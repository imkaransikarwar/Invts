import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

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
type InterviewState = 'setup' | 'connecting' | 'active' | 'ending' | 'feedback' | 'error';

type DAFDetails = {
    homeState: string;
    gradSubject: string;
    optionalSubject: string;
    hobbies: string;
};

type TranscriptEntry = {
    speaker: 'Interviewer' | 'You';
    text: string;
};

type Feedback = {
    overall_assessment: string;
    content_knowledge: string[];
    communication_skills: string[];
    areas_for_improvement: string[];
};

export type InterviewResult = {
    dafDetails: DAFDetails;
    transcript: TranscriptEntry[];
    feedback: Feedback;
};

const formatInterviewResultAsMarkdown = (result: InterviewResult): string => {
    let content = `# Interview Report\n\n`;
    content += `## DAF Details Provided\n`;
    content += `- **Home State:** ${result.dafDetails.homeState || 'N/A'}\n`;
    content += `- **Graduation Subject:** ${result.dafDetails.gradSubject || 'N/A'}\n`;
    content += `- **Optional Subject:** ${result.dafDetails.optionalSubject || 'N/A'}\n`;
    content += `- **Hobbies:** ${result.dafDetails.hobbies || 'N/A'}\n\n`;

    if (result.feedback) {
        content += `## Feedback\n\n`;
        content += `### Overall Assessment\n${result.feedback.overall_assessment}\n\n`;
        content += `### Content & Knowledge\n`;
        result.feedback.content_knowledge.forEach(p => content += `- ${p}\n`);
        content += `\n### Communication & Structure\n`;
        result.feedback.communication_skills.forEach(p => content += `- ${p}\n`);
        content += `\n### Areas for Improvement\n`;
        result.feedback.areas_for_improvement.forEach(p => content += `- ${p}\n`);
        content += `\n`;
    }

    content += `## Full Transcript\n\n`;
    result.transcript.forEach(t => {
        content += `**${t.speaker}:** ${t.text}\n\n`;
    });

    return content;
};

