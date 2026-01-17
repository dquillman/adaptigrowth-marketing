import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Loader2, Users, Activity, Search, ShieldCheck, Trash2 } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { getEffectiveAccess } from '../utils/effectiveAccess';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    creationTime: string;
    lastSignInTime: string;
    isPro: boolean;
    plan?: string;
    testerOverride?: boolean;
    testerExpiresAt?: { _seconds: number, _nanoseconds: number };
    subscriptionStatus?: string;
    trial?: {
        status: "active" | "expired" | "converted";
        startDate: { _seconds: number, _nanoseconds: number };
        endDate: { _seconds: number, _nanoseconds: number };
    };
}

interface ActivityPoint {
    date: string;
    count: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [activityGraph, setActivityGraph] = useState<ActivityPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Users
                const getUsersFn = httpsCallable(functions, 'getAdminUserList');
                const usersResult = await getUsersFn() as { data: { users: UserData[] } };
                setUsers(usersResult.data.users);

                // 2. Fetch Activity Stats
                const getStatsFn = httpsCallable(functions, 'getGlobalStats');
                const statsResult = await getStatsFn() as { data: { activityGraph: ActivityPoint[] } };
                setActivityGraph(statsResult.data.activityGraph);

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const [deleteConfirm, setDeleteConfirm] = useState<{ uid: string; email: string } | null>(null);
    const [grantConfirm, setGrantConfirm] = useState<{ uid: string; email: string } | null>(null);
    const [revokeConfirm, setRevokeConfirm] = useState<{ uid: string; email: string } | null>(null); // New
    const [deleting, setDeleting] = useState(false);
    const [granting, setGranting] = useState(false);
    const [revoking, setRevoking] = useState(false); // New

    const handleGrantTesterPro = async (uid: string) => {
        try {
            setGranting(true);
            const grantFn = httpsCallable(functions, 'grantTesterPro');
            await grantFn({ targetUserId: uid });

            // Optimistic Update
            setUsers(users.map(u => {
                if (u.uid === uid) {
                    const now = new Date();
                    // 14 days from now
                    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                    return {
                        ...u,
                        isPro: true,
                        plan: 'pro',
                        testerOverride: true,
                        testerExpiresAt: { _seconds: Math.floor(expiresAt.getTime() / 1000), _nanoseconds: 0 },
                        trial: undefined // Clear trial state locally
                    };
                }
                return u;
            }));
            setGrantConfirm(null);
            alert('Tester Pro Access Granted for 14 Days.');
        } catch (error: any) {
            console.error("Error granting tester pro:", error);
            alert(`Failed to grant access: ${error.message}`);
        } finally {
            setGranting(false);
        }
    };

    const handleRevokeTesterPro = async (uid: string) => {
        try {
            setRevoking(true);
            const revokeFn = httpsCallable(functions, 'revokeTesterPro');
            await revokeFn({ targetUserId: uid });

            // Optimistic Update
            setUsers(users.map(u => {
                if (u.uid === uid) {
                    return {
                        ...u,
                        isPro: false,
                        plan: 'starter',
                        testerOverride: false,
                        testerExpiresAt: undefined
                    };
                }
                return u;
            }));
            setRevokeConfirm(null);
            alert('Tester Pro Access Revoked.');
        } catch (error: any) {
            console.error("Error revoking tester pro:", error);
            alert(`Failed to revoke access: ${error.message}`);
        } finally {
            setRevoking(false);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        try {
            setDeleting(true);
            const deleteUserFn = httpsCallable(functions, 'deleteUser');
            await deleteUserFn({ uid });

            // Remove user from local state
            setUsers(users.filter(u => u.uid !== uid));
            setDeleteConfirm(null);

            // Show success message (you could add a toast notification here)
            alert('User deleted successfully');
        } catch (error: any) {
            console.error("Error deleting user:", error);
            alert(`Failed to delete user: ${error.message}`);
        } finally {
            setDeleting(false);
        }
    };

    // Derived Stats
    const totalUsers = users.length;
    const proUsers = users.filter(u => u.isPro).length;
    const freeUsers = totalUsers - proUsers;

    // Filter Users
    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid.includes(searchQuery)
    );

