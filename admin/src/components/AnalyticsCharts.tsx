import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsChartsProps {
    blueprint: { domain: string; weight: number }[];
    questions: { domain?: string; difficulty?: string }[];
    domains?: string[];
}

export default function AnalyticsCharts({ blueprint, questions, domains: providedDomains }: AnalyticsChartsProps) {
    const data = useMemo(() => {
        // 1. Get all unique domains (prefer provided list, fallback to derived)
        const allDomains = new Set<string>(providedDomains || []);
        if (allDomains.size === 0) {
            blueprint.forEach(b => allDomains.add(b.domain));
            questions.forEach(q => {
                if (q.domain) allDomains.add(q.domain);
            });
        }

        // 2. Calculate Actual Counts & Percentages
        const totalQuestions = questions.length;
        const counts: Record<string, { total: number, easy: number, medium: number, hard: number }> = {};

        questions.forEach(q => {
            if (q.domain) {
                if (!counts[q.domain]) counts[q.domain] = { total: 0, easy: 0, medium: 0, hard: 0 };
                counts[q.domain].total++;

                const diff = (q.difficulty || 'Medium').toLowerCase();
                if (diff === 'easy') counts[q.domain].easy++;
                else if (diff === 'hard') counts[q.domain].hard++;
                else counts[q.domain].medium++;
            }
        });

        // 3. Build Data Array
        return Array.from(allDomains).map(domain => {
            const target = blueprint.find(b => b.domain === domain)?.weight || 0;
            const domainStats = counts[domain] || { total: 0, easy: 0, medium: 0, hard: 0 };

            // Calculate % of TOTAL exam (to match Target scale)
            const actualTotal = totalQuestions > 0 ? (domainStats.total / totalQuestions) * 100 : 0;
            const actualEasy = totalQuestions > 0 ? (domainStats.easy / totalQuestions) * 100 : 0;
            const actualMedium = totalQuestions > 0 ? (domainStats.medium / totalQuestions) * 100 : 0;
            const actualHard = totalQuestions > 0 ? (domainStats.hard / totalQuestions) * 100 : 0;

            return {
                name: domain,
                Target: target,
                // Total Actual % for validation logic
                Actual: actualTotal,
                // Stacked values (Percentages of total exam)
                Easy: actualEasy,
                Medium: actualMedium,
                Hard: actualHard,
                // Raw counts for tooltip
                countTotal: domainStats.total,
                countEasy: domainStats.easy,
                countMedium: domainStats.medium,
                countHard: domainStats.hard
            };
        });
    }, [blueprint, questions, providedDomains]);

    if (questions.length === 0 && blueprint.length === 0) {
        return <div className="text-center text-slate-500 py-10">No data available for analytics.</div>;
    }

    return (
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-6 font-display">Domain Distribution & Difficulty</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={10}
                            tick={{ fill: '#94a3b8' }}
                            interval={0} // Force show all labels
                            angle={-25} // Slight angle for reading
                            textAnchor="end" // Align correctly when angled
                            height={60} // Give space for angled labels
                        />
                        <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} unit="%" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: number, name: string, props: any) => {
                                if (name === 'Target Blueprint %') return [`${value.toFixed(1)}%`, name];
                                // Show raw count + % for difficulty bars
                                const count = props.payload[`count${name}`];
                                return [`${value.toFixed(1)}% (${count} Qs)`, `${name}`];
                            }}
                            labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Bar dataKey="Target" fill="#6366f1" radius={[4, 4, 0, 0]} name="Target Blueprint %" />

                        {/* Stacked Bars for Actual Distribution */}
                        <Bar dataKey="Easy" stackId="actual" fill="#22c55e" name="Easy" />
                        <Bar dataKey="Medium" stackId="actual" fill="#eab308" name="Medium" />
                        <Bar dataKey="Hard" stackId="actual" fill="#ef4444" radius={[4, 4, 0, 0]} name="Hard" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Total Questions</div>
                    <div className="text-2xl font-bold text-white">{questions.length}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Blueprint Status</div>
                    <div className="text-2xl font-bold text-white">
                        {data.every(d => Math.abs(d.Actual - d.Target) <= 5) ?
                            <span className="text-emerald-400">Balanced</span> :
                            <span className="text-amber-400">Needs Work</span>
                        }
                    </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Domains</div>
                    <div className="text-2xl font-bold text-white">{data.length}</div>
                </div>
            </div>
        </div>
    );
}
