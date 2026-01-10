import { useState, useEffect } from 'react';
import { SystemHealthService } from '../services/SystemHealthService';
import type { SystemHealthMetrics } from '../services/SystemHealthService';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Exam Selector Component
const ExamSelector = ({ selected, onSelect }: { selected: string, onSelect: (id: string) => void }) => (
    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
        <button
            onClick={() => onSelect('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selected === 'all' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            All Exams
        </button>
        <button
            onClick={() => onSelect('default-exam')} // Assuming PMP is default-exam driven
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selected === 'default-exam' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            PMP
        </button>
        <button
            onClick={() => onSelect('itil-4')} // Example ID
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selected === 'itil-4' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            ITIL
        </button>
    </div>
);

export function SystemHealthPage() {
    const [selectedExam, setSelectedExam] = useState('default-exam'); // Default to PMP
    const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, [selectedExam]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await SystemHealthService.getHealthMetrics(selectedExam);
            setMetrics(data);
        } catch (e) {
            console.error("Failed to load health metrics", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !metrics) return <div className="p-8 text-slate-400">Loading system vitals...</div>;

    const statusColor = metrics.globalStatus === 'Healthy' ? 'text-emerald-400' : metrics.globalStatus === 'Warning' ? 'text-amber-400' : 'text-red-400';
    const StatusIcon = metrics.globalStatus === 'Healthy' ? CheckCircle : metrics.globalStatus === 'Warning' ? AlertTriangle : ShieldAlert;

    // Transform quality mix for chart (placeholder trend if service returns snapshot)
    // For MVP, we'll visualize the snapshot as a stacked bar or simple composition
    const qualityData = [
        { name: 'Stable', value: metrics.qualityMix.stable, color: '#10B981' },
        { name: 'Monitor', value: metrics.qualityMix.monitor, color: '#3B82F6' },
        { name: 'Needs Variant', value: metrics.qualityMix.needsVariant, color: '#F59E0B' },
        { name: 'Needs Reword', value: metrics.qualityMix.needsReword, color: '#EF4444' },
    ];

    const totalQuestions = Object.values(metrics.qualityMix).reduce((a, b) => a + b, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white font-display tracking-tight">System Health</h1>
                    <p className="text-slate-400 text-sm">Real-time observability and risk assessment</p>
                </div>
                <div className="flex items-center gap-4">
                    <ExamSelector selected={selectedExam} onSelect={setSelectedExam} />
                    <button onClick={() => navigate('/exam-health')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                        View Detailed Audit &rarr;
                    </button>
                </div>
            </header>

            {/* Top Bar: Status & Insight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Global Status Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                    <div className={`absolute inset-0 opacity-10 ${metrics.globalStatus === 'Healthy' ? 'bg-emerald-500' : metrics.globalStatus === 'Warning' ? 'bg-amber-500' : 'bg-red-500'} transition-colors duration-500`}></div>
                    <StatusIcon className={`w-12 h-12 mb-3 ${statusColor}`} />
                    <h2 className="text-lg font-semibold text-white mb-1">System is {metrics.globalStatus}</h2>
                    <p className="text-xs text-slate-400">Drift signals are within {metrics.globalStatus === 'Healthy' ? 'nominal' : 'acceptable'} ranges.</p>
                </div>

                {/* Insight Panel */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <Search className="w-4 h-4 text-indigo-400" />
                        AI Insights
                    </h3>
                    <div className="space-y-3">
                        {metrics.insights.map((insight, i) => {
                            const [level, text] = insight.split(':');
                            const levelColor = level.includes('Action') ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                            return (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${levelColor}`}>
                                        {level}
                                    </span>
                                    <p className="text-sm text-slate-300">{text}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Quality Mix */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Content Quality</h3>
                    {totalQuestions === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-center">
                            <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
                            <p className="text-slate-500 text-sm">Insufficient data</p>
                            <p className="text-xs text-slate-600 mt-1">Not enough eligible questions found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {qualityData.map((item) => (
                                <div key={item.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">{item.name}</span>
                                        <span className="text-slate-400">{Math.round((item.value / totalQuestions) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${(item.value / totalQuestions) * 100}%`, backgroundColor: item.color }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Gate Outcomes (Distribution) */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Gate Outcomes (Last 7 Days)</h3>
                    <div className="flex items-end h-32 gap-2 mt-4">
                        <div className="flex-1 flex flex-col justify-end group">
                            <div className="bg-emerald-500/80 rounded-t-lg transition-all hover:bg-emerald-500" style={{ height: `${metrics.gateOutcomes.ready}%` }}></div>
                            <span className="text-[10px] text-center mt-2 text-slate-400 group-hover:text-white">Ready ({metrics.gateOutcomes.ready}%)</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end group">
                            <div className="bg-amber-500/80 rounded-t-lg transition-all hover:bg-amber-500" style={{ height: `${metrics.gateOutcomes.borderline}%` }}></div>
                            <span className="text-[10px] text-center mt-2 text-slate-400 group-hover:text-white">Borderline ({metrics.gateOutcomes.borderline}%)</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end group">
                            <div className="bg-red-500/80 rounded-t-lg transition-all hover:bg-red-500" style={{ height: `${metrics.gateOutcomes.notReady}%` }}></div>
                            <span className="text-[10px] text-center mt-2 text-slate-400 group-hover:text-white">Not Ready ({metrics.gateOutcomes.notReady}%)</span>
                        </div>
                    </div>
                </div>

                {/* 3. Memorization Rate (Trend) */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Memorization Trends (14d)</h3>
                    <div className="h-32 -mx-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.memorizationTrend}>
                                <Line type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={2} dot={false} />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.1)' }}
                                    itemStyle={{ color: '#F59E0B', fontSize: '12px' }}
                                    formatter={(val: number) => [`${val}%`, 'Risk Rate']}
                                    labelStyle={{ display: 'none' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}
