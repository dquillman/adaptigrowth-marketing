import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle, BookOpen, Brain, Clock, X, RefreshCw, Zap } from 'lucide-react';
import DashboardLink from '../../components/DashboardLink';
import { useAuth } from '../../App';
import { StudyPlanService } from '../../services/StudyPlanService';
import { useExam } from '../../contexts/ExamContext';
import type { StudyPlan, DailyTask } from '../../types/StudyPlan';
import { useNavigate, useLocation } from 'react-router-dom';
import MockExamConfigModal from '../../components/planner/MockExamConfigModal';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// Injected reinforcement task after diagnostic/mock
interface InjectedTask {
    id: string;
    runId: string;
    domain: string;
    source: 'diagnostic' | 'mock-exam';
}

export default function StudySchedule() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [plan, setPlan] = useState<StudyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [showExamConfig, setShowExamConfig] = useState(false);

    // Recalculation state
    const [recalculating, setRecalculating] = useState(false);
    const [recalcToast, setRecalcToast] = useState<{ show: boolean; domain: string | null; error?: string }>({ show: false, domain: null });

    // Injected reinforcement task state (post-diagnostic/mock)
    const [injectedTask, setInjectedTask] = useState<InjectedTask | null>(null);

    // Readiness state for mock exam gating (v15 trust fix)
    const [readinessScore, setReadinessScore] = useState<number | null>(null);
    const [readinessPreliminary, setReadinessPreliminary] = useState(false);
    const [readinessLoaded, setReadinessLoaded] = useState(false);

    // Diagnostic context from navigation
    const fromDiagnostic = location.state?.source === 'diagnostic';
    const recommendedDomain = location.state?.recommendedDomain;

    // Exam date prompt state
    const EXAM_DATE_KEY = 'exam_coach_pmp_exam_date';
    const [showExamDatePrompt, setShowExamDatePrompt] = useState(false);
    const [pendingExamDate, setPendingExamDate] = useState('');

    // Check if exam date prompt should be shown (one-time, on mount)
    useEffect(() => {
        const storedDate = localStorage.getItem(EXAM_DATE_KEY);
        if (!storedDate && fromDiagnostic) {
            setShowExamDatePrompt(true);
        }
    }, [fromDiagnostic]);

    const handleSaveExamDate = () => {
        if (pendingExamDate) {
            localStorage.setItem(EXAM_DATE_KEY, pendingExamDate);
        }
        setShowExamDatePrompt(false);
    };

    const handleSkipExamDate = () => {
        setShowExamDatePrompt(false);
    };


    // Use the global Exam context
    const { selectedExamId, examName } = useExam();

    // Check for recent diagnostic/mock that needs reinforcement
    useEffect(() => {
        if (!user || !selectedExamId) return;

        const checkForReinforcement = async () => {
            try {
                // Query recent completed diagnostic or simulation runs
                const runsRef = collection(db, 'quizRuns', user.uid, 'runs');
                const q = query(
                    runsRef,
                    where('status', '==', 'completed'),
                    where('examId', '==', selectedExamId),
                    orderBy('completedAt', 'desc'),
                    limit(5)
                );

                const snapshot = await getDocs(q);
                if (snapshot.empty) return;

                // Find the most recent diagnostic or simulation (mock exam)
                for (const docSnap of snapshot.docs) {
                    const run = docSnap.data();
                    const runId = docSnap.id;

                    // Only consider diagnostic or simulation (mock exam) runs
                    if (run.quizType !== 'diagnostic' && run.quizType !== 'simulation') continue;

                    // Check if we've already addressed this run
                    const ackKey = `ec_reinforcement_ack_${runId}`;
                    if (localStorage.getItem(ackKey)) continue;

                    // Extract weakest domain from results
                    const domainResults = run.results?.domainResults;
                    if (!domainResults) continue;

                    let weakestDomain: string | null = null;
                    let worstAccuracy = Infinity;

                    for (const [domain, stats] of Object.entries(domainResults) as [string, { correct: number; total: number }][]) {
                        if (stats.total > 0) {
                            const accuracy = stats.correct / stats.total;
                            if (accuracy < worstAccuracy) {
                                worstAccuracy = accuracy;
                                weakestDomain = domain;
                            }
                        }
                    }

                    if (weakestDomain) {
                        setInjectedTask({
                            id: `reinforcement-${runId}`,
                            runId,
                            domain: weakestDomain,
                            source: run.quizType === 'diagnostic' ? 'diagnostic' : 'mock-exam'
                        });
                        return; // Only one injection at a time
                    }
                }
            } catch (error) {
                console.error('Error checking for reinforcement:', error);
            }
        };

        checkForReinforcement();
    }, [user, selectedExamId]);

    // Handle completing the injected reinforcement task
    const handleReinforcementComplete = () => {
        if (!injectedTask) return;

        // Mark as acknowledged in localStorage
        const ackKey = `ec_reinforcement_ack_${injectedTask.runId}`;
        localStorage.setItem(ackKey, new Date().toISOString());

        setInjectedTask(null);
    };

    // Check readiness BEFORE Today's Mission renders (v15 trust fix)
    // Score thresholds: <50 High Risk, 50-69 Borderline, >=70 Ready
    useEffect(() => {
        if (!user || !selectedExamId) return;

        const checkReadiness = async () => {
            try {
                const { PredictionEngine } = await import('../../services/PredictionEngine');
                const report = await PredictionEngine.calculateReadiness(user.uid, selectedExamId);
                setReadinessScore(report?.overallScore ?? 100);
                setReadinessPreliminary(report?.isPreliminary ?? false);
            } catch (error) {
                console.error('Readiness check failed:', error);
                setReadinessScore(100); // Default to safe if check fails
            } finally {
                setReadinessLoaded(true);
            }
        };

        checkReadiness();
    }, [user, selectedExamId]);

    useEffect(() => {
        if (!user || !selectedExamId) return;

        const loadPlan = async () => {
            setLoading(true);
            try {
                // Use ID from context
                console.log("StudySchedule loading plan for exam:", selectedExamId);
                const currentPlan = await StudyPlanService.getCurrentPlan(user.uid, selectedExamId);
                if (!currentPlan) {
                    navigate('/app/planner/setup');
                    return;
                }
                setPlan(currentPlan);
            } catch (error) {
                console.error("Failed to load plan", error);
            } finally {
                setLoading(false);
            }
        };

        loadPlan();
    }, [user, navigate, selectedExamId]);

    if (loading || !readinessLoaded) return <div className="p-8 text-center text-slate-400">Loading your personalized roadmap...</div>;
    if (!plan) return null;

    // Group tasks by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort tasks
    const sortedTasks = [...plan.tasks].sort((a, b) => a.date.getTime() - b.date.getTime());

    const todaysTasksRaw = sortedTasks.filter(t => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    // v15 trust fix: Gate mock exams based on readiness
    // HIGHEST PRIORITY: If preliminary (remaining questions > 0), suppress entirely
    // Then score thresholds: <50 suppress, 50-69 never first, >=70 normal
    const todaysTasks = (() => {
        if (readinessPreliminary) {
            return todaysTasksRaw.filter(t => t.activityType !== 'mock-exam');
        }
        const score = readinessScore ?? 100;
        if (score < 50) {
            return todaysTasksRaw.filter(t => t.activityType !== 'mock-exam');
        }
        if (score < 70) {
            return [...todaysTasksRaw].sort((a, b) => {
                const aIsMock = a.activityType === 'mock-exam';
                const bIsMock = b.activityType === 'mock-exam';
                if (aIsMock && !bIsMock) return 1;
                if (!aIsMock && bIsMock) return -1;
                return 0;
            });
        }
        return todaysTasksRaw;
    })();

    const upcomingTasks = sortedTasks.filter(t => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() > today.getTime();
    }); // Show next 10

    const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
        if (!plan || !user) return;

        // Optimistic update
        setPlan(prev => {
            if (!prev) return null;
            return {
                ...prev,
                tasks: prev.tasks.map(t =>
                    t.id === taskId ? { ...t, completed: !currentStatus } : t
                )
            };
        });

        try {
            await StudyPlanService.markTaskComplete(plan.id!, taskId, !currentStatus);
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on failure
            setPlan(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    tasks: prev.tasks.map(t =>
                        t.id === taskId ? { ...t, completed: currentStatus } : t
                    )
                };
            });
        }
    };

    // Handle recalculation based on current progress
    const handleRecalculatePlan = async () => {
        if (!user || !plan || !selectedExamId) return;

        setRecalculating(true);
        setRecalcToast({ show: false, domain: null });

        try {
            const result = await StudyPlanService.recalculatePlanFromProgress(
                user.uid,
                selectedExamId,
                plan,
                examName || undefined,
                []
            );

            if (result.success && result.newAnchorDomain) {
                // Refresh plan from Firestore
                const updatedPlan = await StudyPlanService.getCurrentPlan(user.uid, selectedExamId);
                if (updatedPlan) {
                    setPlan(updatedPlan);
                }
                setRecalcToast({ show: true, domain: result.newAnchorDomain });
                // Auto-hide toast after 5 seconds
                setTimeout(() => setRecalcToast({ show: false, domain: null }), 5000);
            } else {
                setRecalcToast({ show: true, domain: null, error: result.error || 'Could not update plan.' });
                setTimeout(() => setRecalcToast({ show: false, domain: null }), 5000);
            }
        } catch (error) {
            console.error('Recalculation failed:', error);
            setRecalcToast({ show: true, domain: null, error: 'Failed to update plan. Please try again.' });
            setTimeout(() => setRecalcToast({ show: false, domain: null }), 5000);
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto text-slate-100">
            {/* Back to Dashboard */}
            <DashboardLink className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-4" />

            {/* Guided Plan Microcopy */}
            <p className="text-sm text-slate-500 mb-4">
                You're on the <span className="text-slate-400">Guided Plan</span>. Complete today's Smart Practice — your plan adapts as you go.
            </p>

            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white mb-2">My {examName || ''} Plan</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Target Exam Date: <span className="text-emerald-400 font-bold">{plan.examDate.toLocaleDateString()}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-sm">
                        {plan.weeklyHours} hours / week
                    </div>
                    <button
                        onClick={handleRecalculatePlan}
                        disabled={recalculating}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-indigo-500 hover:border-indigo-400 flex items-center gap-2"
                        title="Adjusts your plan based on your current quiz performance"
                    >
                        <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                        {recalculating ? 'Updating...' : 'Update Plan Based on My Progress'}
                    </button>
                    <button
                        onClick={() => navigate('/app/planner/setup', {
                            state: {
                                editMode: true,
                                currentSettings: {
                                    examDate: plan.examDate,
                                    weeklyHours: plan.weeklyHours
                                }
                            }
                        })}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600 hover:border-slate-500"
                    >
                        Edit Settings
                    </button>
                </div>
            </header>

            {/* Diagnostic Context Banner */}
            {fromDiagnostic && (
                <div className="mb-6 bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-indigo-200 text-sm">
                        <span className="font-semibold">✓ This study plan is based on your diagnostic results.</span>
                        {recommendedDomain && (
                            <span className="block mt-1 text-indigo-300">
                                We'll start by focusing on <strong className="text-white">{recommendedDomain}</strong>, your biggest opportunity for improvement.
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* Recommended Next Step */}
            {fromDiagnostic && recommendedDomain && (
                <div className="mb-6 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-purple-300 text-sm font-semibold">
                                Recommended: Domain Quiz ({recommendedDomain})
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                                This domain showed the most opportunity in your diagnostic. Other quiz types are available in the sidebar.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/app/quiz', { state: { mode: 'weakest', filterDomain: recommendedDomain } })}
                            className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                            Start Domain Quiz
                        </button>
                    </div>
                </div>
            )}

            {/* Exam Date Prompt Modal */}
            {showExamDatePrompt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white font-display">When is your PMP exam?</h3>
                                <p className="text-slate-400 text-sm mt-1">This helps us pace your study plan.</p>
                            </div>
                            <button
                                onClick={handleSkipExamDate}
                                className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <input
                            type="date"
                            value={pendingExamDate}
                            onChange={(e) => setPendingExamDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={handleSkipExamDate}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 rounded-xl transition-all text-sm"
                            >
                                I'll add this later
                            </button>
                            <button
                                onClick={handleSaveExamDate}
                                disabled={!pendingExamDate}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Mission */}
            <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                    Today's Mission
                </h2>

                <div className="grid gap-4">
                    {/* Injected Reinforcement Task - appears FIRST */}
                    {injectedTask && (
                        <div className="bg-gradient-to-r from-amber-900/40 to-slate-800 border-2 border-amber-500/50 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <Zap className="w-6 h-6 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            PRIORITY
                                        </span>
                                        <span className="text-xs text-slate-400">~20 min</span>
                                    </div>
                                    <h3 className="font-bold text-white">Focused Reinforcement: {injectedTask.domain}</h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Based on your recent {injectedTask.source === 'diagnostic' ? 'diagnostic' : 'mock exam'} results
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigate('/app/quiz', {
                                            state: {
                                                mode: 'weakest',
                                                filterDomain: injectedTask.domain,
                                                source: 'reinforcement'
                                            }
                                        });
                                        handleReinforcementComplete();
                                    }}
                                    className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                                >
                                    Start
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Regular Today's Tasks */}
                    {todaysTasks.length === 0 && !injectedTask ? (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
                            <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p>No tasks scheduled for today. Enjoy your break!</p>
                        </div>
                    ) : (
                        todaysTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onToggleComplete={() => handleToggleComplete(task.id, task.completed)}
                                onStartMock={() => setShowExamConfig(true)}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Upcoming */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-slate-600 rounded-full"></span>
                    Upcoming
                </h2>
                <div className="grid gap-4 opacity-75">
                    {upcomingTasks.map(task => (
                        <TaskCard key={task.id} task={task} isUpcoming />
                    ))}
                </div>
            </section>

            {/* Recalculation Toast */}
            {recalcToast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-4 rounded-xl shadow-lg border ${recalcToast.error
                    ? 'bg-red-900/90 border-red-500/50 text-red-100'
                    : 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        {recalcToast.error ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        <span className="font-medium">
                            {recalcToast.error || `Your plan has been updated to focus on ${recalcToast.domain}, based on your recent results.`}
                        </span>
                    </div>
                </div>
            )}

            <MockExamConfigModal
                isOpen={showExamConfig}
                onClose={() => setShowExamConfig(false)}
                onStart={(config) => {
                    setShowExamConfig(false);
                    navigate('/app/simulator', {
                        state: config
                    });
                }}
            />
        </div>
    );
}

// Helper to generate consistent colors from domain names
const getDomainColor = (domain: string) => {
    const colors = [
        'bg-pink-500/10 text-pink-400 border-pink-500/20',
        'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        'bg-rose-500/10 text-rose-400 border-rose-500/20',
        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    ];

    if (domain === 'Mixed') return 'bg-slate-500/10 text-slate-400 border-slate-500/20';

    // Simple hash
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
        hash = domain.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

function TaskCard({ task, isUpcoming = false, onToggleComplete, onStartMock }: { task: DailyTask, isUpcoming?: boolean, onToggleComplete?: () => void, onStartMock?: () => void }) {
    const navigate = useNavigate();

    const handleAction = () => {
        if (task.activityType === 'mock-exam') {
            if (onStartMock) onStartMock();
        } else if (task.activityType === 'quiz') {
            // Route based on quiz type
            if (task.topic.startsWith('Smart Quiz')) {
                navigate('/app/quiz', { state: { mode: 'smart' } });
            } else {
                navigate('/app/quiz', { state: { mode: 'domain', filterDomain: task.domain } });
            }
        } else {
            // For reading/review, toggle complete
            if (onToggleComplete) {
                onToggleComplete();
            }
        }
    };

    return (
        <div className={`
            flex items-center gap-4 p-4 rounded-xl border transition-all
            ${isUpcoming ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'}
        `}>
            {/* Icon based on Type */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                ${task.activityType === 'quiz' ? 'bg-purple-500/10 text-purple-400' :
                    task.activityType === 'mock-exam' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}
            `}>
                {task.activityType === 'quiz' ? <Brain className="w-5 h-5" /> :
                    task.activityType === 'mock-exam' ? <Clock className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getDomainColor(task.domain)}`}>
                        {task.domain}
                    </span>
                    {isUpcoming && <span className="text-xs text-slate-500">{task.date.toLocaleDateString()}</span>}
                </div>
                <h3 className="font-bold text-slate-200 truncate">{task.topic}</h3>
                <p className="text-xs text-slate-400 mt-1">
                    {task.activityType === 'reading'
                        ? "Read a chapter or watch a video lesson on this topic."
                        : task.activityType === 'quiz'
                            ? (task.topic.startsWith('Smart Quiz')
                                ? "Smart Quiz — Mixed questions for reinforcement."
                                : `Domain Quiz — Focus on ${task.domain} concepts.`)
                            : "Mock Exam — Full length simulation to build endurance. Block out 4 hours."}
                </p>
            </div>

            <div className="flex items-center gap-4 text-slate-500 text-sm">
                <div className="flex items-center gap-1" title="Estimated duration">
                    <Clock className="w-4 h-4" />
                    {task.durationMinutes}m
                </div>
                {!isUpcoming && (
                    <button
                        onClick={handleAction}
                        className={`w-6 h-6 rounded-full border-2 border-slate-600 transition-colors flex items-center justify-center group
                            ${task.activityType === 'reading' ? 'hover:border-emerald-500 hover:bg-emerald-500/10' : 'hover:border-indigo-500 hover:bg-indigo-500/10'}
                        `}
                        title={task.activityType === 'reading' ? "Mark as Complete" : "Start Activity"}
                    >
                        {task.activityType === 'reading' ? (
                            <CheckCircle className={`w-4 h-4 text-emerald-500 transition-opacity ${task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        ) : (
                            <div className="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}

                    </button>
                )}
            </div>
        </div>
    );
}
