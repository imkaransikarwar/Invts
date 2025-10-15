import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat as GenAIChat } from "@google/genai";

declare var marked: any;

type MentorChatMessage = {
    role: 'user' | 'model';
    content: string;
};

export type MentorModesResult = {
    persona: string;
    history: MentorChatMessage[];
};

type Persona = {
    id: string;
    name: string;
    description: string;
    icon: React.ReactElement;
    systemInstruction: string;
    accentColor: string;
    initialMessage: string;
};

const personas: Persona[] = [
    {
        id: 'socratic_guide',
        name: 'Socratic Guide',
        description: 'Asks probing questions instead of giving direct answers.',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"></path><path d="m22 10-7.5 7.5L9 12"></path></svg>,
        accentColor: '#3b82f6',
        initialMessage: "Let us begin. What topic shall we explore through questions today?",
        systemInstruction: "You are a Socratic Guide for a UPSC aspirant. Your goal is to test the user's knowledge and deepen their understanding by asking probing questions. Never give a direct answer. Instead, respond to their statements and questions with more questions that force them to think critically and explore the topic from different angles."
    },
    {
        id: 'devils_advocate',
        name: "Devil's Advocate",
        description: 'Challenges your arguments to help you build a stronger case.',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>,
        accentColor: '#ef4444',
        initialMessage: "Present your argument. I am here to challenge it.",
        systemInstruction: "You are a 'Devil's Advocate' for a UPSC aspirant. Your role is to be rigorously critical but constructive. The user will present an argument, opinion, or answer. Your job is to challenge their points, find counter-arguments, question their assumptions, and expose weaknesses in their logic. Force them to defend their position and build a more robust, well-rounded argument."
    },
    {
        id: 'simplifier',
        name: 'The Simplifier',
        description: 'Breaks down complex topics into simple concepts using analogies.',
        accentColor: '#10b981',
        initialMessage: "What complex topic can I simplify for you today?",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 13-8-5 8-5 8 5-8 5z"></path><path d="m12 21-8-5v-6.5l8 5 8-5V16l-8 5z"></path></svg>,
        systemInstruction: "You are 'The Simplifier', an expert teacher for a UPSC aspirant. The user will provide a complex topic, term, or text. Your goal is to explain it in the simplest possible terms. Use analogies, real-world examples, and bullet points to break down jargon and make the concept highly accessible and memorable."
    },
    {
        id: 'ethics_guru',
        name: 'Ethics Guru (GS-IV)',
        description: 'Presents ethical dilemmas and evaluates your response.',
        accentColor: '#8b5cf6',
        initialMessage: "Welcome. Let's discuss an ethical issue. Present a topic or ask for a dilemma.",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
        systemInstruction: "You are an expert examiner for UPSC GS Paper IV (Ethics). Your role is to engage the user on ethical concepts, present them with realistic ethical dilemmas or case studies, and evaluate their responses. Analyze their answers based on key ethical frameworks (Deontology, Utilitarianism, Virtue Ethics), constitutional morality, and the principles of public service. Guide them to structure their answers better."
    },
    {
        id: 'pyq_analyst',
        name: 'PYQ Analyst',
        description: "Deconstructs Previous Year Questions to reveal patterns.",
        accentColor: '#f97316',
        initialMessage: "Please provide a Previous Year Question, and I will deconstruct it for you.",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
        systemInstruction: "You are a PYQ Analyst for a UPSC aspirant. The user will give you a Previous Year Question. Your task is to deconstruct it. Explain the core directive, identify the key themes being tested, reveal the 'hidden' demands of the question, and explain the likely mindset of the examiner. Provide a basic framework for how a high-scoring answer should be structured."
    },
    {
        id: 'topper_strategist',
        name: 'Topper Strategist',
        description: 'Gives advice on study techniques, time management, and mindset.',
        accentColor: '#f59e0b',
        initialMessage: "Preparation is a marathon, not a sprint. What aspect of your strategy are you struggling with today?",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>,
        systemInstruction: "You are a UPSC Topper Strategist. You are not an expert on subjects, but an expert on preparation strategy. Your persona is that of a successful, encouraging senior aspirant. Provide practical, actionable advice on study techniques (e.g., Pomodoro, active recall), time management, note-making, dealing with burnout, and maintaining a positive mindset. Your tone should be empathetic and motivational."
    }
];

