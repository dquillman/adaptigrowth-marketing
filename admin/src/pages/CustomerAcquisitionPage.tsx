import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Lock,
    Target,
    Gift,
    Users,
    TrendingUp,
    Copy,
    Check,
    ExternalLink,
    ArrowRight,
    Play
} from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, Timestamp, collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

// --- Types ---

interface PhaseCompletion {
    phase1: boolean;
    phase2: boolean;
    phase3: boolean;
    phase4: boolean;
}

interface WorkflowData {
    phaseCompletion: PhaseCompletion;
    tasks: {
        // Phase 1
        p1_oneSentence?: { complete: boolean; value: string };
        p1_customerType?: { complete: boolean; value: "first_time" | "retaker" | "general" };
        p1_examVisibility?: { complete: boolean; value: { pmp: boolean; capm: boolean; others: boolean } };

        // Phase 2
        p2_entryOffer?: { complete: boolean; value: "trial_7_days" | "first_plan_free" | "one_dollar_trial" };
        p2_whyBox?: { complete: boolean; value: { failBecause: string; fixesBy: string; knowWorkingWhen: string } };

        // Phase 3
        p3_trafficSource?: { complete: boolean; value: "pmi_chapters" | "linkedin_groups" | "reddit" };
        p3_postMessage?: { complete: boolean; value: { copied: boolean; postedOnce: boolean } };
        p3_outreachLog?: { complete: boolean; value: { attemptsToday: number; repliesToday: number; lastUpdated: any } };

        // Phase 4
        p4_userFunnel?: { complete: boolean; value: { enabled: boolean } };
        p4_followUpTemplate?: { complete: boolean; value: { enabled: boolean; sendAfterHours: number; template: string } };
    };
    updatedAt: any;
}

const INITIAL_DATA: WorkflowData = {
    phaseCompletion: { phase1: false, phase2: false, phase3: false, phase4: false },
    tasks: {
        p1_oneSentence: { complete: false, value: "" },
        p1_customerType: { complete: false, value: "first_time" },
        p1_examVisibility: { complete: false, value: { pmp: false, capm: false, others: false } },
        p2_entryOffer: { complete: false, value: "trial_7_days" },
        p2_whyBox: { complete: false, value: { failBecause: "", fixesBy: "", knowWorkingWhen: "" } },
        p3_trafficSource: { complete: false, value: "pmi_chapters" },
        p3_postMessage: { complete: false, value: { copied: false, postedOnce: false } },
        p3_outreachLog: { complete: false, value: { attemptsToday: 0, repliesToday: 0, lastUpdated: null } },
        p4_userFunnel: { complete: true, value: { enabled: true } }, // Default complete as it's just a view
        p4_followUpTemplate: { complete: false, value: { enabled: false, sendAfterHours: 48, template: "Quick check — did the study plan make sense? If not, tell me what confused you and I’ll fix it." } }
    },
    updatedAt: null
};

// --- Main Page Component ---

