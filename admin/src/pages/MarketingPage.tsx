import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, Timestamp, query, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import {
    Loader2, Sparkles, Copy, Check, Lightbulb, Plus, Trash2, MessageSquare, Tag, Link as LinkIcon, HelpCircle,
    Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- Interfaces ---

type AssetType = 'message' | 'offer' | 'value_prop' | 'faq' | 'link' | 'pro_logic';

interface MarketingTemplate {
    id: string;
    type: AssetType;
    title: string;
    content: string; // Markdown or simple text
    createdAt?: any;
    updatedAt?: any;
    tags?: string[];
}

// --- Component ---

export default function MarketingPage() {
    // Tabs: Library Tabs (Messages extracted etc), AI Generator
    // Default to 'message' (Post & DM Templates) as requested
    const [activeTab, setActiveTab] = useState<'generator' | AssetType>('message');

    // Library State
    const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null); // If set, shows editor modal
    const [isSaving, setIsSaving] = useState(false);

    // AI Generator State
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Twitter');
    const [tone, setTone] = useState('Professional');
    const [generatedCopy, setGeneratedCopy] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);

    // AI Variant Generator State (Exam Coach Pro)
    const [proValues, setProValues] = useState({ primary: '', secondary: '' });
    const [proVariants, setProVariants] = useState<{ primary: string; secondary: string }[]>([]);
    const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
    const [isLoadingPro, setIsLoadingPro] = useState(false);



    // --- Effects ---

    useEffect(() => {
        if (activeTab === 'pro_logic') {
            fetchProValues();
        } else {
            const unsubscribe = subscribeTemplates();
            return () => unsubscribe && unsubscribe();
        }
    }, [activeTab]);

    const fetchProValues = async () => {
        setIsLoadingPro(true);
        try {
            const ref = doc(db, 'marketing_assets', 'examcoach_pro');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                setProValues({
                    primary: data.pro_value_primary || '',
                    secondary: data.pro_value_secondary || ''
                });
            } else {
                // Default if missing
                setProValues({
                    primary: "Unlock Your Full Potential",
                    secondary: "Get unlimited access to AI-generated questions, advanced analytics, and domain mastery tracking."
                });
            }
        } catch (e) {
            console.error("Failed to fetch pro values", e);
        } finally {
            setIsLoadingPro(false);
        }
    };


    const subscribeTemplates = () => {
        const user = auth.currentUser;
        if (!user) return;
        setLoadingTemplates(true);

        const q = query(collection(db, 'admin_marketing_assets', user.uid, 'templates'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MarketingTemplate));
            setTemplates(loaded);
            setLoadingTemplates(false);
        });
    };

    // --- Actions: Library ---

    const handleSaveTemplate = async (template: MarketingTemplate) => {
        const user = auth.currentUser;
        if (!user) return;
        setIsSaving(true);

        try {
            const docRef = doc(db, 'admin_marketing_assets', user.uid, 'templates', template.id);
            await setDoc(docRef, {
                ...template,
                updatedAt: Timestamp.now(),
                createdAt: template.createdAt || Timestamp.now()
            });
            setEditingTemplate(null);
        } catch (e) {
            console.error("Failed to save template", e);
            alert("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this asset?")) return;

        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'admin_marketing_assets', user.uid, 'templates', id));
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const handleCreateNew = () => {
        const newTemplate: MarketingTemplate = {
            id: crypto.randomUUID(),
            type: activeTab === 'generator' ? 'message' : activeTab as AssetType,
            title: '',
            content: '',
            createdAt: null
        };
        setEditingTemplate(newTemplate);
    };

    // --- Actions: AI ---

    const handleGenerate = async () => {
        if (!topic) return;
        setIsGenerating(true);
        setGeneratedCopy('');

        try {
            const generateFn = httpsCallable(functions, 'generateMarketingCopy');
            const result = await generateFn({ topic, platform, tone }) as { data: { copy: string } };
            setGeneratedCopy(result.data.copy);
        } catch (error) {
            console.error("Failed to generate copy:", error);
            setGeneratedCopy("Error: Failed to generate copy. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateVariants = async () => {
        setIsGeneratingVariants(true);
        setProVariants([]);
        try {
            const generateFn = httpsCallable(functions, 'generateMarketingCopyVariants');
            const result = await generateFn({
                currentPrimary: proValues.primary,
                currentSecondary: proValues.secondary
            }) as { data: { variants: { primary: string, secondary: string }[] } };

            setProVariants(result.data.variants);
        } catch (error) {
            console.error("Failed to generate variants", error);
            alert("Failed to generate variants. Please try again.");
        } finally {
            setIsGeneratingVariants(false);
        }
    };

    const handleApplyVariant = (variant: { primary: string, secondary: string }) => {
        setProValues(variant);
        setProVariants([]); // Clear variants after selection to clean up UI
    };

    const handleSaveProValues = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'marketing_assets', 'examcoach_pro'), {
                pro_value_primary: proValues.primary,
                pro_value_secondary: proValues.secondary,
                updatedAt: Timestamp.now()
            }, { merge: true });
            alert("Saved successfully!");
        } catch (e) {
            console.error("Failed to save", e);
            alert("Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyText = (text: string) => {
        navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    // --- Render Helpers ---

    const filteredTemplates = templates.filter(t => t.type === activeTab);

    type TabItem = { id: string; label: string; icon: any };
    const libraryTabs: TabItem[] = [
        { id: 'message', label: 'Post & DM Templates', icon: MessageSquare },
        { id: 'offer', label: 'Trial & Upgrade Offers', icon: Tag },
        { id: 'value_prop', label: 'Core Messaging', icon: Lightbulb },
        { id: 'faq', label: 'FAQs', icon: HelpCircle },
        { id: 'faq', label: 'FAQs', icon: HelpCircle },
        { id: 'link', label: 'Approved URLs', icon: LinkIcon },
        { id: 'pro_logic', label: 'Exam Coach Pro Logic', icon: Sparkles },
    ];

    return (
        <div className="space-y-6 h-full flex flex-col relative">
            {/* Header & Tabs */}
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">Marketing Assets</h1>
                    <p className="text-slate-400 mt-1">
                        {activeTab === 'pro_logic'
                            ? "Configure the core value proposition displayed in the Exam Coach app."
                            : "Reusable library of messages, offers, and value props."}
                    </p>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-4">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-blue-300">Library Mode</h3>
                        <p className="text-sm text-blue-400/80 mt-1">Marketing Assets are reusable templates used by the Get Customers (Coach) workflow. During active outreach, you typically <strong>copy</strong> templates from the Coach workflow instead of editing them here.</p>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/5 pb-1">
                    <div className="flex flex-wrap gap-2">
                        {/* Library Tabs */}
                        {libraryTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 border-b-2 ${activeTab === tab.id ? 'border-brand-500 text-white bg-white/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                </div>

                {/* AI Generator Toggle (Hidden on Pro Logic tab) */}
                {activeTab !== 'pro_logic' && (
                    <button
                        onClick={() => setShowGenerator(!showGenerator)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${showGenerator ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-purple-300 hover:bg-purple-500/10'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Copywriter
                    </button>
                )}
            </div>


            {/* Content Area */}
            <div className="flex-1 overflow-auto min-h-0 custom-scrollbar pr-2 pb-20">

                {/* --- TAB: PRO LOGIC --- */}
                {activeTab === 'pro_logic' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">

                        {/* Editor Section */}
                        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Live Value Proposition</h2>
                                    <p className="text-slate-400 text-sm mt-1">This content appears on the Pricing Page, Upgrade Modal, and Diagnostic Reveal.</p>
                                </div>
                                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                    <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Live Production Data</p>
                                </div>
                            </div>

                            {isLoadingPro ? (
                                <div className="py-12 text-center text-slate-500">Loading current configuration...</div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Primary Headline (Single Sentence)</label>
                                        <input
                                            value={proValues.primary}
                                            onChange={e => setProValues({ ...proValues, primary: e.target.value })}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none font-medium text-lg"
                                            placeholder="e.g. Unlock Your Full Potential"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Supporting Line (Single Sentence)</label>
                                        <textarea
                                            value={proValues.secondary}
                                            onChange={e => setProValues({ ...proValues, secondary: e.target.value })}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none min-h-[100px] resize-none"
                                            placeholder="e.g. Get unlimited access to..."
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleSaveProValues}
                                            disabled={isSaving}
                                            className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            Save Changes
                                        </button>

                                        <button
                                            onClick={handleGenerateVariants}
                                            disabled={isGeneratingVariants}
                                            className="px-6 py-3 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isGeneratingVariants ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            Generate AI Variants
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Variants Output */}
                        {proVariants.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8">
                                <h3 className="text-lg font-bold text-slate-300 px-2">Generated Drafts (Click to Use)</h3>
                                <div className="grid gap-4">
                                    {proVariants.map((variant, idx) => (
                                        <div key={idx} className="bg-slate-900/50 border border-white/5 p-6 rounded-xl hover:border-purple-500/50 transition-all group relative">
                                            <div className="pr-24">
                                                <h4 className="text-white font-bold mb-1">{variant.primary}</h4>
                                                <p className="text-slate-400 text-sm">{variant.secondary}</p>
                                            </div>
                                            <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleApplyVariant(variant)}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg"
                                                >
                                                    Use This
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* --- AI GENERATOR (Standard) --- */}
                {activeTab !== 'pro_logic' && showGenerator && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 border-b border-white/5 pb-8">
                        <div className="bg-purple-500/5 p-6 rounded-2xl border border-purple-500/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">AI Copywriter</h2>
                                    <p className="text-sm text-slate-400">Use this to generate new ideas, then save them as templates.</p>
                                </div>
                            </div>

                            {/* Generator Inputs */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Topic</label>
                                        <textarea
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="What do you want to write about?"
                                            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 min-h-[80px] text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Platform</label>
                                            <select
                                                value={platform}
                                                onChange={(e) => setPlatform(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                            >
                                                <option>Twitter</option>
                                                <option>LinkedIn</option>
                                                <option>Instagram Caption</option>
                                                <option>Email Newsletter</option>
                                                <option>Blog Post Outline</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Tone</label>
                                            <select
                                                value={tone}
                                                onChange={(e) => setTone(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                            >
                                                <option>Professional</option>
                                                <option>Excited / Hype</option>
                                                <option>Educational</option>
                                                <option>Casual</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!topic || isGenerating}
                                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Generate
                                    </button>
                                </div>

                                <div className="bg-slate-950 rounded-xl p-4 border border-white/5 min-h-[150px] text-slate-300 prose prose-invert prose-sm max-w-none relative">
                                    {generatedCopy && (
                                        <button
                                            onClick={() => handleCopyText(generatedCopy)}
                                            className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {hasCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    )}
                                    {isGenerating ? (
                                        <div className="space-y-3 animate-pulse opacity-50">
                                            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                                            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                                            <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                                        </div>
                                    ) : (
                                        generatedCopy ? <ReactMarkdown>{generatedCopy}</ReactMarkdown> : <span className="text-slate-600 italic">Generated output will appear here...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: LIBRARY LIST --- */}
                {activeTab !== 'pro_logic' && (
                    <div className="space-y-6">
                        {/* Empty State / Add New */}
                        {filteredTemplates.length === 0 && !loadingTemplates ? (
                            <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-white/5 border-dashed">
                                <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Plus className="w-8 h-8 text-slate-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No assets found</h3>
                                <p className="text-slate-400 mb-6">Create your first {libraryTabs.find(t => t.id === activeTab)?.label} template.</p>
                                <button
                                    onClick={handleCreateNew}
                                    className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-lg"
                                >
                                    Create New Asset
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* Add New Card */}
                                <button
                                    onClick={handleCreateNew}
                                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-brand-500/50 transition-all group min-h-[200px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-all mb-3">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-slate-300 group-hover:text-white">Create New</span>
                                </button>

                                {loadingTemplates ? (
                                    <div className="col-span-full text-center py-10 text-slate-500">Loading assets...</div>
                                ) : (
                                    filteredTemplates.map(template => (
                                        <div key={template.id} className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 flex flex-col group hover:border-brand-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-slate-900 rounded-lg text-brand-400">
                                                    {(() => {
                                                        const TabIcon = libraryTabs.find(t => t.id === template.type)?.icon;
                                                        return TabIcon ? <TabIcon className="w-5 h-5" /> : null;
                                                    })()}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingTemplate(template)}
                                                        className="px-3 py-1.5 bg-slate-900 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                                                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{template.title}</h3>
                                            <div className="text-slate-400 text-sm line-clamp-3 mb-6 bg-slate-950/50 p-3 rounded-lg border border-white/5 flex-1 font-mono">
                                                {template.content || <span className="italic opacity-50">No content...</span>}
                                            </div>

                                            <button
                                                onClick={() => handleCopyText(template.content)}
                                                className="w-full py-2 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border border-brand-500/20 hover:border-brand-500"
                                            >
                                                {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                {hasCopied ? 'Copied' : 'Copy to Clipboard'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {
                editingTemplate && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">
                                    {editingTemplate.createdAt ? 'Edit Asset' : 'New Asset'}
                                </h2>
                                <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-white">Close</button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={editingTemplate.title}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                                        placeholder="e.g. Welcome Email Sequence"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex-1 flex flex-col min-h-[300px]">
                                    <label className="block text-sm font-bold text-slate-400 mb-2">Content (Markdown)</label>
                                    <textarea
                                        value={editingTemplate.content}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                                        className="w-full flex-1 bg-slate-950 border border-white/10 rounded-lg p-4 text-white font-mono text-sm focus:border-brand-500 focus:outline-none resize-none"
                                        placeholder="# Heading\n\nYour content here..."
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingTemplate(null)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveTemplate(editingTemplate)}
                                    disabled={!editingTemplate.title || !editingTemplate.content || isSaving}
                                    className="px-5 py-2.5 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Asset
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
