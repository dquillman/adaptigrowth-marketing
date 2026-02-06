import { useState, useEffect, useRef } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';

interface ChartData {
    date: string;
    accuracy: number;
    speed: number; // seconds per question
}


interface SpeedAccuracyChartProps {
    currentExamId: string;
}

export default function SpeedAccuracyChart({ currentExamId }: SpeedAccuracyChartProps) {
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    // const [showInfo, setShowInfo] = useState(false);

    // Fix for "width(-1)" warning: Only render chart when container has valid dimensions
    // We use a hybrid approach: ResizeObserver for correctness + Timeout for safety
    const [isChartReady, setIsChartReady] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Safety fallback: If ResizeObserver fails to trigger (e.g., race condition),
        // force the chart to render after a short delay so user always sees data.
        const safetyTimer = setTimeout(() => {
            setIsChartReady(true);
        }, 250);

        if (!containerRef.current) return () => clearTimeout(safetyTimer);

        // precise sizing check
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                // Only allow render if we have strict positive dimensions
                if (width > 0 && height > 0) {
                    setIsChartReady(true);
                    clearTimeout(safetyTimer); // Cancel fallback if successful
                    resizeObserver.disconnect();
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            clearTimeout(safetyTimer);
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser || !currentExamId) return;

            try {
                // Query from quizRuns/{userId}/runs - the actual data source
                // Using simple query to avoid composite index requirements
                const userId = auth.currentUser.uid;
                const runsRef = collection(db, 'quizRuns', userId, 'runs');

                let runs: any[] = [];

                try {
                    // Try with composite query first (if index exists)
                    const q = query(
                        runsRef,
                        where('examId', '==', currentExamId),
                        where('status', '==', 'completed'),
                        orderBy('completedAt', 'desc'),
                        limit(50)
                    );
                    const snapshot = await getDocs(q);
                    runs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                } catch {
                    // Fallback: query only by status, filter client-side
                    console.warn("SpeedAccuracyChart: Composite index not available, using fallback query");
                    const fallbackQ = query(
                        runsRef,
                        where('status', '==', 'completed'),
                        limit(100)
                    );
                    const snapshot = await getDocs(fallbackQ);
                    runs = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter((r: any) => r.examId === currentExamId)
                        .sort((a: any, b: any) => {
                            const aTime = a.completedAt?.seconds || 0;
                            const bTime = b.completedAt?.seconds || 0;
                            return bTime - aTime; // desc
                        })
                        .slice(0, 50);
                }

                // Exclude diagnostics (no meaningful trend data for chart)
                const scored = runs.filter((r: any) => r.mode !== 'diagnostic' && r.quizType !== 'diagnostic');

                // Process data for chart (reverse to show chronological order)
                const processedData = scored.reverse().map((run: any) => {
                    // Calculate score from answers array
                    const answers = run.answers || [];
                    const totalQuestions = answers.length;
                    const correctCount = answers.filter((a: any) => a.isCorrect).length;
                    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

                    // Calculate speed from results or answers timing
                    let speed = 0;
                    if (run.results?.averageTimePerQuestion) {
                        speed = Math.round(run.results.averageTimePerQuestion);
                    } else if (run.results?.timeSpent && totalQuestions > 0) {
                        speed = Math.round(run.results.timeSpent / totalQuestions);
                    }

                    // Get timestamp from completedAt or updatedAt
                    const timestamp = run.completedAt || run.updatedAt;
                    const date = timestamp?.seconds
                        ? new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : 'Unknown';

                    return {
                        date,
                        accuracy,
                        speed
                    };
                });

                setData(processedData);
            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentExamId]);

    if (loading) return <div className="h-64 w-full bg-slate-800/50 animate-pulse rounded-xl"></div>;

    if (data.length === 0) {
        return (
            <div className="h-64 w-full flex flex-col items-center justify-center text-slate-400 bg-slate-800/30 rounded-xl border border-slate-700/50 px-4 text-center">
                <p className="font-medium">Performance trends appear after your first Smart Practice session.</p>
                <p className="text-sm text-slate-500 mt-1">Diagnostic results are not included in trend analysis.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[300px] md:h-[400px] relative overflow-hidden bg-slate-800/30 rounded-xl border border-slate-700/50">
            {/* Scrollable Container */}
            <div className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                {/* Min-width container to force scroll if needed */}
                <div ref={containerRef} className="min-w-[800px] w-full h-full bg-slate-800/20 relative" style={{ minHeight: '100%' }}>
                    {isChartReady && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                            <ComposedChart
                                data={data}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    bottom: 20,
                                    left: 20,
                                }}
                            >
                                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8' }}
                                    tickLine={{ stroke: '#334155' }}
                                    axisLine={{ stroke: '#334155' }}
                                />

                                {/* Left Y-Axis: Accuracy (%) */}
                                <YAxis
                                    yAxisId="left"
                                    stroke="#10b981"
                                    domain={[0, 100]}
                                    tick={{ fill: '#10b981' }}
                                    tickLine={{ stroke: '#334155' }}
                                    axisLine={{ stroke: '#334155' }}
                                    label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', fill: '#10b981', dy: 50 }}
                                />

                                {/* Right Y-Axis: Speed (sec/q) */}
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#8b5cf6"
                                    tick={{ fill: '#8b5cf6' }}
                                    tickLine={{ stroke: '#334155' }}
                                    axisLine={{ stroke: '#334155' }}
                                    label={{ value: 'Avg Time (sec)', angle: 90, position: 'insideRight', fill: '#8b5cf6', dy: 50 }}
                                />

                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#f1f5f9' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                                <Bar
                                    yAxisId="left"
                                    dataKey="accuracy"
                                    name="Accuracy (%)"
                                    fill="#10b981"
                                    barSize={20}
                                    radius={[4, 4, 0, 0]}
                                    fillOpacity={0.8}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="speed"
                                    name="Speed (sec/q)"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
