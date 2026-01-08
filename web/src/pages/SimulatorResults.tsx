
import { useLocation, useNavigate } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { CheckCircle, XCircle, RotateCcw, LayoutDashboard, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SimulatorResults() {
    const location = useLocation();
    const navigate = useNavigate();
    const { score, total, timeSpent, questions, answers_map, flagged = {} } = location.state || {}; // answers_map is index->optionIndex

    const [domainStats, setDomainStats] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'flagged' | 'unanswered'>('all');

    useEffect(() => {
        if (!questions) {
            navigate('/simulator');
            return;
        }

        // Calculate Domain Performance
        const domains: Record<string, { correct: number, total: number }> = {};

        questions.forEach((q: any, idx: number) => {
            const domain = q.domain || 'General';
            const isCorrect = answers_map[idx] === q.correctAnswer;

            if (!domains[domain]) domains[domain] = { correct: 0, total: 0 };
            domains[domain].total++;
            if (isCorrect) domains[domain].correct++;
        });

        const stats = Object.entries(domains).map(([name, data]) => ({
            name,
            score: Math.round((data.correct / data.total) * 100),
            correct: data.correct,
            total: data.total
        }));

        setDomainStats(stats);
    }, [questions]);

    if (!questions) return null;

    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 70;

    const chartData = {
        labels: ['Correct', 'Incorrect'],
        datasets: [
            {
                data: [score, total - score],
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 0,
            },
        ],
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto w-full">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-white font-display mb-2">Exam Results</h1>
                    <p className="text-slate-400">Here is how you performed on this simulation.</p>
                </div>

                {/* Score Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className={`absolute top-0 w-full h-2 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                        <div className="w-40 h-40 mb-6">
                            <Doughnut data={chartData} options={{ maintainAspectRatio: true, cutout: '70%' }} />
                        </div>

                        <div className="text-5xl font-bold text-white mb-2">{percentage}%</div>
                        <div className={`text-lg font-bold px-4 py-1 rounded-full ${passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'
                            }`}>
                            {passed ? 'PASSED' : 'FAILED'}
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Score</p>
                                    <p className="text-2xl font-bold text-white">{score} <span className="text-slate-500 text-base">/ {total}</span></p>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Time Taken</p>
                                    <p className="text-2xl font-bold text-white">{formatTime(timeSpent)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Domain Breakdown */}
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                            <h3 className="font-bold text-white mb-4">Performance by Domain</h3>
                            <div className="space-y-4">
                                {domainStats.map((stat, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-300">{stat.name}</span>
                                            <span className="font-bold text-white">{stat.score}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${stat.score >= 70 ? 'bg-emerald-500' : stat.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${stat.score}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Review Section */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mb-12">
                    <div className="p-6 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-xl font-bold text-white">Review Answers</h3>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                All ({questions.length})
                            </button>
                            <button
                                onClick={() => setFilter('correct')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                Correct ({questions.filter((q: any, i: number) => answers_map[i] === q.correctAnswer).length})
                            </button>
                            <button
                                onClick={() => setFilter('wrong')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'wrong' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                Wrong ({questions.filter((q: any, i: number) => answers_map[i] !== undefined && answers_map[i] !== q.correctAnswer).length})
                            </button>
                            <button
                                onClick={() => setFilter('flagged')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'flagged' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                Flagged ({Object.values(flagged).filter(Boolean).length})
                            </button>
                            <button
                                onClick={() => setFilter('unanswered')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'unanswered' ? 'bg-slate-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                Unanswered ({questions.filter((_: any, i: number) => answers_map[i] === undefined).length})
                            </button>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-700">
                        {questions.map((q: any, idx: number) => {
                            const userAnswer = answers_map[idx];
                            const isCorrect = userAnswer === q.correctAnswer;
                            const isFlagged = flagged[idx];
                            const isUnanswered = userAnswer === undefined;

                            // Filter Logic
                            if (filter === 'correct' && !isCorrect) return null;
                            if (filter === 'wrong' && (isCorrect || isUnanswered)) return null;
                            if (filter === 'flagged' && !isFlagged) return null;
                            if (filter === 'unanswered' && !isUnanswered) return null;

                            return (
                                <div key={q.id} className="p-6 hover:bg-slate-700/30 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="mt-1 flex flex-col gap-2 items-center">
                                            {isCorrect ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                            ) : isUnanswered ? (
                                                <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center text-slate-500 text-xs font-bold">?</div>
                                            ) : (
                                                <XCircle className="w-6 h-6 text-red-500" />
                                            )}
                                            {isFlagged && (
                                                <div title="Flagged for review" className="text-amber-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-mono text-slate-500">Q{idx + 1}</span>
                                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                                                    {q.domain}
                                                </span>
                                            </div>
                                            <p className="text-lg text-white font-medium mb-4">{q.stem}</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                {q.options.map((opt: string, optIdx: number) => {
                                                    let borderClass = 'border-slate-700 bg-slate-800/50';
                                                    let textClass = 'text-slate-400';
                                                    let icon = null;

                                                    if (optIdx === q.correctAnswer) {
                                                        borderClass = 'border-emerald-500/50 bg-emerald-500/10';
                                                        textClass = 'text-emerald-400 font-bold';
                                                        icon = <CheckCircle className="w-4 h-4 ml-auto" />;
                                                    } else if (optIdx === userAnswer && !isCorrect) {
                                                        borderClass = 'border-red-500/50 bg-red-500/10';
                                                        textClass = 'text-red-400 line-through';
                                                        icon = <XCircle className="w-4 h-4 ml-auto" />;
                                                    }

                                                    return (
                                                        <div key={optIdx} className={`p-3 rounded-lg border flex items-center ${borderClass} ${textClass}`}>
                                                            {opt}
                                                            {icon}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 text-slate-300 text-sm leading-relaxed">
                                                <strong className="text-indigo-400 block mb-1">Explanation:</strong>
                                                {q.explanation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 pb-12">
                    <button
                        onClick={() => navigate('/simulator')}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Take Another Exam
                    </button>
                    <button
                        onClick={() => navigate('/app')}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
