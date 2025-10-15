import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

declare var marked: any;

// === TYPE DEFINITIONS ===

type ReportRecommendation = {
    report_name: string;
    key_recommendations: string[];
};

type DynamicDimension = {
    dimension_name: string;
    detailed_analysis: string; // Markdown formatted
};

type PrelimsFactoid = {
    category: string;
    facts: string[];
};

export type NotesProResult = {
    topic: string;
    introduction: string;
    dynamic_analysis: DynamicDimension[];
    reports_and_recommendations?: ReportRecommendation[];
    prelims_facts: PrelimsFactoid[];
    keywords: string[];
    way_forward: string[];
    conclusion: string;
    related_pyqs: {
        prelims: string[];
        mains: string[];
    };
};

const formatNotesResultAsMarkdown = (result: NotesProResult): string => {
    let content = `# Comprehensive Notes on: ${result.topic}\n\n`;
    content += `## Introduction\n${result.introduction}\n\n`;

    content += `## In-Depth Analysis\n`;
    result.dynamic_analysis.forEach(dim => {
        content += `### ${dim.dimension_name}\n`;
        content += `${dim.detailed_analysis}\n\n`;
    });
    
    if (result.reports_and_recommendations && result.reports_and_recommendations.length > 0) {
        content += `## Key Reports & Recommendations\n`;
        result.reports_and_recommendations.forEach(report => {
            content += `### ${report.report_name}\n- ${report.key_recommendations.join('\n- ')}\n\n`;
        });
    }

    if (result.prelims_facts?.length > 0) {
        content += `## High-Yield Prelims Facts\n`;
        result.prelims_facts.forEach(pf => {
            content += `### ${pf.category}\n- ${pf.facts.join('\n- ')}\n\n`;
        });
    }

    if (result.keywords?.length > 0) content += `## Keywords for Answers\n- ${result.keywords.join(', ')}\n\n`;

    content += `## Way Forward\n${result.way_forward.map(p => `- ${p}`).join('\n')}\n\n`;
    content += `## Conclusion\n${result.conclusion}\n\n`;

    content += `## Related Previous Year Questions (PYQs)\n\n`;
    if(result.related_pyqs?.prelims?.length > 0) content += `### Prelims\n${result.related_pyqs.prelims.map(p => `- ${p}`).join('\n')}\n\n`;
    if(result.related_pyqs?.mains?.length > 0) content += `### Mains\n${result.related_pyqs.mains.map(p => `- ${p}`).join('\n')}\n\n`;

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
            <h2>Notes Pro</h2>
            <p className="subtitle">Enter any syllabus topic to generate comprehensive, multi-dimensional notes, enriched with the latest data and relevant PYQs.</p>
            <form onSubmit={handleSubmit} className="pyq-config-form">
                 <div className="form-group">
                    <label htmlFor="topic-input">Syllabus Topic</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g., 'Judicial Review', 'Insolvency and Bankruptcy Code', 'Climate Change'"
                        rows={3}
                        required
                    />
                </div>
                <button type="submit" className="action-button primary" disabled={isLoading || !topic.trim()}>
                    {isLoading ? 'Generating Notes...' : 'Generate Notes'}
                </button>
            </form>
        </div>
    );
};

// === HELPER HOOKS & COMPONENTS FOR MAGAZINE VIEW ===

function useOnScreen(ref: React.RefObject<HTMLElement>, rootMargin = '0px', once = true) {
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const currentRef = ref.current;
        if (!currentRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIntersecting(true);
                    if (once) {
                        observer.unobserve(currentRef);
                    }
                }
            },
            { rootMargin }
        );
        
        observer.observe(currentRef);
        
        return () => {
            observer.unobserve(currentRef);
        };
    }, [ref, rootMargin, once]);

    return isIntersecting;
}

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; }> = ({ icon, title }) => (
    <div className="ca-card-header">
        <div className="ca-card-header-icon">
            <div className="icon-wrapper">{icon}</div>
            <h3>{title}</h3>
        </div>
    </div>
);

