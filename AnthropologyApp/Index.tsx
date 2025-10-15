import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

declare var marked: any;

// === DETAILED SYLLABUS DATA ===
const DETAILED_ANTHROPOLOGY_SYLLABUS = {
    "Paper 1": {
        "1. Anthropology - Discipline and Development": [
            "1.1 Meaning, scope and development of Anthropology.",
            "1.2 Relationships with other disciplines: Social Sciences, Behavioural Sciences, Life Sciences, Medical Sciences, Earth Sciences and Humanities.",
            "1.3 Main branches of Anthropology, their scope and relevance: Social-cultural Anthropology, Biological Anthropology, Archaeological Anthropology, Linguistic Anthropology.",
            "1.4 Human Evolution and emergence of Man: Biological and Cultural factors in human evolution.",
            "1.5 Theories of Organic Evolution (Pre- Darwinian, Darwinian and Post-Darwinian).",
            "1.6 Synthetic theory of evolution; Brief outline of terms and concepts of evolutionary biology."
        ],
        "2. Primate Study and Human Evolution": [
            "2.1 Characteristics of Primates; Evolutionary Trend and Primate Taxonomy; Primate Adaptations (Arboreal and Terrestrial).",
            "2.2 Primate Taxonomy; Primate Behaviour; Tertiary and Quaternary fossil primates; Living Major Primates.",
            "2.3 Comparative Anatomy of Man and Apes.",
            "2.4 Skeletal changes due to erect posture and its implications."
        ],
        "3. Fossil Evidence and Hominid Evolution": [
            "3.1 Phylogenetic status, characteristics and geographical distribution of Plio-pleistocene hominids in South and East Africa — Australopithecines.",
            "3.2 Homo erectus: Africa (Paranthropus), Europe (Homo heidelbergensis), Asia (Homo erectus).",
            "3.3 Neanderthal Man—La-Chapelle-aux-saints (Classical type), Mt. Carmel (Progressive type).",
            "3.4 Rhodesian man.",
            "3.5 Homo sapiens — Cromagnon, Grimaldi and Chancelede."
        ],
        "4. The Nature of Culture and Society": [
            "4.1 The Nature of Culture: The concept and characteristics of culture and civilization; Ethnocentrism vis-a-vis cultural Relativism.",
            "4.2 The Nature of Society: Concept of Society; Society and Culture; Social Institutions; Social groups; and Social stratification.",
        ],
        "5. Foundational Social Institutions": [
            "5.1 Marriage: Definition and universality; Laws of marriage (endogamy, exogamy, hypergamy, hypogamy, incest taboo); Types of marriage; Functions of marriage; Marriage regulations; Marriage payments.",
            "5.2 Family: Definition and universality; Family, household and domestic groups; functions of family; Types of family; Impact of social change on family.",
            "5.3 Kinship: Consanguinity and Affinity; Principles and types of descent; Forms of descent groups; Kinship terminology; Descent, Filiation and Complimentary Filiation; Descent and Alliance."
        ],
        "6. Economic and Political Anthropology": [
            "6.1 Economic Anthropology: Meaning, scope and relevance; Formalist and Substantivist debate; Principles governing production, distribution and exchange; globalization and indigenous economic systems.",
            "6.2 Political Anthropology: Meaning, scope and relevance; Concepts of power, authority and legitimacy; Social control, law and justice in simple societies; Political systems in simple societies; concepts of nation-state and stateless-nations."
        ],
        "7. Religion, Magic, and Science": [
            "7.1 Religion: Anthropological approaches to the study of religion (evolutionary, psychological and functional); Monotheism and polytheism; Sacred and profane; Myths and rituals; Forms of religion in tribal and peasant societies; Religion, magic and science distinguished; Magico-religious functionaries.",
        ],
        "8. Anthropological Theories": [
            "8.1 Classical evolutionism (Tylor, Morgan and Frazer)",
            "8.2 Historical particularism (Boas); Diffusionism (British, German and American)",
            "8.3 Functionalism (Malinowski); Structural- functionalism (Radcliffe-Brown)",
            "8.4 Structuralism (L’evi - Strauss and E. Leach)",
            "8.5 Culture and personality (Benedict, Mead, Linton, Kardiner and Cora - du Bois)",
            "8.6 Neo - evolutionism (Childe, White, Steward, Sahlins and Service)",
            "8.7 Cultural materialism (Harris)",
            "8.8 Symbolic and interpretive theories (Turner, Schneider and Geertz)",
            "8.9 Cognitive theories (Tyler, Conklin)",
            "8.10 Post-modernism in anthropology"
        ],
        "9. Research Methods in Anthropology": [
            "9.1 Fieldwork tradition in anthropology",
            "9.2 Distinction between technique, method and methodology",
            "9.3 Tools of data collection: observation, interview, schedules, questionnaire, Case study, genealogy, life-history, oral history, secondary sources of information, participatory methods.",
            "9.4 Analysis, interpretation and presentation of data."
        ],
    },
    "Paper 2": {
        "1. Evolution of Indian Culture & Civilization": [
            "1.1 Prehistoric (Paleolithic, Mesolithic, Neolithic and Neolithic-Chalcolithic) cultures.",
            "1.2 Protohistoric (Indus Civilization): Origin, distribution, scripts, urban life, subsistence pattern.",
            "1.3 Contributions of tribal cultures to Indian civilization."
        ],
        "2. Demography of Indian Populations": [
            "2.1 Paleo-demography of India.",
            "2.2 Ethnic and linguistic elements in the Indian population and their distribution.",
            "2.3 Indian population - factors influencing its structure and growth."
        ],
        "3. Traditional Indian Social System": [
            "3.1 Structure and nature of traditional Indian social system — Varnashram, Purushartha, Karma, Rina and Rebirth.",
            "3.2 Caste system in India: structure and characteristics, Varna and caste, Theories of origin of caste system, Dominant caste, Caste mobility, Jajmani system.",
            "3.3 Sacred Complex and Nature-Man-Spirit Complex."
        ],
        "4. Emergence of Indian Anthropology": [
            "4.1 History of administration and anthropology in India.",
            "4.2 Contributions of 18th, 19th and early 20th Century scholar-administrators.",
            "4.3 Contributions of Indian anthropologists to tribal and caste studies."
        ],
        "5. Indian Village Studies": [
            "5.1 Significance of village study in India; Indian village as a social system.",
            "5.2 Traditional and changing patterns of settlement and inter-caste relations.",
            "5.3 Agrarian relations in Indian villages; impact of globalization on Indian villages."
        ],
        "6. Weaker Sections of Indian Society": [
            "6.1 Scheduled Castes, Scheduled Tribes and Other Backward Classes: Constitutional provisions.",
            "6.2 Social, economic and educational development of weaker sections and their problems.",
            "6.3 The concept of ethnicity; Ethnic conflicts and political developments; Unrest among tribal communities."
        ],
        "7. Tribal India - Problems & Development": [
            "7.1 Problems of the tribal Communities — land alienation, poverty, indebtedness, low literacy, poor educational facilities, unemployment, health and nutrition.",
            "7.2 Developmental projects and their impact on tribal displacement and problems of rehabilitation.",
            "7.3 Administration of tribal areas, tribal policies, plans, and Five-Year Plans.",
            "7.4 The concept of PTGs (Primitive Tribal Groups), their distribution, special programmes for their development.",
            "7.5 Role of NGOs in tribal development."
        ],
    }
};


