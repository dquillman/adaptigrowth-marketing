import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { PredictionEngine, type ReadinessReport } from '../services/PredictionEngine';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, BarChart2, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import PatternInsightCard, { type PatternData } from '../components/PatternInsightCard';

import { useExam } from '../contexts/ExamContext';

export default function ReadinessReportPage() {
    const { user } = useAuth();
    const { checkPermission } = useSubscription();
    const { selectedExamId, examName } = useExam();
    const navigate = useNavigate();
    const [report, setReport] = useState<ReadinessReport | null>(null);
    const [minedPatterns, setMinedPatterns] = useState<PatternData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            if (!user || !selectedExamId) return;
            try {
                // Parallel fetch: Readiness + Weakest Patterns
                const [readinessData, patternsResult] = await Promise.allSettled([
                    PredictionEngine.calculateReadiness(user.uid, selectedExamId),
                    httpsCallable(getFunctions(), 'getWeakestPatterns')()
                ]);

                if (readinessData.status === 'fulfilled') {
                    setReport(readinessData.value);
                }

                if (patternsResult.status === 'fulfilled' && patternsResult.value.data) {
                    setMinedPatterns(patternsResult.value.data as PatternData[]);
                }
            } catch (error) {
                console.error("Failed to load readiness report", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [user, selectedExamId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!report || report.totalQuestionsAnswered === 0) {
        return (
            <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center justify-center text-center">
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md">
                    <BarChart2 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Not Enough Data</h2>
                    <p className="text-slate-400 mb-6">Complete a few quizzes or a mock exam to generate your readiness prediction.</p>
                    <Link to="/app/quiz" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                        Take a Quiz
                    </Link>
                </div>
            </div>
        );
    }

    // Color Logic
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400 stroke-emerald-500';
        if (score >= 65) return 'text-amber-400 stroke-amber-500';
        return 'text-red-400 stroke-red-500';
    };

    const getStatusColor = (status: string) => {
        if (status === 'Strong') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        if (status === 'Moderate') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        if (status === 'Insufficient') return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        return 'text-red-400 bg-red-400/10 border-red-400/20';
    };

    // Radial Progress Math
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((report.overallScore ?? 0) / 100) * circumference;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 pb-24">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Exam Readiness</h1>
                    {examName && <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-1 block">{examName}</span>}
                    <p className="text-slate-400">AI-powered prediction based on your recent performance.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Score Card */}
                    <div className="md:col-span-2 bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl relative overflow-hidden">

                        {!checkPermission('analytics') && (
                            <div className="absolute inset-0 z-20 bg-slate-800/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-xl border border-slate-700">
                                    <Lock className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Detailed Analysis Locked</h3>
                                <p className="text-slate-300 mb-6 max-w-sm">
                                    Get detailed readiness predictions and trend analysis with Pro.
                                </p>
                                <button
                                    onClick={() => navigate('/app/pricing')}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                                >
                                    Unlock Report
                                </button>
                            </div>
                        )}

                        <div className={`flex flex-col md:flex-row items-center gap-8 ${!checkPermission('analytics') ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                            {/* Radial Chart */}
                            <div className="relative w-48 h-48 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90">
                                    <circle
                                        cx="96" cy="96" r={radius}
                                        className="stroke-slate-700"
                                        strokeWidth="12"
                                        fill="none"
                                    />
                                    <circle
                                        cx="96" cy="96" r={radius}
                                        className={`${report.overallScore !== null ? getScoreColor(report.overallScore) : 'stroke-slate-600'} transition-all duration-1000 ease-out`}
                                        strokeWidth="12"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={offset}
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-black ${report.overallScore !== null ? getScoreColor(report.overallScore).split(' ')[0] : 'text-slate-500'}`}>
                                        {report.overallScore !== null ? `${report.overallScore}%` : '\u2014'}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                                        {report.overallScore !== null ? 'Probability' : 'Pending'}
                                    </span>
                                </div>
                            </div>

                            {/* Stats & Trend */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                    <div>
                                        <p className="text-sm text-slate-400">Current Trend</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {report.trend === 'improving' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                                            {report.trend === 'declining' && <TrendingDown className="w-5 h-5 text-red-400" />}
                                            {report.trend === 'stable' && <Minus className="w-5 h-5 text-slate-400" />}
                                            <span className="font-bold capitalize text-white">{report.trend}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400">Questions Analyzed</p>
                                        <p className="font-bold text-xl text-white mt-1">{report.totalQuestionsAnswered}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                        {report.isPreliminary ? (
                                            <div className="flex items-center gap-2 text-amber-400">
                                                <AlertTriangle className="w-5 h-5" />
                                                <span>Preliminary Assessment</span>
                                            </div>
                                        ) : (
                                            (report.overallScore ?? 0) >= 75 ? (
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span>Assessment</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-amber-400">
                                                    <AlertTriangle className="w-5 h-5" />
                                                    <span>Assessment</span>
                                                </div>
                                            )
                                        )}
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {report.isPreliminary
                                            ? `Complete at least 50 questions for a reliable readiness score. You have answered ${report.totalQuestionsAnswered} so far.`
                                            : (report.overallScore ?? 0) >= 80
                                                ? "You are showing strong readiness! Maintain this consistency and focus on time management."
                                                : (report.overallScore ?? 0) >= 65
                                                    ? "You're getting close, but consistency is key. Focus on your weak domains below to boost your score."
                                                    : "We recommend more targeted practice before scheduling your exam. Focus on fundamental concepts."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-6">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Activity</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-white">Mock Exams</span>
                                    <span className="font-mono text-indigo-400">{report.mockExamsTaken}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white">Total Qs</span>
                                    <span className="font-mono text-indigo-400">{report.totalQuestionsAnswered}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Top Focus Area</h3>
                            {report.domainBreakdown.length > 0 && report.domainBreakdown[0].score < 70 ? (
                                <div>
                                    <p className="text-white font-bold mb-1">{report.domainBreakdown[0].domain}</p>
                                    <Link
                                        to="/app/quiz"
                                        state={{ filterDomain: report.domainBreakdown[0].domain }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2"
                                    >
                                        Practice this domain &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-emerald-400 text-sm">All domains looking good!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mindset Gaps (Weakest Patterns) */}
                {minedPatterns.length > 0 && (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    Mindset Gaps
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Common "User Traps" you are falling for. Master these to boost your score.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30">
                            {minedPatterns.map(p => (
                                <PatternInsightCard key={p.pattern_id} pattern={p} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Domain Breakdown */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="font-bold text-white">Domain Breakdown</h3>
                    </div>
                    <div className="divide-y divide-slate-700">
                        {report.domainBreakdown.map((domain) => (
                            <div key={domain.domain} className="p-6 hover:bg-slate-750 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-white">{domain.domain}</span>
                                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${getStatusColor(domain.status)}`}>
                                        {domain.status} {domain.totalQuestions > 0 ? `(${Math.round(domain.score)}%)` : ''}
                                    </span>
                                </div>
                                <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600/50">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                                        style={{
                                            width: `${domain.score}%`,
                                            backgroundColor: `hsl(${Math.min(domain.score * 1.2, 120)}, 85%, 45%)`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend / Help Text */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 text-sm text-slate-400 space-y-2">
                    <p><span className="font-bold text-slate-300">Insufficient Data:</span> A domain will be marked as "Insufficient" until you have answered at least 10 questions in that specific area.</p>
                    <p><span className="font-bold text-slate-300">Score (%):</span> This percentage represents your accuracy (Correct Answers / Total Attempts) within that domain.</p>
                    <div className="mt-2 text-slate-400">
                        <span className="font-bold text-slate-300">Current Trend:</span> Compares your last 5 attempts to your overall average:
                        <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li><span className="text-emerald-400">Improving:</span> Recent accuracy is &gt;5% higher than overall.</li>
                            <li><span className="text-red-400">Declining:</span> Recent accuracy is &gt;5% lower than overall.</li>
                            <li><span className="text-slate-400">Stable:</span> Recent performance is consistent (within 5%).</li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}