export const MentorModesApp: React.FC<{
    onSessionComplete?: (result: MentorModesResult) => void;
    initialData?: MentorModesResult | null;
}> = ({ onSessionComplete, initialData }) => {
    const [activePersona, setActivePersona] = useState<Persona | null>(
        initialData ? personas.find(p => p.name === initialData.persona) || null : null
    );
    const [history, setHistory] = useState<MentorChatMessage[]>(initialData?.history || []);
    const [isLoading, setIsLoading] = useState(false);
    const [chatInput, setChatInput] = useState('');

    const aiRef = useRef<GoogleGenAI | null>(null);
    const chatInstanceRef = useRef<GenAIChat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history, isLoading]);

    // This effect handles saving the session when the component unmounts or the tool is switched.
    useEffect(() => {
        return () => {
            if (onSessionComplete && activePersona && history.length > 1 && !initialData) {
                onSessionComplete({
                    persona: activePersona.name,
                    history: history
                });
            }
        };
    }, [onSessionComplete, activePersona, history, initialData]);

    const handleSelectPersona = (persona: Persona) => {
        setActivePersona(persona);
        setHistory([{ role: 'model', content: persona.initialMessage }]);
        chatInstanceRef.current = null; // Reset chat instance
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !activePersona || isLoading) return;

        const message = chatInput.trim();
        setChatInput('');
        setIsLoading(true);

        const updatedHistory = [...history, { role: 'user', content: message } as MentorChatMessage];
        setHistory(updatedHistory);

        if (!chatInstanceRef.current) {
            if (!aiRef.current) {
                console.error("AI not initialized");
                setIsLoading(false);
                return;
            }
            chatInstanceRef.current = aiRef.current.chats.create({
                model: 'gemini-2.5-flash',
                history: updatedHistory.slice(0, -1).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
                config: { systemInstruction: activePersona.systemInstruction }
            });
        }
        
        try {
            const stream = await chatInstanceRef.current.sendMessageStream({ message });
            let modelResponse = '';
            
            setHistory(prev => [...prev, { role: 'model', content: '' }]);
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: 'model', content: modelResponse };
                    return newHistory;
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setHistory(prev => [...prev, { role: 'model', content: "Sorry, an error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!activePersona) {
        return (
            <div className="persona-selection-container">
                <h2 className="persona-selection-title">Choose a Mentor Persona</h2>
                <p>Select a specialized mentor to start a focused conversation.</p>
                <div className="persona-grid">
                    {personas.map(persona => (
                        <div key={persona.id} className="persona-card" onClick={() => handleSelectPersona(persona)} style={{ '--accent-color': persona.accentColor } as React.CSSProperties}>
                             <div className="persona-icon-wrapper">
                                <div className="persona-icon">{persona.icon}</div>
                            </div>
                            <div className="persona-text">
                                <h3>{persona.name}</h3>
                                <p>{persona.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mentor-modes-chat-container" data-persona-id={activePersona.id} style={{ '--accent-color': activePersona.accentColor } as React.CSSProperties}>
            <div className="mentor-modes-header">
                 <div className="persona-info">
                    <div className="persona-avatar">{activePersona.icon}</div>
                    <div className="persona-details">
                        <h3>{activePersona.name}</h3>
                        <p>{activePersona.description}</p>
                    </div>
                </div>
                <button className="end-session-button" onClick={() => {
                    if (onSessionComplete && history.length > 1 && !initialData) {
                        onSessionComplete({ persona: activePersona.name, history });
                    }
                    setActivePersona(null);
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    <span>End Session</span>
                </button>
            </div>
            <div className="chat-content" ref={chatContainerRef}>
                 {history.map((msg, index) => (
                     <div key={index} className={`chat-message-wrapper ${msg.role}-wrapper`}>
                        <div className={`avatar ${msg.role}-avatar`}>
                            {msg.role === 'model' ? (
                                activePersona.icon
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            )}
                        </div>
                        <div className={`chat-message ${msg.role}-message`}>
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                        </div>
                    </div>
                 ))}
                 {isLoading && (
                    <div className="chat-message-wrapper model-wrapper">
                        <div className="avatar model-avatar">{activePersona.icon}</div>
                        <div className="chat-message model-message loading-dots"><span></span><span></span><span></span></div>
                    </div>
                )}
            </div>
            <div className="chat-input-area">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Chat with ${activePersona.name}...`}
                    disabled={isLoading}
                />
                <button onClick={handleSendMessage} disabled={isLoading || !chatInput.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        </div>
    );
};