export default function CustomerAcquisitionPage() {
    const [data, setData] = useState<WorkflowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
        phase1: true,
        phase2: false,
        phase3: false,
        phase4: false
    });
    // const navigate = useNavigate(); // Unused in main component


    // --- Firestore Sync ---
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, 'admin_workflows', user.uid, 'customer_acquisition', 'main');

        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setData(snap.data() as WorkflowData);
            } else {
                const initialWithTime = {
                    ...INITIAL_DATA,
                    updatedAt: Timestamp.now()
                };
                setDoc(docRef, initialWithTime).catch(console.error);
                setData(initialWithTime);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateTask = async (taskKey: string, updates: Partial<any>) => {
        if (!auth.currentUser || !data) return;

        const docRef = doc(db, 'admin_workflows', auth.currentUser.uid, 'customer_acquisition', 'main');

        // Optimistic update
        const newData = { ...data };
        // @ts-ignore
        newData.tasks[taskKey] = { ...newData.tasks[taskKey], ...updates };
        newData.updatedAt = Timestamp.now();
        setData(newData);

        try {
            await updateDoc(docRef, {
                [`tasks.${taskKey}`]: { ...data.tasks[taskKey as keyof typeof data.tasks], ...updates },
                updatedAt: Timestamp.now()
            });
        } catch (e) {
            console.error("Failed to update task", e);
        }
    };

    const markPhaseComplete = async (phaseKey: keyof PhaseCompletion) => {
        if (!auth.currentUser || !data) return;
        const docRef = doc(db, 'admin_workflows', auth.currentUser.uid, 'customer_acquisition', 'main');

        try {
            await updateDoc(docRef, {
                [`phaseCompletion.${phaseKey}`]: true,
                updatedAt: Timestamp.now()
            });

            const nextPhaseMap: Record<string, string> = { phase1: 'phase2', phase2: 'phase3', phase3: 'phase4' };
            const next = nextPhaseMap[phaseKey];
            if (next) {
                setExpandedPhases(prev => ({ ...prev, [next]: true }));
            }
        } catch (e) {
            console.error("Failed to mark phase complete", e);
        }
    };

    const togglePhase = (phase: string) => {
        setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
    };

    const getOverallProgress = () => {
        if (!data) return 0;
        const completed = Object.values(data.phaseCompletion).filter(Boolean).length;
        return Math.round((completed / 4) * 100);
    };

    const isLocked = (phaseKey: string) => {
        if (!data) return true;
        if (phaseKey === 'phase1') return false;
        if (phaseKey === 'phase2') return !data.phaseCompletion.phase1;
        if (phaseKey === 'phase3') return !data.phaseCompletion.phase2;
        if (phaseKey === 'phase4') return !data.phaseCompletion.phase3;
        return true;
    };

    // --- Next Action Logic ---
    const getNextAction = () => {
        if (!data) return null;
        if (!data.tasks.p1_oneSentence?.complete) return { label: "Define your value proposition", phase: "phase1", desc: "Write a one-sentence explanation of your product." };
        if (!data.tasks.p1_customerType?.complete) return { label: "Pick a customer type", phase: "phase1", desc: "Decide who you are serving first." };
        if (!data.tasks.p1_examVisibility?.complete) return { label: "Publish an exam", phase: "phase1", desc: "Enable exactly one exam plan." };
        if (!data.phaseCompletion.phase1) return { label: "Complete Phase 1", phase: "phase1", desc: "Mark Phase 1 as complete to proceed." };

        if (!data.tasks.p2_entryOffer?.value) return { label: "Choose entry offer", phase: "phase2", desc: "Select a trial or free plan strategy." };
        if (!data.tasks.p2_whyBox?.complete) return { label: "Write 'Why This Works'", phase: "phase2", desc: "Explain the benefits to your users." };
        if (!data.phaseCompletion.phase2) return { label: "Complete Phase 2", phase: "phase2", desc: "Mark Phase 2 as complete to proceed." };

        if (!data.tasks.p3_postMessage?.value?.postedOnce) return { label: "Post your first message", phase: "phase3", desc: "Copy the template and post it to your traffic source." };
        if ((data.tasks.p3_outreachLog?.value?.attemptsToday || 0) < 1) return { label: "Start outreach", phase: "phase3", desc: "Log your first outreach attempt today." };

        // ... more logic can be added
        return null;
    };

    const nextAction = getNextAction();

    if (loading) return <div className="p-8 text-slate-400">Loading workflow...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">Get Customers (Coach)</h1>
                    <p className="text-slate-400 mt-2">Guided workflow to acquire your first 50 paying customers.</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 w-48 text-center">
                    <div className="text-2xl font-bold text-brand-400">{getOverallProgress()}%</div>
                    <div className="text-xs text-slate-500 uppercase font-medium tracking-wider">Complete</div>
                </div>
            </div>

            {/* Next Action Card */}
            {nextAction && !data?.phaseCompletion.phase4 && (
                <div className="bg-gradient-to-r from-brand-600/20 to-purple-600/20 rounded-2xl p-1 border border-brand-500/30">
                    <div className="bg-slate-900/90 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-1">Up Next</div>
                                <h3 className="text-xl font-bold text-white">{nextAction.label}</h3>
                                <p className="text-slate-400">{nextAction.desc}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setExpandedPhases(prev => ({ ...prev, [nextAction.phase]: true }))}
                            className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                        >
                            Go to Task
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Phases List */}
            <div className="space-y-4">
                {/* PHASE 1 */}
                <PhaseCard
                    phaseKey="phase1"
                    title="Phase 1: Foundation"
                    description="Define your core value and setup the basics."
                    icon={Target}
                    isLocked={isLocked('phase1')}
                    isExpanded={expandedPhases.phase1}
                    isComplete={data?.phaseCompletion.phase1}
                    onToggle={() => togglePhase('phase1')}
                    onMarkComplete={() => markPhaseComplete('phase1')}
                    canComplete={!!(data?.tasks.p1_oneSentence?.complete && data?.tasks.p1_customerType?.complete && data?.tasks.p1_examVisibility?.complete)}
                    color="brand"
                >
                    <Phase1Content data={data} updateTask={updateTask} />
                </PhaseCard>

                {/* PHASE 2 */}
                <PhaseCard
                    phaseKey="phase2"
                    title="Phase 2: Simple Offer"
                    description="Create an irresistible entry point for new users."
                    icon={Gift}
                    isLocked={isLocked('phase2')}
                    isExpanded={expandedPhases.phase2}
                    isComplete={data?.phaseCompletion.phase2}
                    onToggle={() => togglePhase('phase2')}
                    onMarkComplete={() => markPhaseComplete('phase2')}
                    canComplete={!!(data?.tasks.p2_entryOffer?.value && data?.tasks.p2_whyBox?.complete)}
                    color="purple"
                >
                    <Phase2Content data={data} updateTask={updateTask} />
                </PhaseCard>

                {/* PHASE 3 */}
                <PhaseCard
                    phaseKey="phase3"
                    title="Phase 3: Customer Source"
                    description="Go where your customers already hang out."
                    icon={Users}
                    isLocked={isLocked('phase3')}
                    isExpanded={expandedPhases.phase3}
                    isComplete={data?.phaseCompletion.phase3}
                    onToggle={() => togglePhase('phase3')}
                    onMarkComplete={() => markPhaseComplete('phase3')}
                    canComplete={
                        !!(data?.tasks.p3_trafficSource?.value &&
                            data?.tasks.p3_postMessage?.value?.postedOnce &&
                            (data?.tasks.p3_outreachLog?.value?.attemptsToday || 0) >= 1)
                    }
                    canCompleteLabel={!(data?.tasks.p3_outreachLog?.value?.attemptsToday || 0) ? "Log at least 1 attempt" : undefined}
                    color="emerald"
                >
                    <Phase3Content data={data} updateTask={updateTask} />
                </PhaseCard>

                {/* PHASE 4 */}
                <PhaseCard
                    phaseKey="phase4"
                    title="Phase 4: Convert Users"
                    description="Track signups and ensure they see value."
                    icon={TrendingUp}
                    isLocked={isLocked('phase4')}
                    isExpanded={expandedPhases.phase4}
                    isComplete={data?.phaseCompletion.phase4}
                    onToggle={() => togglePhase('phase4')}
                    onMarkComplete={() => markPhaseComplete('phase4')}
                    canComplete={!!data?.tasks.p4_followUpTemplate?.complete}
                    color="orange"
                >
                    <Phase4Content data={data} updateTask={updateTask} />
                </PhaseCard>
            </div>
        </div>
    );
}

