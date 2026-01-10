import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
    CheckCircle2, Circle, Loader2, Sparkles, Copy, Check,
    BarChart3, Users, DollarSign, Activity, Target,
    Lightbulb, ArrowRight, HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

// --- Interfaces ---
interface ToolAction {
    tab: 'tools';
    topic: string;
    platform: string;
    tone?: string;
}

interface ChecklistItem {
    id: string;
    task: string;
    category: 'Launch' | 'Growth' | 'Retention';
    completed: boolean;
    rationale?: string;
    toolAction?: ToolAction;
}

interface MarketStats {
    date: string;
    visitors: number;
    signups: number;
    activations: number;
    upgrades: number;
    revenue: number;
    sources: { organic: number; social: number; direct: number; ads: number };
}

// --- Initial Data ---
const INITIAL_CHECKLIST: ChecklistItem[] = [
    {
        id: '1',
        task: 'Optimize App Store Screenshots',
        category: 'Launch',
        completed: false,
        rationale: 'Screenshots are the #1 driver of install conversion rates.'
    },
    {
        id: '2',
        task: 'Submit to ProductHunt',
        category: 'Launch',
        completed: false,
        rationale: 'Driving initial traffic spike and backlink authority.'
    },
    {
        id: '3',
        task: 'Write "How AI Reduces PMP Study Time" Blog Post',
        category: 'Launch',
        completed: false,
        rationale: 'Educates users on value prop (Efficiency) to drive signups.',
        toolAction: { tab: 'tools', topic: 'How AI Reduces PMP Study Time by 50%', platform: 'Blog Post Outline', tone: 'Educational' }
    },
    {
        id: '4',
        task: 'Set up Social Media Bios',
        category: 'Launch',
        completed: false,
        rationale: 'Trust signal for users checking brand legitimacy.'
    },
    {
        id: '5',
        task: 'Post "Launch Announcement" on LinkedIn',
        category: 'Growth',
        completed: false,
        rationale: 'Leverage professional network for B2B/Certification audience.',
        toolAction: { tab: 'tools', topic: 'We just launched Exam Coach Pro AI to help you pass the PMP exam!', platform: 'LinkedIn', tone: 'Excited / Hype' }
    },
    {
        id: '6',
        task: 'Reach out to 5 niche influencers',
        category: 'Growth',
        completed: false,
        rationale: 'Social proof drives higher conversion than cold ads.'
    },
    {
        id: '7',
        task: 'Setup "Welcome" Email Drip',
        category: 'Retention',
        completed: false,
        rationale: 'Onboarding emails increase activation rate by ~15%.',
        toolAction: { tab: 'tools', topic: 'Welcome to Exam Coach Pro AI! Here is how to get started...', platform: 'Email Newsletter', tone: 'Professional' }
    },
];

