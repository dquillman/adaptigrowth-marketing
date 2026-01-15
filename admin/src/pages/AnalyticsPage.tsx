import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
    BarChart3, Users, DollarSign, Activity, Target
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface MarketStats {
    date: string;
    visitors: number;
    signups: number;
    activations: number;
    upgrades: number;
    revenue: number;
    sources: { organic: number; social: number; direct: number; ads: number };
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<MarketStats[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const getStatsFn = httpsCallable(functions, 'getMarketingAnalytics');
            const result = await getStatsFn() as { data: { stats: MarketStats[] } };
            setStats(result.data.stats);
        } catch (error) {
            console.error("Failed to load stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (loadingStats) return <div className="p-10 text-center text-slate-500">Loading analytics...</div>;

    const totalVisitors = stats.reduce((acc, curr) => acc + curr.visitors, 0);
    const totalSignups = stats.reduce((acc, curr) => acc + curr.signups, 0);
    const totalUpgrades = stats.reduce((acc, curr) => acc + curr.upgrades, 0);
    const totalRevenue = stats.reduce((acc, curr) => acc + curr.revenue, 0);

    const conversionRate = totalVisitors > 0 ? ((totalSignups / totalVisitors) * 100).toFixed(1) : '0.0';

    return (
        <div className="space-y-8 h-full flex flex-col pb-20">
            <div>
                <h1 className="text-3xl font-bold text-white font-display">Analytics</h1>
                <p className="text-slate-400 mt-1">Track traffic, conversion, and revenue metrics.</p>
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Total Visitors" value={totalVisitors.toLocaleString()} sub={`${stats[0]?.visitors || 0} today`} icon={<Users />} color="blue" health="real" />
                    <KpiCard title="Conversion Rate" value={`${conversionRate}%`} sub="Visitor to Signup" icon={<Target />} color="purple" health="real" />
                    <KpiCard title="New Signups" value={totalSignups.toLocaleString()} sub="Last 30 Days" icon={<Activity />} color="emerald" health="real" />
                    <KpiCard title="Revenue (Est)" value={`$${totalRevenue.toLocaleString()}`} sub={`${totalUpgrades} upgrades`} icon={<DollarSign />} color="amber" health="partial" />
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 h-[300px] min-h-[300px]">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-400" />
                        Traffic & Conversion Trends
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats}>
                            <defs>
                                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                            <YAxis stroke="#64748b" fontSize={12} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisitors)" />
                            <Area type="monotone" dataKey="signups" stroke="#10b981" fillOpacity={1} fill="url(#colorSignups)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, sub, icon, color, health }: any) {
    const colorMap: any = {
        blue: "text-blue-400 bg-blue-500/10",
        purple: "text-purple-400 bg-purple-500/10",
        emerald: "text-emerald-400 bg-emerald-500/10",
        amber: "text-amber-400 bg-amber-500/10"
    };

    return (
        <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorMap[color]}`}>{icon}</div>
                {health === 'partial' && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">Est</span>}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-slate-400">{sub}</div>
            <div className="text-xs text-slate-500 mt-2">{title}</div>
        </div>
    );
}
