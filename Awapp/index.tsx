import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Chat } from "@google/genai";

// These are loaded from CDNs in index.html
declare var marked: any;

type PointFeedback = {
    point: string;
    marks: number;
};

type SectionBreakdown = {
    section_name: string;
    user_answer_text: string;
    marks_awarded: number;
    strengths: PointFeedback[];
    weaknesses: PointFeedback[];
    suggestions: string[];
    value_addition?: string[];
    deep_dive_analysis?: string;
};

export type EvaluationResult = {
    question: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    detailed_analysis: string;
    score: number;
    max_score: number;
    word_count: number;
    section_breakdown: SectionBreakdown[];
};

type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

const ScoreGauge: React.FC<{ score: number; maxScore: number; wordCount: number }> = ({ score, maxScore, wordCount }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    
    let barColorClass = 'score-gauge-fill-good';
    if (percentage < 75) barColorClass = 'score-gauge-fill-medium';
    if (percentage < 40) barColorClass = 'score-gauge-fill-low';

    return (
        <div className="score-container">
            <div className="score-header">
                <p className="score-text">Marks Scored: <strong>{score} / {maxScore}</strong></p>
                <p className="word-count-text">Word Count: {wordCount}</p>
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

const FeedbackBox: React.FC<{ title: string; items: string[]; type: 'strengths' | 'weaknesses' | 'suggestions' }> = ({ title, items, type }) => {
    const icons = {
        strengths: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        ),
        weaknesses: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        ),
        suggestions: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
        ),
    };

    if (!items || items.length === 0) return null;

    return (
        <div className={`feedback-box ${type}-box`}>
            <h3>{icons[type]} {title}</h3>
            <ul>
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
    );
};

const ExportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onDownloadMarkdown: () => void;
    isDownloading: boolean;
}> = ({ isOpen, onClose, onDownloadMarkdown, isDownloading }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="modal-content download-modal-content" onClick={e => e.stopPropagation()}>
                <h2>Export Evaluation</h2>
                <p className="modal-subtitle">Choose a format to download your report.</p>
                <div className="modal-actions">
                    <button onClick={onDownloadMarkdown} className="modal-button primary" disabled={isDownloading}>
                         {isDownloading ? 'Exporting...' : 'Download as Markdown (.md)'}
                    </button>
                </div>
                 <div className="modal-actions">
                     <button onClick={onClose} className="modal-button secondary">Cancel</button>
                </div>
            </div>
        </div>
    );
};


type ContentPart = { type: 'text'; content: string } | { type: 'diagram'; prompt: string };