// === COMPONENT ===
export const InterviewApp: React.FC<{
    onInterviewComplete?: (result: InterviewResult) => void;
    initialData?: InterviewResult | null;
}> = ({ onInterviewComplete, initialData }) => {
    const [interviewState, setInterviewState] = useState<InterviewState>(initialData ? 'feedback' : 'setup');
    const [dafDetails, setDafDetails] = useState<DAFDetails>(initialData?.dafDetails || {
        homeState: '', gradSubject: '', optionalSubject: '', hobbies: ''
    });
    const [transcript, setTranscript] = useState<TranscriptEntry[]>(initialData?.transcript || []);
    const [feedback, setFeedback] = useState<Feedback | null>(initialData?.feedback || null);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI service.");
            setInterviewState('error');
        }
        
        return () => {
            // Cleanup on unmount
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
        };
    }, []);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDafDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleStartInterview = async () => {
        if (!aiRef.current) return;
        setInterviewState('connecting');
        setError(null);
        setTranscript([]);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const outputNode = outputAudioContextRef.current.createGain();
            outputNode.connect(outputAudioContextRef.current.destination);


            const dafContext = `
                - Home State: ${dafDetails.homeState || 'Not provided'}
                - Graduation Subject: ${dafDetails.gradSubject || 'Not provided'}
                - Optional Subject: ${dafDetails.optionalSubject || 'Not provided'}
                - Hobbies: ${dafDetails.hobbies || 'Not provided'}
            `;

            const systemInstruction = `You are the chairperson of a UPSC interview board. Your name is Dr. Sharma. You are conducting a mock personality test for a UPSC aspirant.
            Your tone should be professional, formal, and inquisitive, but not overly aggressive.
            Begin the interview by warmly welcoming the candidate and asking them to be comfortable. Then, start with a question based on their provided background details.
            Use the candidate's background to ask relevant questions: ${dafContext}
            Ask a variety of questions:
            - Some based on their background (DAF).
            - Some on current affairs of national and international importance.
            - Some situational questions (e.g., "Imagine you are the District Magistrate of...").
            - Some opinion-based questions on ethical dilemmas.
            Listen to the candidate's responses and ask relevant follow-up questions. Keep the conversation flowing naturally. Aim for an interview duration of about 5-7 minutes (around 5-8 questions with follow-ups).
            Do not provide feedback during the interview itself. Your role is solely to be the interviewer.
            When you feel the interview has concluded, thank the candidate and inform them that the interview is over.
            `;

            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            sessionPromiseRef.current = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setInterviewState('active');
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
                            if(currentOutputTranscription.trim()) setTranscript(prev => [...prev, { speaker: 'Interviewer', text: currentOutputTranscription.trim() }]);
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
                        setInterviewState('error');
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
            setInterviewState('error');
        }
    };
    
    const handleEndInterview = async () => {
        setInterviewState('ending');
        
        // Stop audio processing
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

        if (!aiRef.current) return;

        const fullTranscript = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        const feedbackPrompt = `
            You are an expert UPSC interview coach. You have the transcript of a mock interview.
            Your task is to provide constructive, comprehensive feedback based SOLELY on the provided transcript.
            Do not invent any information not present in the transcript.

            **Transcript:**
            ${fullTranscript}

            **Instructions:**
            Provide your feedback as a single, valid JSON object with the following structure:
            - "overall_assessment": A string summarizing the candidate's overall performance in 2-3 sentences.
            - "content_knowledge": An array of strings highlighting strengths and weaknesses in the content of the answers (e.g., factual accuracy, depth of knowledge, multi-dimensional analysis).
            - "communication_skills": An array of strings analyzing communication based on the text (e.g., clarity of thought, structure of answers, directness). Do not comment on voice or tone.
            - "areas_for_improvement": An array of strings with specific, actionable suggestions for improvement.
        `;

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: feedbackPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            overall_assessment: { type: Type.STRING },
                            content_knowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                            communication_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                            areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ['overall_assessment', 'content_knowledge', 'communication_skills', 'areas_for_improvement']
                    }
                }
            });
            const feedbackResult: Feedback = JSON.parse(response.text);
            setFeedback(feedbackResult);
            setInterviewState('feedback');
            
            if (onInterviewComplete) {
                onInterviewComplete({ dafDetails, transcript, feedback: feedbackResult });
            }
        } catch (err) {
            console.error('Feedback generation failed:', err);
            setError('Could not generate feedback. You can still review the transcript.');
            setInterviewState('feedback'); // Still show transcript even if feedback fails
        }
    };

    const handleExport = () => {
        setIsDownloading(true);
        const resultToExport: InterviewResult = {
            dafDetails: initialData?.dafDetails || dafDetails,
            transcript: initialData?.transcript || transcript,
            feedback: initialData?.feedback || feedback!,
        };
        const markdownContent = formatInterviewResultAsMarkdown(resultToExport);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Interview_Report_${resultToExport.dafDetails.optionalSubject || 'General'}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };
    
     const renderSetup = () => (
        <div className="card interview-setup-container">
            <h2>Mock Interview Simulator</h2>
            <p className="subtitle">Provide some details to personalize your interview experience. This information will only be used for this session.</p>
            <div className="daf-form">
                <div className="form-group">
                    <label htmlFor="homeState">Home State</label>
                    <input type="text" id="homeState" name="homeState" value={dafDetails.homeState} onChange={handleInputChange} placeholder="e.g., Uttar Pradesh" />
                </div>
                <div className="form-group">
                    <label htmlFor="gradSubject">Graduation Subject</label>
                    <input type="text" id="gradSubject" name="gradSubject" value={dafDetails.gradSubject} onChange={handleInputChange} placeholder="e.g., Mechanical Engineering" />
                </div>
                 <div className="form-group">
                    <label htmlFor="optionalSubject">Optional Subject (Mains)</label>
                    <input type="text" id="optionalSubject" name="optionalSubject" value={dafDetails.optionalSubject} onChange={handleInputChange} placeholder="e.g., Public Administration" />
                </div>
                 <div className="form-group">
                    <label htmlFor="hobbies">Hobbies</label>
                    <input type="text" id="hobbies" name="hobbies" value={dafDetails.hobbies} onChange={handleInputChange} placeholder="e.g., Reading, Trekking" />
                </div>
            </div>
            <button className="action-button primary large" onClick={handleStartInterview}>Start Interview</button>
        </div>
    );
    
    const renderActive = () => (
        <div className="card interview-active-container">
            <div className="interview-header">
                <h2>Interview in Progress...</h2>
                <div className="listening-indicator">
                    <div className="pulsating-dot"></div>
                    <span>Listening</span>
                </div>
            </div>
            <div className="transcript-container">
                {transcript.map((entry, index) => (
                    <div key={index} className={`transcript-entry ${entry.speaker.toLowerCase()}`}>
                        <strong>{entry.speaker}:</strong> {entry.text}
                    </div>
                ))}
            </div>
            <button className="action-button secondary" onClick={handleEndInterview}>End Interview & Get Feedback</button>
        </div>
    );
    
    const renderFeedback = () => (
        <div className="card interview-feedback-container">
            <h2>Interview Report</h2>
            {feedback && (
                <div className="feedback-report">
                    <div className="feedback-section">
                        <h3>Overall Assessment</h3>
                        <p>{feedback.overall_assessment}</p>
                    </div>
                    <div className="feedback-grid">
                        <div className="feedback-section">
                            <h4>Content & Knowledge</h4>
                            <ul>{feedback.content_knowledge.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        </div>
                         <div className="feedback-section">
                            <h4>Communication & Structure</h4>
                            <ul>{feedback.communication_skills.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        </div>
                    </div>
                     <div className="feedback-section">
                        <h4>Areas for Improvement</h4>
                        <ul>{feedback.areas_for_improvement.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                </div>
            )}
             <div className="accordion">
                <div className="accordion-item">
                     <h3 className="accordion-header" style={{cursor: 'default'}}>Full Transcript</h3>
                     <div className="accordion-content" style={{padding: '1.5rem'}}>
                        <div className="transcript-container review">
                             {transcript.map((entry, index) => (
                                <div key={index} className={`transcript-entry ${entry.speaker.toLowerCase()}`}>
                                    <strong>{entry.speaker}:</strong> {entry.text}
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            </div>
            <div className="results-actions" style={{marginTop: '2rem'}}>
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                    {isDownloading ? 'Exporting...' : 'Export Report'}
                </button>
                <button className="action-button primary" onClick={() => {
                    setInterviewState('setup');
                    setDafDetails({ homeState: '', gradSubject: '', optionalSubject: '', hobbies: '' });
                    setTranscript([]);
                    setFeedback(null);
                }}>Start New Interview</button>
            </div>
        </div>
    );
    
    return (
        <div className="interview-container">
            {interviewState === 'setup' && renderSetup()}
            {interviewState === 'connecting' && <div className="card"><p>Connecting and accessing microphone...</p></div>}
            {interviewState === 'active' && renderActive()}
            {interviewState === 'ending' && <div className="card"><p>Interview ended. Generating feedback report...</p></div>}
            {interviewState === 'feedback' && renderFeedback()}
            {interviewState === 'error' && <div className="card error"><p>{error}</p><button className="action-button secondary" onClick={() => setInterviewState('setup')}>Try Again</button></div>}
        </div>
    );
};
