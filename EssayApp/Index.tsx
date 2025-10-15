import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// === TYPE DEFINITIONS ===

type FrameworkSection = {
    section_name: string;
    guidance: {
        dimensions: string[];
        quotes: string[];
        examples: string[];
        data_points: string[];
    };
};

type EssayFramework = {
    title: string;
    description: string;
    structure: FrameworkSection[];
};

export type EssayFrameworkResult = {
    topic: string;
    frameworks: EssayFramework[];
};

const formatEssayResultAsMarkdown = (result: EssayFrameworkResult): string => {
    let content = `# Essay Architecture for: ${result.topic}\n\n`;
    result.frameworks.forEach((framework, index) => {
        content += `## Framework ${index + 1}: ${framework.title}\n\n`;
        content += `**Approach:** ${framework.description}\n\n`;
        framework.structure.forEach(section => {
            content += `### ${section.section_name}\n\n`;
            if(section.guidance.dimensions.length > 0) content += `**Dimensions to Explore:**\n- ${section.guidance.dimensions.join('\n- ')}\n\n`;
            if(section.guidance.quotes.length > 0) content += `**Relevant Quotes:**\n- ${section.guidance.quotes.join('\n- ')}\n\n`;
            if(section.guidance.examples.length > 0) content += `**Examples & Anecdotes:**\n- ${section.guidance.examples.join('\n- ')}\n\n`;
            if(section.guidance.data_points.length > 0) content += `**Data Points:**\n- ${section.guidance.data_points.join('\n- ')}\n\n`;
        });
        content += `---\n\n`;
    });
    return content;
};

// === COMPONENTS ===

const AnalysisConfig: React.FC<{
    onGenerate: (topic: string) => void;
    isLoading: boolean;
}> = ({ onGenerate, isLoading }) => {
    const [topic, setTopic] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            onGenerate(topic.trim());
        }
    };

    return (
        <div className="card pyq-config-container">
            <h2>Essay Architect</h2>
            <p className="subtitle">Enter an essay topic to generate multiple strategic outlines, complete with dimensions, quotes, examples, and data points.</p>
            <form onSubmit={handleSubmit} className="pyq-config-form">
                <div className="form-group">
                    <label htmlFor="topic-input">Essay Topic</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g., 'Wisdom finds truth.' or 'Forests are the best case studies for economic excellence.'"
                        rows={3}
                        required
                    />
                </div>
                <button type="submit" className="action-button primary" disabled={isLoading || !topic.trim()}>
                    {isLoading ? 'Architecting...' : 'Generate Essay Outlines'}
                </button>
            </form>
        </div>
    );
};

