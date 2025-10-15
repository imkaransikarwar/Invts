import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { FLTApp } from './flt.tsx';

declare var marked: any;

export type QuizQuestion = {
    question: string;
    options: string[];
    correct_answer: string;
    explanation?: string;
    pyq_year?: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
};

export type QuizResult = {
    id: string;
    title: string;
    questions: QuizQuestion[];
    userAnswers: Array<string | null>;
    score: number;
    total: number;
};


type QuizState = 'config' | 'generating' | 'active' | 'finished';
type AppMode = 'quiz' | 'flt';

const formatQuizResultAsMarkdown = (result: QuizResult): string => {
    let content = `# Quiz Results: ${result.title}\n\n`;
    content += `**Final Score:** ${result.score} / ${result.total}\n\n---\n\n`;

    result.questions.forEach((q, i) => {
        const userAnswer = result.userAnswers[i];
        const isCorrect = userAnswer === q.correct_answer;

        let questionTitle = `## Question ${i + 1}`;
        if (q.pyq_year) {
            questionTitle += ` (PYQ ${q.pyq_year})`;
        }
        if (q.difficulty) {
            questionTitle += ` - Difficulty: ${q.difficulty}`;
        }
        content += `${questionTitle}\n\n`;

        content += `${q.question}\n\n`;
        content += `**Options:**\n`;
        q.options.forEach(opt => content += `- ${opt}\n`);
        content += `\n`;
        content += `**Your Answer:** ${userAnswer || 'Not Answered'}\n`;
        content += `**Correct Answer:** ${q.correct_answer}\n`;
        content += `**Result:** ${isCorrect ? 'Correct' : 'Incorrect'}\n\n`;
        if (q.explanation) {
            content += `**Explanation:**\n${q.explanation}\n\n`;
        }
        content += `---\n\n`;
    });

    return content;
};