const useModelAnswerGenerator = (ai: GoogleGenAI | null, question: string) => {
    const [modelAnswerContent, setModelAnswerContent] = useState<ContentPart[] | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    const modelAnswer = useMemo(() => {
        if (!modelAnswerContent) return null;
        return modelAnswerContent.map(part => {
            if (part.type === 'text') return part.content;
            return `\n${part.prompt}\n`;
        }).join('');
    }, [modelAnswerContent]);

    const generateModelAnswer = async () => {
        if (!ai) return;
        setIsGenerating(true);
        setModelAnswerContent(null);
        setGenerationError(null);
        try {
            const prompt = `
                You are an expert content creator for UPSC Mains preparation. Your task is to generate a high-quality, comprehensive model answer for the following question.

                **Question:** "${question}"

                **Instructions:**
                1.  **Analyze the Question's Directive:** First, identify the core directive of the question (e.g., 'critically analyze', 'discuss', 'explain', 'evaluate'). Your entire answer's structure and tone must be tailored to this directive. You MUST explicitly state your approach in the introduction based on this directive and summarize how you've addressed it in the conclusion.
                2.  **Word Count:** The answer must be between 500 and 600 words.
                3.  **Structure:** Follow a clear and logical structure:
                    *   **Introduction:** Briefly introduce the topic and state the core argument or scope of the answer, explicitly addressing the question's directive as mentioned above.
                    *   **Body:** This should be the main part of the answer. Critically analyze the question from multiple dimensions (e.g., social, political, economic, ethical, technological, environmental). Use headings and subheadings in Markdown to organize the different dimensions.
                    *   **Conclusion:** Summarize the key points and provide a forward-looking or balanced concluding statement that directly ties back to the question's core directive.
                4.  **Value Addition (Crucial):**
                    *   You **must** use Google Search to find and incorporate the latest information, including:
                        *   Relevant statistics and data from credible sources (e.g., government reports, international organizations).
                        *   Recent case studies or examples.
                        *   Names of relevant committees, reports, or legal judgments.
                        *   Contemporary analysis and viewpoints.
                5.  **Incorporate Visuals (Diagrams/Flowcharts):**
                    *   Where a diagram or flowchart would be beneficial, you **must** insert a simple, clear textual placeholder in the format: \`[A diagram/flowchart illustrating <concept> can be drawn here.]\`. Do not use any special markdown headings for this.
                6.  **Highlight Key Information:** Identify the most crucial facts, statistics, keywords, or takeaways that a student should memorize. Wrap these specific phrases or sentences in \`++\` symbols. Each highlighted section MUST be on its own line and not be part of another sentence or list item. For example: \`++The Gini coefficient was reported as 0.65 in the latest UN report.++\`. Use this for standout information, not as a replacement for bolding. Your goal is for the final highlighted text to appear semi-bold.
                7.  **Formatting:** Use Markdown for clear formatting (headings, bold text, bullet points).
                8.  **Goal:** The final output should be a model answer that a candidate can study to understand how to build a multi-dimensional, well-supported, and high-scoring answer that includes visual aids. It should be concise but information-dense.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            
            let answerText = response.text;
            const newContent: ContentPart[] = [];
            
            const parts = answerText.split(/(\[A\s(?:diagram|flowchart)[\s\S]*?\])/g);

            for (const part of parts) {
                if (part.startsWith('[A diagram') || part.startsWith('[A flowchart')) {
                    newContent.push({ type: 'diagram', prompt: part });
                } else if (part.trim()) {
                    newContent.push({ type: 'text', content: part });
                }
            }

            if (newContent.length === 0) {
                 newContent.push({ type: 'text', content: answerText });
            }
            setModelAnswerContent(newContent);

        } catch (err) {
            console.error("Error generating model answer:", err);
            setGenerationError("Sorry, an error occurred while generating the model answer. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return { modelAnswer, modelAnswerContent, isGenerating, generationError, generateModelAnswer };
};

const ComparisonView: React.FC<{ userAnswer: string, modelAnswer: string }> = ({ userAnswer, modelAnswer }) => {
    return (
        <div className="comparison-container">
            <div className="comparison-panel">
                <h3>Your Answer</h3>
                <div
                    className="comparison-content markdown-content"
                    dangerouslySetInnerHTML={{ __html: marked.parse(userAnswer || ' ') }}
                />
            </div>
            <div className="comparison-panel">
                <h3>Model Answer</h3>
                 <div
                    className="comparison-content markdown-content"
                    dangerouslySetInnerHTML={{ __html: marked.parse(modelAnswer || ' ') }}
                />
            </div>
        </div>
    );
};

const formatResultAsMarkdown = (result: EvaluationResult, modelAnswer: string | null): string => {
    let content = `# Evaluation Report for: ${result.question}\n\n`;

    content += `## Overall Score\n`;
    content += `- **Marks Scored:** ${result.score} / ${result.max_score}\n`;
    content += `- **Word Count:** ${result.word_count}\n\n`;

    content += `## Overall Strengths\n`;
    result.strengths.forEach(item => content += `- ${item}\n`);
    content += "\n";

    content += `## Overall Weaknesses\n`;
    result.weaknesses.forEach(item => content += `- ${item}\n`);
    content += "\n";

    content += `## Overall Suggestions\n`;
    result.suggestions.forEach(item => content += `- ${item}\n`);
    content += "\n";

    content += `## Detailed Analysis\n${result.detailed_analysis}\n\n`;

    if (result.section_breakdown && result.section_breakdown.length > 0) {
        content += `## Section-by-Section Breakdown\n`;
        result.section_breakdown.forEach(section => {
            content += `### ${section.section_name} (${section.marks_awarded} marks)\n\n`;
            content += `**Your Answer (this section):**\n\`\`\`\n${section.user_answer_text || 'No text extracted.'}\n\`\`\`\n\n`;
            
            if (section.strengths.length > 0) {
                content += `**Strengths:**\n`;
                section.strengths.forEach(item => content += `- **[+${item.marks}]** ${item.point}\n`);
            }
            
            if (section.weaknesses.length > 0) {
                content += `\n**Weaknesses:**\n`;
                section.weaknesses.forEach(item => content += `- **[${item.marks}]** ${item.point}\n`);
            }

            if (section.suggestions.length > 0) {
                content += `\n**Suggestions:**\n`;
                section.suggestions.forEach(item => content += `- ${item}\n`);
            }

            if (section.value_addition && section.value_addition.length > 0) {
                content += `\n**Value Addition Points:**\n`;
                section.value_addition.forEach(item => content += `- ${item}\n`);
            }
            content += "\n---\n";
        });
    }

    if (modelAnswer) {
        content += `## Model Answer\n${modelAnswer}\n\n`;
    }

    return content;
};

interface AccordionItemProps {
    result: EvaluationResult;
    index: number;
    ai: GoogleGenAI;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ result, index, ai }) => {
    const [isOpen, setIsOpen] = useState(index === 0);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'analysis' | 'model'>('overview');
    
    const { modelAnswer, modelAnswerContent, isGenerating, generationError, generateModelAnswer } = useModelAnswerGenerator(ai, result.question);
    const [isComparing, setIsComparing] = useState(false);

    const userAnswer = React.useMemo(() => 
        result.section_breakdown.map(s => s.user_answer_text || '').join('\n\n'), 
        [result.section_breakdown]
    );
    
    const toggleRow = (rowIndex: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowIndex)) {
                newSet.delete(rowIndex);
            } else {
                newSet.add(rowIndex);
            }
            return newSet;
        });
    };

    const handleDownloadMarkdown = () => {
        setIsDownloading(true);
        const markdownContent = formatResultAsMarkdown(result, modelAnswer);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Evaluation-Report_Q${index + 1}_${result.question.substring(0, 20).replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        setIsExportModalOpen(false);
    };

    return (
        <div className="accordion-item">
            <button className="accordion-header" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
                <span className="accordion-title">{`Q${index + 1}: ${result.question}`}</span>
                <span className="accordion-icon">{isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                )}</span>
            </button>
            {isOpen && (
                 <div className="accordion-content">
                    <div className="accordion-main-content">
                        <nav className="tabs-nav">
                            <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''} role="tab">Overview</button>
                            <button onClick={() => setActiveTab('breakdown')} className={activeTab === 'breakdown' ? 'active' : ''} role="tab">Section Breakdown</button>
                            <button onClick={() => setActiveTab('analysis')} className={activeTab === 'analysis' ? 'active' : ''} role="tab">Detailed Analysis</button>
                            <button onClick={() => setActiveTab('model')} className={activeTab === 'model' ? 'active' : ''} role="tab">Model Answer</button>
                        </nav>

                        <div className="tab-content" role="tabpanel">
                            {activeTab === 'overview' && (
                                <div className="tab-pane">
                                    <ScoreGauge score={result.score} maxScore={result.max_score} wordCount={result.word_count} />
                                    <div className="evaluation-grid">
                                        <FeedbackBox title="Overall Strengths" items={result.strengths} type="strengths" />
                                        <FeedbackBox title="Overall Weaknesses" items={result.weaknesses} type="weaknesses" />
                                    </div>
                                    <FeedbackBox title="Overall Suggestions to Improve" items={result.suggestions} type="suggestions" />
                                </div>
                            )}
                             {activeTab === 'breakdown' && result.section_breakdown && result.section_breakdown.length > 0 && (
                                <div className="tab-pane">
                                    <div className="breakdown-table-container">
                                        <table className="breakdown-table">
                                            <thead>
                                                <tr>
                                                    <th>Section</th>
                                                    <th>Marks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.section_breakdown.map((section, sIndex) => {
                                                    const isExpanded = expandedRows.has(sIndex);
                                                    return (
                                                        <React.Fragment key={sIndex}>
                                                            <tr className="breakdown-row-main" onClick={() => toggleRow(sIndex)} aria-expanded={isExpanded}>
                                                                <td>
                                                                    <div className="section-cell-wrapper">
                                                                        {section.section_name}
                                                                        <span className={`row-toggle-icon ${isExpanded ? 'expanded' : ''}`}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="marks-cell">{section.marks_awarded}</td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr className="breakdown-row-details">
                                                                    <td colSpan={2}>
                                                                        <div className="section-details-wrapper">
                                                                            <div className="user-answer-text-container">
                                                                                <h4>Your Answer (this section)</h4>
                                                                                <div
                                                                                    className="user-answer-text markdown-content"
                                                                                    dangerouslySetInnerHTML={{ __html: marked.parse(section.user_answer_text || '<em>No text extracted for this section.</em>') }}
                                                                                />
                                                                            </div>
                                                                            <div className="details-grid">
                                                                                <div className="detail-category">
                                                                                    <h4>Strengths</h4>
                                                                                    <ul>
                                                                                        {section.strengths.map((item, i) => (
                                                                                            <li key={i}>
                                                                                                <span className="marks-badge positive">{item.marks > 0 ? `+${item.marks}` : item.marks}</span>
                                                                                                <span>{item.point}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                                <div className="detail-category">
                                                                                    <h4>Weaknesses</h4>
                                                                                    <ul>
                                                                                        {section.weaknesses.map((item, i) => (
                                                                                            <li key={i}>
                                                                                                <span className={`marks-badge ${item.marks < 0 ? 'negative' : 'neutral'}`}>{item.marks}</span>
                                                                                                <span className="weakness-point">{item.point}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                                <div className="detail-category">
                                                                                    <h4>Suggestions</h4>
                                                                                    <ul>{section.suggestions.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                                                                </div>
                                                                                {section.value_addition && section.value_addition.length > 0 && (
                                                                                    <div className="detail-category value-addition-category">
                                                                                        <h4 className="value-addition-header">
                                                                                            <div className="header-content">
                                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                                                                                                Value Addition
                                                                                            </div>
                                                                                            <span className="info-tooltip" title="AI-generated insights based on recent Google Search results.">ⓘ</span>
                                                                                        </h4>
                                                                                        <ul>{section.value_addition.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: marked.parse(item) }} />)}</ul>
                                                                                    </div>
                                                                                )}
                                                                                {section.deep_dive_analysis && (
                                                                                    <div className="detail-category deep-dive-category">
                                                                                        <h4>
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v1a2.5 2.5 0 0 1-5 0v-1A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.32 10.97a3.5 3.5 0 1 1-8.64 0"/><path d="M6 14c-2 3-2 5 2 5"/><path d="M18 14c2 3 2 5-2 5"/><path d="M12 14v7.5"/><path d="M9.5 7.5c-1.28-1.72-1.28-4.22 0-6"/><path d="M14.5 7.5c1.28-1.72-1.28-4.22 0-6"/></svg>
                                                                                            Deep-Dive Analysis
                                                                                        </h4>
                                                                                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(section.deep_dive_analysis) }} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'analysis' && (
                                <div className="tab-pane">
                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.detailed_analysis) }} />
                                </div>
                            )}
                             {activeTab === 'model' && (
                                <div className="tab-pane model-answer-tab">
                                    {!modelAnswerContent && !isGenerating && !generationError && (
                                        <div className="model-answer-prompt">
                                            <h3>Generate a Model Answer</h3>
                                            <p>Get a comprehensive, well-structured answer written by the AI to compare with your own.</p>
                                            <button onClick={generateModelAnswer} disabled={isGenerating} className="action-button primary">
                                                Generate Model Answer
                                            </button>
                                        </div>
                                    )}
                                    {isGenerating && <div className="loading-indicator"><div></div><div></div><div></div></div>}
                                    {generationError && <div className="error-small" role="alert">{generationError}</div>}
                                    {modelAnswerContent && (
                                        <>
                                            <div className="model-answer-actions">
                                                <button onClick={() => setIsComparing(!isComparing)} className="action-button secondary" disabled={!userAnswer.trim()}>
                                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"></path><path d="M8 12H4"></path><path d="M12 8H4"></path><path d="M20 14v4a2 2 0 0 1-2 2H9.83a2 2 0 0 1-1.41-.59l-2.83-2.82a2 2 0 0 1 0-2.82l2.83-2.83a2 2 0 0 1 1.41-.58H18a2 2 0 0 1 2 2Z"></path><path d="M14 18h-4"></path><path d="M16 14h-4"></path></svg>
                                                    {isComparing ? 'Show Model Answer Only' : 'Compare with Your Answer'}
                                                </button>
                                            </div>
                                            
                                            {isComparing ? (
                                                userAnswer.trim() ? (
                                                    <ComparisonView userAnswer={userAnswer} modelAnswer={modelAnswer!} />
                                                ) : (
                                                    <div className="model-answer-container">
                                                        <p>Could not extract your answer text to perform a comparison.</p>
                                                        <button onClick={() => setIsComparing(false)} className="action-button primary">Go Back</button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="model-answer-content-container">
                                                    {modelAnswerContent.map((part, index) => {
                                                        if (part.type === 'text') {
                                                            const highlightedContent = part.content.replace(
                                                                /\+\+([\s\S]+?)\+\+/g,
                                                                (match, content) => `<strong>${content.trim()}</strong>`
                                                            );
                                                            return <div key={index} className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(highlightedContent) }} />;
                                                        }
                                                        if (part.type === 'diagram') {
                                                            return (
                                                                <div key={index} className="diagram-placeholder">
                                                                    {part.prompt}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="accordion-footer">
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            disabled={isDownloading}
                            className="action-button secondary"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="spinner-small"></div>
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span>Export Documents</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
             {isExportModalOpen && (
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onDownloadMarkdown={handleDownloadMarkdown}
                    isDownloading={isDownloading}
                />
            )}
        </div>
    );
};

const ProgressBar: React.FC<{ percentage: number; status: string }> = ({ percentage, status }) => {
    return (
        <div className="progress-container" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Evaluation Progress">
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

export const MainsApp: React.FC<{
    onEvaluationComplete?: (results: EvaluationResult[]) => void;
    initialData?: EvaluationResult[] | null;
}> = ({ onEvaluationComplete, initialData }) => {
    const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[] | null>(initialData || null);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const [progress, setProgress] = useState<{ percentage: number; status: string } | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    
    const [strictness, setStrictness] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [deepDive, setDeepDive] = useState<boolean>(false);

    const [chat, setChat] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState<string>('');
    const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

    const chatHistoryRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI. Please check your API key setup.");
        }
    }, []);

    useEffect(() => {
        if (initialData) {
            setEvaluationResults(initialData);
        }
    }, [initialData]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
            if (allowedTypes.includes(file.type)) {
                setAnswerSheetFile(file);
                setError(null);
                setEvaluationResults(null);
                setChat(null);
                setChatHistory([]);
            } else {
                setError("Please upload a valid PDF, JPG, or PNG file.");
                setAnswerSheetFile(null);
            }
        }
        // Reset the input value to allow re-selecting the same file
        e.target.value = '';
    };
    
    const fetchValueAdditions = async (results: EvaluationResult[]): Promise<EvaluationResult[]> => {
        if (!aiRef.current) return results;
        const ai = aiRef.current;
        const model = 'gemini-2.5-flash';
        
        try {
            const enrichedResults = await Promise.all(results.map(async (result) => {
                const sectionNames = result.section_breakdown.map(s => s.section_name);
                if (sectionNames.length === 0) {
                    return { ...result, section_breakdown: result.section_breakdown.map(s => ({...s, value_addition: []})) };
                };

                const valueAddPrompt = `
                    For the UPSC question: "${result.question}", I need value-addition points for the following sections of an answer: ${sectionNames.join(', ')}.
                    For each section, use Google Search to find recent data, relevant statistics, contemporary examples, or case studies that would enhance the answer.
                    Return your findings as a single, valid JSON object and nothing else.
                    The keys of the object should be the exact section names: "${sectionNames.join('", "')}".
                    The value for each key should be an array of strings. Each string must be a specific value-addition point formatted with Markdown to emphasize key terms (e.g., using **bold** for names or stats).
                    Example format: { "${sectionNames[0]}": ["A key statistic is that **90% of initiatives** succeed with proper funding.", "The recent **'XYZ' report** highlights this issue."], "${sectionNames[1]}": [] }
                `;
                
                const response = await ai.models.generateContent({
                    model,
                    contents: valueAddPrompt,
                    config: {
                        tools: [{ googleSearch: {} }]
                    }
                });

                try {
                    let responseText = response.text.trim();
                    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
                    if (jsonMatch) {
                        responseText = jsonMatch[1] || jsonMatch[2];
                    }

                    const valueAdditions = JSON.parse(responseText);
                    const enrichedSectionBreakdown = result.section_breakdown.map(section => ({
                        ...section,
                        value_addition: valueAdditions[section.section_name] || []
                    }));
                    return { ...result, section_breakdown: enrichedSectionBreakdown };
                } catch (e) {
                    console.error("Failed to parse value-addition JSON for question:", result.question, e);
                    console.error("LLM Response was:", response.text);
                    const fallbackBreakdown = result.section_breakdown.map(section => ({ ...section, value_addition: [] }));
                    return { ...result, section_breakdown: fallbackBreakdown };
                }
            }));
            return enrichedResults;
        } catch (err) {
            console.error("Error fetching value additions:", err);
             return results.map(res => ({
                ...res,
                section_breakdown: res.section_breakdown.map(sec => ({ ...sec, value_addition: [] }))
            }));
        }
    };

    const handleEvaluate = async () => {
        if (!answerSheetFile) {
            setError('Please upload your answer sheet file first.');
            return;
        }
        if (!aiRef.current) {
            setError('AI service is not initialized. Please refresh the page.');
            return;
        }

        setLoading(true);
        setError(null);
        setEvaluationResults(null);
        setChat(null);
        setChatHistory([]);
        
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        try {
            const ai = aiRef.current;
            const model = 'gemini-2.5-flash';
            
            setProgress({ percentage: 10, status: 'Reading your file...' });
            const base64File = await fileToBase64(answerSheetFile);

            setProgress({ percentage: 20, status: 'Analyzing with Gemini... This is the longest step.' });
            
            progressIntervalRef.current = window.setInterval(() => {
                setProgress(prev => {
                    if (!prev || prev.percentage >= 90) {
                        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                        return prev;
                    }
                    return { ...prev, percentage: prev.percentage + 1 };
                });
            }, 400);

            let strictnessDescription = `You are a strict but fair, balanced, and experienced UPSC Mains examiner. Your goal is to provide a realistic and constructive evaluation that accurately reflects the answer's quality. A very good answer should score around 50-60% of the max_score, and only exceptional, flawless answers should score higher. This realism is critical.`;
            if (strictness === 'Easy') {
                strictnessDescription = `You are a lenient and encouraging UPSC examiner. Your goal is to boost confidence. Be generous with marks for any valid attempt and focus feedback primarily on major structural improvements. A good attempt should score around 60-70% of the max_score.`;
            } else if (strictness === 'Hard') {
                strictnessDescription = `You are an extremely strict and critical UPSC Mains examiner, simulating the standards for a top 10 ranker. Scrutinize every detail. Be very conservative with marks, awarding them only for exceptional points that are well-substantiated with data or deep analysis. Feedback should be direct, blunt, and focused on even minor imperfections in structure, content, and expression. A very good answer should score around 40-50% of the max_score.`;
            }

            const deepDiveTextPrompt = deepDive
                ? `8. For each section, you MUST also provide a "deep_dive_analysis" field. This is a string containing a detailed analysis connecting the user's points to broader syllabus themes, suggesting alternative viewpoints, and citing specific examples/data that would elevate the answer.`
                : '';

            const prompt = `
                ${strictnessDescription}

                The user has provided a single document (PDF or image) that contains a series of questions and their corresponding handwritten answers.

                Your task is to:
                1.  Carefully parse the entire document to identify each distinct question and its corresponding handwritten answer.
                2.  **Crucially, for each question, you MUST identify the maximum marks allocated to it.** This information is typically written at the end of the question text (e.g., "[10 marks]", "(15 marks)", "150 words / 10 marks"). You must extract this number accurately. This will be the 'max_score'.
                3.  For each question-and-answer pair, evaluate the answer based on the following balanced UPSC standards:
                    *   **Adherence to Directives:** The most important evaluation criterion is how well the answer adheres to the question's directive (e.g., 'critically analyze', 'discuss', 'evaluate'). An answer that merely describes when it should be critically analyzing should receive lower marks.
                    *   **Balanced, Point-Based Marking:** For each section of the answer (e.g., Introduction, Body, Conclusion), perform a granular, point-by-point evaluation with these principles:
                        *   **Strengths:** Award positive marks based on the quality and relevance of the point. A standard, correct point should receive +1 mark. A point that is exceptionally insightful, well-supported with data, or shows deep analytical skill could receive up to +2 marks, depending on the overall weightage of the question.
                        *   **Weaknesses:** Identify weaknesses clearly. However, apply negative marks sparingly. Reserve negative marks (-0.5 to -1) only for significant errors such as **major factual inaccuracies, logical fallacies, or fundamentally misunderstanding the question's directive**. For other weaknesses like **lack of depth, poor structure, or omission of relevant points**, you MUST list them as a weakness but assign **"marks": 0**. This indicates a missed opportunity to score rather than a penalty.
                    *   The 'marks_awarded' for a section MUST be the mathematical sum of all positive marks for strengths and negative marks for weaknesses within that section.
                    *   **Credit for Diagrams:** If a relevant and well-executed visual aid (diagram, flowchart, map) is present, list it as a strength and assign appropriate positive marks.
                4.  The overall 'score' for the question MUST be the sum of 'marks_awarded' from all its sections. The final score should be balanced and reflect a fair assessment of the answer's quality.
                5.  Provide an overall evaluation including overall strengths, weaknesses, and suggestions that are direct and constructive.
                6.  **Strict and Accurate Word Count:** This is a critical step. You MUST calculate the **exact** word count of the user's handwritten answer.
                    *   **Isolate Handwriting:** First, identify and isolate only the handwritten text of the answer, distinguishing it from any printed text on the page.
                    *   **Ignore ALL Printed Text:** Explicitly ignore all machine-printed text. This includes the question text, headers, footers, page numbers, margins, or any other template text. Your focus is solely on what the user has written.
                    *   **Transcribe and Count:** To ensure accuracy, first transcribe the isolated handwritten text into digital text, and then perform a word count on your transcription. This two-step process is mandatory.
                    *   **Evaluate Word Count:** If the answer's word count is significantly over or under the typical limit for the question's marks (e.g., a 10-mark answer being 300 words), this should be flagged as a weakness (with 0 marks).
                7.  Return your complete analysis as a single JSON array.
                ${deepDiveTextPrompt}

                Each object in the array must correspond to one evaluated question and have the following structure:
                - "question": The exact text of the question you identified.
                - "strengths": An array of strings, with each string being a concise OVERALL strength of the answer.
                - "weaknesses": An array of strings, with each string being a concise OVERALL weakness.
                - "suggestions": An array of strings, offering specific, actionable OVERALL suggestions for improvement.
                - "detailed_analysis": A comprehensive OVERALL evaluation of the answer in Markdown format.
                - "score": The final score you assigned (sum of marks from all sections).
                - "max_score": The maximum possible score for the question, which you **MUST** extract from the document text.
                - "word_count": The exact word count of the user's handwritten answer.
                - "section_breakdown": An array of objects, where each object represents a section of the answer. Each object must have:
                    - "section_name": The name of the section.
                    - "user_answer_text": The actual text written by the user for this specific section, extracted verbatim.
                    - "marks_awarded": The sum of marks from the strengths and weaknesses in this section.
                    - "strengths": An array of objects. Each object must have "point" (a string describing the strength) and "marks" (a positive number).
                    - "weaknesses": An array of objects. Each object must have "point" (a string describing the weakness) and "marks" (a negative number or 0).
                    - "suggestions": An array of strings with suggestions for that section.
                    ${deepDive ? '- "deep_dive_analysis": "string (A detailed deep-dive analysis as described above)."' : ''}

                Ensure your output is a valid JSON array and nothing else.
            `;

            const contents = {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: answerSheetFile.type, data: base64File } }
                ]
            };

            const sectionBreakdownProperties: any = {
                section_name: { type: Type.STRING },
                user_answer_text: { type: Type.STRING },
                marks_awarded: { type: Type.NUMBER },
                strengths: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { point: { type: Type.STRING }, marks: { type: Type.NUMBER } },
                        required: ['point', 'marks']
                    }
                },
                weaknesses: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { point: { type: Type.STRING }, marks: { type: Type.NUMBER } },
                        required: ['point', 'marks']
                    }
                },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            };
            if (deepDive) {
                sectionBreakdownProperties['deep_dive_analysis'] = { type: Type.STRING };
            }
            
            const response = await ai.models.generateContent({
                model,
                contents,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                detailed_analysis: { type: Type.STRING },
                                score: { type: Type.NUMBER },
                                max_score: { type: Type.NUMBER },
                                word_count: { type: Type.NUMBER },
                                section_breakdown: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: sectionBreakdownProperties,
                                        required: ['section_name', 'user_answer_text', 'marks_awarded', 'strengths', 'weaknesses', 'suggestions']
                                    }
                                }
                            },
                            required: ['question', 'strengths', 'weaknesses', 'suggestions', 'detailed_analysis', 'score', 'max_score', 'word_count', 'section_breakdown']
                        }
                    }
                }
            });

            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            setProgress({ percentage: 95, status: 'Fetching value-addition insights...' });
            
            const resultText = response.text.trim();
            const resultJson = JSON.parse(resultText);
            
            const enrichedResults = await fetchValueAdditions(resultJson);

            setProgress({ percentage: 100, status: 'Evaluation complete!' });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (onEvaluationComplete) {
                onEvaluationComplete(enrichedResults);
            }
            setEvaluationResults(enrichedResults);

        } catch (err) {
            console.error(err);
            setError('An error occurred while evaluating the answer sheet. The AI might have had trouble parsing the file. Please ensure it is clear and legible.');
        } finally {
            setLoading(false);
            setProgress(null);
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }
    };
    
    useEffect(() => {
        if (evaluationResults && aiRef.current) {
            const ai = aiRef.current;
            const model = 'gemini-2.5-flash';

            const fullEvaluationContext = evaluationResults.map((res: EvaluationResult, index: number) => {
                const valueAdditionContext = res.section_breakdown
                    .map(sec => {
                        if (sec.value_addition && sec.value_addition.length > 0) {
                            return `- For section "${sec.section_name}": ${sec.value_addition.join('; ')}`;
                        }
                        return null;
                    })
                    .filter(Boolean)
                    .join('\n');
        
                return `Evaluation for Question ${index + 1} (${res.question}):\n` +
                    `Score: ${res.score}/${res.max_score}\n` +
                    `Strengths: ${res.strengths.join('; ')}\n` +
                    `Weaknesses: ${res.weaknesses.join('; ')}\n` +
                    `Suggestions: ${res.suggestions.join('; ')}\n` +
                    (valueAdditionContext ? `\nAvailable Value Addition Points:\n${valueAdditionContext}\n` : '') +
                    `Detailed Analysis: ${res.detailed_analysis}`;
            }).join('\n\n---\n\n');
            
            const initialModelMessage = "Great! I have the full context of your answers and my evaluation. How can I help you improve further?";
            const initialHistory = [
                { role: 'user', parts: [{ text: `I have just received feedback on my answer sheet. The full context of my answers and the evaluation is provided.` }] },
                { role: 'model', parts: [{ text: initialModelMessage }] }
            ];

            const systemInstruction = `You are a helpful UPSC Mains preparation assistant. You have just provided a detailed evaluation for a user's answer sheet. The full context of the questions and the evaluation has been provided, including specific 'Value Addition' points generated from Google Search. Your role is to answer follow-up questions to help the user understand their mistakes and improve their performance.
**Crucially, when discussing weaknesses or providing suggestions, you should proactively reference the 'Value Addition' points.** Explain how incorporating these specific facts, stats, or examples would have strengthened their answer. For example, if a user asks how to improve their introduction, and a relevant 'Value Addition' point exists, you should say something like, "You could strengthen your introduction by including the recent statistic I found: [mention the specific point]." This makes your advice more concrete and actionable.
**IMPORTANT FORMATTING RULE:** Use standard Markdown for formatting.
- Use headings (e.g., \`## Your Heading\`) for structure.
- Use bold text (\`**important term**\`) to highlight key concepts, definitions, or facts.
- Use lists for clarity.
Your output should be clean, readable, and well-structured markdown.
Context: ${fullEvaluationContext}`;

            const newChat = ai.chats.create({ 
                model, 
                history: initialHistory,
                config: {
                    systemInstruction
                }
            });
            setChat(newChat);
            setChatHistory([{ role: 'model', content: initialModelMessage }]);
        }
    }, [evaluationResults]);


    const handleSendChatMessage = async () => {
        if (!chatInput.trim() || !chat || isChatLoading) return;
        
        const message = chatInput.trim();
        setChatInput('');
        
        const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(updatedHistory);
        setIsChatLoading(true);

        try {
            const stream = await chat.sendMessageStream({ message });
            let modelResponse = '';
            
            setChatHistory(prev => [...prev, { role: 'model', content: '' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: 'model', content: modelResponse };
                    return newHistory;
                });
            }
        } catch (err) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: 'model', content: 'Sorry, I ran into an error. Please try again.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [chatHistory]);


    return (
        <>
            {loading && progress && <ProgressBar percentage={progress.percentage} status={progress.status} />}
            
            {error && <div className="card error" role="alert">{error}</div>}

            {!loading && !evaluationResults && (
                 <div className="upload-container">
                    <div className="upload-box">
                        <div className="upload-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <h2>Evaluate Your Answer Sheet</h2>
                        <p>Upload a PDF, JPG, or PNG file to get instant, in-depth feedback from our AI mentor.</p>
                        
                        <div className="evaluation-options">
                            <div className="form-group">
                                <label>Strictness Level</label>
                                <div className="segmented-control">
                                    <button className={strictness === 'Easy' ? 'active' : ''} onClick={() => setStrictness('Easy')}>Easy</button>
                                    <button className={strictness === 'Medium' ? 'active' : ''} onClick={() => setStrictness('Medium')}>Medium</button>
                                    <button className={strictness === 'Hard' ? 'active' : ''} onClick={() => setStrictness('Hard')}>Hard</button>
                                </div>
                            </div>
                             <div className="checkbox-group">
                                <input type="checkbox" id="deepDiveCheckbox" checked={deepDive} onChange={(e) => setDeepDive(e.target.checked)} />
                                <label htmlFor="deepDiveCheckbox">
                                    Enable Deep-Dive Analysis
                                    <span className="tooltip-icon" title="Provides more granular feedback and connects your answer to broader syllabus themes.">?</span>
                                </label>
                            </div>
                        </div>

                        <div className="file-upload-area">
                            <input type="file" id="fileUpload" accept="application/pdf,image/jpeg,image/png" onChange={handleFileChange} style={{ display: 'none' }} aria-label="Upload your answer sheet"/>
                            <label htmlFor="fileUpload" className="file-upload-label">
                                {answerSheetFile ? `Selected: ${answerSheetFile.name}` : "Click to upload or drag & drop"}
                            </label>
                            {answerSheetFile && (
                                <button onClick={() => setAnswerSheetFile(null)} className="remove-file-button" aria-label="Remove selected file">&times;</button>
                            )}
                        </div>

                        <button
                            className="action-button primary evaluate-button"
                            onClick={handleEvaluate}
                            disabled={!answerSheetFile}
                            aria-label="Evaluate Answer Sheet"
                        >
                            Evaluate Answer Sheet
                        </button>
                    </div>
                    <div className="features-list">
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                            <div>
                                <h4>Comprehensive Analysis</h4>
                                <p>Section-by-section breakdown with precise marks.</p>
                            </div>
                        </div>
                         <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                            <div>
                                <h4>Actionable Insights</h4>
                                <p>Specific strengths, weaknesses, and suggestions.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
                            <div>
                                <h4>Value Addition</h4>
                                <p>AI-powered suggestions with data from Google Search.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {evaluationResults && evaluationResults.length > 0 && (
                <div className="output-section" aria-live="polite">
                    <div className="card">
                        <h2>Evaluation Results</h2>
                        <div className="accordion">
                            {aiRef.current && evaluationResults.map((result, index) => (
                                <AccordionItem key={index} result={result} index={index} ai={aiRef.current!} />
                            ))}
                        </div>
                    </div>
                     {chat && (
                        <div className="card chat-card">
                            <h2>Follow-up Chat</h2>
                            <p className="chat-subtitle">Ask detailed questions about your performance across all answers.</p>
                            <div className="chat-history" ref={chatHistoryRef}>
                                {chatHistory.map((msg, index) => (
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
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && chatHistory[chatHistory.length - 1]?.role !== 'model' && (
                                    <div className="chat-message-wrapper model-wrapper">
                                        <div className="avatar">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26 20 9.27 15.55 13.97 16.91 20.02 12 17.27 7.09 20.02 8.45 13.97 4 9.27 9.91 8.26 12 2z"></path></svg>
                                        </div>
                                        <div className="chat-message model-message loading-dots"><span></span><span></span><span></span></div>
                                    </div>
                                )}
                            </div>
                            <div className="chat-input-area">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                                    placeholder="e.g., How can I improve my conclusions?"
                                    aria-label="Chat input for follow-up questions"
                                    disabled={isChatLoading}
                                />
                                <button onClick={handleSendChatMessage} disabled={isChatLoading || !chatInput.trim()} aria-label="Send chat message">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};