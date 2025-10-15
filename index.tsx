
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { MainsApp, EvaluationResult } from './Awapp/index.tsx';
import { PrelimsApp, QuizResult } from './Papp/Index.tsx';
import { InterviewApp, InterviewResult } from './Iapp/Index.tsx';
import { PyqApp, PyqAnalysisResult } from './Pyqtapp/Index.tsx';
import { EssayApp, EssayFrameworkResult } from './EssayApp/Index.tsx';
import { MentorCallApp, TranscriptEntry as MentorCallTranscriptEntry } from './MentorCallApp/Index.tsx';
import { NotesProApp, NotesProResult } from './NotesProApp/Index.tsx';
import { MentorModesApp, MentorModesResult } from './MentorModesApp/Index.tsx';
import { ChronoScoutApp, ChronoScoutResult } from './CaApp/Index.tsx';
import { AnthropologyApp, AnthropologyAnalysisResult } from './AnthropologyApp/Index.tsx';
import { MindMapApp, MindMapResult } from './MindMapApp/Index.tsx';
import { GoogleGenAI, Chat as GenAIChat } from "@google/genai";
import { AuthPage } from './user_data/Auth.tsx';
import { authService, dataService, User, UserData } from './Mimic_backend/services.ts';

declare var marked: any;

const themes = ['light', 'dark', 'slate', 'midnight', 'obsidian', 'crimson'];

