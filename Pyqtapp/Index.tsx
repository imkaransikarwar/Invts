import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

// === TYPE DEFINITIONS for the new detailed analysis ===

type MainsSignificance = {
    question_types: string[];
    key_themes: Array<{ theme: string; description: string; }>;
    inter_linkages: string[];
    answer_framework: string;
    keywords: string[];
    trends_over_time: Array<{ year_range: string; observation: string; }>;
    current_affairs_linkages: string[];
    source_recommendations: Array<{ source: string; relevance: string; }>;
};

type PrelimsSignificance = {
    question_types: string[];
    high_yield_areas: Array<{ area: string; description: string; }>;
    common_traps: string[];
    important_facts_articles: string[];
};

export type PyqAnalysisResult = {
    topic: string;
    mains_significance: MainsSignificance;
    prelims_significance: PrelimsSignificance;
};

const formatPyqResultAsMarkdown = (result: PyqAnalysisResult): string => {
    let content = `# Deep-Dive Analysis for: ${result.topic}\n\n`;

    const { mains_significance, prelims_significance } = result;

    content += `## Mains Significance\n\n`;
    content += `### Common Question Types\n- ${mains_significance.question_types.join('\n- ')}\n\n`;
    
    content += `### Key Recurring Themes\n`;
    mains_significance.key_themes.forEach(t => content += `- **${t.theme}:** ${t.description}\n`);
    content += `\n`;

    if (mains_significance.trends_over_time?.length > 0) {
        content += `### Trends Over Time\n`;
        mains_significance.trends_over_time.forEach(t => content += `- **${t.year_range}:** ${t.observation}\n`);
        content += `\n`;
    }

    if (mains_significance.current_affairs_linkages?.length > 0) {
        content += `### Current Affairs Linkages\n- ${mains_significance.current_affairs_linkages.join('\n- ')}\n\n`;
    }

    content += `### Inter-Linkages with Syllabus\n- ${mains_significance.inter_linkages.join('\n- ')}\n\n`;
    content += `### Answer Structuring Framework\n\`\`\`\n${mains_significance.answer_framework}\n\`\`\`\n\n`;
    content += `### Essential Keywords & Terminology\n- ${mains_significance.keywords.join(', ')}\n\n`;
    
    if (mains_significance.source_recommendations?.length > 0) {
        content += `### Recommended Sources\n`;
        mains_significance.source_recommendations.forEach(s => content += `- **${s.source}:** ${s.relevance}\n`);
        content += `\n`;
    }

    content += `## Prelims Significance\n\n`;
    content += `### Common Question Patterns\n- ${prelims_significance.question_types.join('\n- ')}\n\n`;

    content += `### High-Yield Areas for MCQs\n`;
    prelims_significance.high_yield_areas.forEach(a => content += `- **${a.area}:** ${a.description}\n`);
    content += `\n`;

    content += `### Important Facts / Articles / Reports\n- ${prelims_significance.important_facts_articles.join('\n- ')}\n\n`;
    content += `### Common Traps & Confusing Options\n- ${prelims_significance.common_traps.join('\n- ')}\n\n`;
    
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
            <h2>PYQ Deep-Dive Analyzer</h2>
            <p className="subtitle">Enter a specific topic from the syllabus to get a detailed strategic analysis of its significance for both Prelims and Mains.</p>
            <form onSubmit={handleSubmit} className="pyq-config-form">
                <div className="form-group">
                    <label htmlFor="topic-input">Syllabus Topic</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g., 'Fundamental Rights', 'Bhakti Movement', 'Monetary Policy', 'Post-Independence Consolidation'"
                        rows={2}
                        required
                    />
                </div>
                <button type="submit" className="action-button primary" disabled={isLoading || !topic.trim()}>
                    {isLoading ? 'Analyzing...' : 'Generate Deep-Dive Analysis'}
                </button>
            </form>
        </div>
    );
};

