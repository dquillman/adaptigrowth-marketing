import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

interface Exam {
    id: string;
    name: string;
}

interface Signal {
    type: string;
    severity: 'monitor' | 'adjust' | 'review';
    details: string;
    domain?: string;
}

interface ExamHealth {
    examId: string;
    status: 'healthy' | 'warning' | 'critical';
    lastUpdated: any;
    signals: Signal[];
    metrics: {
        avgReadiness: number;
        explanationViewRate: number;
        avgTimePerQuestion: number;
    };
}

export default function ExamHealthPage() {
    const [healthData, setHealthData] = useState<ExamHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [exams, setExams] = useState<Exam[]>([]);
    const [activeExamId, setActiveExamId] = useState('pmp-exam-1'); // Default fallback

    useEffect(() => {
        fetchExams();
    }, []);

    useEffect(() => {
        if (activeExamId) {
            fetchHealth();
        }
    }, [activeExamId]);

    const fetchExams = async () => {
        try {
            const snap = await getDocs(collection(db, 'exams'));
            const examList = snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
            setExams(examList);
            // Default to first exam if active not set or not in list (optional logic)
            if (examList.length > 0 && !examList.find(e => e.id === activeExamId)) {
                setActiveExamId(examList[0].id);
            }
        } catch (err) {
            console.error("Error fetching exams:", err);
        }
    };

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'examHealth', activeExamId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setHealthData(snap.data() as ExamHealth);
            } else {
                setHealthData(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runAnalysis = async () => {
        setAnalyzing(true);
        try {
            const analyzeFn = httpsCallable(functions, 'analyzeExamHealth');
            const result = await analyzeFn({ examId: activeExamId });
            console.log("Analysis Result:", result);

            const data = result.data as any;
            if (data.status === 'insufficient_data') {
                alert(`Analysis Skipped: ${data.message} (Try running some mock exams first)`);
            } else {
                await fetchHealth(); // Refresh data
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Analysis failed. Check console.");
        } finally {
            setAnalyzing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50';
            case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
            case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/50';
            default: return 'bg-slate-800 text-slate-400';
        }
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white">Exam Health & Drift</h1>
                    <p className="text-slate-400 mt-1">Automated auditing of question quality and user confusion.</p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={activeExamId}
                        onChange={(e) => setActiveExamId(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={runAnalysis}
                        disabled={analyzing}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${analyzing ? 'bg-slate-700 text-slate-500' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'}`}
                    >
                        {analyzing ? 'Analyzing...' : 'Run Analysis Now'}
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading health data...</div>
            ) : !healthData ? (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
                    <p className="text-slate-400 mb-4">No health report found for this exam.</p>
                    <button onClick={runAnalysis} className="text-brand-400 hover:text-brand-300 font-medium">Run first analysis</button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Status Banner */}
                    <div className={`p-6 rounded-xl border flex items-center gap-6 ${getStatusColor(healthData.status)}`}>
                        <div className="text-4xl text-center">
                            {healthData.status === 'healthy' ? '🛡️' : healthData.status === 'warning' ? '⚠️' : '🚨'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold uppercase tracking-wide">{healthData.status}</h2>
                            <p className="opacity-90">
                                {healthData.status === 'healthy' ? 'System is functioning within nominal parameters.' :
                                    healthData.status === 'warning' ? 'Minor drift detected. Adjustments recommended.' :
                                        'Critical drift or quality issues detected. Review required.'}
                            </p>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard
                            label="Avg Time / Question"
                            value={`${healthData.metrics.avgTimePerQuestion.toFixed(1)}s`}
                            subtext="Target: 30s - 90s"
                        />
                        <MetricCard
                            label="Explanation View Rate"
                            value={`${(healthData.metrics.explanationViewRate * 100).toFixed(1)}%`}
                            subtext="Target: < 40%"
                        />
                        <MetricCard
                            label="Avg Readiness"
                            value="N/A"
                            subtext="Metric coming in Phase 2"
                        />
                    </div>

                    {/* Signals List */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                            <h3 className="font-bold text-white">Detected Signals</h3>
                        </div>
                        {healthData.signals.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No anomalous signals detected.</div>
                        ) : (
                            <div className="divide-y divide-slate-700">
                                {healthData.signals.map((signal, idx) => (
                                    <div key={idx} className="p-6 flex items-start gap-4 hover:bg-slate-800/40 transition-colors">
                                        <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${signal.severity === 'review' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                            signal.severity === 'adjust' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                                                'bg-blue-500'
                                            }`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <h4 className="font-bold text-slate-200 uppercase text-sm tracking-wider">
                                                    {signal.type.replace('_', ' ')}
                                                </h4>
                                                <span className={`text-xs px-2 py-1 rounded border uppercase font-bold ${signal.severity === 'review' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                    signal.severity === 'adjust' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                                                        'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                                    }`}>{signal.severity}</span>
                                            </div>
                                            <p className="text-slate-300">{signal.details}</p>
                                            {signal.domain && (
                                                <div className="mt-2 inline-block px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-400">
                                                    Domain: {signal.domain}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, subtext }: { label: string, value: string, subtext: string }) {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">{label}</h3>
            <div className="text-3xl font-bold text-white mb-1 font-display">{value}</div>
            <div className="text-slate-500 text-xs">{subtext}</div>
        </div>
    );
}