// === TYPE DEFINITIONS ===

type KeyConcept = {
    concept: string;
    explanation: string;
};

type AssociatedThinker = {
    name:string;
    contribution: string;
};

type EthnographicExample = {
    study: string;
    ethnographer: string;
    relevance: string;
};

export type AnthropologyAnalysisResult = {
    topic: string;
    introduction: string;
    key_concepts: KeyConcept[];
    associated_thinkers: AssociatedThinker[];
    ethnographic_examples: EthnographicExample[];
    criticisms: string[];
    contemporary_relevance: string[];
    related_pyqs: {
        paper1?: string[];
        paper2?: string[];
    };
};

const formatAnthroResultAsMarkdown = (result: AnthropologyAnalysisResult): string => {
    let content = `# Anthro Architect Analysis: ${result.topic}\n\n`;
    content += `## Introduction\n${result.introduction}\n\n`;

    content += `## Key Concepts\n`;
    result.key_concepts.forEach(c => content += `### ${c.concept}\n${c.explanation}\n\n`);

    content += `## Associated Thinkers\n`;
    result.associated_thinkers.forEach(t => content += `### ${t.name}\n${t.contribution}\n\n`);

    content += `## Ethnographic Examples\n`;
    result.ethnographic_examples.forEach(e => content += `### ${e.study} (by ${e.ethnographer})\n${e.relevance}\n\n`);

    content += `## Criticisms\n- ${result.criticisms.join('\n- ')}\n\n`;
    content += `## Contemporary Relevance\n- ${result.contemporary_relevance.join('\n- ')}\n\n`;

    content += `## Related PYQs\n`;
    // FIX: Check for property existence before accessing it to ensure type safety with optional properties.
    if (result.related_pyqs?.paper1 && result.related_pyqs.paper1.length > 0) {
        content += `### Paper 1\n- ${result.related_pyqs.paper1.join('\n- ')}\n\n`;
    }
    // FIX: Check for property existence before accessing it to ensure type safety with optional properties.
    if (result.related_pyqs?.paper2 && result.related_pyqs.paper2.length > 0) {
        content += `### Paper 2\n- ${result.related_pyqs.paper2.join('\n- ')}\n\n`;
    }

    return content;
};