    // Prepare Graph Data
    const pieData = [
        { name: 'Pro', value: proUsers, color: '#3b82f6' }, // Blue
        { name: 'Starter', value: freeUsers, color: '#64748b' } // Slate
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">User Monitoring</h1>
                    <p className="text-slate-400 mt-1">Analytics and user management</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-brand-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">+12% this week</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{totalUsers.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">Total Registered Users</div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">{((proUsers / totalUsers) * 100).toFixed(1)}% Conv.</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{proUsers.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">Pro Subscribers</div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {activityGraph.length > 0 ? activityGraph[activityGraph.length - 1].count : 0}
                    </div>
                    <div className="text-sm text-slate-400">Daily Quiz Attempts</div>
                </div>
            </div>

            {/* Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Chart */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">Quiz Activity (Last 30 Days)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activityGraph}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#38bdf8' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#38bdf8"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#38bdf8' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Users Distribution */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-white mb-2 self-start">Plan Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-white">All Users</h3>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Access</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4">Last Active</th>
                                <th className="px-6 py-4 text-right">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.slice(0, 50).map((user) => (
                                <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                {user.email?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{user.email}</div>
                                                <div className="text-xs text-slate-500 font-mono">{user.uid.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isPro ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                <ShieldCheck className="w-3 h-3" />
                                                PRO
                                                {user.testerOverride && (
                                                    <span className="ml-1 text-[10px] bg-purple-500/20 px-1 rounded border border-purple-500/30 uppercase tracking-wider">
                                                        Tester
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                Starter
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const status = getEffectiveAccess(user);
                                            // Map helper colors to Tailwind classes
                                            const colorClasses: Record<string, string> = {
                                                purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                                                yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                                                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                red: 'bg-red-500/10 text-red-400 border-red-500/20',
                                                slate: 'text-slate-600',
                                            };
                                            const badgeClass = colorClasses[status.badgeColor] || colorClasses.slate;

                                            // Handle plain text for 'none' case to match original styling
                                            if (status.type === 'none') {
                                                return <span className="text-slate-600 text-xs">-</span>;
                                            }

                                            return (
                                                <div className="flex flex-col">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit ${badgeClass}`}>
                                                        {status.label}
                                                    </span>
                                                    {status.subtext && (
                                                        <span className="text-[10px] text-slate-500 mt-1 pl-1">
                                                            {status.subtext}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {new Date(user.creationTime).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {new Date(user.lastSignInTime).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-block w-2 h-2 rounded-full ${user.isPro
                                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                            : user.trial?.status === 'active'
                                                ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                                                : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                            }`}></span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(() => {
                                            const status = getEffectiveAccess(user);
                                            const isInvalidTester = status.type === 'tester_invalid';

                                            // Show Fix/Revoke for Invalid Testers
                                            if (isInvalidTester) {
                                                return (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => setGrantConfirm({ uid: user.uid, email: user.email })}
                                                            className="text-amber-400 hover:text-amber-300 transition-colors p-2 hover:bg-amber-500/10 rounded-lg"
                                                            title="Fix Tester (Grant 14 Days)"
                                                        >
                                                            <Activity className="w-4 h-4" /> {/* Or a Wrench/Refresh icon if available */}
                                                        </button>
                                                        <button
                                                            onClick={() => setRevokeConfirm({ uid: user.uid, email: user.email })}
                                                            className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                                                            title="Revoke Tester Access"
                                                        >
                                                            <ShieldCheck className="w-4 h-4" /> {/* Strike-through logically */}
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm({ uid: user.uid, email: user.email })}
                                                            className="text-slate-500 hover:text-red-300 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            // Show Revoke for Active Testers
                                            if (status.type === 'tester') {
                                                return (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => setRevokeConfirm({ uid: user.uid, email: user.email })}
                                                            className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                                                            title="Revoke Tester Access"
                                                        >
                                                            <ShieldCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm({ uid: user.uid, email: user.email })}
                                                            className="text-slate-500 hover:text-red-300 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            // Default Actions
                                            return (
                                                <div className="flex gap-1 justify-end">
                                                    <button
                                                        onClick={() => setDeleteConfirm({ uid: user.uid, email: user.email })}
                                                        className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    {!user.isPro && (
                                                        <button
                                                            onClick={() => setGrantConfirm({ uid: user.uid, email: user.email })}
                                                            className="text-purple-400 hover:text-purple-300 transition-colors p-2 hover:bg-purple-500/10 rounded-lg"
                                                            title="Grant Tester Pro"
                                                        >
                                                            <ShieldCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {
                deleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
                            <p className="text-slate-400 mb-6">
                                Are you sure you want to delete <span className="text-white font-medium">{deleteConfirm.email}</span>?
                                This action cannot be undone and will permanently delete all user data.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(deleteConfirm.uid)}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete User'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Grant Pro Confirmation Dialog */}
            {
                grantConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                                <ShieldCheck className="w-6 h-6 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Grant Tester Pro Access</h3>
                            <p className="text-slate-400 mb-6">
                                Grant <span className="text-white font-medium">{grantConfirm.email}</span> 14 days of Pro access?
                                <br /><br />
                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                    NOTE: This does NOT start a Stripe subscription.
                                </span>
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setGrantConfirm(null)}
                                    disabled={granting}
                                    className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleGrantTesterPro(grantConfirm.uid)}
                                    disabled={granting}
                                    className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {granting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Granting...
                                        </>
                                    ) : (
                                        'Grant Access'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Revoke Pro Confirmation Dialog */}
            {
                revokeConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <ShieldCheck className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Revoke Tester Pro Access</h3>
                            <p className="text-slate-400 mb-6">
                                Revoke Tester Pro access for <span className="text-white font-medium">{revokeConfirm.email}</span>?
                                <br /><br />
                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                    This will revert them to the Starter plan.
                                </span>
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setRevokeConfirm(null)}
                                    disabled={revoking}
                                    className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleRevokeTesterPro(revokeConfirm.uid)}
                                    disabled={revoking}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {revoking ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Revoking...
                                        </>
                                    ) : (
                                        'Revoke Access'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
