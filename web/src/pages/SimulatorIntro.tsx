
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ArrowLeft, Play, History, Clock, FileText, Award, Lock } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

import { useExam } from '../contexts/ExamContext';

interface SimulationAttempt {
    id: string;
    score: number;
    totalQuestions: number;
    timestamp: any;
    timeSpent?: number;
    mode: string;
}

export default function SimulatorIntro() {
    const { checkPermission } = useSubscription();
    const navigate = useNavigate();
    const { examName } = useExam();
    const [attempts, setAttempts] = useState<SimulationAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const activeExamId = localStorage.getItem('selectedExamId') || 'default-exam';
    const [readiness, setReadiness] = useState<any>(null);

    useEffect(() => {
        const checkReadiness = async () => {
            if (!auth.currentUser) return;
            try {
                const { PredictionEngine } = await import('../services/PredictionEngine');
                const report = await PredictionEngine.calculateReadiness(auth.currentUser.uid, activeExamId);
                setReadiness(report);
            } catch (err) {
                console.error("Readiness check failed", err);
            }
        };

        const fetchHistory = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, 'quizAttempts'),
                    where('userId', '==', auth.currentUser.uid),
                    where('examId', '==', activeExamId),
                    where('mode', '==', 'simulation'),
                    orderBy('timestamp', 'desc')
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as SimulationAttempt[];
                setAttempts(data);
            } catch (error) {
                console.error("Error fetching simulation history:", error);
            } finally {
                setLoading(false);
            }
        };

        checkReadiness();
        fetchHistory();
    }, [activeExamId]);

    // ... (rest of history fetch)

    // Gate Logic
    const isBorderline = readiness && readiness.overallScore >= 50 && readiness.overallScore < 70;
    const notReady = readiness && readiness.overallScore < 50;

    const formatTime = (seconds?: number) => {
        if (!seconds) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        // Handle Firestore Timestamp or JS Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Override for pro users who want to ignore warning? 
    // For now, strict warning but allow click with confirm?
    // Implementation Plan says: "Strict warning to avoid complete lock-out"

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold font-display text-white">Exam Simulator</h1>
                        {examName && <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-1 block">{examName}</span>}
                        <p className="text-slate-400">Full mock exam environment.</p>
                    </div>
                </div>

                {/* Readiness Gate Banner */}
                {readiness && (notReady || isBorderline) && (
                    <div className={`mb-8 p-6 rounded-2xl border ${notReady ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${notReady ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold mb-1 ${notReady ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {notReady ? 'High Risk of Failure Detected' : 'Readiness is Borderline'}
                                </h3>
                                <p className="text-slate-300 mb-4 leading-relaxed">
                                    Your Smart Readiness Score is <strong>{readiness.overallScore}%</strong>.
                                    {notReady
                                        ? " A full exam right now is unlikely to give you useful feedback. We strongly recommend Verbal Mode or Domain Practice first."
                                        : " You may pass, but it will be close. Review your weakest domains before starting."}
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => navigate('/app/verbal')}
                                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm border border-slate-600 transition-colors"
                                    >
                                        Go to Verbal Mode
                                    </button>
                                    <button
                                        onClick={() => navigate('/app')}
                                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm border border-slate-600 transition-colors"
                                    >
                                        Practice Weakest Domain
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Action Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className={`lg:col-span-2 bg-gradient-to-br from-indigo-900/50 to-slate-900 border ${notReady ? 'border-red-500/20' : 'border-indigo-500/30'} rounded-2xl p-8 relative overflow-hidden shadow-2xl transition-all`}>
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Realistic Mock Exam</h2>
                        <div className="flex flex-wrap gap-4 mb-8 text-slate-300 relative z-10">
                            {/* ... stats ... */}
                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <span>50 Questions</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                                <Clock className="w-4 h-4 text-pink-400" />
                                <span>60 Minutes</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                                <Award className="w-4 h-4 text-yellow-400" />
                                <span>No Hints</span>
                            </div>
                        </div>

                        <p className="text-slate-300 mb-8 max-w-xl leading-relaxed relative z-10">
                            Test your readiness under exam conditions. You won't see correct answers until you finish.
                            Results from this mode will <strong>not</strong> affect your Mastery Rings.
                        </p>

                        {!checkPermission('simulator') ? (
                            <div className="relative z-10">
                                <button
                                    disabled
                                    className="flex items-center gap-3 bg-slate-700 text-slate-400 px-8 py-4 rounded-xl font-bold text-lg cursor-not-allowed border border-slate-600 mb-4"
                                >
                                    <Lock className="w-5 h-5" />
                                    Pro Feature Only
                                </button>
                                <p className="text-indigo-200 text-sm max-w-sm">
                                    <span onClick={() => navigate('/app/pricing')} className="underline cursor-pointer hover:text-white">Upgrade to Pro</span> to access full exam simulators.
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (notReady) {
                                        if (window.confirm("CRITICAL WARNING: Your readiness score indicates a high chance of failure. Are you sure you want to proceed? This may impact your confidence.")) {
                                            navigate('/app/simulator/exam');
                                        }
                                    } else {
                                        navigate('/app/simulator/exam');
                                    }
                                }}
                                className={`relative z-10 flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transform hover:-translate-y-1 transition-all ${notReady
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                                    }`}
                            >
                                <Play className="w-5 h-5 fill-current" />
                                {notReady ? 'Proceed Anyway (High Risk)' : 'Start New Exam'}
                            </button>
                        )}
                    </div>

                    {/* Quick Stats or Tips */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center">
                        {/* ... tips ... */}
                        <h3 className="text-lg font-bold text-white mb-4">Exam Tips</h3>
                        <ul className="space-y-4 text-slate-400 text-sm">
                            <li className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">1</div>
                                <span>Flag questions for review if you're unsure. Don't get stuck.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">2</div>
                                <span>Pace yourself. You have roughly 1 minute per question.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
                        <History className="w-5 h-5 text-slate-400" />
                        <h3 className="text-lg font-bold text-white">Past Attempts</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading history...</div>
                    ) : attempts.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p>No exams taken yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-800/50 text-slate-200 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Score</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {attempts.map((attempt) => {
                                        const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
                                        const passed = percentage >= 70;
                                        return (
                                            <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 text-white font-medium">{formatDate(attempt.timestamp)}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-white font-bold">{percentage}%</span>
                                                    <span className="text-slate-500 ml-1">({attempt.score}/{attempt.totalQuestions})</span>
                                                </td>
                                                <td className="px-6 py-4">{formatTime(attempt.timeSpent)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${passed
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}>
                                                        {passed ? 'PASSED' : 'FAIL'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
