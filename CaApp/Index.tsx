import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type, Chat as GenAIChat } from "@google/genai";

declare var marked: any;

// === TYPE DEFINITIONS ===

type TimelineEvent = {
    date: string;
    event: string;
};

type StakeholderAnalysis = {
    name: string;
    role: string;
    interests: string;
    influence: string;
};

type DynamicDimension = {
    dimension_name: string;
    detailed_analysis: string; // Markdown formatted string
    potential_questions: string[];
};

type PrelimsFacts = {
    key_terms_and_definitions: string[];
    reports_and_indices: string[];
    committees_and_bodies: string[];
    legal_and_constitutional_provisions: string[];
    miscellaneous_facts: string[];
};

type DetailedWayForwardPoint = {
    recommendation: string;
    justification: string;
    implementation_challenges: string;
};

type RelatedPyqs = {
    prelims: string[];
    mains: string[];
};

type LegalProvision = {
    provision: string;
    description: string;
};

type CoreIssue = {
    issue: string;
    pros: string[];
    cons: string[];
};

type EthicalDilemma = {
    dilemma: string;
    values_in_conflict: string[];
};

type DataPoint = {
    statistic: string;
    source: string;
    relevance: string;
};

type GovernmentInitiative = {
    name: string;
    objective: string;
    key_features: string[];
};

type InternationalComparison = {
    country_or_org: string;
    approach_or_comparison: string;
};

type WayForwardStructure = {
    short_term: DetailedWayForwardPoint[];
    long_term: DetailedWayForwardPoint[];
};

type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

export type ChronoScoutResult = {
    topic: string;
    summary: string;
    timeline: TimelineEvent[];
    historical_context: string;
    constitutional_and_legal_provisions: LegalProvision[];
    government_initiatives: GovernmentInitiative[];
    key_stakeholders_analysis: StakeholderAnalysis[];
    dynamic_dimensions: DynamicDimension[];
    prelims_facts: PrelimsFacts;
    core_issue_analysis: CoreIssue[];
    ethical_dilemmas: EthicalDilemma[];
    technological_dimensions: string[];
    international_perspective: InternationalComparison[];
    key_data_and_statistics: DataPoint[];
    future_outlook: string;
    keywords: string[];
    way_forward: WayForwardStructure;
    related_pyqs: RelatedPyqs;
};