// === COMPONENTS ===

const SyllabusExplorer: React.FC<{
    onGenerate: (topic: string) => void;
    isLoading: boolean;
}> = ({ onGenerate, isLoading }) => {
    const [mode, setMode] = useState<'explore' | 'custom'>('explore');
    const [selectedPaper, setSelectedPaper] = useState<string>('Paper 1');
    const [selectedChapter, setSelectedChapter] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [customTopic, setCustomTopic] = useState('');

    const chapters = Object.keys(DETAILED_ANTHROPOLOGY_SYLLABUS[selectedPaper as keyof typeof DETAILED_ANTHROPOLOGY_SYLLABUS] || {});
    const topics = DETAILED_ANTHROPOLOGY_SYLLABUS[selectedPaper as keyof typeof DETAILED_ANTHROPOLOGY_SYLLABUS][selectedChapter as keyof typeof DETAILED_ANTHROPOLOGY_SYLLABUS[keyof typeof DETAILED_ANTHROPOLOGY_SYLLABUS]] || [];
    
    useEffect(() => {
        if (chapters.length > 0) {
            setSelectedChapter(chapters[0]);
        } else {
            setSelectedChapter('');
        }
        setSelectedTopic('');
    }, [selectedPaper]);
    
    useEffect(() => {
        if (topics.length > 0) {
            setSelectedTopic(topics[0]);
        } else {
            setSelectedTopic('');
        }
    }, [selectedChapter]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const topicToGenerate = mode === 'explore' ? selectedTopic : customTopic;
        if (topicToGenerate.trim()) {
            onGenerate(topicToGenerate.trim());
        }
    };

    return (
        <div className="card pyq-config-container">
            <h2>Anthro Architect</h2>
            <p className="subtitle">Explore the syllabus or enter a custom topic to generate a detailed, academic-level analysis.</p>
            <form onSubmit={handleSubmit} className="pyq-config-form" style={{maxWidth: 'none'}}>
                <div className="form-group">
                    <label>Input Method</label>
                    <div className="input-mode-selector">
                        <button type="button" className={mode === 'explore' ? 'active' : ''} onClick={() => setMode('explore')}>Explore Syllabus</button>
                        <button type="button" className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>Custom Topic</button>
                    </div>
                </div>

                {mode === 'explore' ? (
                    <div className="syllabus-explorer-container">
                        <div className="syllabus-column">
                            <h4>Paper</h4>
                            <div className="syllabus-list paper-selector">
                                {Object.keys(DETAILED_ANTHROPOLOGY_SYLLABUS).map(paper => (
                                    <button type="button" key={paper} className={`syllabus-item ${selectedPaper === paper ? 'active' : ''}`} onClick={() => setSelectedPaper(paper)}>
                                        {paper}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="syllabus-column">
                            <h4>Chapter</h4>
                            <div className="syllabus-list">
                                {chapters.map(chapter => (
                                    <button type="button" key={chapter} className={`syllabus-item ${selectedChapter === chapter ? 'active' : ''}`} onClick={() => setSelectedChapter(chapter)}>
                                        {chapter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="syllabus-column">
                            <h4>Topic</h4>
                            <div className="syllabus-list">
                                {topics.map(topic => (
                                    <button type="button" key={topic} className={`syllabus-item ${selectedTopic === topic ? 'active' : ''}`} onClick={() => setSelectedTopic(topic)}>
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="form-group">
                        <label htmlFor="topic-input">Custom Topic / Thinker</label>
                        <textarea
                            id="topic-input"
                            value={customTopic}
                            onChange={e => setCustomTopic(e.target.value)}
                            placeholder="e.g., 'Functionalism', 'Levi-Strauss', 'Kula Ring', 'Cultural Relativism'"
                            rows={3}
                            required
                        />
                    </div>
                )}
                
                <div className="syllabus-selection-footer">
                    {mode === 'explore' && selectedTopic && (
                        <p><strong>Selected:</strong> {selectedTopic}</p>
                    )}
                    <button 
                        type="submit" 
                        className="action-button primary" 
                        disabled={isLoading || (mode === 'explore' && !selectedTopic) || (mode === 'custom' && !customTopic.trim())}
                    >
                        {isLoading ? 'Analyzing...' : 'Generate Analysis'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; }> = ({ icon, title }) => (
    <div className="ca-card-header">
        <div className="ca-card-header-icon">
            <div className="icon-wrapper">{icon}</div>
            <h3>{title}</h3>
        </div>
    </div>
);

const AnalysisResults: React.FC<{
    result: AnthropologyAnalysisResult;
    onReset: () => void;
}> = ({ result, onReset }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleExport = () => {
        setIsDownloading(true);
        const markdownContent = formatAnthroResultAsMarkdown(result);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Anthro_Analysis_${result.topic.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    return (
        <div className="ca-magazine-container">
            <header className="ca-magazine-header" style={{ animation: 'fade-in-up 0.5s ease-out' }}>
                <span className="ca-magazine-eyebrow">Anthro Architect Analysis</span>
                <h1>{result.topic}</h1>
                <p className="ca-magazine-dek">{result.introduction}</p>
            </header>
            
            <div className="ca-magazine-grid">
                <div className="ca-main-col">
                    <div className="ca-card" style={{ animationDelay: '200ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>}
                            title="Key Concepts" 
                        />
                        {result.key_concepts.map(c => (
                            <div className="report-subsection" key={c.concept}>
                                <h4>{c.concept}</h4>
                                <p>{c.explanation}</p>
                            </div>
                        ))}
                    </div>

                    <div className="ca-card" style={{ animationDelay: '300ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                            title="Associated Thinkers" 
                        />
                        {result.associated_thinkers.map(t => (
                            <div className="report-subsection" key={t.name}>
                                <h4>{t.name}</h4>
                                <p>{t.contribution}</p>
                            </div>
                        ))}
                    </div>

                    <div className="ca-card" style={{ animationDelay: '400ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
                            title="Criticisms" 
                        />
                        <ul className="negative-list">{result.criticisms.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                     <div className="ca-card" style={{ animationDelay: '500ms' }}>
                        <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                            title="Contemporary Relevance" 
                        />
                        <ul className="positive-list">{result.contemporary_relevance.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                </div>
                
                <div className="ca-sidebar-col">
                    <div className="ca-card" style={{ animationDelay: '600ms' }}>
                         <CardHeader 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
                            title="Ethnographic Examples" 
                        />
                         {result.ethnographic_examples.map(e => (
                            <div className="report-subsection" key={e.study}>
                                <h4>{e.study} <span style={{fontWeight: 400, color: 'var(--text-secondary)'}}> (by {e.ethnographer})</span></h4>
                                <p>{e.relevance}</p>
                            </div>
                        ))}
                    </div>

                    {result.related_pyqs && (result.related_pyqs.paper1?.length > 0 || result.related_pyqs.paper2?.length > 0) &&
                        <div className="ca-card" style={{ animationDelay: '700ms' }}>
                            <CardHeader 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                                title="Related PYQs"
                            />
                             <div className="pyq-box">
                                {/* FIX: Check for property existence before checking length and accessing it to prevent type errors. */}
                                {result.related_pyqs.paper1 && result.related_pyqs.paper1.length > 0 && (
                                    <>
                                        <h5>Paper 1</h5>
                                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.related_pyqs.paper1.map(q => `- ${q}`).join('\n')) }} />
                                    </>
                                )}
                                 {/* FIX: Check for property existence before checking length and accessing it to prevent type errors. */}
                                 {result.related_pyqs.paper2 && result.related_pyqs.paper2.length > 0 && (
                                    <>
                                        <h5 style={{marginTop: result.related_pyqs.paper1?.length > 0 ? '1.5rem' : '0' }}>Paper 2</h5>
                                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(result.related_pyqs.paper2.map(q => `- ${q}`).join('\n')) }} />
                                    </>
                                 )}
                            </div>
                        </div>
                    }
                </div>
            </div>

            <div className="results-actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                <button className="action-button secondary" onClick={handleExport} disabled={isDownloading}>
                    {isDownloading ? 'Exporting...' : 'Export Analysis'}
                </button>
                <button className="action-button primary" onClick={onReset}>Start New Analysis</button>
            </div>
        </div>
    );
};

export const AnthropologyApp: React.FC<{
    onAnalysisComplete?: (result: AnthropologyAnalysisResult) => void;
    initialData?: AnthropologyAnalysisResult | null;
}> = ({ onAnalysisComplete, initialData }) => {
    const [analysisResult, setAnalysisResult] = useState<AnthropologyAnalysisResult | null>(initialData || null);
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
            You are a distinguished University Professor of Anthropology, acting as a specialist mentor for a UPSC (Indian Civil Services) optional paper student. Your analysis must be of the highest academic quality, deeply researched, nuanced, and structured for exam preparation.

            **Topic/Thinker for Analysis:** "${topic}"

            **CRITICAL INSTRUCTIONS:**
            1.  **Deep Research & Sourcing:** Act as a researcher. Use Google Search extensively to consult academic journals, seminal texts, and authoritative sources. When explaining concepts or contributions, implicitly reference the core ideas from major anthropological works. For example, instead of "Malinowski studied the Trobriand Islanders," say "In works like 'Argonauts of the Western Pacific,' Malinowski detailed the Kula Ring among the Trobriand Islanders to illustrate..."
            2.  **Comprehensive & Structured Output:** Your analysis must deconstruct the topic from multiple angles, providing a 360-degree view.
            3.  **Nuanced Criticisms:** The 'criticisms' section must be detailed, presenting specific counter-arguments, later developments that challenged the theory, and limitations of the concept or thinker's work. Name the critics where possible.
            4.  **Classic Ethnography:** The 'ethnographic_examples' must be classic, well-known studies that are essential for any anthropology student to know in relation to the topic.
            5.  **Rigorous PYQ Search:** Find and include Previous Year Questions (PYQs) from both Paper 1 and Paper 2 that are directly or thematically related to the topic.
            6.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object. Do not include any text, comments, or markdown formatting outside of the JSON structure.
        `;

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING },
                            introduction: { type: Type.STRING },
                            key_concepts: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { concept: { type: Type.STRING }, explanation: { type: Type.STRING } },
                                    required: ['concept', 'explanation']
                                }
                            },
                            associated_thinkers: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { name: { type: Type.STRING }, contribution: { type: Type.STRING } },
                                    required: ['name', 'contribution']
                                }
                            },
                            ethnographic_examples: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { study: { type: Type.STRING }, ethnographer: { type: Type.STRING }, relevance: { type: Type.STRING } },
                                    required: ['study', 'ethnographer', 'relevance']
                                }
                            },
                            criticisms: { type: Type.ARRAY, items: { type: Type.STRING } },
                            contemporary_relevance: { type: Type.ARRAY, items: { type: Type.STRING } },
                            related_pyqs: {
                                type: Type.OBJECT,
                                properties: {
                                    paper1: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    paper2: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        },
                        required: ['topic', 'introduction', 'key_concepts', 'associated_thinkers', 'ethnographic_examples', 'criticisms', 'contemporary_relevance', 'related_pyqs']
                    }
                }
            });

            const resultData: AnthropologyAnalysisResult = JSON.parse(response.text);
            const finalResult = { ...resultData, topic: topic }; 

            setAnalysisResult(finalResult);

            if (onAnalysisComplete) {
                onAnalysisComplete(finalResult);
            }

        } catch (err: any) {
            console.error("Anthro Architect Failed:", err);
            let errorMessage = "Sorry, an error occurred while generating the analysis. Please try again later.";
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
                <SyllabusExplorer onGenerate={handleGenerateAnalysis} isLoading={isLoading} />
            )}
        </div>
    );
};
