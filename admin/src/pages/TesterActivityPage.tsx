import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { Activity, Clock, Search, Filter, CheckCircle2, History } from 'lucide-react';

interface Session {
    id: string;
    userId: string;
    email: string | null;
    app: string;
    loginAt: Timestamp | null;
    lastSeenAt: Timestamp | null;
    logoutAt: Timestamp | null;
    durationSec: number | null;
    endedBy: string | null;
    userAgent: string | null;
}

export default function TesterActivityPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterActive, setFilterActive] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [dateRange, setDateRange] = useState('24h');

    useEffect(() => {
        let q = query(collection(db, 'user_sessions'), orderBy('lastSeenAt', 'desc'), limit(100));

        if (filterActive) {
            q = query(collection(db, 'user_sessions'), where('logoutAt', '==', null), orderBy('lastSeenAt', 'desc'), limit(100));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
            setSessions(docs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterActive]);

    const now = new Date();
    const isActive = (session: Session) => {
        if (session.logoutAt) return false;
        if (!session.lastSeenAt) return false;
        const diff = now.getTime() - session.lastSeenAt.toDate().getTime();
        return diff < 2 * 60 * 1000; // 2 minutes
    };

    const filteredSessions = sessions.filter(s => {
        const matchesEmail = s.email?.toLowerCase().includes(searchEmail.toLowerCase());
        const matchesActive = filterActive ? isActive(s) : true;

        // Date filter
        const threshold = new Date();
        if (dateRange === '24h') threshold.setHours(now.getHours() - 24);
        else if (dateRange === '7d') threshold.setDate(now.getDate() - 7);
        else if (dateRange === '30d') threshold.setDate(now.getDate() - 30);

        const matchesDate = s.loginAt ? s.loginAt.toDate() > threshold : false;

        return matchesEmail && matchesActive && matchesDate;
    });

    const formatDuration = (seconds: number | null) => {
        if (seconds === null) return '---';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    const activeCount = sessions.filter(s => isActive(s)).length;
    const totalDuration = filteredSessions.reduce((acc, s) => acc + (s.durationSec || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Tester Activity</h1>
                    <p className="text-slate-400">Monitor real-time sessions and engagement</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 text-brand-400 mb-4">
                        <Activity className="w-5 h-5" />
                        <h3 className="font-semibold text-slate-300">Active Now</h3>
                    </div>
                    <div className="text-4xl font-bold text-white font-display">
                        {activeCount}
                    </div>
                    <p className="text-slate-500 text-sm mt-2">Testers currently in app</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 text-indigo-400 mb-4">
                        <History className="w-5 h-5" />
                        <h3 className="font-semibold text-slate-300">Total Sessions</h3>
                    </div>
                    <div className="text-4xl font-bold text-white font-display">
                        {filteredSessions.length}
                    </div>
                    <p className="text-slate-500 text-sm mt-2">In selected range</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 text-purple-400 mb-4">
                        <Clock className="w-5 h-5" />
                        <h3 className="font-semibold text-slate-300">Engagement Time</h3>
                    </div>
                    <div className="text-4xl font-bold text-white font-display">
                        {Math.floor(totalDuration / 60)}m
                    </div>
                    <p className="text-slate-500 text-sm mt-2">Total tracked minutes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter by email..."
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500/50 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-slate-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>

                        <button
                            onClick={() => setFilterActive(!filterActive)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${filterActive
                                ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                                : 'bg-slate-800/50 border-white/5 text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="font-medium">Active Only</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">App</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Login At</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ended By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredSessions.map((session) => (
                                <tr key={session.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-white">{session.email || 'Anonymous'}</div>
                                        <div className="text-xs text-slate-500 font-mono truncate max-w-[120px]">{session.userId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                            {session.app}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isActive(session) ? (
                                            <div className="flex items-center gap-1.5 text-brand-400">
                                                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                                                <span className="text-xs font-bold uppercase tracking-wider">ACTIVE NOW</span>
                                            </div>
                                        ) : session.logoutAt ? (
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Closed</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-amber-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Inactive</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-300">
                                            {session.loginAt?.toDate().toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {session.loginAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        {formatDuration(session.durationSec || (session.logoutAt && session.loginAt ? Math.round((session.logoutAt.toMillis() - session.loginAt.toMillis()) / 1000) : null))}
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.endedBy ? (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-tighter ${session.endedBy === 'logout'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                }`}>
                                                {session.endedBy}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-[10px]---">---</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredSessions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        No sessions found matching filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