const formatCaResultAsMarkdown = (result: ChronoScoutResult): string => {
    let content = `# ChronoScout Analysis: ${result.topic}\n\n`;
    content += `**Summary:** ${result.summary}\n\n`;

    content += `## Timeline of Key Events\n`;
    result.timeline.forEach(t => content += `- **${t.date}:** ${t.event}\n`);
    content += `\n`;
    
    content += `## Historical Context\n${result.historical_context}\n\n`;

    content += `## Constitutional & Legal Provisions\n`;
    result.constitutional_and_legal_provisions.forEach(p => content += `- **${p.provision}:** ${p.description}\n`);
    content += `\n`;
    
    if (result.government_initiatives && result.government_initiatives.length > 0) {
        content += `## Government Initiatives & Policies\n`;
        result.government_initiatives.forEach(i => content += `### ${i.name}\n- **Objective:** ${i.objective}\n- **Key Features:**\n  - ${i.key_features.join('\n  - ')}\n\n`);
    }

    content += `## Key Stakeholders Analysis\n`;
    result.key_stakeholders_analysis.forEach(s => content += `- **${s.name} (${s.role}):**\n  - **Interests:** ${s.interests}\n  - **Influence:** ${s.influence}\n`);
    content += `\n`;

    content += `## Multi-Dimensional Analysis\n`;
    result.dynamic_dimensions.forEach(dim => {
        content += `### ${dim.dimension_name}\n${dim.detailed_analysis}\n`;
        if (dim.potential_questions && dim.potential_questions.length > 0) {
            content += `\n**Potential Questions:**\n- ${dim.potential_questions.join('\n- ')}\n`;
        }
        content += `\n`;
    });
    
    content += `## Core Issue Analysis\n`;
    result.core_issue_analysis.forEach(issue => {
        content += `### ${issue.issue}\n- **Arguments For:**\n  - ${issue.pros.join('\n  - ')}\n- **Arguments Against:**\n  - ${issue.cons.join('\n  - ')}\n\n`;
    });

    if (result.technological_dimensions && result.technological_dimensions.length > 0) {
        content += `## Technological Dimensions\n- ${result.technological_dimensions.join('\n- ')}\n\n`;
    }

    if (result.international_perspective && result.international_perspective.length > 0) {
        content += `## International Perspective & Global Comparisons\n`;
        result.international_perspective.forEach(i => content += `- **${i.country_or_org}:** ${i.approach_or_comparison}\n`);
        content += `\n`;
    }

    content += `## High-Yield Facts for Prelims\n`;
    const prelimsF = result.prelims_facts;
    if (prelimsF.key_terms_and_definitions.length > 0) content += `### Key Terms\n- ${prelimsF.key_terms_and_definitions.join('\n- ')}\n`;
    if (prelimsF.legal_and_constitutional_provisions.length > 0) content += `### Legal Provisions mentioned in brief\n- ${prelimsF.legal_and_constitutional_provisions.join('\n- ')}\n`;
    if (prelimsF.reports_and_indices.length > 0) content += `### Reports & Indices\n- ${prelimsF.reports_and_indices.join('\n- ')}\n`;
    if (prelimsF.committees_and_bodies.length > 0) content += `### Committees & Bodies\n- ${prelimsF.committees_and_bodies.join('\n- ')}\n`;
    if (prelimsF.miscellaneous_facts.length > 0) content += `### Miscellaneous\n- ${prelimsF.miscellaneous_facts.join('\n- ')}\n`;
    content += `\n`;

    content += `## Key Data & Statistics\n`;
    result.key_data_and_statistics.forEach(d => content += `- **${d.statistic}** (Source: ${d.source}) - Relevance: ${d.relevance}\n`);
    content += `\n`;
    
    if (result.future_outlook) {
        content += `## Future Outlook\n${result.future_outlook}\n\n`;
    }

    content += `## Keywords & Terminology\n- ${result.keywords.join(', ')}\n\n`;

    content += `## Way Forward\n`;
    if (result.way_forward.short_term?.length > 0) {
        content += `### Short-Term Recommendations\n`;
        result.way_forward.short_term.forEach(wf => content += `- **${wf.recommendation}:** ${wf.justification}\n  - *Implementation Challenges:* ${wf.implementation_challenges}\n`);
    }
    if (result.way_forward.long_term?.length > 0) {
        content += `\n### Long-Term Recommendations\n`;
        result.way_forward.long_term.forEach(wf => content += `- **${wf.recommendation}:** ${wf.justification}\n  - *Implementation Challenges:* ${wf.implementation_challenges}\n`);
    }
    content += `\n`;

    if (result.related_pyqs && (result.related_pyqs.prelims?.length > 0 || result.related_pyqs.mains?.length > 0)) {
        content += `## Related Previous Year Questions\n`;
        if (result.related_pyqs.mains?.length > 0) content += `### Mains\n- ${result.related_pyqs.mains.join('\n- ')}\n\n`;
        if (result.related_pyqs.prelims?.length > 0) content += `### Prelims\n- ${result.related_pyqs.prelims.join('\n- ')}\n\n`;
    }

    return content;
};

// === HELPER HOOKS & COMPONENTS FOR ANIMATIONS ===

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

const AnimatedNumber: React.FC<{ text: string }> = ({ text }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [currentNumber, setCurrentNumber] = useState(0);
    const isOnScreen = useOnScreen(ref, '-50px');

    const { number, prefix, suffix } = useMemo(() => {
        const match = text.match(/(\D*\s?)(\d[\d,.]*)(\s?\D*)/);
        if (match) {
            const num = parseFloat(match[2].replace(/,/g, ''));
            return { number: isNaN(num) ? 0 : num, prefix: match[1] || '', suffix: match[3] || '' };
        }
        return { number: 0, prefix: text, suffix: '' };
    }, [text]);

    useEffect(() => {
        if (isOnScreen) {
            let start = 0;
            const end = number;
            if (start === end) {
                setCurrentNumber(end);
                return;
            }

            const duration = 1500;
            const startTime = performance.now();

            const step = (currentTime: number) => {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                const value = progress * end;
                
                const isFloat = number % 1 !== 0;
                setCurrentNumber(isFloat ? parseFloat(value.toFixed(2)) : Math.floor(value));
                
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    setCurrentNumber(number); // Ensure it ends on the exact number
                }
            };
            requestAnimationFrame(step);
        }
    }, [isOnScreen, number]);

    const formatNumber = (num: number) => {
        const isFloat = number % 1 !== 0;
        return num.toLocaleString(undefined, {
            minimumFractionDigits: isFloat ? 2 : 0,
            maximumFractionDigits: isFloat ? 2 : 0,
        });
    };

    return (
        <span ref={ref} aria-label={text}>
            {prefix}
            {formatNumber(isOnScreen ? currentNumber : 0)}
            {suffix}
        </span>
    );
};