const AnalysisResults: React.FC<{
    result: PyqAnalysisResult;
    onReset: () => void;
}> = ({ result, onReset }) => {
    const { topic, mains_significance, prelims_significance } = result;
    const [isDownloading, setIsDownloading] = useState(false);

    const handleExport = () => {
        setIsDownloading(true);
        const markdownContent = formatPyqResultAsMarkdown(result);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PYQ_Analysis_${result.topic.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    return (
        <div className="pyq-report-container">
            <h2>Deep-Dive Analysis for: {topic}</h2>

            {/* Mains Significance Section */}
            <div className="report-section">
                <h3>Mains Significance</h3>
                <div className="report-subsection">
                    <h4>Common Question Types</h4>
                    <p>In Mains, questions from this topic are often framed to test your analytical and critical thinking skills. Expect directives like:</p>
                    <ul className="keyword-list">
                        {mains_significance.question_types.map((type, i) => <li key={i}>{type}</li>)}
                    </ul>
                </div>
                <div className="report-subsection">
                    <h4>Key Recurring Themes</h4>
                     <ul>
                        {mains_significance.key_themes.map((theme, i) => (
                           <li key={i}><strong>{theme.theme}:</strong> {theme.description}</li>
                        ))}
                    </ul>
                </div>
                 {mains_significance.trends_over_time && mains_significance.trends_over_time.length > 0 && (
                    <div className="report-subsection">
                        <h4>Trends Over Time</h4>
                        <ul>
                            {mains_significance.trends_over_time.map((trend, i) => (
                               <li key={i}><strong>{trend.year_range}:</strong> {trend.observation}</li>
                            ))}
                        </ul>
                    </div>
                 )}
                 {mains_significance.current_affairs_linkages && mains_significance.current_affairs_linkages.length > 0 && (
                    <div className="report-subsection">
                        <h4>Current Affairs Linkages</h4>
                        <p>This topic is frequently linked with contemporary issues. Look out for questions that connect it to:</p>
                        <ul>
                           {mains_significance.current_affairs_linkages.map((link, i) => <li key={i}>{link}</li>)}
                        </ul>
                    </div>
                 )}
                 <div className="report-subsection">
                    <h4>Inter-Linkages with Syllabus</h4>
                    <p>This topic has significant overlap with other areas of the syllabus. When writing answers, try to draw connections to:</p>
                    <ul>
                       {mains_significance.inter_linkages.map((link, i) => <li key={i}>{link}</li>)}
                    </ul>
                </div>
                <div className="report-subsection">
                    <h4>Answer Structuring Framework</h4>
                    <p>A high-scoring answer on this topic should generally follow this structure:</p>
                    <div className="framework-box">{mains_significance.answer_framework}</div>
                </div>
                <div className="report-subsection">
                    <h4>Essential Keywords & Terminology</h4>
                     <ul className="keyword-list">
                       {mains_significance.keywords.map((word, i) => <li key={i}>{word}</li>)}
                    </ul>
                </div>
                 {mains_significance.source_recommendations && mains_significance.source_recommendations.length > 0 && (
                    <div className="report-subsection">
                        <h4>Recommended Sources</h4>
                         <p>Based on PYQ analysis, prioritize the following sources for comprehensive coverage:</p>
                        <ul>
                            {mains_significance.source_recommendations.map((source, i) => (
                               <li key={i}><strong>{source.source}:</strong> {source.relevance}</li>
                            ))}
                        </ul>
                    </div>
                 )}
            </div>

            {/* Prelims Significance Section */}
            <div className="report-section">
                <h3>Prelims Significance</h3>
                 <div className="report-subsection">
                    <h4>Common Question Patterns</h4>
                     <p>In Prelims, questions from this topic tend to follow these patterns:</p>
                    <ul className="keyword-list">
                       {prelims_significance.question_types.map((type, i) => <li key={i}>{type}</li>)}
                    </ul>
                </div>
                <div className="report-subsection">
                    <h4>High-Yield Areas for MCQs</h4>
                    <p>Focus your revision on these specific areas, as they are frequently targeted in multiple-choice questions:</p>
                    <ul>
                        {prelims_significance.high_yield_areas.map((area, i) => (
                             <li key={i}><strong>{area.area}:</strong> {area.description}</li>
                        ))}
                    </ul>
                </div>
                <div className="report-subsection">
                    <h4>Important Facts / Articles / Reports</h4>
                    <p>Memorizing the following is crucial for scoring well on factual questions:</p>
                    <ul>
                       {prelims_significance.important_facts_articles.map((fact, i) => <li key={i}>{fact}</li>)}
                    </ul>
                </div>
                 <div className="report-subsection">
                    <h4>Common Traps & Confusing Options</h4>
                    <p>Be cautious of these common pitfalls seen in previous year papers:</p>
                     <ul>
                       {prelims_significance.common_traps.map((trap, i) => <li key={i}>{trap}</li>)}
                    </ul>
                </div>
            </div>

            <div className="results-actions" style={{ marginTop: '2rem' }}>
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                    {isDownloading ? 'Exporting...' : 'Export Analysis'}
                </button>
                <button className="action-button primary" onClick={onReset}>Start New Analysis</button>
            </div>
        </div>
    );
};

export const PyqApp: React.FC<{
    onAnalysisComplete?: (result: PyqAnalysisResult) => void;
    initialData?: PyqAnalysisResult | null;
}> = ({ onAnalysisComplete, initialData }) => {
    const [analysisResult, setAnalysisResult] = useState<PyqAnalysisResult | null>(initialData || null);
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

        const prompt = `
            You are an expert UPSC exam analyst with deep knowledge of syllabus trends and question patterns. Your task is to perform a highly detailed, strategic "deep-dive" analysis of a specific topic based on Previous Year Questions (PYQs).

            **Topic for Analysis:** "${topic}"

            **Instructions:**
            1.  Use Google Search extensively to analyze PYQs from the last 15 years for both the UPSC Prelims and Mains exams related to this specific topic.
            2.  Synthesize your findings into a detailed strategic report.
            3.  Your entire response MUST be a single, valid JSON object and nothing else. Do not include any text, comments, or markdown formatting (like \`\`\`json\`).

            **JSON Structure:**
            Your JSON object must have the following structure:
            {
              "topic": "${topic}",
              "mains_significance": {
                "question_types": ["An array of strings describing the typical Mains question directives, e.g., 'Critically Analyze', 'Discuss', 'Evaluate the significance'"],
                "key_themes": [An array of objects, each with {"theme": "A recurring sub-theme", "description": "A brief explanation of how this sub-theme is tested"}],
                "trends_over_time": [An array of objects, each with {"year_range": "e.g., 2018-2023", "observation": "A key trend observed in PYQs during this period, like a shift from static to dynamic questions"}],
                "current_affairs_linkages": ["An array of strings describing how this topic is commonly linked to current events in Mains questions"],
                "inter_linkages": ["An array of strings detailing connections to other syllabus topics, e.g., 'Connects with Judiciary's role in separation of powers'"],
                "answer_framework": "A string containing a concise, recommended structure for writing a Mains answer on this topic, using '\\n' for new lines.",
                "keywords": ["An array of essential, high-scoring keywords and terminology for Mains answers"],
                "source_recommendations": [An array of objects, each with {"source": "e.g., NCERT Class XI, The Hindu Editorials", "relevance": "Why this source is important for the topic"}]
              },
              "prelims_significance": {
                "question_types": ["An array of strings describing typical Prelims question patterns, e.g., 'Statement-based (1 only, 2 only, both)', 'Match the following', 'Chronological arrangement'"],
                "high_yield_areas": [An array of objects, each with {"area": "A specific high-yield area", "description": "Why this area is important for MCQs"}],
                "common_traps": ["An array of strings describing common mistakes or confusing options seen in PYQs"],
                "important_facts_articles": ["An array of strings listing crucial facts, Constitutional articles, report names, or data points to memorize"]
              }
            }
        `;

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            let jsonString = response.text.trim();
            const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```|({[\s\S]*})/);
            if (jsonMatch) {
                jsonString = jsonMatch[1] || jsonMatch[2];
            }

            const resultData: PyqAnalysisResult = JSON.parse(jsonString);
            const finalResult = { ...resultData, topic: topic }; // Ensure the topic is consistent

            setAnalysisResult(finalResult);

            if (onAnalysisComplete) {
                onAnalysisComplete(finalResult);
            }

        } catch (err: any) {
            console.error("PYQ Analysis Failed:", err);
            let errorMessage = "Sorry, an error occurred while generating the analysis. Please try again later.";
            if (err.message && err.message.includes('JSON')) {
                 errorMessage = "The AI returned an invalid format. Please try again, as this can sometimes be a temporary issue.";
            } else if (err.toString().includes('400')) {
                errorMessage = `PYQ Analysis Failed: ${err.toString()}`;
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