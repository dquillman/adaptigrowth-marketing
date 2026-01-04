import { useState, useEffect } from 'react';
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

interface QuizAttempt {
    id: string;
    score: number;
    totalQuestions: number;
    timestamp: any;
    averageTimePerQuestion?: number;
    timeSpent?: number;
}

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

    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser || !currentExamId) return;

            try {
                // Fetch last 50 attempts for this specific exam
                const q = query(
                    collection(db, 'quizAttempts'),
                    where('userId', '==', auth.currentUser.uid),
                    where('examId', '==', currentExamId),
                    orderBy('timestamp', 'desc'),
                    limit(50)
                );

                const snapshot = await getDocs(q);
                const attempts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as QuizAttempt[];

                // Process data for chart (reverse to show chronological order)
                const processedData = attempts.reverse().map(attempt => {
                    const accuracy = Math.round((attempt.score / attempt.totalQuestions) * 100);

                    // Default to 0 if no time tracking data (legacy records)
                    let speed = 0;
                    if (attempt.averageTimePerQuestion) {
                        speed = Math.round(attempt.averageTimePerQuestion);
                    } else if (attempt.timeSpent && attempt.totalQuestions > 0) {
                        speed = Math.round(attempt.timeSpent / attempt.totalQuestions);
                    }

                    return {
                        date: new Date(attempt.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
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
            <div className="h-64 w-full flex items-center justify-center text-slate-400 bg-slate-800/30 rounded-xl border border-slate-700/50">
                No quiz data available yet.
            </div>
        );
    }

    return (
        <div className="w-full h-[300px] md:h-[400px] relative overflow-hidden bg-slate-800/30 rounded-xl border border-slate-700/50">
            {/* Scrollable Container */}
            <div className="w-full h-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                {/* Min-width container to force scroll if needed */}
                <div className="min-w-[800px] h-full p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            // ...
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
                </div>
            </div>
        </div>
    );
}