// === MAIN COMPONENTS ===

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
            <h2>ChronoScout: Current Affairs Analyst</h2>
            <p className="subtitle">Get a 360-degree strategic breakdown of any current affairs topic for both Prelims and Mains.</p>
            <form onSubmit={handleSubmit} className="pyq-config-form">
                <div className="form-group">
                    <label htmlFor="topic-input">Current Affairs Topic</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g., 'Israel-Palestine Conflict', 'Uniform Civil Code', 'G20 Summit Outcomes'"
                        rows={3}
                        required
                    />
                </div>
                <button type="submit" className="action-button primary" disabled={isLoading || !topic.trim()}>
                    {isLoading ? 'Analyzing...' : 'Generate Analysis'}
                </button>
            </form>
        </div>
    );
};

const CardHeader: React.FC<{
    icon: React.ReactNode;
    title: string;
    onSimplify?: () => void;
    simplifyDisabled?: boolean;
}> = ({ icon, title, onSimplify, simplifyDisabled }) => (
    <div className="ca-card-header">
        <div className="ca-card-header-icon">
            <div className="icon-wrapper">{icon}</div>
            <h3>{title}</h3>
        </div>
        {onSimplify && (
            <button className="simplify-btn" onClick={onSimplify} disabled={simplifyDisabled} title="Simplify this section">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            </button>
        )}
    </div>
);


const GeneratedContentModal: React.FC<{ title: string; content: string; onCopy: () => void; onClose: () => void; }> = ({ title, content, onCopy, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{title}</h2>
                <div className="generated-content-modal">
                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(content) }}></div>
                </div>
                <div className="modal-actions">
                    <button className="modal-button secondary" onClick={onCopy}>Copy</button>
                    <button className="modal-button primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