const getDimensionIcon = (name: string): React.ReactNode => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('economic') || lowerName.includes('finance') || lowerName.includes('fiscal')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
    if (lowerName.includes('political') || lowerName.includes('governance') || lowerName.includes('legal') || lowerName.includes('constitutional')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
    if (lowerName.includes('social') || lowerName.includes('society') || lowerName.includes('stakeholder')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
    if (lowerName.includes('ethic')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
    if (lowerName.includes('histor')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
    if (lowerName.includes('technolog') || lowerName.includes('science')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
    if (lowerName.includes('environment') || lowerName.includes('geograph') || lowerName.includes('climate')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 12.5c0-5.25-4.25-9.5-9.5-9.5S2.5 7.25 2.5 12.5c0 4.24 2.76 7.84 6.5 9.05.5.1.5.85 0 .95-3.74-1.2-6.5-4.8-6.5-9-.02-5.24 4.24-9.5 9.48-9.5s9.5 4.26 9.5 9.5c0 4.2-2.76 7.8-6.5 9.05-.5.1-.5.85 0 .95 3.74-1.21 6.5-4.81 6.5-9.05z"></path><path d="M16 16.5c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 1.48.81 2.77 2 3.5v-3.5h4v3.5c1.19-.73 2-2.02 2-3.5z"></path></svg>;
    if (lowerName.includes('international') || lowerName.includes('geopolitic')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
    
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 13-8-5 8-5 8 5-8 5z"></path><path d="m12 21-8-5v-6.5l8 5 8-5V16l-8 5z"></path></svg>; // Default icon
};

// === RESULT VIEW COMPONENTS ===

const MagazineView: React.FC<{ result: NotesProResult }> = ({ result }) => {
    return (
        <div className="ca-magazine-grid">
            <div className="ca-main-col">
                 {result.dynamic_analysis.map((dim, index) => (
                    <div className="ca-card" style={{ animationDelay: `${300 + index * 100}ms` }} key={dim.dimension_name}>
                        <CardHeader 
                            icon={getDimensionIcon(dim.dimension_name)}
                            title={dim.dimension_name}
                        />
                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(dim.detailed_analysis) }} />
                    </div>
                ))}
            </div>
            <div className="ca-sidebar-col">
                {(result.prelims_facts?.length > 0) &&
                    <div className="ca-card ca-card-prelims" style={{ animationDelay: '350ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                            title="High-Yield Prelims Facts"
                        />
                        {result.prelims_facts.map((item, i) => (
                           <div className="report-subsection" key={i} style={{border: 'none', padding: 0, paddingTop: '1rem'}}>
                               <h4>{item.category}</h4>
                               <ul className="positive-list" style={{gap: '0.5rem'}}>{item.facts.map((f, j) => <li key={j}>{f}</li>)}</ul>
                           </div>
                       ))}
                    </div>
                }

                {result.reports_and_recommendations && result.reports_and_recommendations.length > 0 &&
                    <div className="ca-card" style={{ animationDelay: '500ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>}
                            title="Key Reports & Recommendations"
                        />
                        {result.reports_and_recommendations.map((report, i) => (
                           <div className="report-subsection" key={i} style={{border: 'none', padding: 0, paddingTop: '1rem'}}>
                               <h4>{report.report_name}</h4>
                               <ul className="positive-list" style={{gap: '0.5rem'}}>{report.key_recommendations.map((rec, j) => <li key={j}>{rec}</li>)}</ul>
                           </div>
                       ))}
                    </div>
                }

                 {(result.keywords?.length > 0) &&
                    <div className="ca-card" style={{ animationDelay: '650ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
                            title="Keywords"
                        />
                        <ul className="keyword-list">{result.keywords.map((k, i) => <li key={i}>{k}</li>)}</ul>
                    </div>
                }

                 {result.related_pyqs && (result.related_pyqs.prelims?.length > 0 || result.related_pyqs.mains?.length > 0) &&
                    <div className="ca-card" style={{ animationDelay: '800ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>}
                            title="Related PYQs"
                        />
                         <div className="pyq-box">
                            {result.related_pyqs.mains?.length > 0 && (
                                <>
                                    <h5>Mains</h5>
                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.related_pyqs.mains.map(q => `- ${q}`).join('\n')) }} />
                                </>
                            )}
                             {result.related_pyqs.prelims?.length > 0 && (
                                <>
                                    <h5 style={{marginTop: result.related_pyqs.mains?.length > 0 ? '1.5rem' : '0' }}>Prelims</h5>
                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.related_pyqs.prelims.map(q => `- ${q}`).join('\n')) }} />
                                </>
                             )}
                        </div>
                    </div>
                }
            </div>
        </div>
    );
};

const SimpleNoteSection: React.FC<{
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    tag?: string; 
}> = ({ title, isOpen, onToggle, children, tag }) => {
    return (
        <div className="accordion-item">
            <button className="accordion-header" onClick={onToggle} aria-expanded={isOpen}>
                <span className="accordion-title">
                    {title}
                    {tag && <span className="pyq-badge" style={{marginLeft: '0.5rem', verticalAlign: 'middle'}}>{tag}</span>}
                </span>
                <span className="accordion-icon">{isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                )}</span>
            </button>
            {isOpen && (
                <div className="accordion-content">
                    <div className="accordion-main-content">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

const SimpleView: React.FC<{ result: NotesProResult }> = ({ result }) => {
    const [openSection, setOpenSection] = useState<string | null>('Introduction');

    const toggleSection = (sectionTitle: string) => {
        setOpenSection(prev => prev === sectionTitle ? null : sectionTitle);
    };

    return (
        <div className="accordion" style={{marginTop: '2rem'}}>
            <SimpleNoteSection title="Introduction" isOpen={openSection === 'Introduction'} onToggle={() => toggleSection('Introduction')}>
                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.introduction) }} />
            </SimpleNoteSection>

            {result.dynamic_analysis.map(dim => (
                <SimpleNoteSection 
                    key={dim.dimension_name}
                    title={dim.dimension_name} 
                    isOpen={openSection === dim.dimension_name} 
                    onToggle={() => toggleSection(dim.dimension_name)}
                >
                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(dim.detailed_analysis) }} />
                </SimpleNoteSection>
            ))}

            {result.reports_and_recommendations && result.reports_and_recommendations.length > 0 &&
                <SimpleNoteSection title="Key Reports & Recommendations" isOpen={openSection === 'Key Reports & Recommendations'} onToggle={() => toggleSection('Key Reports & Recommendations')}>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        {result.reports_and_recommendations.map((item, i) => (
                            <div className="key-concept-item" key={i}>
                                <h4 style={{marginTop: 0}}>{item.report_name}</h4>
                                <ul style={{paddingLeft: '1.25rem', margin: 0}}>{item.key_recommendations.map((rec, j) => <li key={j} style={{marginBottom: '0.5rem'}}>{rec}</li>)}</ul>
                            </div>
                        ))}
                    </div>
                </SimpleNoteSection>
            }
            
            {result.prelims_facts?.length > 0 &&
                <SimpleNoteSection title="High-Yield Prelims Facts" isOpen={openSection === 'High-Yield Prelims Facts'} onToggle={() => toggleSection('High-Yield Prelims Facts')}>
                     {result.prelims_facts.map((item, i) => (
                        <div className="report-subsection" key={i}>
                            <h4>{item.category}</h4>
                            <ul>{item.facts.map((f, j) => <li key={j}>{f}</li>)}</ul>
                        </div>
                    ))}
                </SimpleNoteSection>
            }
            
             {result.keywords?.length > 0 &&
                <SimpleNoteSection title="Keywords" isOpen={openSection === 'Keywords'} onToggle={() => toggleSection('Keywords')}>
                    <ul className="keyword-list">{result.keywords.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </SimpleNoteSection>
            }

            <SimpleNoteSection title="Way Forward" isOpen={openSection === 'Way Forward'} onToggle={() => toggleSection('Way Forward')}>
                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.way_forward.map(p => `- ${p}`).join('\n')) }} />
            </SimpleNoteSection>

             <SimpleNoteSection title="Conclusion" isOpen={openSection === 'Conclusion'} onToggle={() => toggleSection('Conclusion')}>
                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.conclusion) }} />
            </SimpleNoteSection>
            
            <SimpleNoteSection title="Related PYQs" isOpen={openSection === 'Related PYQs'} onToggle={() => toggleSection('Related PYQs')}>
                <div className="pyq-box">
                    {result.related_pyqs?.mains?.length > 0 && (
                        <>
                            <h5>Mains</h5>
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.related_pyqs.mains.map(q => `- ${q}`).join('\n')) }} />
                        </>
                    )}
                     {result.related_pyqs?.prelims?.length > 0 && (
                        <>
                            <h5 style={{marginTop: result.related_pyqs?.mains?.length > 0 ? '1.5rem' : '0' }}>Prelims</h5>
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.related_pyqs.prelims.map(q => `- ${q}`).join('\n')) }} />
                        </>
                     )}
                     {(!result.related_pyqs || (result.related_pyqs.prelims?.length === 0 && result.related_pyqs.mains?.length === 0)) && (
                        <p>No specific PYQs found for this exact topic in the recent past.</p>
                     )}
                </div>
            </SimpleNoteSection>
        </div>
    );
};