const AnalysisResults: React.FC<{
    result: EssayFrameworkResult;
    onReset: () => void;
}> = ({ result, onReset }) => {
    const { topic, frameworks } = result;
    const [openFrameworkIndex, setOpenFrameworkIndex] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleExport = () => {
        setIsDownloading(true);
        const markdownContent = formatEssayResultAsMarkdown(result);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Essay_Outlines_${result.topic.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };


    return (
        <div className="pyq-report-container">
            <h2>Essay Architecture for: {topic}</h2>

            <div className="accordion">
                {frameworks.map((framework, index) => (
                    <div className="accordion-item" key={index}>
                         <button className="accordion-header" onClick={() => setOpenFrameworkIndex(openFrameworkIndex === index ? -1 : index)} aria-expanded={openFrameworkIndex === index}>
                            <span className="accordion-title">{`Framework ${index + 1}: ${framework.title}`}</span>
                            <span className="accordion-icon">{openFrameworkIndex === index ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            )}</span>
                        </button>
                        {openFrameworkIndex === index && (
                             <div className="accordion-content" style={{padding: '1.5rem'}}>
                                <p><strong>Approach:</strong> {framework.description}</p>
                                {framework.structure.map((section, sIndex) => (
                                    <div className="report-subsection" key={sIndex}>
                                        <h4>{section.section_name}</h4>
                                        <div className="details-grid">
                                            {section.guidance.dimensions.length > 0 && <div className="detail-category"><h5>Dimensions to Explore</h5><ul>{section.guidance.dimensions.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}
                                            {section.guidance.quotes.length > 0 && <div className="detail-category"><h5>Relevant Quotes</h5><ul>{section.guidance.quotes.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
                                            {section.guidance.examples.length > 0 && <div className="detail-category"><h5>Examples & Anecdotes</h5><ul>{section.guidance.examples.map((ex, i) => <li key={i}>{ex}</li>)}</ul></div>}
                                            {section.guidance.data_points.length > 0 && <div className="detail-category"><h5>Data Points</h5><ul>{section.guidance.data_points.map((dp, i) => <li key={i}>{dp}</li>)}</ul></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="results-actions" style={{ marginTop: '2rem' }}>
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                    {isDownloading ? 'Exporting...' : 'Export Outlines'}
                </button>
                <button className="action-button primary" onClick={onReset}>Analyze New Topic</button>
            </div>
        </div>
    );
};


export const EssayApp: React.FC<{
    onAnalysisComplete?: (result: EssayFrameworkResult) => void;
    initialData?: EssayFrameworkResult | null;
}> = ({ onAnalysisComplete, initialData }) => {
    const [analysisResult, setAnalysisResult] = useState<EssayFrameworkResult | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI service. Please check your API key setup.");
        }
    }, []);

    const handleGenerateAnalysis = async (topic: string) => {
        if (!aiRef.current) {
            setError('AI Service not initialized.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        const prompt = `You are an expert UPSC essay writing mentor. Your task is to generate 2-3 distinct, high-quality structural frameworks (outlines) for a given essay topic. For each section of an outline, you must provide specific, enriching content suggestions.

**Essay Topic:** "${topic}"

**CRITICAL INSTRUCTIONS:**
1.  **Generate 2-3 Frameworks:** Create between two and three completely different structural approaches to the essay. Examples of approaches include:
    *   Thematic/Dimensional (Social, Political, Economic, Ethical, etc.)
    *   Historical Progression (Past, Present, Future)
    *   Thesis, Antithesis, Synthesis
    *   Problem-Solution-Way Forward
2.  **Detailed Section Guidance:** For each section within a framework (e.g., Introduction, Body Paragraph, Conclusion), you MUST provide suggestions for the following categories:
    *   \`dimensions\`: Key aspects or angles to explore in this section.
    *   \`quotes\`: Relevant and famous quotes from notable personalities.
    *   \`examples\`: Specific real-world examples, case studies, or historical anecdotes.
    *   \`data_points\`: Relevant statistics, facts from reports, or data to substantiate arguments.
3.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object and nothing else. Do not include any text, comments, or markdown formatting (like \`\`\`json). The raw response body must be parsable as JSON.
`;

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING },
                            frameworks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        structure: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    section_name: { type: Type.STRING },
                                                    guidance: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            dimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                            quotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                            data_points: { type: Type.ARRAY, items: { type: Type.STRING } }
                                                        },
                                                        required: ['dimensions', 'quotes', 'examples', 'data_points']
                                                    }
                                                },
                                                required: ['section_name', 'guidance']
                                            }
                                        }
                                    },
                                    required: ['title', 'description', 'structure']
                                }
                            }
                        },
                        required: ['topic', 'frameworks']
                    }
                }
            });

            const resultData: EssayFrameworkResult = JSON.parse(response.text);
            const finalResult = { ...resultData, topic }; // Ensure the topic is consistent

            setAnalysisResult(finalResult);

            if (onAnalysisComplete) {
                onAnalysisComplete(finalResult);
            }

        } catch (err: any) {
            console.error("Essay Architect Failed:", err);
            let errorMessage = "Sorry, an error occurred while generating the outlines. Please try again later.";
            if (err.message && err.message.includes('JSON')) {
                 errorMessage = "The AI returned an invalid format. Please try again, as this can sometimes be a temporary issue.";
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setAnalysisResult(null);
        setError(null);
        setIsLoading(false);
    };

    return (
        <div className="pyq-container">
            {error && <div className="card error" role="alert">{error}</div>}

            {analysisResult ? (
                <AnalysisResults result={analysisResult} onReset={handleReset} />
            ) : (
                <AnalysisConfig onGenerate={handleGenerateAnalysis} isLoading={isLoading} />
            )}
        </div>
    );
};