const ThemeToggle: React.FC<{ theme: string; toggleTheme: () => void; }> = ({ theme, toggleTheme }) => {
    const isDark = ['dark', 'midnight', 'obsidian', 'crimson'].includes(theme);

    const getNextTheme = (current: string) => {
        const currentIndex = themes.indexOf(current);
        const nextIndex = (currentIndex + 1) % themes.length;
        return themes[nextIndex];
    };

    const nextTheme = getNextTheme(theme);
    
    return (
        <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${nextTheme} mode`}>
            {isDark ? (
                // Sun icon for dark themes
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
                // Moon icon for light themes
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
        </button>
    );
};


// === AI MENTOR APP ===

type MentorChatMessage = {
    role: 'user' | 'model';
    content: string;
    timestamp: number;
};

type MentorChat = {
    id: string;
    title: string;
    history: MentorChatMessage[];
};

type EvaluationHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    results: EvaluationResult[];
};

type QuizHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: QuizResult;
};

type InterviewHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: InterviewResult;
};

type PyqHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: PyqAnalysisResult;
}

type EssayHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: EssayFrameworkResult;
}

type MentorCallHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    transcript: MentorCallTranscriptEntry[];
}

type NotesProHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: NotesProResult;
}

type MentorModesHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: MentorModesResult;
}

type ChronoScoutHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: ChronoScoutResult;
}

type AnthropologyHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: AnthropologyAnalysisResult;
}

type MindMapHistoryItem = {
    id: string;
    title: string;
    timestamp: number;
    result: MindMapResult;
}


const MentorApp: React.FC<{
    isSidebarOpen: boolean;
    closeSidebar: () => void;
    currentUser: User;
    onLogout: () => void;
}> = ({ isSidebarOpen, closeSidebar, currentUser, onLogout }) => {
    const [chats, setChats] = useState<MentorChat[]>([]);
    const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistoryItem[]>([]);
    const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
    const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryItem[]>([]);
    const [pyqHistory, setPyqHistory] = useState<PyqHistoryItem[]>([]);
    const [essayHistory, setEssayHistory] = useState<EssayHistoryItem[]>([]);
    const [mentorCallHistory, setMentorCallHistory] = useState<MentorCallHistoryItem[]>([]);
    const [notesProHistory, setNotesProHistory] = useState<NotesProHistoryItem[]>([]);
    const [mentorModesHistory, setMentorModesHistory] = useState<MentorModesHistoryItem[]>([]);
    const [chronoScoutHistory, setChronoScoutHistory] = useState<ChronoScoutHistoryItem[]>([]);
    const [anthropologyHistory, setAnthropologyHistory] = useState<AnthropologyHistoryItem[]>([]);
    const [mindMapHistory, setMindMapHistory] = useState<MindMapHistoryItem[]>([]);
    const [activeItemId, setActiveItemId] = useState<string | null>(null);

    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [openToolsMenu, setOpenToolsMenu] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'mains' | 'prelims' | 'interview' | 'pyq' | 'essay' | 'mentorCall' | 'notesPro' | 'mentorModes' | 'chronoScout' | 'anthropology' | 'mindMap' | null>(null);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [openMessageMenu, setOpenMessageMenu] = useState<number | null>(null);
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);


    const aiRef = useRef<GoogleGenAI | null>(null);
    const chatInstances = useRef<Map<string, GenAIChat>>(new Map());
    const chatContentRef = useRef<HTMLDivElement>(null);
    const toolsMenuContainerRef = useRef<Record<string, HTMLDivElement | null>>({});
    const messageMenuRef = useRef<HTMLDivElement>(null);
    const chatMenuRef = useRef<HTMLDivElement>(null);
    const initialLoadComplete = useRef(false);

    const isMobile = useMemo(() => window.innerWidth <= 1024, []);

    // Load user data on mount
    useEffect(() => {
        if (currentUser) {
            const data = dataService.loadUserData(currentUser.username);
            setChats(data.chats);
            setEvaluationHistory(data.evaluations);
            setQuizHistory(data.quizzes);
            setInterviewHistory(data.interviews || []);
            setPyqHistory(data.pyqAnalyses || []);
            setEssayHistory(data.essayOutlines || []);
            setMentorCallHistory(data.mentorCalls || []);
            setNotesProHistory(data.notesPro || []);
            setMentorModesHistory(data.mentorModes || []);
            setChronoScoutHistory(data.chronoScouts || []);
            setAnthropologyHistory(data.anthropologyAnalyses || []);
            setMindMapHistory(data.mindMaps || []);
            setActiveItemId(data.activeItemId);
            initialLoadComplete.current = true;
        }
    }, [currentUser]);

    // Save user data on change
    useEffect(() => {
        if (currentUser && initialLoadComplete.current) {
            const userData: UserData = {
                chats,
                evaluations: evaluationHistory,
                quizzes: quizHistory,
                interviews: interviewHistory,
                pyqAnalyses: pyqHistory,
                essayOutlines: essayHistory,
                mentorCalls: mentorCallHistory,
                notesPro: notesProHistory,
                mentorModes: mentorModesHistory,
                chronoScouts: chronoScoutHistory,
                anthropologyAnalyses: anthropologyHistory,
                mindMaps: mindMapHistory,
                activeItemId,
            };
            dataService.saveUserData(currentUser.username, userData);
        }
    }, [chats, evaluationHistory, quizHistory, interviewHistory, pyqHistory, essayHistory, mentorCallHistory, notesProHistory, mentorModesHistory, chronoScoutHistory, anthropologyHistory, mindMapHistory, activeItemId, currentUser]);

    const handleNewChat = useCallback(() => {
        const newChat: MentorChat = {
            id: `chat-${Date.now()}`,
            title: "New Chat",
            history: [],
        };
        setChats(prev => [newChat, ...prev]);
        setActiveItemId(newChat.id);
        setActiveTool(null);
        closeSidebar();
    }, [closeSidebar]);

    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
        }
    }, []);

    const activeChat = useMemo(() => chats.find(c => c.id === activeItemId), [chats, activeItemId]);
    const viewingEvaluationData = useMemo(() => evaluationHistory.find(e => e.id === activeItemId)?.results, [evaluationHistory, activeItemId]);
    const viewingQuizData = useMemo(() => quizHistory.find(q => q.id === activeItemId)?.result, [quizHistory, activeItemId]);
    const viewingInterviewData = useMemo(() => interviewHistory.find(i => i.id === activeItemId)?.result, [interviewHistory, activeItemId]);
    const viewingPyqData = useMemo(() => pyqHistory.find(p => p.id === activeItemId)?.result, [pyqHistory, activeItemId]);
    const viewingEssayData = useMemo(() => essayHistory.find(e => e.id === activeItemId)?.result, [essayHistory, activeItemId]);
    const viewingMentorCallData = useMemo(() => mentorCallHistory.find(i => i.id === activeItemId)?.transcript, [mentorCallHistory, activeItemId]);
    const viewingNotesProData = useMemo(() => notesProHistory.find(n => n.id === activeItemId)?.result, [notesProHistory, activeItemId]);
    const viewingMentorModesData = useMemo(() => mentorModesHistory.find(m => m.id === activeItemId)?.result, [mentorModesHistory, activeItemId]);
    const viewingChronoScoutData = useMemo(() => chronoScoutHistory.find(cs => cs.id === activeItemId)?.result, [chronoScoutHistory, activeItemId]);
    const viewingAnthropologyData = useMemo(() => anthropologyHistory.find(a => a.id === activeItemId)?.result, [anthropologyHistory, activeItemId]);
    const viewingMindMapData = useMemo(() => mindMapHistory.find(m => m.id === activeItemId)?.result, [mindMapHistory, activeItemId]);

    useEffect(() => {
        if (chatContentRef.current) {
            chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
    }, [chats, activeItemId, isLoading, activeTool]);

     useEffect(() => {
        if (!initialLoadComplete.current) return;

        if (chats.length === 0 && evaluationHistory.length === 0 && quizHistory.length === 0 && interviewHistory.length === 0 && pyqHistory.length === 0 && essayHistory.length === 0 && mentorCallHistory.length === 0 && notesProHistory.length === 0 && mentorModesHistory.length === 0 && chronoScoutHistory.length === 0 && anthropologyHistory.length === 0 && mindMapHistory.length === 0) {
            handleNewChat();
            return;
        }
        const allItems = [...chats, ...evaluationHistory, ...quizHistory, ...interviewHistory, ...pyqHistory, ...essayHistory, ...mentorCallHistory, ...notesProHistory, ...mentorModesHistory, ...chronoScoutHistory, ...anthropologyHistory, ...mindMapHistory];
        const activeItemExists = allItems.some(item => item.id === activeItemId);
        if (!activeItemId || !activeItemExists) {
            setActiveItemId(chats[0]?.id || evaluationHistory[0]?.id || quizHistory[0]?.id || interviewHistory[0]?.id || pyqHistory[0]?.id || essayHistory[0]?.id || mentorCallHistory[0]?.id || notesProHistory[0]?.id || mentorModesHistory[0]?.id || chronoScoutHistory[0]?.id || anthropologyHistory[0]?.id || mindMapHistory[0]?.id || null);
        }
    }, [chats, evaluationHistory, quizHistory, interviewHistory, pyqHistory, essayHistory, mentorCallHistory, notesProHistory, mentorModesHistory, chronoScoutHistory, anthropologyHistory, mindMapHistory, activeItemId, handleNewChat]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openToolsMenu) {
                const currentRef = toolsMenuContainerRef.current[openToolsMenu];
                if (currentRef && !currentRef.contains(event.target as Node)) {
                    setOpenToolsMenu(null);
                }
            }
            if (isChatMenuOpen && chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
                setIsChatMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openToolsMenu, isChatMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMessageMenu !== null && messageMenuRef.current && !messageMenuRef.current.contains(event.target as Node)) {
                setOpenMessageMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMessageMenu]);

    const getOrCreateGenAIChat = (chat: MentorChat): GenAIChat => {
        if (chatInstances.current.has(chat.id)) {
            return chatInstances.current.get(chat.id)!;
        }

        if (!aiRef.current) throw new Error("AI not initialized");
        
        const systemInstruction = `You are INVICTUS, an expert AI mentor for the UPSC Civil Services Examination. Your goal is to provide comprehensive, accurate, and structured guidance to aspirants. You can create detailed study plans, explain complex topics micro-topic wise, provide detailed notes, and act as a Socratic guide to test a user's knowledge. Your tone should be encouraging, knowledgeable, and professional.

**IMPORTANT FORMATTING RULE:** Use standard Markdown for formatting.
- Use headings (e.g., \`## Your Heading\`) for structure.
- Use bold text (\`**important term**\`) to highlight key concepts, definitions, or facts.
- Use lists for clarity.
Your output should be clean, readable, and well-structured markdown.
`;
        
        const historyForGenAI = chat.history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        const newGenAIChat = aiRef.current.chats.create({
            model: 'gemini-2.5-flash',
            history: historyForGenAI,
            config: { systemInstruction }
        });

        chatInstances.current.set(chat.id, newGenAIChat);
        return newGenAIChat;
    };
    
    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const handleSelectChat = (chatId: string) => {
        setActiveItemId(chatId);
        setActiveTool(null);
        closeSidebar();
    }
    
    const handleSelectEvaluation = (item: EvaluationHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('mains');
        closeSidebar();
    };

    const handleSelectQuiz = (item: QuizHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('prelims');
        closeSidebar();
    };
    
    const handleSelectInterview = (item: InterviewHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('interview');
        closeSidebar();
    };

    const handleSelectPyq = (item: PyqHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('pyq');
        closeSidebar();
    };
    
    const handleSelectEssay = (item: EssayHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('essay');
        closeSidebar();
    };

    const handleSelectMentorCall = (item: MentorCallHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('mentorCall');
        closeSidebar();
    };

    const handleSelectNotesPro = (item: NotesProHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('notesPro');
        closeSidebar();
    };

    const handleSelectMentorModes = (item: MentorModesHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('mentorModes');
        closeSidebar();
    };

    const handleSelectChronoScout = (item: ChronoScoutHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('chronoScout');
        closeSidebar();
    };

    const handleSelectAnthropology = (item: AnthropologyHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('anthropology');
        closeSidebar();
    };

    const handleSelectMindMap = (item: MindMapHistoryItem) => {
        setActiveItemId(item.id);
        setActiveTool('mindMap');
        closeSidebar();
    };

    const handleDeleteItem = (e: React.MouseEvent, idToDelete: string, type: 'chat' | 'evaluation' | 'quiz' | 'interview' | 'pyq' | 'essay' | 'mentorCall' | 'notesPro' | 'mentorModes' | 'chronoScout' | 'anthropology' | 'mindMap') => {
        e.stopPropagation();

        const itemMap = {
            chat: { items: chats, setter: setChats, name: "chat" },
            evaluation: { items: evaluationHistory, setter: setEvaluationHistory, name: "evaluation" },
            quiz: { items: quizHistory, setter: setQuizHistory, name: "quiz" },
            interview: { items: interviewHistory, setter: setInterviewHistory, name: "interview" },
            pyq: { items: pyqHistory, setter: setPyqHistory, name: "PYQ analysis" },
            essay: { items: essayHistory, setter: setEssayHistory, name: "Essay Outline" },
            mentorCall: { items: mentorCallHistory, setter: setMentorCallHistory, name: "Mentor Call" },
            notesPro: { items: notesProHistory, setter: setNotesProHistory, name: "Notes" },
            mentorModes: { items: mentorModesHistory, setter: setMentorModesHistory, name: "Mentor Session" },
            chronoScout: { items: chronoScoutHistory, setter: setChronoScoutHistory, name: "CA Analysis" },
            anthropology: { items: anthropologyHistory, setter: setAnthropologyHistory, name: "Anthro Analysis" },
            mindMap: { items: mindMapHistory, setter: setMindMapHistory, name: "Mind Map" },
        };

        const { items, setter, name } = itemMap[type];
        const itemToDelete = items.find(c => c.id === idToDelete);
        if (!itemToDelete) return;

        if (window.confirm(`Are you sure you want to delete this ${name}: "${itemToDelete.title}"? This action cannot be undone.`)) {
            const newItems = items.filter(c => c.id !== idToDelete);
            (setter as React.Dispatch<React.SetStateAction<any[]>>)(newItems);
            
            if (type === 'chat') {
                chatInstances.current.delete(idToDelete);
            }

            if (activeItemId === idToDelete) {
                const nextActiveItem = chats[0] || evaluationHistory[0] || quizHistory[0] || interviewHistory[0] || pyqHistory[0] || essayHistory[0] || mentorCallHistory[0] || notesProHistory[0] || mentorModesHistory[0] || chronoScoutHistory[0] || anthropologyHistory[0] || mindMapHistory[0] || null;
                if(nextActiveItem && nextActiveItem.id !== idToDelete) {
                   setActiveItemId(nextActiveItem.id);
                } else if (newItems.length > 0) {
                   setActiveItemId(newItems[0].id);
                }
                 else {
                   setActiveItemId(null);
                }
            }
        }
    };

    const handleClearChat = () => {
        if (!activeChat) return;
        if (window.confirm("Are you sure you want to clear this entire chat history? This action cannot be undone.")) {
            setChats(prev => prev.map(c => 
                c.id === activeChat.id ? { ...c, history: [] } : c
            ));
            chatInstances.current.delete(activeChat.id); // Reset AI history
        }
        setIsChatMenuOpen(false); // Close menu
    }

    const handleExportChat = () => {
        if (!activeChat) return;
    
        let content = `# Chat with INVICTUS: ${activeChat.title}\n\n`;
        activeChat.history.forEach(msg => {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            const speaker = msg.role === 'user' ? currentUser.username : 'INVICTUS';
            content += `**[${timestamp}] ${speaker}:**\n${msg.content}\n\n---\n\n`;
        });
    
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeChat.title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsChatMenuOpen(false); // Close menu
    };

    const handleCopyMessage = (content: string, index: number) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => setCopiedMessageIndex(null), 2000);
        });
        setOpenMessageMenu(null);
    };

    const handleDeleteMessage = (messageIndex: number) => {
        if (!activeChat) return;

        if (window.confirm("Are you sure you want to delete this message? This cannot be undone.")) {
            setChats(prevChats => {
                const chatIndex = prevChats.findIndex(c => c.id === activeChat.id);
                if (chatIndex === -1) return prevChats;

                const updatedChat = { ...prevChats[chatIndex] };
                updatedChat.history = updatedChat.history.filter((_, i) => i !== messageIndex);
                
                const newChats = [...prevChats];
                newChats[chatIndex] = updatedChat;

                chatInstances.current.delete(activeChat.id);
                return newChats;
            });
        }
    };

    const handleStartRename = (e: React.MouseEvent, chat: MentorChat) => {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditingTitle(chat.title);
    };
    
    const handleRenameChat = (chatId: string) => {
        if (editingTitle.trim() === '') {
            setEditingChatId(null);
            return;
        }
        setChats(prev => prev.map(c => 
            c.id === chatId ? { ...c, title: editingTitle.trim() } : c
        ));
        setEditingChatId(null);
    };

    const handleSendMessage = async (messageOverride?: string) => {
        const messageToSend = messageOverride || chatInput;
        if (!messageToSend.trim() || !activeChat || isLoading) return;

        const trimmedMessage = messageToSend.trim().toLowerCase();

        if (trimmedMessage === 'open evaluator') {
            setActiveTool('mains');
            setActiveItemId(null);
            setChatInput('');
            return;
        }

        if (trimmedMessage === 'generate quiz') {
            setActiveTool('prelims');
            setActiveItemId(null);
            setChatInput('');
            return;
        }

        setChatInput('');
        setIsLoading(true);

        const activeChatIndex = chats.findIndex(c => c.id === activeItemId);
        if (activeChatIndex === -1) {
            setIsLoading(false);
            return;
        }
        
        const genaiChat = getOrCreateGenAIChat(activeChat);

        const userMessage: MentorChatMessage = { role: 'user', content: messageToSend, timestamp: Date.now() };
        // Create an empty model message placeholder immediately.
        const modelMessagePlaceholder: MentorChatMessage = { role: 'model', content: '', timestamp: Date.now() + 1 };
        
        const updatedHistory = [...activeChat.history, userMessage, modelMessagePlaceholder];
        const updatedTitle = activeChat.history.length === 0 ? messageToSend.substring(0, 35) + (messageToSend.length > 35 ? '...' : '') : activeChat.title;
        
        const updatedChats = [...chats];
        updatedChats[activeChatIndex] = { ...activeChat, history: updatedHistory, title: updatedTitle };
        setChats(updatedChats);

        try {
            const stream = await genaiChat.sendMessageStream({ message: messageToSend });
            let modelResponse = '';
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setChats(prev => {
                    const currentChats = [...prev];
                    const chatIndex = currentChats.findIndex(c => c.id === activeItemId);
                    if(chatIndex !== -1) {
                         // Update the content of the last message (the placeholder).
                         currentChats[chatIndex].history[currentChats[chatIndex].history.length - 1].content = modelResponse;
                    }
                    return currentChats;
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
             setChats(prev => {
                const currentChats = [...prev];
                const chatIndex = currentChats.findIndex(c => c.id === activeItemId);
                if(chatIndex !== -1) {
                    // Update the placeholder message with the error.
                    currentChats[chatIndex].history[currentChats[chatIndex].history.length - 1].content = "Sorry, an error occurred. Please try again.";
                }
                return currentChats;
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExamplePromptClick = (prompt: string) => {
        setChatInput(prompt);
        // Do not auto-send, let user click send button.
    }
    
    const handleToggleMessageMenu = (index: number) => {
        setOpenMessageMenu(prev => (prev === index ? null : index));
    };

    const handleEvaluationComplete = (results: EvaluationResult[]) => {
        const newEval: EvaluationHistoryItem = {
            id: `eval-${Date.now()}`,
            title: results[0]?.question.substring(0, 40) + '...' || 'New Evaluation',
            timestamp: Date.now(),
            results,
        };
        setEvaluationHistory(prev => [newEval, ...prev]);
        setActiveItemId(newEval.id);
    };

    const handleQuizComplete = (result: QuizResult) => {
        const newQuiz: QuizHistoryItem = {
            id: `quiz-${Date.now()}`,
            title: result.title,
            timestamp: Date.now(),
            result,
        };
        setQuizHistory(prev => [newQuiz, ...prev]);
        setActiveItemId(newQuiz.id);
    };

    const handleInterviewComplete = (result: InterviewResult) => {
        const newInterview: InterviewHistoryItem = {
            id: `interview-${Date.now()}`,
            title: `Interview (${result.dafDetails.optionalSubject || 'General'})`,
            timestamp: Date.now(),
            result,
        };
        setInterviewHistory(prev => [newInterview, ...prev]);
        setActiveItemId(newInterview.id);
    };
    
    const handlePyqAnalysisComplete = (result: PyqAnalysisResult) => {
        const newAnalysis: PyqHistoryItem = {
            id: `pyq-${Date.now()}`,
            title: `PYQ Analysis: ${result.topic}`,
            timestamp: Date.now(),
            result,
        };
        setPyqHistory(prev => [newAnalysis, ...prev]);
        setActiveItemId(newAnalysis.id);
    };

    const handleEssayAnalysisComplete = (result: EssayFrameworkResult) => {
        const newAnalysis: EssayHistoryItem = {
            id: `essay-${Date.now()}`,
            title: `Essay Outline: ${result.topic}`,
            timestamp: Date.now(),
            result,
        };
        setEssayHistory(prev => [newAnalysis, ...prev]);
        setActiveItemId(newAnalysis.id);
    };

    const handleMentorCallComplete = (transcript: MentorCallTranscriptEntry[]) => {
        const newCall: MentorCallHistoryItem = {
            id: `mentorcall-${Date.now()}`,
            title: `Mentor Call (${new Date().toLocaleDateString()})`,
            timestamp: Date.now(),
            transcript,
        };
        setMentorCallHistory(prev => [newCall, ...prev]);
        setActiveItemId(newCall.id);
    };

    const handleNotesProComplete = (result: NotesProResult) => {
        const newNotes: NotesProHistoryItem = {
            id: `notespro-${Date.now()}`,
            title: `Notes: ${result.topic}`,
            timestamp: Date.now(),
            result,
        };
        setNotesProHistory(prev => [newNotes, ...prev]);
        setActiveItemId(newNotes.id);
    };

    const handleMentorModesComplete = (result: MentorModesResult) => {
        const newSession: MentorModesHistoryItem = {
            id: `mentormode-${Date.now()}`,
            title: `Session: ${result.persona}`,
            timestamp: Date.now(),
            result,
        };
        setMentorModesHistory(prev => [newSession, ...prev]);
        setActiveItemId(newSession.id);
    };

    const handleChronoScoutComplete = (result: ChronoScoutResult) => {
        const newAnalysis: ChronoScoutHistoryItem = {
            id: `chronoscout-${Date.now()}`,
            title: `CA: ${result.topic}`,
            timestamp: Date.now(),
            result,
        };
        setChronoScoutHistory(prev => [newAnalysis, ...prev]);
        setActiveItemId(newAnalysis.id);
    };

    const handleAnthropologyAnalysisComplete = (result: AnthropologyAnalysisResult) => {
        const newAnalysis: AnthropologyHistoryItem = {
            id: `anthro-${Date.now()}`,
            title: `Anthro: ${result.topic}`,
            timestamp: Date.now(),
            result,
        };
        setAnthropologyHistory(prev => [newAnalysis, ...prev]);
        setActiveItemId(newAnalysis.id);
    };
    
    const handleMindMapSave = (result: MindMapResult) => {
        const existingMapIndex = mindMapHistory.findIndex(m => m.id === activeItemId);

        if (existingMapIndex > -1) {
            const updatedHistory = [...mindMapHistory];
            updatedHistory[existingMapIndex] = {
                ...updatedHistory[existingMapIndex],
                title: result.root.text.substring(0, 40) || 'Mind Map',
                result: result,
            };
            setMindMapHistory(updatedHistory);
        } else {
            const newMap: MindMapHistoryItem = {
                id: `mindmap-${Date.now()}`,
                title: result.root.text.substring(0, 40) || 'New Mind Map',
                timestamp: Date.now(),
                result,
            };
            setMindMapHistory(prev => [newMap, ...prev]);
            setActiveItemId(newMap.id);
        }
    };


    const handleDeleteAccount = () => {
        if (window.confirm('Are you sure you want to delete your account? All your data will be permanently lost. This action cannot be undone.')) {
            authService.deleteAccount(currentUser.username);
            onLogout();
        }
    };

    const toolTitle = useMemo(() => {
        switch (activeTool) {
            case 'mains': return 'Mains Mentor';
            case 'prelims': return 'Prelims Quizzer';
            case 'interview': return 'Interview Pro';
            case 'pyq': return 'PYQ Thematic Analyzer';
            case 'essay': return 'Essay Architect';
            case 'mentorCall': return '1:1 Mentor Call';
            case 'notesPro': return 'Notes Pro';
            case 'mentorModes': return 'Mentor Modes';
            case 'chronoScout': return 'ChronoScout: Current Affairs';
            case 'anthropology': return 'Anthro Architect';
            case 'mindMap': return 'Mind Architect';
            default: return '';
        }
    }, [activeTool]);

    return (
        <div className={`mentor-app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
            <aside className="mentor-sidebar">
                <button className="new-chat-button" onClick={handleNewChat}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    New Chat
                </button>
                <nav className="chat-list" aria-label="History">
                    <div className="history-section">
                        <h3>Chats</h3>
                        <div className="history-items-container">
                        {chats.map(chat => {
                            const isEditing = editingChatId === chat.id;
                            return (
                                <div key={chat.id} className={`chat-list-item-wrapper ${chat.id === activeItemId ? 'active' : ''} ${isEditing ? 'editing' : ''}`}>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="rename-chat-input"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onBlur={() => handleRenameChat(chat.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameChat(chat.id);
                                                if (e.key === 'Escape') setEditingChatId(null);
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <button
                                            className="chat-list-item"
                                            onClick={() => handleSelectChat(chat.id)}
                                        >
                                            {chat.title}
                                        </button>
                                    )}
                                    {!isEditing && (
                                        <div className="chat-item-actions">
                                            <button 
                                                className="chat-action-button"
                                                onClick={(e) => handleStartRename(e, chat)}
                                                aria-label={`Rename chat: ${chat.title}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button 
                                                className="chat-action-button delete-button" 
                                                onClick={(e) => handleDeleteItem(e, chat.id, 'chat')}
                                                aria-label={`Delete chat: ${chat.title}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        </div>
                    </div>
                     <div className="history-section">
                        <h3>Mind Maps</h3>
                        <div className="history-items-container">
                        {mindMapHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectMindMap(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'mindMap')} aria-label={`Delete Mind Map: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="history-section">
                        <h3>Evaluations</h3>
                        <div className="history-items-container">
                        {evaluationHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectEvaluation(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                    <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'evaluation')} aria-label={`Delete evaluation: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                     <div className="history-section">
                        <h3>Quizzes</h3>
                        <div className="history-items-container">
                        {quizHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectQuiz(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'quiz')} aria-label={`Delete quiz: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                     <div className="history-section">
                        <h3>Interviews</h3>
                        <div className="history-items-container">
                        {interviewHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectInterview(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'interview')} aria-label={`Delete interview: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                     <div className="history-section">
                        <h3>PYQ Analyses</h3>
                        <div className="history-items-container">
                        {pyqHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectPyq(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'pyq')} aria-label={`Delete PYQ analysis: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="history-section">
                        <h3>Essay Outlines</h3>
                        <div className="history-items-container">
                        {essayHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectEssay(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'essay')} aria-label={`Delete Essay Outline: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                     <div className="history-section">
                        <h3>Notes Pro</h3>
                        <div className="history-items-container">
                        {notesProHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectNotesPro(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'notesPro')} aria-label={`Delete Notes: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="history-section">
                        <h3>Anthro Notes</h3>
                        <div className="history-items-container">
                        {anthropologyHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectAnthropology(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'anthropology')} aria-label={`Delete Anthro Analysis: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="history-section">
                        <h3>CA Analyses</h3>
                        <div className="history-items-container">
                        {chronoScoutHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectChronoScout(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'chronoScout')} aria-label={`Delete CA Analysis: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="history-section">
                        <h3>Mentor Sessions</h3>
                        <div className="history-items-container">
                        {mentorModesHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectMentorModes(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'mentorModes')} aria-label={`Delete Mentor Session: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="history-section">
                        <h3>Mentor Calls</h3>
                        <div className="history-items-container">
                        {mentorCallHistory.map(item => (
                            <div key={item.id} className={`chat-list-item-wrapper ${item.id === activeItemId ? 'active' : ''}`}>
                                <button className="chat-list-item" onClick={() => handleSelectMentorCall(item)}>
                                    {item.title}
                                </button>
                                <div className="chat-item-actions">
                                     <button className="chat-action-button delete-button" onClick={(e) => handleDeleteItem(e, item.id, 'mentorCall')} aria-label={`Delete Mentor Call: ${item.title}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </nav>
                 <div className="account-section">
                    <div className="current-user" aria-label={`Logged in as ${currentUser.username}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>{currentUser.username}</span>
                    </div>
                    <button onClick={onLogout} className="account-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Logout
                    </button>
                    <button onClick={handleDeleteAccount} className="account-button delete">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Delete Account
                    </button>
                </div>
            </aside>
            <section className="mentor-main">
                <div className="chat-messages-container">
                    {activeTool ? (
                        <div className="tool-view-container">
                            <div className="tool-header">
                                <button className="back-to-chat-button" onClick={() => { setActiveTool(null); setActiveItemId(chats[0]?.id || null); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                    Back to Chat
                                </button>
                                <h2>{toolTitle}</h2>
                            </div>
                            <div className="tool-content">
                                {activeTool === 'mains' && <MainsApp onEvaluationComplete={handleEvaluationComplete} initialData={viewingEvaluationData} />}
                                {activeTool === 'prelims' && <PrelimsApp onQuizComplete={handleQuizComplete} initialData={viewingQuizData} />}
                                {activeTool === 'interview' && <InterviewApp onInterviewComplete={handleInterviewComplete} initialData={viewingInterviewData} />}
                                {activeTool === 'pyq' && <PyqApp onAnalysisComplete={handlePyqAnalysisComplete} initialData={viewingPyqData} />}
                                {activeTool === 'essay' && <EssayApp onAnalysisComplete={handleEssayAnalysisComplete} initialData={viewingEssayData} />}
                                {activeTool === 'mentorCall' && <MentorCallApp onCallComplete={handleMentorCallComplete} initialData={viewingMentorCallData} />}
                                {activeTool === 'notesPro' && <NotesProApp onAnalysisComplete={handleNotesProComplete} initialData={viewingNotesProData} />}
                                {activeTool === 'mentorModes' && <MentorModesApp onSessionComplete={handleMentorModesComplete} initialData={viewingMentorModesData} />}
                                {activeTool === 'chronoScout' && <ChronoScoutApp onAnalysisComplete={handleChronoScoutComplete} initialData={viewingChronoScoutData} />}
                                {activeTool === 'anthropology' && <AnthropologyApp onAnalysisComplete={handleAnthropologyAnalysisComplete} initialData={viewingAnthropologyData} />}
                                {activeTool === 'mindMap' && <MindMapApp onSave={handleMindMapSave} initialData={viewingMindMapData} />}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="chat-header">
                                <h2>{activeChat?.title || 'Chat'}</h2>
                                {activeChat && (
                                <div className="chat-actions-container" ref={chatMenuRef}>
                                    <button 
                                        className="chat-header-action-button" 
                                        onClick={() => setIsChatMenuOpen(prev => !prev)}
                                        aria-label="Chat options"
                                        aria-haspopup="true"
                                        aria-expanded={isChatMenuOpen}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                    </button>
                                    {isChatMenuOpen && (
                                        <div className="chat-actions-popup">
                                            <button onClick={handleClearChat}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                <span>Clear Chat</span>
                                            </button>
                                            <button onClick={handleExportChat}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                <span>Export Chat</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>

                            <div className="chat-content" ref={chatContentRef}>
                            {activeChat && activeChat.history.length > 0 ? (
                                activeChat.history.map((msg, index) => {
                                    if (msg.role === 'model' && msg.content === '' && isLoading && index === activeChat.history.length - 1) {
                                        return (
                                            <div key="typing-indicator" className="chat-message-wrapper model-wrapper">
                                                <div className="avatar">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
                                                </div>
                                                <div className="chat-message model-message loading-dots"><span></span><span></span><span></span></div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={index} className={`chat-message-wrapper ${msg.role}-wrapper`}>
                                            <div className="avatar">
                                                {msg.role === 'model' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                )}
                                            </div>
                                            <div className={`chat-message ${msg.role}-message`}>
                                                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                                                <div className="message-meta">
                                                    <time dateTime={new Date(msg.timestamp).toISOString()} className="message-timestamp">
                                                        {formatTimestamp(msg.timestamp)}
                                                    </time>
                                                </div>
                                                <div className="message-actions-container">
                                                    <button
                                                        className="message-menu-toggle"
                                                        onClick={() => handleToggleMessageMenu(index)}
                                                        aria-label="Message options"
                                                        aria-haspopup="true"
                                                        aria-expanded={openMessageMenu === index}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    </button>
                                                    {openMessageMenu === index && (
                                                        <div className="message-actions-popup" ref={messageMenuRef}>
                                                            <button className="message-action-button" onClick={() => handleCopyMessage(msg.content, index)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                                <span>{copiedMessageIndex === index ? 'Copied!' : 'Copy'}</span>
                                                            </button>
                                                            <button
                                                                className="message-action-button delete"
                                                                onClick={() => {
                                                                    handleDeleteMessage(index);
                                                                    setOpenMessageMenu(null);
                                                                }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="welcome-screen">
                                    <div className="welcome-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
                                    </div>
                                    <h2>How can I help you today?</h2>
                                    <div className="example-prompts">
                                        <div className="prompt-card" onClick={() => handleExamplePromptClick("Create a 7-day study plan for Ancient History")}>
                                            <div className="prompt-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg></div>
                                            <div className="prompt-card-text">
                                                <h4>Create a study plan</h4>
                                                <p>for Ancient History</p>
                                            </div>
                                        </div>
                                        <div className="prompt-card" onClick={() => handleExamplePromptClick("Explain the concept of Judicial Review in India")}>
                                            <div className="prompt-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></div>
                                            <div className="prompt-card-text">
                                                <h4>Explain a concept</h4>
                                                <p>like Judicial Review</p>
                                            </div>
                                        </div>
                                        <div className="prompt-card" onClick={() => handleExamplePromptClick("Give me detailed notes on the Five Year Plans")}>
                                            <div className="prompt-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>
                                            <div className="prompt-card-text">
                                                <h4>Provide detailed notes</h4>
                                                <p>on the Five Year Plans</p>
                                            </div>
                                        </div>
                                        <div className="prompt-card" onClick={() => handleExamplePromptClick("Test my knowledge on the Revolt of 1857")}>
                                            <div className="prompt-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></div>
                                            <div className="prompt-card-text">
                                                <h4>Test my knowledge</h4>
                                                <p>on the Revolt of 1857</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>
                        </>
                    )}
                </div>
                {!activeTool && (
                    <div className="chat-input-container">
                        <div className="chat-input-area">
                            <div className="tool-buttons-wrapper">
                                <div className="tools-menu-container" ref={el => (toolsMenuContainerRef.current['practice'] = el)}>
                                    <button 
                                        className={`tool-group-button ${openToolsMenu === 'practice' ? 'active' : ''}`}
                                        onClick={() => setOpenToolsMenu(p => p === 'practice' ? null : 'practice')}
                                        title="Practice Zone"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                                        <span>Practice</span>
                                    </button>
                                     {openToolsMenu === 'practice' && (
                                        <div className="tools-popup" role="menu">
                                            <button role="menuitem" onClick={() => { setActiveTool('mains'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                Answer Evaluator
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('prelims'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                Prelims Quizzer
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('interview'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                                                Interview Pro
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="tools-menu-container" ref={el => (toolsMenuContainerRef.current['study'] = el)}>
                                    <button 
                                        className={`tool-group-button ${openToolsMenu === 'study' ? 'active' : ''}`}
                                        onClick={() => setOpenToolsMenu(p => p === 'study' ? null : 'study')}
                                        title="Study Tools"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                                        <span>Study</span>
                                    </button>
                                     {openToolsMenu === 'study' && (
                                        <div className="tools-popup" role="menu">
                                            <button role="menuitem" onClick={() => { setActiveTool('notesPro'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                Notes Pro
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('pyq'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                                                PYQ Analyzer
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('essay'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
                                                Essay Architect
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('mindMap'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5a1.5 1.5 0 0 1 3 0V12a1.5 1.5 0 0 1-3 0V11.5z"/><path d="M15 6.5a1.5 1.5 0 0 1 3 0V7a1.5 1.5 0 0 1-3 0V6.5z"/><path d="M15 17.5a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0V17.5z"/><path d="M6 12h5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H8.5"/><path d="M6 12h5a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2H8.5"/><path d="M13 14v.5a1.5 1.5 0 0 0 3 0V14"/><path d="M13 10v-.5a1.5 1.5 0 0 1 3 0V10"/></svg>
                                                Mind Architect
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('anthropology'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                                Anthro Architect
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('chronoScout'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                CA Analyst (ChronoScout)
                                            </button>
                                        </div>
                                    )}
                                </div>
                                 <div className="tools-menu-container" ref={el => (toolsMenuContainerRef.current['mentor'] = el)}>
                                    <button 
                                        className={`tool-group-button ${openToolsMenu === 'mentor' ? 'active' : ''}`}
                                        onClick={() => setOpenToolsMenu(p => p === 'mentor' ? null : 'mentor')}
                                        title="Mentor Sessions"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                        <span>Mentor</span>
                                    </button>
                                     {openToolsMenu === 'mentor' && (
                                        <div className="tools-popup" role="menu">
                                            <button role="menuitem" onClick={() => { setActiveTool('mentorModes'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                                Mentor Modes
                                            </button>
                                            <button role="menuitem" onClick={() => { setActiveTool('mentorCall'); setActiveItemId(null); setOpenToolsMenu(null); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                                                1:1 Mentor Call
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isMobile && handleSendMessage()}
                                placeholder="Ask your AI mentor..."
                                aria-label="Chat input"
                                disabled={isLoading || !activeChat}
                            />
                            <button onClick={() => handleSendMessage()} disabled={isLoading || !chatInput.trim() || !activeChat} aria-label="Send message">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

// === MAIN APP (AUTH ROUTER) ===
const App: React.FC = () => {
    const [theme, setTheme] = useState(themes[0]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
    
    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && themes.includes(savedTheme)) {
            setTheme(savedTheme);
            document.body.setAttribute('data-theme', savedTheme);
        } else {
            document.body.setAttribute('data-theme', themes[0]);
            localStorage.setItem('theme', themes[0]);
        }
    }, []);

    const toggleTheme = () => {
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        setTheme(newTheme);
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };
    
    const { title, subtitle } = { title: 'INVICTUS', subtitle: 'Your Personal AI Mentor for UPSC' };
    
    if (!currentUser) {
        return <AuthPage onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <>
            <header>
                <div className="header-content">
                    <h1>{title}</h1>
                    <p className="subtitle">{subtitle}</p>
                </div>
                <div className="header-actions">
                    <button onClick={toggleSidebar} className="sidebar-toggle" aria-label="Toggle chat history">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                </div>
            </header>
            <main className="mentor-active">
                <MentorApp 
                    isSidebarOpen={isSidebarOpen} 
                    closeSidebar={closeSidebar} 
                    currentUser={currentUser}
                    onLogout={handleLogout}
                />
            </main>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
