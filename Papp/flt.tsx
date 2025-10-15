import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { QuizQuestion, QuizResult } from './Index.tsx';

declare var marked: any;

const TEST_DURATION_SECONDS = 2 * 60 * 60; // 2 hours
const NUM_QUESTIONS = 100;

type TestState = 'instructions' | 'config' | 'generating' | 'active' | 'finished';
type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-review' | 'answered-review';

type FLTAppProps = {
    onTestComplete: (result: QuizResult) => void;
};

const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const initialSubjectDistribution = [
    { name: 'History of India and Indian National Movement', count: 15 },
    { name: 'Indian and World Geography', count: 15 },
    { name: 'Indian Polity and Governance', count: 15 },
    { name: 'Economic and Social Development', count: 15 },
    { name: 'Environmental Ecology, Bio-diversity and Climate Change', count: 15 },
    { name: 'General Science & Technology', count: 15 },
    { name: 'Current events of national and international importance', count: 10 },
];

export const FLTApp: React.FC<FLTAppProps> = ({ onTestComplete }) => {
    const [testState, setTestState] = useState<TestState>('instructions');
    const [distribution, setDistribution] = useState(initialSubjectDistribution);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<Array<string | null>>([]);
    const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generationStatus, setGenerationStatus] = useState('Initiating test generation...');

    const aiRef = useRef<GoogleGenAI | null>(null);
    const timerRef = useRef<number | null>(null);

    const totalQuestions = useMemo(() => {
        return distribution.reduce((sum, subject) => sum + (subject.count || 0), 0);
    }, [distribution]);

    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI. Please check your API key setup.");
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (testState === 'active') {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [testState]);

    const handleStartGeneration = async () => {
        if (!aiRef.current || totalQuestions !== NUM_QUESTIONS) return;
        setTestState('generating');
        setError(null);
        setGenerationStatus('Initializing test environment...');

        const allGeneratedQuestions: QuizQuestion[] = [];
        const subjectsToGenerate = distribution.filter(s => s.count > 0);

        try {
            for (const subject of subjectsToGenerate) {
                setGenerationStatus(`Generating ${subject.count} questions for ${subject.name}...`);

                const prompt = `
                    You are an expert question creator for the UPSC Civil Services Preliminary Examination (GS Paper I).
                    Your task is to generate ${subject.count} high-quality multiple-choice questions on the specific subject: "${subject.name}".

                    **CRITICAL INSTRUCTIONS:**
                    1.  **Question Count:** You MUST generate exactly ${subject.count} questions.
                    2.  **Subject Focus:** All questions MUST be strictly related to "${subject.name}".
                    3.  **Question Standard:** All questions must match the high analytical and conceptual standard of the actual UPSC Prelims exam. Include a mix of question types: statement-based (e.g., "Consider the following statements..."), match-the-following, and direct conceptual questions.
                    4.  **Difficulty:** The overall difficulty of these questions should be 'Medium to Hard'.
                    5.  **Use Google Search:** You MUST use Google Search to ensure factual accuracy and to source relevant information, especially for current affairs, economic data, and scientific developments.
                    6.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON array containing exactly ${subject.count} objects. Do not include any text, comments, or markdown formatting (like \`\`\`json\`). The raw response body must be parsable as JSON.

                    **JSON Structure for each object:**
                    - \`question\`: (string) The full text of the question.
                    - \`options\`: (string array) An array of exactly 4 possible answer strings.
                    - \`correct_answer\`: (string) The correct answer, which must exactly match one of the strings in the 'options' array.
                    - \`explanation\`: (string) A detailed explanation for why the correct answer is right and the others are wrong. This is mandatory.
                    - \`is_pyq\`: (boolean) Set to \`false\`. This is a mock test.
                `;

                const response = await aiRef.current.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { tools: [{ googleSearch: {} }] }
                });

                let responseText = response.text.trim();
                const jsonMatch = responseText.match(/(\[[\s\S]*\])/);
                if (!jsonMatch) throw new Error(`Could not find a valid JSON array in the response for ${subject.name}.`);
                
                const subjectQuestions = JSON.parse(jsonMatch[0]);
                allGeneratedQuestions.push(...subjectQuestions);
            }

            setGenerationStatus('Finalizing your test paper...');

            if (allGeneratedQuestions.length > NUM_QUESTIONS) {
                console.warn(`AI generated ${allGeneratedQuestions.length} questions in total. Truncating to ${NUM_QUESTIONS}.`);
                setQuestions(allGeneratedQuestions.slice(0, NUM_QUESTIONS));
            } else {
                setQuestions(allGeneratedQuestions);
            }
            
            setUserAnswers(new Array(NUM_QUESTIONS).fill(null));
            setTestState('active');

        } catch (err) {
            console.error(err);
            setError("Failed to generate the test. The AI may be experiencing high load or the response was invalid. Please try again in a few moments.");
            setTestState('config'); // Go back to config on error
        }
    };

    const handleAnswerSelect = (option: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = option;
        setUserAnswers(newAnswers);
    };

    const handleClearResponse = () => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = null;
        setUserAnswers(newAnswers);
    }
    
    const handleNavigation = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < questions.length) {
            setCurrentQuestionIndex(newIndex);
            setIsPaletteOpen(false);
        }
    }
    
    const handleMarkForReview = () => {
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentQuestionIndex)) {
            newMarked.delete(currentQuestionIndex);
        } else {
            newMarked.add(currentQuestionIndex);
        }
        setMarkedForReview(newMarked);
    }

    const handleSubmit = () => {
        if (testState !== 'active') return;
        
        if (!window.confirm("Are you sure you want to submit the test?")) {
            return;
        }

        const score = userAnswers.filter((ans, i) => ans === questions[i].correct_answer).length;
        onTestComplete({
            id: `flt-${Date.now()}`,
            title: `Full Length Test (GS Paper I)`,
            questions,
            userAnswers,
            score,
            total: questions.length
        });
        setTestState('finished');
    }
    
    const getQuestionStatus = (index: number): QuestionStatus => {
        const isAnswered = userAnswers[index] !== null;
        const isMarked = markedForReview.has(index);

        if(isAnswered && isMarked) return 'answered-review';
        if(isAnswered) return 'answered';
        if(isMarked) return 'marked-review';
        return 'not-answered';
    }

    const handleCountChange = (index: number, value: string) => {
        const newCount = parseInt(value, 10);
        if (isNaN(newCount) && value !== '') return;

        const newDistribution = [...distribution];
        newDistribution[index] = { ...newDistribution[index], count: isNaN(newCount) ? 0 : newCount };
        setDistribution(newDistribution);
    };
    
    const currentQuestion = questions[currentQuestionIndex];
    
    if (testState === 'instructions') {
        return (
            <div className="card flt-instructions">
                <h2>Full-Length Test: General Studies Paper I</h2>
                {error && <p className="error" style={{textAlign: 'center'}}>{error}</p>}
                <ul>
                    <li><strong>Number of Questions:</strong> {NUM_QUESTIONS}</li>
                    <li><strong>Time Limit:</strong> 2 Hours</li>
                    <li><strong>Marking:</strong> For this simulation, each correct answer is worth 1 point. There is no negative marking.</li>
                </ul>
                <p>This is a simulation to help you practice time management and accuracy under exam conditions. You can customize the subject distribution on the next screen.</p>
                <button className="action-button primary large" onClick={() => setTestState('config')}>Customize & Start Test</button>
            </div>
        );
    }

    if (testState === 'config') {
        const isTotalValid = totalQuestions === NUM_QUESTIONS;
        return (
            <div className="card flt-config-container">
                <h2>Configure Your Test</h2>
                <p>Adjust the number of questions per subject. The total must be exactly {NUM_QUESTIONS}.</p>
                <div className="flt-subject-list">
                    {distribution.map((subject, index) => (
                        <div key={index} className="flt-subject-item">
                            <label htmlFor={`subject-count-${index}`}>{subject.name}</label>
                            <input
                                type="number"
                                id={`subject-count-${index}`}
                                value={subject.count}
                                onChange={(e) => handleCountChange(index, e.target.value)}
                                min="0"
                            />
                        </div>
                    ))}
                </div>
                <div className="flt-config-footer">
                    <div className={`flt-total-counter ${isTotalValid ? '' : 'invalid'}`}>
                        Total Questions: {totalQuestions} / {NUM_QUESTIONS}
                    </div>
                    <div className="flt-config-actions">
                        <button className="action-button secondary" onClick={() => setTestState('instructions')}>Back</button>
                        <button className="action-button primary" onClick={handleStartGeneration} disabled={!isTotalValid}>
                            Generate Test
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (testState === 'generating') {
        return (
            <div className="card" style={{textAlign: 'center'}}>
                <h2>Generating Your Test...</h2>
                <p>{generationStatus}</p>
                <div className="loading-indicator" style={{margin: '2rem auto'}}><div></div><div></div><div></div></div>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>This may take up to a minute, please be patient.</p>
            </div>
        )
    }

    if (testState === 'active') {
        return (
            <div className="flt-container">
                <div className="flt-header">
                     <button className="action-button secondary" onClick={() => setIsPaletteOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v2"/><path d="M11 21H3"/><path d="M7 21v-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v8"/><path d="M21.5 16.5a2.5 2.5 0 0 0-3.3-3.3l-1.4 1.4a.5.5 0 0 0 0 .7l.7.7a.5.5 0 0 0 .7 0l1.4-1.4a2.5 2.5 0 0 0 1.9 1.9z"/></svg>
                        Question Palette
                    </button>
                    <div className={`flt-timer ${timeLeft < 300 ? 'low-time' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {isPaletteOpen && (
                    <div className="question-palette-overlay" onClick={() => setIsPaletteOpen(false)}>
                        <div className="question-palette-container" onClick={e => e.stopPropagation()}>
                           <h3>Question Palette</h3>
                           <div className="palette-legend">
                               <div><span className="legend-box answered"></span> Answered</div>
                               <div><span className="legend-box not-answered"></span> Not Answered</div>
                               <div><span className="legend-box marked-review"></span> Marked for Review</div>
                               <div><span className="legend-box answered-review"></span> Answered & Marked</div>
                           </div>
                           <div className="question-palette-grid">
                               {questions.map((_, i) => (
                                   <button 
                                     key={i} 
                                     className={`palette-btn ${getQuestionStatus(i)} ${i === currentQuestionIndex ? 'current' : ''}`}
                                     onClick={() => handleNavigation(i)}
                                    >
                                       {i + 1}
                                   </button>
                               ))}
                           </div>
                        </div>
                    </div>
                )}

                <div className="flt-question-area">
                    <h4>Question {currentQuestionIndex + 1} of {questions.length}</h4>
                    <div className="question-text markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(currentQuestion.question) }}></div>
                    <div className="options-grid flt-options">
                        {currentQuestion.options.map((opt, i) => (
                            <button 
                                key={i} 
                                className={`option-card ${userAnswers[currentQuestionIndex] === opt ? 'selected' : ''}`} 
                                onClick={() => handleAnswerSelect(opt)}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flt-nav-container">
                    <div className="flt-nav-group left">
                         <button className="action-button secondary" onClick={handleMarkForReview}>
                            {markedForReview.has(currentQuestionIndex) ? 'Unmark Review' : 'Mark for Review'}
                        </button>
                        <button className="action-button secondary" onClick={handleClearResponse} disabled={userAnswers[currentQuestionIndex] === null}>
                            Clear Response
                        </button>
                    </div>
                     <div className="flt-nav-group center">
                        <button className="action-button secondary" onClick={() => handleNavigation(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>
                            Previous
                        </button>
                        <button className="action-button primary" onClick={() => handleNavigation(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length - 1}>
                            Save & Next
                        </button>
                    </div>
                    <div className="flt-nav-group right">
                        <button className="action-button primary" onClick={handleSubmit}>
                            Submit Test
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return null; // Finished state is handled by parent component
};