const MagazineView: React.FC<{
    result: ChronoScoutResult,
    ai: GoogleGenAI
}> = ({ result, ai }) => {
    // States for interactive features
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [simplifiedContent, setSimplifiedContent] = useState<string | null>(null);
    const [simplifyError, setSimplifyError] = useState<string | null>(null);
    const [simplifyTitle, setSimplifyTitle] = useState('');

    const handleSimplify = async (title: string, content: string) => {
        setSimplifyTitle(`Simplified: ${title}`);
        setSimplifiedContent(null);
        setSimplifyError(null);
        setIsSimplifying(true);

        const prompt = `Explain the following text as if you were talking to a 15-year-old high school student. Use simple language, analogies, and break down complex terms. Do not add any new information. Just simplify this text:\n\n---\n\n${content}`;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setSimplifiedContent(response.text);
        } catch (err) {
            setSimplifyError("Sorry, an error occurred while simplifying this section.");
            console.error(err);
        } finally {
            setIsSimplifying(false);
        }
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

     // Animation Components
    const TimelineItem: React.FC<{ item: TimelineEvent; delay: number }> = ({ item, delay }) => {
        const ref = useRef<HTMLLIElement>(null);
        const isVisible = useOnScreen(ref, '-100px');
        return (
            <li ref={ref} className={isVisible ? 'is-visible' : ''} style={{ transitionDelay: `${delay}ms`}}>
                <div className="ca-timeline-date">{item.date}</div>
                <div className="ca-timeline-event">{item.event}</div>
            </li>
        );
    };
    
    const DataHighlightItem: React.FC<{ item: DataPoint; delay: number }> = ({ item, delay }) => {
        const ref = useRef<HTMLDivElement>(null);
        const isVisible = useOnScreen(ref, '-100px');
        return (
            <div className={`data-highlight-item ${isVisible ? 'is-visible' : ''}`} ref={ref} style={{ transitionDelay: `${delay}ms`}}>
                <div className="data-highlight-stat"><AnimatedNumber text={item.statistic} /></div>
                <div className="data-highlight-relevance">{item.relevance}</div>
                <div className="data-highlight-source">Source: {item.source}</div>
            </div>
        );
    };
    
    return (
        <>
        {simplifiedContent && (
            <GeneratedContentModal 
                title={simplifyTitle}
                content={simplifiedContent || (isSimplifying ? "Simplifying..." : "")}
                onCopy={() => handleCopy(simplifiedContent || "")}
                onClose={() => setSimplifiedContent(null)}
            />
        )}
        <div className="ca-magazine-grid">
            <div className="ca-main-col">
                <div className="ca-card" style={{ animationDelay: '300ms' }}>
                    <CardHeader 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>}
                        title="Multi-Dimensional Analysis"
                        onSimplify={() => handleSimplify('Multi-Dimensional Analysis', JSON.stringify(result.dynamic_dimensions))}
                    />
                    {result.dynamic_dimensions.map(dim => (
                        <div className="report-subsection" key={dim.dimension_name}>
                            <h4>{dim.dimension_name}</h4>
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(dim.detailed_analysis) }} />
                            {dim.potential_questions && dim.potential_questions.length > 0 &&
                                <div className="pyq-box" style={{marginTop: '1rem'}}>
                                    <h5>Potential Mains Questions</h5>
                                    <ul className="positive-list">{dim.potential_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                                </div>
                            }
                        </div>
                    ))}
                </div>

                <div className="ca-card" style={{ animationDelay: '450ms' }}>
                    <CardHeader 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 13-8-5 8-5 8 5-8 5z"/><path d="m12 21-8-5v-6.5l8 5 8-5V16l-8 5z"/></svg>}
                        title="Core Issue Analysis"
                        onSimplify={() => handleSimplify('Core Issue Analysis', JSON.stringify(result.core_issue_analysis))}
                    />
                     {result.core_issue_analysis.map((issue, i) => (
                        <div className="ca-core-issue" key={i}>
                            <h4>{issue.issue}</h4>
                            <div className="pros-cons-grid">
                                <div className="pros-column">
                                    <h5>Pros / Arguments For</h5>
                                    <ul>{issue.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                                </div>
                                <div className="cons-column">
                                    <h5>Cons / Arguments Against</h5>
                                    <ul>{issue.cons.map((p, i) => <li key={i}>{p}</li>)}</ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="ca-sidebar-col">
                <div className="ca-card" style={{ animationDelay: '600ms' }}>
                     <CardHeader 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        title="Timeline"
                    />
                    <ul className="ca-timeline">
                        {result.timeline.map((item, i) => (
                            <TimelineItem key={i} item={item} delay={i * 50} />
                        ))}
                    </ul>
                </div>

                {result.key_data_and_statistics && result.key_data_and_statistics.length > 0 &&
                    <div className="ca-card data-highlight-card" style={{ animationDelay: '700ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8a6 6 0 0 0-8.4-8.4"/><path d="M13 10.7a6 6 0 0 0-8.4 8.4"/></svg>}
                            title="Key Data"
                        />
                        {result.key_data_and_statistics.map((item, i) => (
                            <DataHighlightItem key={i} item={item} delay={i * 100} />
                        ))}
                    </div>
                }

                <div className="ca-card ca-card-prelims" style={{ animationDelay: '800ms' }}>
                    <CardHeader 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                        title="High-Yield Prelims Facts"
                        onSimplify={() => handleSimplify('High-Yield Prelims Facts', JSON.stringify(result.prelims_facts))}
                    />
                    {result.prelims_facts.key_terms_and_definitions?.length > 0 && <div><h5>Key Terms</h5><ul className="positive-list">{result.prelims_facts.key_terms_and_definitions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                    {result.prelims_facts.legal_and_constitutional_provisions?.length > 0 && <div><h5>Legal Provisions</h5><ul className="positive-list">{result.prelims_facts.legal_and_constitutional_provisions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                    {result.prelims_facts.reports_and_indices?.length > 0 && <div><h5>Reports & Indices</h5><ul className="positive-list">{result.prelims_facts.reports_and_indices.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                </div>
            </div>
        </div>
        </>
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

const SimpleView: React.FC<{ result: ChronoScoutResult }> = ({ result }) => {
    const [openSection, setOpenSection] = useState<string | null>('Summary');
    const toggleSection = (sectionTitle: string) => setOpenSection(prev => prev === sectionTitle ? null : sectionTitle);

    const renderList = (items: string[] | undefined) => {
        if (!items || items.length === 0) return <p>No information available.</p>;
        return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(items.map(p => `- ${p}`).join('\n')) }} />;
    };

    return (
        <div className="accordion" style={{marginTop: '2rem'}}>
            <SimpleNoteSection title="Summary" isOpen={openSection === 'Summary'} onToggle={() => toggleSection('Summary')}>
                <p>{result.summary}</p>
            </SimpleNoteSection>
            
            <SimpleNoteSection title="Timeline" isOpen={openSection === 'Timeline'} onToggle={() => toggleSection('Timeline')}>
                <ul className="ca-timeline" style={{paddingLeft: '1rem'}}>{result.timeline.map((item, i) => <li key={i}><div className="ca-timeline-date">{item.date}</div><div className="ca-timeline-event">{item.event}</div></li>)}</ul>
            </SimpleNoteSection>

            <SimpleNoteSection title="Historical Context" isOpen={openSection === 'Historical Context'} onToggle={() => toggleSection('Historical Context')}>
                 <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.historical_context) }} />
            </SimpleNoteSection>

             <SimpleNoteSection title="Core Issue Analysis" isOpen={openSection === 'Core Issue Analysis'} onToggle={() => toggleSection('Core Issue Analysis')}>
                 {result.core_issue_analysis.map((issue, i) => (
                    <div className="ca-core-issue" key={i}>
                        <h4>{issue.issue}</h4>
                        <div className="pros-cons-grid">
                            <div className="pros-column"><h5>Arguments For</h5><ul>{issue.pros.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                            <div className="cons-column"><h5>Arguments Against</h5><ul>{issue.cons.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                        </div>
                    </div>
                ))}
            </SimpleNoteSection>

            <SimpleNoteSection title="Multi-Dimensional Analysis" isOpen={openSection === 'Multi-Dimensional Analysis'} onToggle={() => toggleSection('Multi-Dimensional Analysis')}>
                {result.dynamic_dimensions.map((dim) => (
                    <div className="report-subsection" key={dim.dimension_name}>
                        <h4>{dim.dimension_name}</h4>
                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(dim.detailed_analysis) }} />
                    </div>
                ))}
            </SimpleNoteSection>


            <SimpleNoteSection title="Prelims Facts" isOpen={openSection === 'Prelims Facts'} onToggle={() => toggleSection('Prelims Facts')}>
                 {Object.entries(result.prelims_facts).map(([key, value]) => (
                     <div key={key}>
                        <h5>{key.replace(/_/g, ' ')}</h5>
                        {renderList(value as string[])}
                    </div>
                ))}
            </SimpleNoteSection>
        </div>
    );
};

const AnalysisResults: React.FC<{
    result: ChronoScoutResult;
    ai: GoogleGenAI;
    onReset: () => void;
}> = ({ result, ai, onReset }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [viewMode, setViewMode] = useState<'magazine' | 'simple'>('magazine');
    
    // States for interactive features
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<string | null>(null);
    const [isGeneratingMains, setIsGeneratingMains] = useState(false);
    const [generatedMains, setGeneratedMains] = useState<string | null>(null);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatInstanceRef = useRef<GenAIChat | null>(null);
    const chatHistoryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleExport = () => {
        setIsDownloading(true);
        const markdownContent = formatCaResultAsMarkdown(result);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ChronoScout_Analysis_${result.topic.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };
    
    const handleGenerateQuiz = async () => {
        setIsGeneratingQuiz(true);
        setGeneratedQuiz(null);
        const fullContext = formatCaResultAsMarkdown(result);
        const prompt = `Based on the following detailed analysis of the topic "${result.topic}", generate a 5-question multiple-choice quiz. The questions should test understanding of the key facts, concepts, and implications discussed in the text. Format the output as a clean markdown list. For each question, provide the correct answer on the line immediately after the options, prefixed with '**Answer:**'.\n\nCONTEXT:\n${fullContext}`;
        
        try {
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setGeneratedQuiz(response.text);
        } catch (err) {
            setGeneratedQuiz("Error generating quiz.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    const handleGenerateMains = async () => {
        setIsGeneratingMains(true);
        setGeneratedMains(null);
        const fullContext = formatCaResultAsMarkdown(result);
        const prompt = `Based on the following detailed analysis of the topic "${result.topic}", generate one relevant and thought-provoking UPSC Mains question. The question should be analytical and reflect the complexity of the topic. The question should be between 150-250 words.\n\nCONTEXT:\n${fullContext}`;
        
        try {
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setGeneratedMains(response.text);
        } catch (err) {
            setGeneratedMains("Error generating question.");
        } finally {
            setIsGeneratingMains(false);
        }
    };

     const handleSendChatMessage = async () => {
        if (!chatInput.trim() || isChatLoading) return;
        
        const message = chatInput.trim();
        setChatInput('');
        
        const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(updatedHistory);
        setIsChatLoading(true);

        if (!chatInstanceRef.current) {
            const fullContext = formatCaResultAsMarkdown(result);
            const systemInstruction = `You are a helpful AI assistant. The user has just read a detailed analysis on the topic "${result.topic}". Your role is to answer their follow-up questions based on the provided context. Do not invent information. If the answer isn't in the context, say so.\n\nFULL CONTEXT:\n${fullContext}`;
            chatInstanceRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction }
            });
        }

        try {
            const stream = await chatInstanceRef.current.sendMessageStream({ message });
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
            setChatHistory(prev => [...prev, { role: 'model', content: 'Sorry, I ran into an error.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="ca-magazine-container">
            {generatedQuiz && (
                <GeneratedContentModal 
                    title="Generated Quiz"
                    content={generatedQuiz}
                    onCopy={() => handleCopy(generatedQuiz)}
                    onClose={() => setGeneratedQuiz(null)}
                />
            )}
            {generatedMains && (
                <GeneratedContentModal 
                    title="Generated Mains Question"
                    content={generatedMains}
                    onCopy={() => handleCopy(generatedMains)}
                    onClose={() => setGeneratedMains(null)}
                />
            )}

            <header className="ca-magazine-header" style={{ animationDelay: '100ms' }}>
                <span className="ca-magazine-eyebrow">ChronoScout Analysis</span>
                <h1>{result.topic}</h1>
                <p className="ca-magazine-dek">{result.summary}</p>
                 <div className="ca-view-toggle">
                    <button className={viewMode === 'magazine' ? 'active' : ''} onClick={() => setViewMode('magazine')}>Magazine View</button>
                    <button className={viewMode === 'simple' ? 'active' : ''} onClick={() => setViewMode('simple')}>Simple View</button>
                </div>
            </header>

            {viewMode === 'magazine' ? (
                <MagazineView result={result} ai={ai} />
            ) : (
                <SimpleView result={result} />
            )}

            <div className="ca-card ca-full-width ca-interactive-actions" style={{marginTop: '1.5rem', animationDelay: '900ms'}}>
                <h3>Next Steps</h3>
                <div className="actions-grid">
                    <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <span>{isGeneratingQuiz ? 'Generating...' : 'Generate a 5-Question Quiz'}</span>
                    </button>
                    <button onClick={handleGenerateMains} disabled={isGeneratingMains}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        <span>{isGeneratingMains ? 'Generating...' : 'Generate a Mains Question'}</span>
                    </button>
                </div>
            </div>

             <div className="card ca-follow-up-chat" style={{ animationDelay: '1000ms' }}>
                <h3>Follow-up Chat</h3>
                <p className="chat-subtitle">Ask clarifying questions about this topic. The AI has the full context of this analysis.</p>
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
                    {isChatLoading && (
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
                        placeholder="e.g., Explain the international perspective in more detail..."
                        disabled={isChatLoading}
                    />
                    <button onClick={handleSendChatMessage} disabled={isChatLoading || !chatInput.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>

            <div className="results-actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                    {isDownloading ? 'Exporting...' : 'Export Full Analysis'}
                </button>
                <button className="action-button primary" onClick={onReset}>Analyze New Topic</button>
            </div>
        </div>
    );
};

const ProgressBar: React.FC<{ percentage: number; status: string }> = ({ percentage, status }) => {
    return (
        <div className="card progress-container" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Analysis Progress">
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

const AnalysisSkeleton = () => (
    <div className="ca-magazine-container skeleton-container">
        <header className="ca-magazine-header">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-text" style={{width: '80%', margin: '0 auto'}}></div>
            <div className="skeleton skeleton-text" style={{width: '75%', margin: '0.75rem auto 0'}}></div>
        </header>
        <div className="ca-magazine-grid">
            <div className="ca-main-col">
                <div className="ca-card">
                    <div className="skeleton skeleton-subtitle"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text"></div>
                </div>
                <div className="ca-card">
                    <div className="skeleton skeleton-subtitle"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text"></div>
                </div>
            </div>
            <div className="ca-sidebar-col">
                <div className="ca-card">
                    <div className="skeleton skeleton-subtitle"></div>
                    <div className="skeleton skeleton-text" style={{ height: '150px' }}></div>
                </div>
                <div className="ca-card">
                    <div className="skeleton skeleton-subtitle"></div>
                    <div className="skeleton skeleton-text"></div>
                </div>
            </div>
        </div>
    </div>
);


export const ChronoScoutApp: React.FC<{
    onAnalysisComplete?: (result: ChronoScoutResult) => void;
    initialData?: ChronoScoutResult | null;
}> = ({ onAnalysisComplete, initialData }) => {
    const [analysisResult, setAnalysisResult] = useState<ChronoScoutResult | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);
    
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const progressIntervalRef = useRef<number | null>(null);


    useEffect(() => {
        try {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            setError("Could not initialize AI service. Please check your API key setup.");
        }
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
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

        // --- Start Progress Simulation ---
        setStatusText("Analyzing topic with ChronoScout...");
        setProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = window.setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) {
                    if(progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return prev;
                }
                const increment = prev < 80 ? Math.floor(Math.random() * 5) + 1 : 1;
                return prev + increment;
            });
        }, 400);
        // --- End Progress Simulation ---


        const prompt = `You are a "UPSC Current Affairs Strategist" with deep domain expertise. Your primary directive is to use Google Search to find the **absolute latest news, data, and analysis** on a given topic, prioritizing information from the last 12-18 months. Your analysis MUST be dynamic and tailored to the nature of the topic.

**Topic for Analysis:** "${topic}"

**CORE DIRECTIVE: DYNAMIC, CONTEXT-AWARE ANALYSIS**
Before generating the JSON, first identify the primary domain of the topic (e.g., International Relations, Polity, Economy, Social Issues, Science & Tech, Culture). Then, tailor the content of your entire analysis based on the following domain-specific instructions. This is not optional.
- **If International Relations:** Your analysis must be India-centric. In 'key_stakeholders_analysis', clearly define who are India's allies, strategic partners, or adversaries in this context. In the relevant dimensions, provide a nuanced analysis of when India should adopt a positive/cooperative stance versus a cautious/critical one. Critically analyze the direct and indirect impacts on India's internal and external security.
- **If Economy:** Focus on the impact on India's GDP, fiscal policy, key sectors, and vulnerable populations. Use recent data from sources like the Economic Survey, RBI reports, etc.
- **If Polity/Governance:** Focus on constitutional provisions, legal frameworks, Supreme Court judgments, and the functioning of democratic institutions. Analyze the impact on citizen's rights and the federal structure.
- **If Social Issues:** Focus on the impact on different sections of society (women, children, marginalized communities), social equity, and justice. Use data from sources like NFHS, NCRB etc.
- **If Culture:** Focus on heritage, societal impact, evolution, and philosophical underpinnings.
- **Interconnectivity:** Throughout your analysis, you MUST identify and explain any significant inter-linkages. For example, if an IR topic has implications for internal security or the economy, detail these connections in the relevant sections.

**CRITICAL INSTRUCTIONS:**
1.  **Extensive & Recent Search:** You MUST use Google Search to find detailed and up-to-date information for every single field in the required JSON structure.
2.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object. Ensure all property names (keys) are enclosed in double quotes. Do not include any text, comments, or markdown formatting outside of this JSON structure.
3.  **JSON Structure**: The JSON object must conform to this highly detailed structure.
    {
      "topic": "The user-provided topic string",
      "summary": "A concise summary (2-3 sentences) of the topic and its core issue.",
      "timeline": [{"date": "Date of event", "event": "Description of event"}],
      "historical_context": "A narrative paragraph providing essential background information and its connection to any currently trending related news or events.",
      "constitutional_and_legal_provisions": [{"provision": "e.g., Article 14", "description": "A brief explanation of its relevance to the topic."}],
      "government_initiatives": [{"name": "Name of Scheme/Policy", "objective": "Main goal of the initiative.", "key_features": ["Array of key features."]}],
      "key_stakeholders_analysis": [{"name": "Stakeholder name", "role": "Their role", "interests": "What they want to achieve.", "influence": "Their level of power/influence (High/Medium/Low)."}],
      "dynamic_dimensions": [
          {
            "dimension_name": "The name of the first relevant dimension (e.g., 'Geopolitical Dimension')",
            "detailed_analysis": "Your analysis for this dimension. **This MUST be structured using Markdown.** Use headings ('##'), sub-headings ('###'), and bullet points ('-') to create a clear, organized breakdown. **Do not use long, unstructured paragraphs.**",
            "potential_questions": ["An array of potential Mains questions related to this specific dimension."]
          }
      ],
      "prelims_facts": {
          "key_terms_and_definitions": ["Array of important terms and definitions."],
          "reports_and_indices": ["Array of facts from relevant reports/indices."],
          "committees_and_bodies": ["Array identifying key committees or bodies."],
          "legal_and_constitutional_provisions": ["Array of relevant articles, laws, or amendments in brief."],
          "miscellaneous_facts": ["Array of other high-yield facts."]
      },
      "core_issue_analysis": [{"issue": "A central issue within the topic", "pros": ["Array of arguments for/in favor."], "cons": ["Array of arguments against/critical points."]}],
      "ethical_dilemmas": [{"dilemma": "A description of the ethical conflict.", "values_in_conflict": ["e.g., 'National Security vs. Privacy'"]}],
      "technological_dimensions": ["Array of strings discussing the tech angle, e.g., 'Use of AI in surveillance', 'Blockchain for land records.'"],
      "international_perspective": [{"country_or_org": "e.g., 'USA', 'OECD'", "approach_or_comparison": "Description of their approach or a comparison with India."}],
      "key_data_and_statistics": [{"statistic": "A specific, quantifiable data point.", "source": "Source of the data.", "relevance": "Why this statistic is important."}],
      "future_outlook": "A forward-looking paragraph on the future trajectory of this issue.",
      "keywords": ["Array of important keywords/terminology."],
      "way_forward": {
          "short_term": [{"recommendation": "A specific suggestion.", "justification": "Why this is important.", "implementation_challenges": "Potential hurdles."}],
          "long_term": [{"recommendation": "A specific suggestion.", "justification": "Why this is important.", "implementation_challenges": "Potential hurdles."}]
      },
      "related_pyqs": {
        "prelims": ["Array of relevant Prelims PYQs."],
        "mains": ["Array of relevant Mains PYQs."]
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

            const resultData: ChronoScoutResult = JSON.parse(jsonString);
            const finalResult = { ...resultData, topic };

            setAnalysisResult(finalResult);

            if (onAnalysisComplete) {
                onAnalysisComplete(finalResult);
            }

        } catch (err: any) {
            console.error("ChronoScout Analysis Failed:", err);
            let errorMessage = "Sorry, an error occurred while generating the analysis. Please try again later.";
            if (err.message && err.message.includes('JSON')) {
                 errorMessage = "The AI returned an invalid format. Please try rephrasing your topic or try again, as this can sometimes be a temporary issue.";
            }
            setError(errorMessage);
        } finally {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(100);
            setStatusText("Analysis complete!");
            setTimeout(() => {
                setIsLoading(false);
            }, 500);
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

            {!analysisResult && !isLoading && (
                <AnalysisConfig onGenerate={handleGenerateAnalysis} isLoading={isLoading} />
            )}
            
            {isLoading && (
                 <div className="pyq-container">
                    <ProgressBar percentage={progress} status={statusText} />
                    <AnalysisSkeleton />
                </div>
            )}

            {!isLoading && analysisResult && aiRef.current && (
                <AnalysisResults result={analysisResult} ai={aiRef.current} onReset={handleReset} />
            )}
        </div>
    );
};