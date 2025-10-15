import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// === HELPER FUNCTIONS (Audio Encoding/Decoding) ===
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

type Blob = {
    data: string;
    mimeType: string;
};

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// === TYPE DEFINITIONS ===
type CallState = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export type TranscriptEntry = {
    speaker: 'Mentor' | 'You';
    text: string;
};

const formatTranscriptAsMarkdown = (transcript: TranscriptEntry[]): string => {
    let content = `# Mentor Call Transcript\n\n`;
    transcript.forEach(entry => {
        content += `**${entry.speaker}:** ${entry.text}\n\n`;
    });
    return content;
};

const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};


// === COMPONENT ===
export const MentorCallApp: React.FC<{
    onCallComplete?: (transcript: TranscriptEntry[]) => void;
    initialData?: TranscriptEntry[] | null;
}> = ({ onCallComplete, initialData }) => {
    const [callState, setCallState] = useState<CallState>(initialData ? 'ended' : 'idle');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>(initialData || []);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const durationTimerRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI service.");
            setCallState('error');
        }
        
        return () => {
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.close());
            }
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
            if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
                inputAudioContextRef.current.close();
            }
            if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
                outputAudioContextRef.current.close();
            }
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }
        };
    }, []);
    
    useEffect(() => {
        if (callState === 'active') {
            durationTimerRef.current = window.setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            // Don't reset duration on 'ended', only on 'idle'
            if (callState === 'idle') {
                setCallDuration(0);
            }
        }
        
        return () => {
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }
        }
    }, [callState]);

    const handleStartCall = async () => {
        if (!aiRef.current) return;
        setCallState('connecting');
        setError(null);
        setTranscript([]);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const outputNode = outputAudioContextRef.current.createGain();
            outputNode.connect(outputAudioContextRef.current.destination);

            const systemInstruction = `You are INVICTUS, a friendly and expert AI mentor for UPSC. The user has started a 1:1 doubt-solving call. Your goal is to listen carefully to their questions and provide clear, concise, and accurate answers. Keep your responses conversational and encouraging. Start by saying 'Hello! This is INVICTUS. How can I help you with your preparation today?'`;

            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            sessionPromiseRef.current = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setCallState('active');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            if(currentInputTranscription.trim()) setTranscript(prev => [...prev, { speaker: 'You', text: currentInputTranscription.trim() }]);
                            if(currentOutputTranscription.trim()) setTranscript(prev => [...prev, { speaker: 'Mentor', text: currentOutputTranscription.trim() }]);
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outputCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setError('A connection error occurred. Please try again.');
                        setCallState('error');
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Live session closed.');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction,
                },
            });
        } catch (err) {
            console.error(err);
            setError("Could not access the microphone. Please grant permission and try again.");
            setCallState('error');
        }
    };

    const handleEndCall = async () => {
        setCallState('ended');
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }

        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }

        if (onCallComplete && !initialData) {
            onCallComplete(transcript);
        }
    };

    const handleExport = () => {
        setIsDownloading(true);
        const markdownContent = formatTranscriptAsMarkdown(transcript);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Mentor_Call_Transcript_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    const renderIdle = () => (
        <div className="mentor-call-idle-container">
             <div className="mentor-call-icon-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
             </div>
            <h2>1:1 Mentor Call</h2>
            <p>Have a quick doubt? Start a live audio call with your AI mentor for instant clarification. Your conversation will be transcribed and saved.</p>
            <button className="action-button primary large" onClick={handleStartCall}>Start Call</button>
        </div>
    );

    const renderActive = () => (
        <div className="mentor-call-active-container">
             <div className="mentor-call-header">
                <div className="mentor-avatar">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
                </div>
                <div className="mentor-info">
                    <h3>INVICTUS Mentor</h3>
                    <div className="call-status">
                        <div className="pulsating-dot"></div>
                        <span>Live Call</span>
                    </div>
                </div>
                <div className="call-timer">{formatDuration(callDuration)}</div>
            </div>

            <div className="audio-visualizer">
                <span></span><span></span><span></span><span></span><span></span>
            </div>

            <div className="transcript-container">
                {transcript.length === 0 ? (
                    <p className="transcript-placeholder">Your conversation will appear here...</p>
                ) : (
                    transcript.map((entry, index) => (
                        <div key={index} className={`transcript-entry transcript-entry-${entry.speaker.toLowerCase()}`}>
                            <div className="transcript-speaker">{entry.speaker}</div>
                            <div className="transcript-text">{entry.text}</div>
                        </div>
                    ))
                )}
            </div>
            <button className="action-button secondary end-call-button" onClick={handleEndCall}>End Call</button>
        </div>
    );

    const renderEnded = () => (
        <div className="mentor-call-ended-container">
            <h2>Call Ended</h2>
            <div className="transcript-review-wrapper">
                <h4>Call Transcript ({formatDuration(callDuration)})</h4>
                <div className="transcript-container review">
                    {transcript.length > 0 ? transcript.map((entry, index) => (
                        <div key={index} className={`transcript-entry transcript-entry-${entry.speaker.toLowerCase()}`}>
                            <div className="transcript-speaker">{entry.speaker}</div>
                            <div className="transcript-text">{entry.text}</div>
                        </div>
                    )) : <p className="transcript-placeholder">The call ended before any conversation was transcribed.</p>}
                </div>
            </div>
            <div className="results-actions">
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading || transcript.length === 0}>
                    {isDownloading ? 'Exporting...' : 'Export Transcript'}
                </button>
                <button className="action-button primary" onClick={() => { setCallState('idle'); setTranscript([]); }}>Start a New Call</button>
            </div>
        </div>
    );

    return (
        <div className="mentor-call-container">
            {callState === 'idle' && renderIdle()}
            {callState === 'connecting' && <div className="card" style={{textAlign: 'center'}}><p>Connecting and accessing microphone...</p><div className="loading-indicator" style={{margin: '1rem auto'}}><div></div><div></div><div></div></div></div>}
            {callState === 'active' && renderActive()}
            {callState === 'ended' && renderEnded()}
            {callState === 'error' && <div className="card error"><p>{error}</p><button className="action-button secondary" onClick={() => setCallState('idle')}>Try Again</button></div>}
        </div>
    );
};