const AnalysisResults: React.FC<{
    result: NotesProResult;
    onReset: () => void;
}> = ({ result, onReset }) => {
    const [viewMode, setViewMode] = useState<'simple' | 'magazine'>('simple');
    const [isDownloading, setIsDownloading] = useState(false);

    const handleExport = () => {
        setIsDownloading(true);
        const markdownContent = formatNotesResultAsMarkdown(result);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Notes_${result.topic.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    return (
        <div className="notes-pro-results-container ca-magazine-container">
            <header className="ca-magazine-header" style={{ animationDelay: '100ms' }}>
                <span className="ca-magazine-eyebrow">Notes Pro Analysis</span>
                <h1>{result.topic}</h1>
                <p className="ca-magazine-dek">{result.introduction}</p>
                 <div className="ca-view-toggle">
                    <button className={viewMode === 'simple' ? 'active' : ''} onClick={() => setViewMode('simple')}>Simple View</button>
                    <button className={viewMode === 'magazine' ? 'active' : ''} onClick={() => setViewMode('magazine')}>Magazine View</button>
                </div>
            </header>

            {viewMode === 'magazine' ? (
                <MagazineView result={result} />
            ) : (
                <SimpleView result={result} />
            )}
            
            <div className="results-actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                    {isDownloading ? 'Exporting...' : 'Export Notes'}
                </button>
                <button className="action-button primary" onClick={onReset}>Generate New Notes</button>
            </div>
        </div>
    );
};


export const NotesProApp: React.FC<{
    onAnalysisComplete?: (result: NotesProResult) => void;
    initialData?: NotesProResult | null;
}> = ({ onAnalysisComplete, initialData }) => {
    const [analysisResult, setAnalysisResult] = useState<NotesProResult | null>(initialData || null);
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

        const prompt = `You are a UPSC subject matter expert creating comprehensive notes. Your task is to generate a 360-degree view of the topic, suitable for both Prelims and Mains.

**Topic for Notes:** "${topic}"

**CORE DIRECTIVE: DYNAMIC DIMENSIONAL ANALYSIS**
1.  **Identify Domain:** First, identify the primary domain of the topic (e.g., Polity, Economy, Science & Tech, History, Social Issue, IR).
2.  **Generate Dynamic Dimensions:** Based on the domain, generate 5-7 **highly relevant analytical dimensions** to provide a complete view. **DO NOT use a fixed, generic template.** The dimensions must be specific and logical for the given topic. For example:
    *   If the topic is 'Artificial Intelligence', dimensions could be 'Core Technology & Principles', 'Applications Across Sectors', 'Economic Impact', 'Ethical & Social Dilemmas', 'Global Regulatory Landscape'.
    *   If the topic is 'Bhakti Movement', dimensions could be 'Socio-Religious Context and Origins', 'Key Philosophies and Proponents', 'Impact on Regional Literature and Art', 'Role in Social Reform', 'Legacy and Relevance Today'.
3.  **Detailed Content:** For each dimension, provide a detailed analysis formatted using **Markdown** (headings, sub-headings, lists). Use Google Search extensively to ensure all information is accurate, up-to-date, and includes specific data, examples, committee names, etc.
4.  **Optional Section: Reports & Recommendations:** If the topic is related to policy, governance, social issues, economy, or similar domains, you MUST include a \`reports_and_recommendations\` section. Use Google Search to find 2-4 major national or international reports, committee recommendations, or landmark judicial rulings relevant to the topic. For each, provide the name and list its key recommendations or findings. If the topic is purely historical or conceptual (e.g., 'The Bhakti Movement'), you MUST provide an empty array \`[]\` for this field.
5.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object and nothing else.

**JSON Structure (Follow PRECISELY):**
{
  "topic": "${topic}",
  "introduction": "A concise introduction (2-3 sentences) defining the topic and its contemporary relevance.",
  "dynamic_analysis": [
    {
      "dimension_name": "Name of the first dynamic dimension (e.g., 'Geopolitical Dimension')",
      "detailed_analysis": "Your detailed, Markdown-formatted analysis for this dimension. Use headings, lists, and bold text for clarity."
    }
  ],
  "reports_and_recommendations": [
    {
      "report_name": "Name of the Report/Committee/Judgment",
      "key_recommendations": ["An array of strings with the key recommendations or findings."]
    }
  ],
  "prelims_facts": [{"category": "e.g., 'Key Articles', 'Reports/Indices'", "facts": ["An array of high-yield facts for prelims."]}],
  "keywords": ["An array of essential, high-scoring keywords for Mains answers."],
  "way_forward": ["An array of innovative and practical suggestions for the future."],
  "conclusion": "A balanced, forward-looking conclusion.",
  "related_pyqs": {
    "prelims": ["An array of relevant Prelims PYQs from the last 10 years, found via Google Search."],
    "mains": ["An array of relevant Mains PYQs from the last 10 years, found via Google Search."]
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
            
            if (!response || !response.text) {
                throw new Error("The AI returned an empty or invalid response. This can happen due to safety filters or if the topic is too complex. Please try rephrasing your topic.");
            }

            let jsonString = response.text.trim();
            const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```|({[\s\S]*})/);
            if (jsonMatch) {
                jsonString = jsonMatch[1] || jsonMatch[2];
            }


            const resultData: NotesProResult = JSON.parse(jsonString);
            const finalResult = { ...resultData, topic }; // Ensure topic is consistent

            setAnalysisResult(finalResult);

            if (onAnalysisComplete) {
                onAnalysisComplete(finalResult);
            }

        } catch (err: any) {
            console.error("Notes Pro Failed:", err);
            let errorMessage = "Sorry, an error occurred while generating the notes. Please try again later.";
            if (err.message && err.message.includes('empty or invalid response')) {
                errorMessage = err.message;
            } else if (err.message && err.message.includes('JSON')) {
                 errorMessage = "The AI returned an invalid format. Please try again, as this can sometimes be a temporary issue.";
            } else if (err.toString().includes('400')) {
                errorMessage = `The request to the AI failed. It's possible the topic was too broad or ambiguous. Please try again with a more specific topic. (Error: ${err.message})`;
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