// --- Content Components ---

function Phase1Content({ data, updateTask }: { data: WorkflowData | null, updateTask: (key: string, val: any) => void }) {
    const [exams, setExams] = useState<any[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);

    const handleSentenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        updateTask('p1_oneSentence', { value: val, complete: val.length >= 20 });
    };

    const handleTypeChange = (val: string) => {
        updateTask('p1_customerType', { value: val, complete: true });
    };

    useEffect(() => {
        const loadExams = async () => {
            setLoadingExams(true);
            try {
                const snap = await getDocs(collection(db, 'exams'));
                const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setExams(loaded);
                validateExamTask(loaded);
            } catch (e) {
                console.error("Failed to load exams", e);
            } finally {
                setLoadingExams(false);
            }
        };
        loadExams();
    }, []);

    const validateExamTask = (currentExams: any[]) => {
        const publishedCount = currentExams.filter((e: any) => e.isPublished).length;
        updateTask('p1_examVisibility', {
            complete: publishedCount === 1,
            value: { pmp: false, capm: false, others: false }
        });
    };

    const toggleExam = async (examId: string, currentState: boolean) => {
        try {
            await updateDoc(doc(db, 'exams', examId), { isPublished: !currentState });
            const updatedExams = exams.map(e => e.id === examId ? { ...e, isPublished: !currentState } : e);
            setExams(updatedExams);
            validateExamTask(updatedExams);
        } catch (e) {
            console.error("Failed to update exam", e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-2">1. One-Sentence Explanation <span className="text-slate-500 font-normal">(Min 20 chars)</span></label>
                <input
                    type="text"
                    value={data?.tasks.p1_oneSentence?.value || ""}
                    onChange={handleSentenceChange}
                    placeholder="Exam Coach Pro AI helps busy professionals..."
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
            </div>

            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-4">2. Pick ONE Customer Type</label>
                <div className="space-y-2">
                    {[
                        { id: 'first_time', label: 'PMP exam first-time takers' },
                        { id: 'retaker', label: 'PMP exam retakers' },
                        { id: 'general', label: 'General project management learners' }
                    ].map(opt => (
                        <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${data?.tasks.p1_customerType?.value === opt.id ? 'bg-brand-500/10 border-brand-500 text-white' : 'bg-slate-950 border-white/5 text-slate-400'}`}>
                            <input
                                type="radio"
                                name="customerType"
                                value={opt.id}
                                checked={data?.tasks.p1_customerType?.value === opt.id}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="text-brand-500 focus:ring-brand-500 bg-slate-900"
                            />
                            <span className="font-medium">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-slate-300">3. Turn ON Exactly One Exam</label>
                    {data?.tasks.p1_examVisibility?.complete ?
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">Valid</span> :
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">Select exactly 1</span>
                    }
                </div>
                {loadingExams ? <div className="text-sm text-slate-500">Loading...</div> : (
                    <div className="space-y-2">
                        {exams.map((exam: any) => (
                            <div key={exam.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-white/5">
                                <span className="text-slate-300 font-medium">{exam.name || "Untitled"}</span>
                                <button onClick={() => toggleExam(exam.id, exam.isPublished)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${exam.isPublished ? 'bg-brand-500' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${exam.isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Phase2Content({ data, updateTask }: { data: WorkflowData | null, updateTask: (key: string, val: any) => void }) {
    const handleWhyChange = (field: string, val: string) => {
        if (!data) return;
        const current = data.tasks.p2_whyBox?.value || { failBecause: "", fixesBy: "", knowWorkingWhen: "" };
        const updated = { ...current, [field]: val };
        const isComplete = updated.failBecause.length >= 10 && updated.fixesBy.length >= 10 && updated.knowWorkingWhen.length >= 10;
        updateTask('p2_whyBox', { value: updated, complete: isComplete });
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-4">4. Choose the Entry Offer</label>
                <div className="space-y-2">
                    {[
                        { id: 'trial_7_days', label: '7-day free trial' },
                        { id: 'first_plan_free', label: 'First exam plan free' },
                        { id: 'one_dollar_trial', label: '$1 trial for 7 days' }
                    ].map(opt => (
                        <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${data?.tasks.p2_entryOffer?.value === opt.id ? 'bg-purple-500/10 border-purple-500 text-white' : 'bg-slate-950 border-white/5 text-slate-400'}`}>
                            <input
                                type="radio"
                                name="entryOffer"
                                value={opt.id}
                                checked={data?.tasks.p2_entryOffer?.value === opt.id}
                                onChange={(e) => updateTask('p2_entryOffer', { value: e.target.value, complete: true })}
                                className="text-purple-500 focus:ring-purple-500 bg-slate-900"
                            />
                            <span className="font-medium">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-4">5. Create "Why This Works" Box</label>
                <div className="space-y-4">
                    {['failBecause', 'fixesBy', 'knowWorkingWhen'].map((field) => (
                        <div key={field}>
                            <label className="block text-xs text-slate-500 mb-1 capitalize">
                                {field === 'failBecause' ? "Most PMP students fail because..." :
                                    field === 'fixesBy' ? "This app fixes that by..." :
                                        "You'll know it's working when..."}
                            </label>
                            <input
                                type="text"
                                // @ts-ignore
                                value={data?.tasks.p2_whyBox?.value?.[field] || ""}
                                onChange={(e) => handleWhyChange(field, e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Phase3Content({ data, updateTask }: { data: WorkflowData | null, updateTask: (key: string, val: any) => void }) {
    const [justCopied, setJustCopied] = useState(false);
    const navigate = useNavigate();

    const message = "I’m testing a new AI study tool built specifically for PMP candidates who are short on time. I’m looking for a small group to try it free and give honest feedback. No sales pressure. Would anyone here like access?";

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 2000);

        const current = data?.tasks.p3_postMessage?.value || { copied: false, postedOnce: false };
        updateTask('p3_postMessage', { value: { ...current, copied: true } });
    };

    const handleOutreachUpdate = (field: 'attemptsToday' | 'repliesToday', change: number) => {
        const current = data?.tasks.p3_outreachLog?.value || { attemptsToday: 0, repliesToday: 0, lastUpdated: null };
        const newVal = Math.max(0, (current[field] || 0) + change);
        updateTask('p3_outreachLog', {
            value: { ...current, [field]: newVal, lastUpdated: Timestamp.now() }
        });
    };

    const getSourceLink = () => {
        const source = data?.tasks.p3_trafficSource?.value;
        if (source === 'pmi_chapters') return 'https://www.google.com/search?q=PMI%20chapters%20near%20me';
        if (source === 'linkedin_groups') return 'https://www.linkedin.com/groups/';
        if (source === 'reddit') return 'https://www.reddit.com/r/pmp/';
        return '';
    };

    return (
        <div className="space-y-6">
            {/* Task 6 */}
            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-4">6. Choose ONE Traffic Source</label>
                <div className="space-y-2 mb-4">
                    {[
                        { id: 'pmi_chapters', label: 'PMI Local Chapters' },
                        { id: 'linkedin_groups', label: 'LinkedIn PMP Groups' },
                        { id: 'reddit', label: 'Reddit PMP Communities' }
                    ].map(opt => (
                        <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${data?.tasks.p3_trafficSource?.value === opt.id ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-slate-950 border-white/5 text-slate-400'}`}>
                            <input
                                type="radio"
                                name="trafficSource"
                                value={opt.id}
                                checked={data?.tasks.p3_trafficSource?.value === opt.id}
                                onChange={(e) => updateTask('p3_trafficSource', { value: e.target.value, complete: true })}
                                className="text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                            />
                            <span className="font-medium">{opt.label}</span>
                        </label>
                    ))}
                </div>
                {data?.tasks.p3_trafficSource?.value && (
                    <a
                        href={getSourceLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                    >
                        Open {data.tasks.p3_trafficSource.value === 'reddit' ? 'Reddit' : data.tasks.p3_trafficSource.value === 'linkedin_groups' ? 'LinkedIn Groups' : 'Google Search'}
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
            </div>

            {/* Task 7 */}
            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-bold text-slate-300">7. Approved Message</label>
                    <button
                        onClick={() => navigate('/marketing')}
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                        Browse Library <ArrowRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-white/10 text-slate-300 text-sm mb-4 relative font-mono">
                    {message}
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-2 bg-slate-800 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Copy to clipboard"
                    >
                        {justCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <div className="absolute bottom-2 right-2 text-[10px] text-slate-600">Default Template</div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data?.tasks.p3_postMessage?.value?.postedOnce || false}
                        onChange={(e) => {
                            const current = data?.tasks.p3_postMessage?.value || { copied: false, postedOnce: false };
                            updateTask('p3_postMessage', { value: { ...current, postedOnce: e.target.checked } });
                        }}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500"
                    />
                    <span className="text-slate-300">I have posted this once</span>
                </label>
            </div>

            {/* Task 8 */}
            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-4">8. Outreach Log Counters</label>
                <div className="flex gap-8">
                    {['attemptsToday', 'repliesToday'].map(field => (
                        <div key={field} className="flex-1">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                {field === 'attemptsToday' ? 'Outreach Attempts' : 'Replies Received'}
                            </div>
                            <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-lg border border-white/10 justify-between">
                                <button onClick={() => handleOutreachUpdate(field as any, -1)} className="p-2 hover:bg-white/5 rounded text-slate-400">-</button>
                                {/* @ts-ignore */}
                                <span className="text-xl font-bold font-mono text-white">{data?.tasks.p3_outreachLog?.value?.[field] || 0}</span>
                                <button onClick={() => handleOutreachUpdate(field as any, 1)} className="p-2 hover:bg-white/5 rounded text-slate-400">+</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Phase4Content({ data, updateTask }: { data: WorkflowData | null, updateTask: (key: string, val: any) => void }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUsers = async () => {
            setLoadingUsers(true);
            try {
                // Fetch recent 20 users
                const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20));
                const snap = await getDocs(q);
                const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setUsers(loaded);
            } catch (e) {
                console.warn("Could not fetch users (might be index issue)", e);
                // Fallback: just fetch regular
                try {
                    const snap2 = await getDocs(query(collection(db, 'users'), limit(20)));
                    setUsers(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch (e2) { console.error(e2); }
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    const handleTemplateChange = (field: string, val: any) => {
        const current = data?.tasks.p4_followUpTemplate?.value || { enabled: false, sendAfterHours: 48, template: "" };
        const updated = { ...current, [field]: val };
        updateTask('p4_followUpTemplate', {
            value: updated,
            complete: updated.enabled && updated.template.length > 0
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <label className="block text-sm font-bold text-slate-300 mb-4">9. New Users Funnel (Last 30 Days)</label>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">User</th>
                                <th className="px-4 py-3">Plan Created?</th>
                                <th className="px-4 py-3">Diagnostic?</th>
                                <th className="px-4 py-3 rounded-r-lg">Day 1 Done?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loadingUsers ? (
                                <tr><td colSpan={4} className="p-4 text-center">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center">No users found.</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id}>
                                        <td className="px-4 py-3 font-mono text-xs text-white truncate max-w-[150px]">{u.email || u.id}</td>
                                        <td className="px-4 py-3">{u.planCreated ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-600">-</span>}</td>
                                        <td className="px-4 py-3">{u.diagnosticCompleted ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-600">-</span>}</td>
                                        <td className="px-4 py-3">{u.day1Completed ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-600">-</span>}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-bold text-slate-300">10. Follow-up Template</label>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/marketing')}
                            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                        >
                            <Target className="w-3 h-3" /> Use Asset Library
                        </button>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-slate-500 uppercase font-bold">Enable</span>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${data?.tasks.p4_followUpTemplate?.value?.enabled ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${data?.tasks.p4_followUpTemplate?.value?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={data?.tasks.p4_followUpTemplate?.value?.enabled || false}
                                onChange={(e) => handleTemplateChange('enabled', e.target.checked)}
                            />
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Send after (hours)</label>
                        <input
                            type="number"
                            value={data?.tasks.p4_followUpTemplate?.value?.sendAfterHours || 48}
                            onChange={(e) => handleTemplateChange('sendAfterHours', parseInt(e.target.value))}
                            className="bg-slate-950 border border-white/10 rounded px-3 py-2 text-white w-24"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Template Message</label>
                        <textarea
                            rows={3}
                            value={data?.tasks.p4_followUpTemplate?.value?.template || ""}
                            onChange={(e) => handleTemplateChange('template', e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PhaseCard({
    title,
    description,
    icon: Icon,
    isLocked,
    isExpanded,
    isComplete,
    onToggle,
    onMarkComplete,
    canComplete,
    canCompleteLabel,
    children,
    color = "brand"
}: any) {
    const colorMap: any = {
        brand: "text-brand-400 border-brand-500/20 bg-brand-500/10",
        purple: "text-purple-400 border-purple-500/20 bg-purple-500/10",
        emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
        orange: "text-orange-400 border-orange-500/20 bg-orange-500/10",
    };

    const accentColor = colorMap[color] || colorMap.brand;

    if (isLocked) {
        return (
            <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/20 flex items-center justify-between opacity-60 cursor-not-allowed select-none">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-400">{title}</h3>
                        <p className="text-slate-500 text-sm">{description}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isComplete ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isComplete ? 'bg-emerald-500/20 text-emerald-400' : accentColor}`}>
                        {isComplete ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className={`text-lg font-bold ${isComplete ? 'text-emerald-400' : 'text-white'}`}>{title}</h3>
                            {isComplete && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Completed</span>}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{description}</p>
                    </div>
                </div>
                <div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                </div>
            </button>

            {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                    {children}

                    <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end items-center gap-4">
                        {!canComplete && canCompleteLabel && (
                            <div className="text-sm text-amber-500 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                {canCompleteLabel}
                            </div>
                        )}
                        <button
                            onClick={onMarkComplete}
                            disabled={!canComplete || isComplete}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isComplete
                                ? 'bg-emerald-500/10 text-emerald-500 cursor-default'
                                : canComplete
                                    ? 'bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            {isComplete ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Phase Complete
                                </>
                            ) : (
                                <>
                                    Mark Phase Complete
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