export default function MarketingPage() {
    const [activeTab, setActiveTab] = useState<'performance' | 'strategy' | 'tools'>('performance');

    // --- State: Strategy ---
    const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
    const progress = Math.round((checklist.filter(i => i.completed).length / checklist.length) * 100);

    // --- State: Tools (AI Copywriter) ---
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Twitter');
    const [tone, setTone] = useState('Professional');
    const [generatedCopy, setGeneratedCopy] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    // --- State: Performance ---
    const [stats, setStats] = useState<MarketStats[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    // --- Effects ---
    useEffect(() => {
        if (activeTab === 'performance') {
            loadStats();
        }
    }, [activeTab]);

    const loadStats = async () => {
        try {
            const getStatsFn = httpsCallable(functions, 'getMarketingAnalytics');
            const result = await getStatsFn() as { data: { stats: MarketStats[] } };
            setStats(result.data.stats);
        } catch (error) {
            console.error("Failed to load stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    // --- Actions ---
    const toggleCheck = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setChecklist(prev => prev.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        ));
    };

    const handleTaskAction = (item: ChecklistItem) => {
        if (item.toolAction) {
            setTopic(item.toolAction.topic);
            setPlatform(item.toolAction.platform);
            if (item.toolAction.tone) setTone(item.toolAction.tone);
            setActiveTab(item.toolAction.tab);
        }
    };

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

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCopy);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    // --- Performance Calculations ---
    const totalVisitors = stats.reduce((acc, curr) => acc + curr.visitors, 0);
    const totalSignups = stats.reduce((acc, curr) => acc + curr.signups, 0);
    const totalUpgrades = stats.reduce((acc, curr) => acc + curr.upgrades, 0);
    const totalRevenue = stats.reduce((acc, curr) => acc + curr.revenue, 0);

    const conversionRate = totalVisitors > 0 ? ((totalSignups / totalVisitors) * 100).toFixed(1) : '0.0';
    const upgradeRate = totalSignups > 0 ? ((totalUpgrades / totalSignups) * 100).toFixed(1) : '0.0';

    // Funnel Data
    const funnelData = [
        { name: 'Visitors', value: totalVisitors, fill: '#94a3b8' },
        { name: 'Signups', value: totalSignups, fill: '#3b82f6' },
        { name: 'Activations', value: Math.round(totalSignups * 0.8), fill: '#8b5cf6' }, // Est. activation
        { name: 'Paid Users', value: totalUpgrades, fill: '#10b981' },
    ];

    // Recommendations Logic (Advanced)
    const getRecommendations = () => {
        const recs = [];
        const signupConv = parseFloat(conversionRate);
        const paidConv = parseFloat(upgradeRate);

        // 1. TRACKING GAPS (Impossible Data)
        if (totalSignups > totalVisitors && totalVisitors > 0) {
            recs.push({
                title: 'Data Integrity Alert',
                desc: `More signups (${totalSignups}) than visitors (${totalVisitors}). Analytics tag might be missing on Landing Page.`,
                action: 'Check "visited_site" event firing.',
                impact: 'Critical',
                color: 'text-red-500' // Red for broken
            });
            return recs; // Stop here if data is broken
        }

        // 2. FLOW BREAKAGE (Technical Failure)
        if (totalVisitors > 100 && totalSignups === 0) {
            recs.push({
                title: 'Likely Technical Failure',
                desc: `0 signups from ${totalVisitors} visitors. The signup form or auth service may be down.`,
                action: 'Test Signup Flow immediately.',
                impact: 'Critical',
                color: 'text-red-500'
            });
            return recs;
        }

        // 3. INTEREST PROBLEM (Low Traffic)
        if (totalVisitors < 100) {
            recs.push({
                title: 'Insufficient Data / Low Traffic',
                desc: `Only ${totalVisitors} visitors. Hard to optimize conversion without more volume.`,
                action: 'Focus on Top-of-Funnel (Social/Ads) content.',
                impact: 'High',
                color: 'text-amber-400'
            });
        }

        // 4. CLARITY PROBLEM (High Traffic, Low Conversion)
        else if (signupConv < 2.5) {
            recs.push({
                title: 'Clarity / Value Prop Issue',
                desc: `Traffic is arriving, but not converting (${signupConv}%). Users might be confused or unconvinced.`,
                action: 'Simplify Headline & add Social Proof.',
                impact: 'High',
                color: 'text-amber-400'
            });
        }
        else if (signupConv < 5) {
            recs.push({
                title: 'Optimization Opportunity',
                desc: `Conversion is ${signupConv}% (Okay). Can push to 8%+ with better targeting.`,
                action: 'Refine Ad/Content messaging audience match.',
                impact: 'Medium',
                color: 'text-blue-400'
            });
        }

        // 5. RETENTION/OFFER PROBLEM (Low Upgrades)
        if (totalSignups > 10 && paidConv < 2) {
            recs.push({
                title: 'Paid Offer Friction',
                desc: `Only ${paidConv}% upgrade. The Free plan might be too generous, or Premium value unclear.`,
                action: 'Add meaningful gate to Free tier.',
                impact: 'High',
                color: 'text-amber-400'
            });
        }

        // Default Healthy State
        if (recs.length === 0) {
            recs.push({
                title: 'Growth is Healthy',
                desc: 'All funnel metrics are within green benchmarks.',
                action: 'Scale traffic sources to leverage good conversion.',
                impact: 'Positive',
                color: 'text-emerald-400'
            });
        }
        return recs;
    };

    return (
        <div className="space-y-8 h-full flex flex-col">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">Marketing Command</h1>
                    <p className="text-slate-400 mt-1">Performance, Strategy, and Execution</p>
                </div>

                <div className="bg-slate-800/50 p-1 rounded-xl flex gap-1 border border-white/5">
                    {['performance', 'strategy', 'tools'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-brand-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto min-h-0 custom-scrollbar pr-2">

                {/* --- TAB: PERFORMANCE --- */}
                {activeTab === 'performance' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">


                        {loadingStats ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* KPI Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <KpiCard title="Total Visitors" value={totalVisitors.toLocaleString()} sub={`${stats[0]?.visitors || 0} today`} icon={<Users />} color="blue" health="real" />
                                    <KpiCard title="Conversion Rate" value={`${conversionRate}%`} sub="Visitor to Signup" icon={<Target />} color="purple" health="real" />
                                    <KpiCard title="New Signups" value={totalSignups.toLocaleString()} sub="Last 30 Days" icon={<Activity />} color="emerald" health="real" />
                                    <KpiCard title="Revenue (Est)" value={`$${totalRevenue.toLocaleString()}`} sub={`${totalUpgrades} upgrades`} icon={<DollarSign />} color="amber" health="partial" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Main Chart */}
                                    <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-brand-400" />
                                            Traffic & Conversion Trends
                                        </h3>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats}>
                                                    <defs>
                                                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                                                    <YAxis stroke="#64748b" fontSize={12} />
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                                        itemStyle={{ color: '#f8fafc' }}
                                                    />
                                                    <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisitors)" />
                                                    <Area type="monotone" dataKey="signups" stroke="#10b981" fillOpacity={1} fill="url(#colorSignups)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Insight / Funnel Summary */}
                                    <div className="space-y-6">
                                        {/* Funnel Chart (New) */}
                                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                                            <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">Conversion Funnel</h3>
                                            <div className="h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} cursor={{ fill: 'transparent' }} />
                                                        <Bar dataKey="value" barSize={32} radius={[0, 4, 4, 0]}>
                                                            {funnelData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                <Lightbulb className="w-5 h-5 text-yellow-400" />
                                                AI Instights
                                            </h3>
                                            <div className="space-y-4">
                                                {getRecommendations().map((rec, i) => (
                                                    <div key={i} className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                                        <div className={`text-sm font-bold mb-1 ${rec.color}`}>{rec.title}</div>
                                                        <p className="text-xs text-slate-400 mb-2">{rec.desc}</p>
                                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                                                            <ArrowRight className="w-3 h-3" />
                                                            {rec.action}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Source Breakdown (Mini) */}
                                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                                            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Top Sources</h3>
                                            <div className="space-y-3">
                                                {['Organic', 'Social', 'Ads'].map((src) => {
                                                    // Quick aggregation from last 30 days
                                                    const total = stats.reduce((acc, curr) => acc + (curr.sources as any)[src.toLowerCase()], 0);
                                                    const percent = totalVisitors > 0 ? Math.round((total / totalVisitors) * 100) : 0;
                                                    return (
                                                        <div key={src}>
                                                            <div className="flex justify-between text-sm text-slate-300 mb-1">
                                                                <span>{src} Search</span>
                                                                <span>{percent}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-700 h-1.5 rounded-full">
                                                                <div className="bg-brand-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* --- TAB: STRATEGY --- */}
                {activeTab === 'strategy' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                        {/* Left: Checklist */}
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        Launch Checklist
                                    </h2>
                                    <div className="text-sm font-mono text-slate-400">{progress}% Done</div>
                                </div>
                                <div className="w-full bg-slate-700 h-2 rounded-full mb-8 overflow-hidden">
                                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="space-y-3">
                                    {checklist.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => item.toolAction ? handleTaskAction(item) : null}
                                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 group relative ${item.completed
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                                                } ${item.toolAction ? 'cursor-pointer hover:bg-slate-800' : ''}`}
                                        >
                                            <button
                                                onClick={(e) => toggleCheck(item.id, e)}
                                                className={`mt-0.5 ${item.completed ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-400'}`}
                                            >
                                                {item.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                            </button>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className={`font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                        {item.task}
                                                    </div>
                                                    {item.toolAction && (
                                                        <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                                                        {item.category}
                                                    </div>
                                                    {item.rationale && (
                                                        <div className="group/tooltip relative">
                                                            <HelpCircle className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 cursor-help" />
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-300 shadow-xl opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all pointer-events-none z-10">
                                                                <div className="font-bold text-slate-200 mb-1">Why this matters:</div>
                                                                {item.rationale}
                                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-b border-r border-white/10 rotate-45"></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: TOOLS (AI Copywriter) --- */}
                {activeTab === 'tools' && (
                    <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-slate-800/50 p-8 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">AI Copywriter</h2>
                                    <p className="text-sm text-slate-400">Generate high-converting copy in seconds.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Topic / Key Message</label>
                                    <textarea
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g. Announcing our new Verbal Mode feature for commuters..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 min-h-[120px]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Platform</label>
                                        <select
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                                        >
                                            <option>Twitter</option>
                                            <option>LinkedIn</option>
                                            <option>Instagram Caption</option>
                                            <option>Email Newsletter</option>
                                            <option>Blog Post Outline</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Tone</label>
                                        <select
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
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
                                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 mt-4"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Writing Magic...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Generate Copy
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Result */}
                            {(generatedCopy || isGenerating) && (
                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-300">Generated Content</label>
                                        {generatedCopy && (
                                            <button
                                                onClick={handleCopy}
                                                className="text-xs flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors"
                                            >
                                                {hasCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                {hasCopied ? 'Copied!' : 'Copy to Clipboard'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-slate-950 rounded-xl p-6 border border-white/5 min-h-[150px] text-slate-300 prose prose-invert prose-sm max-w-none">
                                        {isGenerating ? (
                                            <div className="space-y-3 animate-pulse">
                                                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                                                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                                                <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                                            </div>
                                        ) : (
                                            <ReactMarkdown>{generatedCopy}</ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

function KpiCard({ title, value, sub, icon, color, health }: any) {
    const bgColors: any = {
        blue: 'bg-blue-500/10 text-blue-400',
        purple: 'bg-purple-500/10 text-purple-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
        amber: 'bg-amber-500/10 text-amber-400'
    };

    // Status colors: real (emerald), partial (amber), mock (red)
    const healthColor = health === 'real' ? 'bg-emerald-500' : health === 'partial' ? 'bg-amber-500' : 'bg-red-500';
    const healthLabel = health === 'real' ? 'Verified Source' : health === 'partial' ? 'Partial / Estimated' : 'Mock Data';

    return (
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bgColors[color]}`}>
                {icon}
            </div>

            {/* Health Indicator */}
            <div className="absolute top-4 right-4 group">
                <div className={`w-2.5 h-2.5 rounded-full ${healthColor} ring-2 ring-slate-800 cursor-help`}></div>
                <div className="absolute top-full right-0 mt-2 w-32 p-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-300 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                    {healthLabel}
                </div>
            </div>

            <div>
                <div className="text-2xl font-bold text-white mb-1">{value}</div>
                <div className="flex justify-between items-end">
                    <div className="text-sm text-slate-400 font-medium">{title}</div>
                    <div className="text-xs text-slate-500">{sub}</div>
                </div>
            </div>
        </div>
    );
}
