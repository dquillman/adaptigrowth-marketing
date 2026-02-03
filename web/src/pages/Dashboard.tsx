import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom';
import { DISPLAY_VERSION } from '../version';
import MasteryRing from '../components/MasteryRing';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, setDoc, getCountFromServer, getDocs, updateDoc, serverTimestamp, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { XPService } from '../services/xpService';
import LevelBadge from '../components/LevelBadge';
import ExamSelector from '../components/ExamSelector';

import LevelDetailModal from '../components/LevelDetailModal';
import { useSidebar } from '../contexts/SidebarContext.tsx';
import { useExam } from '../contexts/ExamContext';
import ReportIssueModal from '../components/ReportIssueModal';
import { useTrial } from '../hooks/useTrial';
import ThinkingTrapsCard from '../components/ThinkingTrapsCard';

interface QuizAttempt {
    id: string;
    score: number;
    totalQuestions: number;
    domain: string;
    timestamp: any; // Firestore Timestamp
    timeSpent?: number;
    averageTimePerQuestion?: number;
}

export default function Dashboard() {
    const { isCollapsed } = useSidebar();

    // Use UseExam globally
    const { selectedExamId, examName, examDomains, loading: examLoading } = useExam();

    const [domainMasteryCounts, setDomainMasteryCounts] = useState<Record<string, number>>({});
    const [domainTotalCounts, setDomainTotalCounts] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [showStreakModal, setShowStreakModal] = useState(false);

    const [recentActivity, setRecentActivity] = useState<QuizAttempt[]>([]);
    const [activeRuns, setActiveRuns] = useState<any[]>([]);
    const [dailyProgress, setDailyProgress] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(10);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [newGoal, setNewGoal] = useState(10);
    const [userXp, setUserXp] = useState(0);
    const [userLevel, setUserLevel] = useState(1);
    const [userStreak, setUserStreak] = useState(0);



    const [showLevelModal, setShowLevelModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const { trial } = useTrial();

    // 1. Fetch domain totals when exam context changes
    useEffect(() => {
        if (examLoading) return;

        if (selectedExamId && examDomains.length > 0) {
            fetchDomainTotals(selectedExamId, examDomains);
        } else {
            setDomainTotalCounts({});
        }
    }, [selectedExamId, examDomains, examLoading]);

    // 2. Fetch User Data (Progress, Activity, Goals)
    useEffect(() => {
        let unsubscribeActivity: () => void;
        let unsubscribeGoal: () => void;
        let unsubscribeProgress: () => void;
        let unsubscribeActiveRuns: () => void;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userId = user.uid;

                // --- Question Progress ---
                if (selectedExamId) {
                    const progressQuery = query(
                        collection(db, 'users', userId, 'questionProgress'),
                        where('examId', '==', selectedExamId)
                    );

                    unsubscribeProgress = onSnapshot(progressQuery, (snapshot) => {
                        const counts: Record<string, number> = {};
                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            if (data.status === 'mastered' && data.domain) {
                                counts[data.domain] = (counts[data.domain] || 0) + 1;
                            }
                        });
                        setDomainMasteryCounts(counts);
                    });
                }

                // --- Recent Activity ---
                if (selectedExamId) {
                    const activityQuery = query(
                        collection(db, 'quizAttempts'),
                        where('userId', '==', userId),
                        where('examId', '==', selectedExamId),
                        orderBy('timestamp', 'desc'),
                        limit(10)
                    );

                    unsubscribeActivity = onSnapshot(activityQuery, (snapshot: QuerySnapshot<DocumentData>) => {
                        const activities = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        })) as QuizAttempt[];
                        setRecentActivity(activities);
                    });
                }

                // --- Daily Progress (Today) ---
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const todayQuery = query(
                    collection(db, 'quizAttempts'),
                    where('userId', '==', userId),
                    where('timestamp', '>=', todayStart)
                );

                onSnapshot(todayQuery, (snapshot) => {
                    let count = 0;
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        // Only count for CURRENT exam
                        if (data.examId === selectedExamId) {
                            count += data.totalQuestions || 0;
                        }
                    });
                    setDailyProgress(count);
                });

                // --- User Stats (Goal, XP, Streak) ---
                const userRef = doc(db, 'users', userId);
                unsubscribeGoal = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.dailyGoal) {
                            setDailyGoal(data.dailyGoal);
                            setNewGoal(data.dailyGoal);
                        }

                        // XP Logic: Exam Specific -> Global Fallback
                        let effectiveXp = 0;
                        if (selectedExamId && data.examXP && typeof data.examXP[selectedExamId] === 'number') {
                            effectiveXp = data.examXP[selectedExamId];
                        } else if (selectedExamId && (!data.examXP || !data.examXP[selectedExamId])) {
                            effectiveXp = 0;
                        } else {
                            effectiveXp = data.xp || 0;
                        }

                        setUserXp(effectiveXp);
                        setUserLevel(XPService.calculateLevel(effectiveXp));

                        if (data.streak !== undefined) {
                            setUserStreak(data.streak);
                        }
                    }
                });

                XPService.checkStreak();

                // --- Active Runs (resumable, no examId filter) ---
                const activeRunsQuery = query(
                    collection(db, 'quizRuns', userId, 'runs'),
                    where('status', '==', 'in_progress')
                );

                unsubscribeActiveRuns = onSnapshot(activeRunsQuery, (snapshot) => {
                    const runs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setActiveRuns(runs);
                });
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeActivity) unsubscribeActivity();
            if (unsubscribeGoal) unsubscribeGoal();
            if (unsubscribeProgress) unsubscribeProgress();
            if (unsubscribeActiveRuns) unsubscribeActiveRuns();
        };
    }, [selectedExamId]); // Re-subscribe when exam changes

    // Helper to fetch total questions per domain
    const fetchDomainTotals = async (examId: string, domains: string[]) => {
        const totals: Record<string, number> = {};

        for (const domain of domains) {
            try {
                const q = query(
                    collection(db, 'questions'),
                    where('examId', '==', examId),
                    where('domain', '==', domain)
                );
                const snapshot = await getCountFromServer(q);
                totals[domain] = snapshot.data().count;
            } catch (e) {
                console.error(`Error fetching total for ${domain}:`, e);
                totals[domain] = 100;
            }
        }
        setDomainTotalCounts(totals);
    };

    const saveGoal = async () => {
        if (!auth.currentUser) return;
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, { dailyGoal: newGoal }, { merge: true });
            setIsEditingGoal(false);
        } catch (error) {
            console.error("Error saving goal:", error);
        }
    };

    const getPercentage = (domain: string) => {
        const mastered = domainMasteryCounts[domain] || 0;
        const total = domainTotalCounts[domain] || 0;
        if (total === 0) return 0;
        return Math.min(100, Math.round((mastered / total) * 100));
    };

    const handleWeakestStart = () => {
        if (!examDomains || examDomains.length === 0) {
            navigate('/app/quiz');
            return;
        }

        let weakest = examDomains[0];
        let minP = 101;

        examDomains.forEach(d => {
            const p = getPercentage(d);
            if (p < minP) {
                minP = p;
                weakest = d;
            }
        });

        console.log("Smart Practice targeting weakest domain:", weakest);
        navigate('/app/quiz', { state: { filterDomain: weakest, mode: 'weakest' } });
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading dashboard...</div>;
    }

    const resumableRuns = activeRuns.filter((r: any) => r.quizType !== 'diagnostic');
    const hasActiveRun = resumableRuns.length > 0;

    // Check for completed diagnostic: must have mode='diagnostic' AND a score (completion indicator)
    const hasCompletedDiagnostic = recentActivity.some(
        (a: any) => (a.mode === 'diagnostic' || a.quizType === 'diagnostic') && a.score !== undefined
    );

    return (
        <div className="min-h-screen flex bg-transparent relative">
            <Sidebar />
            <div className="absolute top-0 right-0 w-full text-right pr-4 py-1 text-xs font-mono text-white/50 pointer-events-none z-50">
                ExamCoach v{DISPLAY_VERSION}
            </div>
            <div className={`flex-1 ${isCollapsed ? 'ml-20' : 'ml-64'} flex flex-col transition-all duration-300`}>
                <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowLevelModal(true)}
                                    className="flex items-center justify-center hover:scale-105 transition-transform"
                                >
                                    <LevelBadge level={userLevel} xp={userXp} size="sm" />
                                </button>
                                <h1 className="text-xl font-bold text-white font-display tracking-tight">Exam Coach Pro AI</h1>
                            </div>
                            <div className="flex items-center gap-4">
                                <ExamSelector />

                                <Link to="/app/help" className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Guide
                                </Link>
                                <Link to="/about" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                                    About
                                </Link>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    Report a Problem
                                </button>
                                <Link to="/app/pricing" className="text-sm font-bold text-brand-400 hover:text-brand-300 transition-colors border border-brand-500/30 px-3 py-1 rounded-full bg-brand-500/10">
                                    Upgrade
                                </Link>
                                <button
                                    onClick={() => setShowStreakModal(true)}
                                    className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-brand-300 rounded-full text-sm font-medium border border-slate-600 hover:bg-slate-700 hover:border-brand-500/50 transition-all cursor-pointer"
                                >
                                    <span>🔥 {userStreak} Day Streak</span>
                                </button>
                                <button
                                    onClick={() => signOut(auth)}
                                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div >
                        </div >
                    </div >
                </nav >

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
                    {/* Trial Banner */}
                    {trial.status === 'active' && (
                        <div className={`rounded-xl p-4 flex items-center justify-between border shadow-lg ${trial.daysRemaining <= 2
                            ? 'bg-gradient-to-r from-amber-600 to-orange-700 border-amber-400/30'
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-800 border-indigo-400/30'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg backdrop-blur-sm ${trial.daysRemaining <= 2 ? 'bg-amber-500/20' : 'bg-indigo-500/20'
                                    }`}>
                                    <span className="text-xl">{trial.daysRemaining <= 2 ? '⏰' : '🎉'}</span>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base">
                                        {trial.daysRemaining <= 2 ? 'Your Pro trial ends soon' : "You're on a 14-day Pro Trial"}
                                    </h3>
                                    <p className={`${trial.daysRemaining <= 2 ? 'text-amber-100' : 'text-indigo-200'} text-sm`}>
                                        {trial.daysRemaining === 0 ? (
                                            <>You have <strong className="text-white">{trial.hoursRemaining} hours</strong> left of full access.</>
                                        ) : (
                                            <>
                                                {trial.daysRemaining <= 2
                                                    ? <>Time remaining: <strong className="text-white">{trial.daysRemaining} days, {trial.hoursRemaining} hours</strong></>
                                                    : <>Full access enabled. ⏳ <strong className="text-white">{trial.daysRemaining} days</strong> remaining</>
                                                }
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <Link to="/app/pricing" className="px-5 py-2.5 bg-white text-indigo-900 font-bold rounded-lg text-sm hover:bg-indigo-50 transition-colors shadow-md whitespace-nowrap">
                                Upgrade Now
                            </Link>
                        </div>
                    )}

                    {/* Expired Trial Blocker */}
                    {trial.status === 'expired' && (
                        <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700 shadow-2xl relative overflow-hidden mb-8">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-white mb-2 font-display">🔒 Your 14-day Pro trial has ended</h3>
                                <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                                    We hope you enjoyed your practice sessions! To continue studying and access your detailed analytics, please upgrade your plan.
                                </p>
                                <div className="flex flex-col items-center gap-4">
                                    <Link
                                        to="/app/pricing"
                                        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-8 py-3 text-base font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-500 transition-all hover:-translate-y-0.5"
                                    >
                                        Upgrade to continue studying
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content - Blurred if Expired */}
                    <div className={trial.status === 'expired' ? "opacity-10 pointer-events-none filter blur-sm select-none" : ""}>
                        {/* Onboarding / Welcome Section */}
                        {!hasCompletedDiagnostic && !loading ? (
                            <>
                                {/* Step 1: Diagnostic Banner */}
                                <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-8 shadow-2xl shadow-brand-900/40 border border-brand-500/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                            Step 1 of 1
                                        </div>
                                        <h2 className="text-3xl font-bold text-white font-display mb-3 tracking-tight">Start with a short diagnostic</h2>
                                        <p className="text-indigo-100 text-lg leading-relaxed mb-4">
                                            Before we begin, I need to understand how you think. This quick assessment helps me personalize your entire study plan.
                                        </p>
                                        <ul className="text-indigo-200 text-sm space-y-2 mb-6">
                                            <li className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                                <span><strong>~10 minutes</strong> — just a few questions per domain</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                                <span><strong>Not pass/fail</strong> — this is about finding your strengths</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                                <span><strong>Unlocks everything</strong> — practice and mock exams become personalized</span>
                                            </li>
                                        </ul>
                                        <button
                                            onClick={() => navigate('/app/quiz', { state: { mode: 'diagnostic' } })}
                                            className="inline-flex items-center justify-center rounded-xl bg-white text-brand-700 px-8 py-4 text-lg font-bold shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all gap-2 group/btn"
                                        >
                                            Start Diagnostic
                                            <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Gated Actions Preview */}
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Gated: Targeted Practice */}
                                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 opacity-60">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-300 flex items-center gap-2">
                                                    Targeted Practice
                                                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">After Diagnostic</span>
                                                </h4>
                                                <p className="text-slate-500 text-sm mt-1">
                                                    Focuses on your weakest areas. Requires diagnostic data to personalize.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gated: Mock Exam */}
                                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 opacity-60">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-600/20 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-300 flex items-center gap-2">
                                                    Mock Exam
                                                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">After Diagnostic</span>
                                                </h4>
                                                <p className="text-slate-500 text-sm mt-1">
                                                    Full-length timed simulation. Most effective after you complete the diagnostic.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-white font-display">Welcome back!</h2>
                                    <p className="text-slate-400 mt-1">Consistency is key. Keep up your daily practice to master the <strong>{examName}</strong>.</p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleWeakestStart}
                                        className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-purple-500/30 hover:bg-purple-500 hover:shadow-purple-500/40 transition-all transform hover:-translate-y-0.5 border border-purple-400/20"
                                        title="Targets your weakest domains"
                                    >
                                        <span className="mr-2">⚡</span> Smart Practice
                                    </button>
                                    <button
                                        onClick={() => navigate('/app/simulator')}
                                        className="inline-flex items-center justify-center rounded-xl bg-slate-800 border border-slate-600 px-6 py-3 text-base font-medium text-white shadow-lg hover:bg-slate-700 transition-all transform hover:-translate-y-0.5 group"
                                        title="Full length timed exam simulation"
                                    >
                                        <span className="mr-2 group-hover:scale-110 transition-transform">⏱️</span> Mock Exam
                                    </button>
                                    {/* 'Start Trial' button on dashboard is handled by TrialModal now, 
                                        or do we also keep a button if they closed the modal?
                                        The prompt says: "Never show 'trial pending' or 'eligible'"
                                        The button below was: {trial.status === 'none' && ( ... )}
                                        We should probably REMOVE this button if we want to be strict,
                                        BUT if the modal is snoozed, they need a way to trigger it?
                                        The prompt says: "Never show 'trial pending' or 'eligible'". This implies we shouldn't have a persistent button?
                                        Actually, "Never show 'trial pending' or 'eligible'" specifically likely refers to banners.
                                        However, if we rely on the modal popping up, maybe we don't need the button.
                                        BUT replacing the button is safer to avoid removing functionality if modal is dismissed.
                                        I will remove it to be compliant with "Never show trial pending or eligible" rule strictly.
                                        Wait, if they hit "Not now", they might want to start it later.
                                        I'll comment it out or leave it but update it to use `startTrial` action.
                                        Actually the prompt says: "Never show 'trial pending' or 'eligible'" under "Dashboard Trial Messaging (UX Upgrade)".
                                        This strongly suggests hiding the "Start Trial" button.
                                        I will remove it.
                                    */}
                                </div>
                            </div>
                        )}

                        {/* Resume Active Run */}
                        {hasActiveRun && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mt-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-amber-400">You have a {resumableRuns[0]?.mode === 'trap' ? 'Trap Practice' : 'Smart Quiz'} in progress</h3>
                                    <p className="text-slate-400 text-sm mt-1">Pick up where you left off.</p>
                                </div>
                                <button
                                    onClick={() => navigate('/app/quiz', { state: { runId: resumableRuns[0].id, resume: true } })}
                                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-base shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                                >
                                    Resume
                                </button>
                            </div>
                        )}

                        {/* Mastery Rings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                            {examDomains.map((domain, index) => {
                                const colors = ['#C084FC', '#F472B6', '#34D399']; // Neon Purple, Neon Pink, Neon Green
                                const color = colors[index % colors.length];
                                const mastered = domainMasteryCounts[domain] || 0;
                                const total = domainTotalCounts[domain] || 0;

                                return (
                                    <button
                                        key={domain}
                                        onClick={() => navigate('/app/quiz', { state: { filterDomain: domain } })}
                                        className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 flex flex-col items-center hover:border-brand-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group text-left w-full relative overflow-hidden"
                                    >
                                        <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity`} style={{ backgroundColor: color }} />

                                        <MasteryRing percentage={getPercentage(domain)} color={color} label="" />

                                        <div className="mt-4 text-center">
                                            <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">{domain}</h3>
                                            <p className="text-sm font-medium text-slate-400 mt-1">
                                                <span className="text-white font-bold">{mastered}</span>
                                                <span className="mx-1 text-slate-600">/</span>
                                                <span className="text-slate-500">{total}</span>
                                                <span className="ml-1 text-xs uppercase tracking-wide opacity-70">Mastered</span>
                                            </p>
                                            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-300">
                                                <span className="text-xs font-bold text-brand-400 uppercase tracking-widest border border-brand-500/30 px-4 py-1.5 rounded-full bg-brand-500/10 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                                                    Practice Domain
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Stats & Activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                            {/* Recent Activity */}
                            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                                <h3 className="text-lg font-bold text-white mb-4 font-display">Recent Activity</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                                    <div className="space-y-3">
                                        {recentActivity.length === 0 ? (
                                            <p className="text-slate-400 text-sm">No recent activity. Take a quiz to see your progress!</p>
                                        ) : (
                                            (() => {
                                                let diagShown = false;
                                                return recentActivity.filter((a: any) => {
                                                    if (a.mode === 'diagnostic' || a.quizType === 'diagnostic') {
                                                        if (diagShown) return false;
                                                        diagShown = true;
                                                    }
                                                    return true;
                                                });
                                            })().map((attempt) => {
                                                const isActive = (attempt as any).mode === 'smart' && (attempt as any).completed !== true;
                                                const MODE_LABEL: Record<string, string> = {
                                                    diagnostic: "Diagnostic Quiz",
                                                    smart: "Smart Practice Quiz",
                                                    daily: "Daily Practice",
                                                    mock: "Mock Exam",
                                                };
                                                const label = MODE_LABEL[(attempt as any).mode] ?? "Smart Practice Quiz";
                                                return (
                                                    <div key={attempt.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold border border-brand-500/20">
                                                                Q
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-slate-200">{label}</p>
                                                                    <span className="text-xs text-slate-500">
                                                                        {attempt.timestamp?.toDate ? attempt.timestamp.toDate().toLocaleString(undefined, {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: 'numeric',
                                                                            minute: '2-digit'
                                                                        }) : 'Just now'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-slate-500">{attempt.totalQuestions} Questions • {attempt.domain}</p>
                                                            </div>
                                                        </div>
                                                        {isActive ? (
                                                            <button
                                                                onClick={() => navigate('/app/quiz', { state: { runId: attempt.id } })}
                                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                                                            >
                                                                Resume
                                                            </button>
                                                        ) : ((attempt as any).mode === 'diagnostic' || (attempt as any).quizType === 'diagnostic') ? (
                                                            <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-sm font-medium">
                                                                Baseline captured
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium">
                                                                {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Goal + Traps */}
                            <div className="space-y-6">
                                {/* Daily Goal */}
                                <div className="bg-gradient-to-br from-brand-600 to-brand-900 rounded-2xl shadow-xl shadow-brand-900/50 p-6 text-white relative overflow-hidden border border-brand-500/30">
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-brand-400 opacity-10 rounded-full blur-2xl"></div>
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <h3 className="text-lg font-bold font-display">Daily Goal</h3>
                                        <button
                                            onClick={() => setIsEditingGoal(!isEditingGoal)}
                                            className="text-brand-200 hover:text-white transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {
                                        isEditingGoal ? (
                                            <div className="mb-4 relative z-10">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={newGoal}
                                                        onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-black/20 border border-brand-400/30 rounded-lg px-3 py-2 text-white placeholder-brand-300/50 focus:outline-none focus:border-brand-400"
                                                    />
                                                    <button
                                                        onClick={saveGoal}
                                                        className="bg-brand-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-400 transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-end gap-2 mb-4 relative z-10">
                                                    <span className="text-4xl font-bold">{dailyProgress}/{dailyGoal}</span>
                                                    <span className="text-brand-200 mb-1 font-medium">questions</span>
                                                </div>
                                                <div className="w-full bg-black/20 rounded-full h-2 mb-4 backdrop-blur-sm relative z-10">
                                                    <div
                                                        className="bg-accent-400 h-2 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-1000"
                                                        style={{ width: `${Math.min((dailyProgress / dailyGoal) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </>
                                        )
                                    }
                                    <p className="text-sm text-brand-100/80 relative z-10">
                                        {dailyProgress >= dailyGoal
                                            ? "Goal reached! You're crushing it! 🚀"
                                            : "Keep it up! Consistency is key to passing your exam."}
                                    </p>
                                </div>

                                {/* Thinking Traps Card */}
                                <ThinkingTrapsCard />
                            </div>
                        </div>
                    </div>
                </main>




                {/* Danger Zone */}
                <div className="mt-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
                    <div className="border border-red-900/30 bg-red-900/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-red-500 font-display mb-2">Danger Zone</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            These actions are irreversible.
                        </p>
                        <button
                            onClick={async () => {
                                if (window.confirm('Are you SURE? This will delete all your mastery rings and quiz history for this exam.')) {
                                    try {
                                        setLoading(true);

                                        // Abandon any in_progress runs for this exam
                                        const userId = auth.currentUser!.uid;
                                        const runsQuery = query(
                                            collection(db, 'quizRuns', userId, 'runs'),
                                            where('status', '==', 'in_progress'),
                                            where('examId', '==', selectedExamId)
                                        );
                                        const runsSnap = await getDocs(runsQuery);
                                        await Promise.all(runsSnap.docs.map(d =>
                                            updateDoc(d.ref, { status: 'abandoned', endedAt: serverTimestamp() })
                                        ));

                                        const { httpsCallable, getFunctions } = await import('firebase/functions');
                                        const functions = getFunctions();
                                        const resetFn = httpsCallable(functions, 'resetExamProgress');
                                        await resetFn({ examId: selectedExamId });

                                        // Clear Thinking Traps localStorage to prevent stale insights
                                        localStorage.removeItem('exam_coach_reinforcement');
                                        localStorage.removeItem('exam_coach_last_reinforcement_shown');
                                        localStorage.removeItem('exam_coach_suggestion_history');

                                        // Suppress Thinking Traps until a new run completes
                                        localStorage.setItem('exam_coach_traps_suppressed', 'true');

                                        // Simple refresh
                                        window.location.reload();
                                    } catch (e) {
                                        console.error(e);
                                        alert('Failed to reset progress.');
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm font-bold transition-colors"
                        >
                            Reset All Progress for {examName}
                        </button>
                    </div>
                </div>

                {/* Streak Modal */}
                {showStreakModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full border border-slate-700 shadow-2xl relative">
                            <button
                                onClick={() => setShowStreakModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="text-center">
                                <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-brand-500/20">
                                    🔥
                                </div>
                                <h3 className="text-2xl font-bold text-white font-display mb-2">{userStreak} Day Streak!</h3>
                                <p className="text-slate-400 mb-6">
                                    You're on fire! Consistency is the #1 predictor of exam success. Keep showing up every day.
                                </p>
                                <button
                                    onClick={() => setShowStreakModal(false)}
                                    className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-500 transition-colors"
                                >
                                    Awesome!
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Level Details Modal */}
                {showLevelModal && (
                    <LevelDetailModal
                        isOpen={showLevelModal}
                        onClose={() => setShowLevelModal(false)}
                        level={userLevel}
                        currentXp={userXp}
                        nextLevelXp={XPService.calculateNextLevelXp(userLevel)}
                        prevLevelXp={Math.pow(userLevel - 1, 2) * 100}
                        examName={examName}
                    />
                )}

                <ReportIssueModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                />
            </div>
        </div>
    );
}