const ProgressBar: React.FC<{ current: number; total: number; status: string }> = ({ current, total, status }) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    return (
        <div className="card progress-container" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Quiz Generation Progress">
            <p className="progress-status">{status}</p>
            <div className="progress-bar-track">
                <div 
                    className="progress-bar-fill" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const ScoreGauge: React.FC<{ score: number; maxScore: number; }> = ({ score, maxScore }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    
    let barColorClass = 'score-gauge-fill-good';
    if (percentage < 75) barColorClass = 'score-gauge-fill-medium';
    if (percentage < 40) barColorClass = 'score-gauge-fill-low';

    return (
        <div className="score-container">
            <div className="score-header">
                <p className="score-text">Final Score: <strong>{score} / {maxScore}</strong></p>
            </div>
            <div className="score-gauge" aria-label={`Score: ${score} out of ${maxScore}`}>
                <div 
                    className={`score-gauge-fill ${barColorClass}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};


export const PrelimsApp: React.FC<{
    onQuizComplete?: (result: QuizResult) => void;
    initialData?: QuizResult | null;
}> = ({ onQuizComplete, initialData }) => {
    const [appMode, setAppMode] = useState<AppMode>('quiz');
    const [quizState, setQuizState] = useState<QuizState>(initialData ? 'finished' : 'config');
    const [quizPrompt, setQuizPrompt] = useState('Include at least 2 PYQs.');
    const [numQuestions, setNumQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>('Medium');
    const [inputMode, setInputMode] = useState<'text' | 'manual' | 'both'>('text');
    
    const [manualSubject, setManualSubject] = useState('Indian Polity');
    const [manualTopic, setManualTopic] = useState('');
    const [manualSubTopic, setManualSubTopic] = useState('');
    const [manualMicroTopic, setManualMicroTopic] = useState('');

    const [questions, setQuestions] = useState<QuizQuestion[]>(initialData?.questions || []);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Array<string | null>>(initialData?.userAnswers || []);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 10, status: '' });
    const [isExplanationVisible, setIsExplanationVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI. Please check your API key setup.");
        }
        
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        }
    }, []);
    
    useEffect(() => {
        if (initialData) {
            setQuestions(initialData.questions);
            setUserAnswers(initialData.userAnswers);
            setQuizState('finished');
            setAppMode('quiz');
        }
    }, [initialData]);

    const handleGenerateQuiz = async () => {
        if (!aiRef.current) {
            setError('AI service is not initialized.');
            return;
        }

        let finalQuizRequest = '';

        if (inputMode === 'text') {
            if (!quizPrompt.trim()) {
                setError('Please enter a description for the quiz.');
                return;
            }
            finalQuizRequest = `Generate a ${numQuestions}-question quiz. ${quizPrompt}`;
        } else {
            const manualParts = [
                manualSubject && `Subject: ${manualSubject}`,
                manualTopic && `Topic: ${manualTopic}`,
                manualSubTopic && `Sub-Topic: ${manualSubTopic}`,
                manualMicroTopic && `Micro-Topic: ${manualMicroTopic}`,
            ].filter(Boolean).join(', ');

            if (!manualParts) {
                setError('Please specify at least a subject for the quiz.');
                return;
            }

            if (inputMode === 'manual') {
                finalQuizRequest = `Generate a ${numQuestions}-question quiz on ${manualParts}.`;
            } else { // 'both'
                finalQuizRequest = `Generate a ${numQuestions}-question quiz. Additional instructions: "${quizPrompt}". The quiz must strictly cover the following: ${manualParts}.`;
            }
        }

        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        setQuizState('generating');
        setError(null);
        
        const totalQuestions = numQuestions;
        setProgress({ current: 0, total: totalQuestions, status: 'Preparing to generate quiz...' });

        // Simulate progress
        progressIntervalRef.current = window.setInterval(() => {
            setProgress(prev => {
                if (prev.current >= totalQuestions) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return { ...prev, status: 'Finalizing quiz...' };
                }
                const newCurrent = prev.current + 1;
                return { 
                    ...prev, 
                    current: newCurrent, 
                    status: `Generating question ${newCurrent} of ${totalQuestions}...` 
                };
            });
        }, 1200);

        let difficultyInstruction = `**Difficulty Level:** "${difficulty}"`;
        if (difficulty === 'Mixed') {
            difficultyInstruction = `**Difficulty Level:** "A mix of Easy, Medium, and Hard questions."`;
        }

        const prompt = `
            You are a subject matter expert and quiz creator for the UPSC Civil Services Preliminary Examination. Your primary task is to generate a high-quality, multiple-choice quiz that is STRICTLY focused on the user's requested topic.

            **User Request:** "${finalQuizRequest}"
            ${difficultyInstruction}

            **CRITICAL INSTRUCTIONS:**
            1.  **TOPIC ADHERENCE IS PARAMOUNT:** You MUST generate questions ONLY from the subject and topic specified in the "User Request". Do not include questions from other topics, even if they are related. For example, if the user asks for "Fundamental Rights", do not include questions about "Directive Principles of State Policy".
            2.  **Difficulty & Standard:** Generate questions that match the specified difficulty level and reflect the challenging, analytical nature of the UPSC Prelims exam.
            3.  **Use Google Search:** You **must** use Google Search for up-to-date information, especially for dynamic topics like Current Affairs, Economy, and Science & Tech.
            4.  **PYQ Identification:** If the user requests Previous Year Questions (PYQs), you must identify them accurately. Provide the year in the "pyq_year" field. If it's not a PYQ, this field should be omitted or null.
            5.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON array of objects and nothing else. Do not include any text, comments, or markdown formatting (like \`\`\`json\`). The raw response body must be parsable as JSON.
            
            **JSON Structure for each object:**
            - \`question\`: (string) The full text of the question.
            - \`options\`: (string array) An array of exactly 4 possible answer strings.
            - \`correct_answer\`: (string) The correct answer, which must exactly match one of the strings in the 'options' array.
            - \`explanation\`: (string) A detailed explanation for why the correct answer is right and the others are wrong.
            - \`pyq_year\`: (number, optional) If the question is a verbatim or slightly modified Previous Year Question (PYQ), provide the year (e.g., 2021). If it is not a PYQ, this field MUST be omitted or null.
            - \`difficulty\`: (string) The assessed difficulty of the generated question. Must be one of 'Easy', 'Medium', or 'Hard'.
        `;

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress({ current: totalQuestions, total: totalQuestions, status: 'Quiz generated!' });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            let responseText = response.text.trim();
            // Handle cases where the AI might wrap the JSON in markdown
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```|(\[[\s\S]*\])/);
            if (jsonMatch) {
                responseText = jsonMatch[1] || jsonMatch[2];
            }
            
            const quizData = JSON.parse(responseText);
            
            setQuestions(quizData);
            setUserAnswers(new Array(quizData.length).fill(null));
            setCurrentQuestionIndex(0);
            setQuizState('active');
        } catch (err) {
            console.error("Quiz generation failed:", err);
            setError("Sorry, an error occurred while generating the quiz. The AI response may have been invalid or in an unexpected format. Please try a different topic or try again later.");
            setQuizState('config');
        } finally {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }
    };

    const handleFinishQuiz = () => {
        if (!initialData && onQuizComplete) {
            const score = userAnswers.filter((ans, i) => ans === questions[i].correct_answer).length;
             let title = 'Quiz';
             if (inputMode !== 'text' && manualSubject) {
                 title = `${manualSubject} Quiz`;
             } else if (inputMode !== 'manual' && quizPrompt) {
                 title = quizPrompt.substring(0, 30) + (quizPrompt.length > 30 ? '...' : '');
             }
             
             onQuizComplete({
                id: `quiz-${Date.now()}`,
                title: title,
                questions: questions,
                userAnswers: userAnswers,
                score: score,
                total: questions.length
             });
        }
        setQuizState('finished');
    };
    
    const handleAnswerSelect = (option: string) => {
        if (userAnswers[currentQuestionIndex] !== null) return; // Prevent changing answer
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = option;
        setUserAnswers(newAnswers);
    };

    const handleReset = () => {
        setAppMode('quiz');
        setQuizState('config');
        setQuestions([]);
        setUserAnswers([]);
        setCurrentQuestionIndex(0);
        setError(null);
    };

    const handleFltComplete = (result: QuizResult) => {
        if (onQuizComplete) {
            onQuizComplete(result);
        }
        setAppMode('quiz');
    };
    
    const handleExport = () => {
        setIsDownloading(true);
        const score = userAnswers.filter((ans, i) => ans === questions[i].correct_answer).length;
        const resultToExport: QuizResult = {
            id: initialData?.id || `quiz-${Date.now()}`,
            title: initialData?.title || 'Quiz',
            questions: questions,
            userAnswers: userAnswers,
            score: score,
            total: questions.length
        };
        const markdownContent = formatQuizResultAsMarkdown(resultToExport);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${resultToExport.title.replace(/\s+/g, '_')}_Results.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };


    const renderQuizContent = () => {
        switch (quizState) {
            case 'config':
                return (
                    <>
                    <div className="card quiz-config-container">
                        <h2>Generate a Prelims Quiz</h2>
                        <p className="subtitle">Use a text prompt, manual topic selection, or both to create your perfect quiz.</p>
                        <div className="quiz-config-form">
                             <div className="manual-inputs-container">
                                <div className="form-group">
                                    <label htmlFor="numQuestions">Number of Questions</label>
                                    <select id="numQuestions" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={15}>15</option>
                                        <option value={20}>20</option>
                                        <option value={30}>30</option>
                                        <option value={40}>40</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="difficulty">Difficulty Level</label>
                                    <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard' | 'Mixed')}>
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                        <option value="Mixed">Mixed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Input Method</label>
                                <div className="input-mode-selector">
                                    <button className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}>Text Prompt</button>
                                    <button className={inputMode === 'manual' ? 'active' : ''} onClick={() => setInputMode('manual')}>Manual Topic</button>
                                    <button className={inputMode === 'both' ? 'active' : ''} onClick={() => setInputMode('both')}>Both</button>
                                </div>
                            </div>
                            
                            {inputMode !== 'text' && (
                                <div className="manual-inputs-container">
                                    <div className="form-group">
                                        <label htmlFor="manualSubject">Subject</label>
                                        <input type="text" id="manualSubject" value={manualSubject} onChange={e => setManualSubject(e.target.value)} placeholder="e.g., Indian Polity"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="manualTopic">Topic</label>
                                        <input type="text" id="manualTopic" value={manualTopic} onChange={e => setManualTopic(e.target.value)} placeholder="e.g., Parliament"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="manualSubTopic">Sub-Topic</label>
                                        <input type="text" id="manualSubTopic" value={manualSubTopic} onChange={e => setManualSubTopic(e.target.value)} placeholder="e.g., Rajya Sabha"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="manualMicroTopic">Micro-Topic</label>
                                        <input type="text" id="manualMicroTopic" value={manualMicroTopic} onChange={e => setManualMicroTopic(e.target.value)} placeholder="e.g., Powers of the Chairman"/>
                                    </div>
                                </div>
                            )}

                            {inputMode !== 'manual' && (
                                <div className="form-group">
                                    <label htmlFor="quizPrompt">
                                        {inputMode === 'text' ? 'Quiz Description' : 'Additional Instructions'}
                                    </label>
                                    <textarea
                                        id="quizPrompt"
                                        rows={3}
                                        value={quizPrompt}
                                        onChange={(e) => setQuizPrompt(e.target.value)}
                                        placeholder={
                                            inputMode === 'text' 
                                            ? "e.g., A quiz on modern Indian history from 1857 to 1947."
                                            : "e.g., Focus on statement-based questions."
                                        }
                                    />
                                </div>
                            )}

                            <button className="action-button primary" onClick={handleGenerateQuiz}>Generate with AI</button>
                        </div>
                    </div>
                    <div className="card flt-promo-card">
                         <h3>Full-Length Test Simulator</h3>
                         <p>Experience a real-time UPSC Prelims simulation with 100 questions and a 2-hour timer.</p>
                         <button className="action-button secondary" onClick={() => setAppMode('flt')}>Start GS Paper I Test</button>
                    </div>
                    </>
                );
            case 'generating':
                return <ProgressBar current={progress.current} total={progress.total} status={progress.status} />;
            case 'active':
                const currentQuestion = questions[currentQuestionIndex];
                const userAnswer = userAnswers[currentQuestionIndex];
                return (
                    <div className="card quiz-question-container">
                        <div className="question-header">
                            <span className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</span>
                             <div className="question-tags">
                                {currentQuestion.difficulty && <span className={`difficulty-badge difficulty-${currentQuestion.difficulty.toLowerCase()}`}>{currentQuestion.difficulty}</span>}
                                {currentQuestion.pyq_year && <span className="pyq-badge">PYQ {currentQuestion.pyq_year}</span>}
                            </div>
                        </div>
                        <div className="question-text markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(currentQuestion.question) }}></div>
                        <div className="options-grid">
                            {currentQuestion.options.map((opt, i) => {
                                let cardClass = 'option-card';
                                if (userAnswer) {
                                    if (opt === currentQuestion.correct_answer) cardClass += ' correct';
                                    else if (opt === userAnswer) cardClass += ' incorrect';
                                } else if (userAnswer === opt) {
                                    // This case is unlikely if userAnswer is not null, but keeping for logical consistency
                                    cardClass += ' selected';
                                }
                                 if (userAnswer && opt === userAnswer) {
                                    cardClass += ' selected';
                                }
                                return (
                                    <button key={i} className={cardClass} onClick={() => handleAnswerSelect(opt)} disabled={!!userAnswer}>
                                        <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                                        <span className="option-text">{opt}</span>
                                         {userAnswer && (
                                            <span className="option-icon">
                                                {opt === currentQuestion.correct_answer && <span className="correct-icon">✓</span>}
                                                {opt !== currentQuestion.correct_answer && opt === userAnswer && <span className="incorrect-icon">✗</span>}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {userAnswer && currentQuestion.explanation && (
                            <div className="explanation-container">
                                <button
                                    className="action-button secondary"
                                    onClick={() => setIsExplanationVisible(p => !p)}
                                    aria-expanded={isExplanationVisible}
                                >
                                    {isExplanationVisible ? 'Hide Explanation' : 'Show Explanation'}
                                </button>
                                {isExplanationVisible && (
                                    <div className="explanation-box">
                                        <h3>Explanation</h3>
                                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(currentQuestion.explanation) }}></div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="quiz-nav">
                             <button className="action-button secondary" onClick={() => { setCurrentQuestionIndex(p => p - 1); setIsExplanationVisible(false); }} disabled={currentQuestionIndex === 0}>Previous</button>
                            {currentQuestionIndex < questions.length - 1 ? (
                                userAnswer ? (
                                    <button 
                                        className="action-button primary" 
                                        onClick={() => { setCurrentQuestionIndex(p => p + 1); setIsExplanationVisible(false); }}
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button 
                                        className="action-button secondary" 
                                        onClick={() => { setCurrentQuestionIndex(p => p + 1); setIsExplanationVisible(false); }}
                                    >
                                        Skip
                                    </button>
                                )
                            ) : (
                                userAnswer ? (
                                     <button 
                                        className="action-button primary" 
                                        onClick={handleFinishQuiz}
                                    >
                                        Finish Quiz
                                    </button>
                                ) : (
                                    <button 
                                        className="action-button secondary" 
                                        onClick={handleFinishQuiz}
                                    >
                                        Skip & Finish
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                );
            case 'finished':
                const score = userAnswers.filter((ans, i) => ans === questions[i].correct_answer).length;

                return (
                    <div className="card quiz-results-container">
                        <div className="results-summary">
                            <h2>{initialData?.title || 'Quiz Complete!'}</h2>
                            <ScoreGauge score={score} maxScore={questions.length} />
                        </div>

                        <div className="accordion" style={{textAlign: 'left', marginTop: '2rem'}}>
                            {questions.map((q, i) => {
                                const isCorrect = userAnswers[i] === q.correct_answer;
                                return (
                                    <div className="accordion-item" key={i}>
                                        <div className="accordion-header">
                                            <span className={`review-question-header ${isCorrect ? 'correct' : 'incorrect'}`}>
                                                {`Q${i+1}: ${isCorrect ? 'Correct' : 'Incorrect'}`}
                                            </span>
                                             <div className="question-tags">
                                                {q.difficulty && <span className={`difficulty-badge difficulty-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>}
                                                {q.pyq_year && <span className="pyq-badge">PYQ {q.pyq_year}</span>}
                                            </div>
                                        </div>
                                        <div className="accordion-content" style={{padding: '1.5rem'}}>
                                            <div className="question-text markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(q.question)}}></div>
                                            <p><strong>Your Answer:</strong> {userAnswers[i] || 'Not Answered'}</p>
                                            <p><strong>Correct Answer:</strong> {q.correct_answer}</p>
                                            {q.explanation && (
                                                <div className="explanation-box" style={{marginTop: '1rem'}}>
                                                    <h3>Explanation</h3>
                                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(q.explanation) }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="results-actions">
                             <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                                {isDownloading ? 'Exporting...' : 'Export Results'}
                            </button>
                            <button className="action-button primary" onClick={handleReset}>Take New Quiz</button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="quiz-container">
            {error && appMode === 'quiz' && <div className="card error" role="alert">{error}</div>}
            {appMode === 'quiz' ? renderQuizContent() : <FLTApp onTestComplete={handleFltComplete} />}
        </div>
    );
};