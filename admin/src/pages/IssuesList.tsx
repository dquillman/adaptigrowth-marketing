import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, MessageSquare, CheckCircle2, Trash2, AlertCircle, Search, Filter, Calendar, ArchiveRestore, RefreshCcw, XCircle, Image as ImageIcon, UserCheck } from 'lucide-react';
import IssueDetailDrawer from '../components/IssueDetailDrawer';

interface Issue {
    id: string;
    userId: string;
    userEmail: string;
    type: 'bug' | 'content' | 'other';
    description: string;
    path: string;
    timestamp: Timestamp;
    status: 'new' | 'working' | 'fixed' | 'released' | 'needs_info';
    version: string;
    deleted?: boolean;
    attachmentUrl?: string;
    priority?: 'p0' | 'p1' | 'p2' | 'p3';
    adminNotes?: string;
    resolution?: string;
}

interface Tester {
    id: string;
    email?: string;
}

export default function IssuesList() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [testers, setTesters] = useState<Tester[]>([]);

    // Filter State
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);
    const [showOnlyTesters, setShowOnlyTesters] = useState(false);

    // Detail Drawer State
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

    useEffect(() => {
        // Fetch issues
        const issuesQuery = query(collection(db, 'issues'), orderBy('timestamp', 'desc'));
        const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
            const issuesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Issue[];
            setIssues(issuesData);
            setLoading(false);
        });

        // Fetch testers
        const testersQuery = query(collection(db, 'testers'));
        const unsubscribeTesters = onSnapshot(testersQuery, (snapshot) => {
            const testersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Tester[];
            setTesters(testersData);
        });

        return () => {
            unsubscribeIssues();
            unsubscribeTesters();
        };
    }, []);

    // Helper: Check if issue is from a tester
    const isTesterIssue = (issue: Issue) => {
        return testers.some(tester => tester.email && tester.email.toLowerCase() === issue.userEmail.toLowerCase());
    };

    // Derived Data
    const filteredIssues = issues.filter(issue => {
        const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
        const matchesType = typeFilter === 'all' || issue.type === typeFilter;
        const matchesPriority = priorityFilter === 'all' || (issue.priority || 'p2') === priorityFilter;

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            issue.description.toLowerCase().includes(searchLower) ||
            issue.userEmail.toLowerCase().includes(searchLower) ||
            issue.path.toLowerCase().includes(searchLower);

        let matchesDate = true;
        if (dateFilter) {
            const issueDate = issue.timestamp?.toDate().toISOString().split('T')[0];
            matchesDate = issueDate === dateFilter;
        }

        // Soft Delete Filter
        const matchesDeleted = showDeleted ? issue.deleted === true : !issue.deleted;

        // Tester Filter
        const matchesTester = !showOnlyTesters || isTesterIssue(issue);

        return matchesStatus && matchesType && matchesPriority && matchesSearch && matchesDate && matchesDeleted && matchesTester;
    });

    // Smart sorting: Status priority -> Priority -> Timestamp
    const getStatusPriority = (status: Issue['status']) => {
        switch (status) {
            case 'new': return 0;
            case 'needs_info': return 1;
            case 'working': return 2;
            case 'fixed': return 3;
            case 'released': return 4;
            default: return 5;
        }
    };

    const getPriorityValue = (priority: Issue['priority']) => {
        switch (priority) {
            case 'p0': return 0;
            case 'p1': return 1;
            case 'p2': return 2;
            case 'p3': return 3;
            default: return 2; // Default to p2
        }
    };

    const sortedIssues = [...filteredIssues].sort((a, b) => {
        // First: Status priority
        const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
        if (statusDiff !== 0) return statusDiff;

        // Second: Priority
        const priorityDiff = getPriorityValue(a.priority) - getPriorityValue(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        // Third: Timestamp (most recent first)
        const tA = a.timestamp?.toMillis() || 0;
        const tB = b.timestamp?.toMillis() || 0;
        return tB - tA;
    });

    const updateStatus = async (id: string, newStatus: Issue['status']) => {
        try {
            await updateDoc(doc(db, 'issues', id), {
                status: newStatus
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const deleteIssue = async (id: string) => {
        if (confirm("Are you sure you want to delete this issue? It will be moved to the trash.")) {
            try {
                await updateDoc(doc(db, 'issues', id), {
                    deleted: true
                });
            } catch (error) {
                console.error("Error deleting issue:", error);
            }
        }
    }

    const restoreIssue = async (id: string) => {
        try {
            await updateDoc(doc(db, 'issues', id), {
                deleted: false
            });
        } catch (error) {
            console.error("Error restoring issue:", error);
        }
    }

    const permanentDeleteIssue = async (id: string) => {
        if (confirm("Are you sure? This action CANNOT be undone.")) {
            await deleteDoc(doc(db, 'issues', id));
        }
    }

    const getStatusColor = (status: Issue['status']) => {
        switch (status) {
            case 'new': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'working': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'fixed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'released': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">User Issues</h1>
                    <p className="text-slate-400 mt-1">Manage reports, feedback, and content notes from users</p>
                </div>
                <div className="flex gap-2 text-sm">
                    <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                        Total: {issues.length}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-brand-400 border-brand-500/20">
                        Showing: {sortedIssues.length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search description, user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="new">New</option>
                            <option value="needs_info">Needs Info</option>
                            <option value="working">Working</option>
                            <option value="fixed">Fixed</option>
                            <option value="released">Released</option>
                        </select>
                    </div>
                    <div className="relative">
                        <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none"
                        >
                            <option value="all">All Types</option>
                            <option value="bug">Bug</option>
                            <option value="content">Content</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none"
                        >
                            <option value="all">All Priorities</option>
                            <option value="p0">P0 - Critical</option>
                            <option value="p1">P1 - High</option>
                            <option value="p2">P2 - Medium</option>
                            <option value="p3">P3 - Low</option>
                        </select>
                    </div>
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>
                        {dateFilter && (
                            <button
                                onClick={() => setDateFilter('')}
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                title="Clear date filter"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowOnlyTesters(!showOnlyTesters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${showOnlyTesters
                            ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 hover:bg-brand-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        {showOnlyTesters ? 'Showing Testers Only' : 'Show Only Testers'}
                    </button>
                    <button
                        onClick={() => setShowDeleted(!showDeleted)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${showDeleted
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/50 hover:bg-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        {showDeleted ? <ArchiveRestore className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        {showDeleted ? 'Exit Trash' : 'View Trash'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Date Reported</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedIssues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No issues match your filters
                                    </td>
                                </tr>
                            ) : sortedIssues.map((issue) => {
                                const isFromTester = isTesterIssue(issue);
                                const priorityValue = issue.priority || 'p2';

                                return (
                                    <tr
                                        key={issue.id}
                                        onClick={() => setSelectedIssue(issue)}
                                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={issue.status}
                                                onChange={(e) => updateStatus(issue.id, e.target.value as Issue['status'])}
                                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider outline-none cursor-pointer ${getStatusColor(issue.status)} bg-opacity-100 bg-slate-900/50`}
                                            >
                                                <option value="new">New</option>
                                                <option value="needs_info">Needs Info</option>
                                                <option value="working">Working</option>
                                                <option value="fixed">Fixed</option>
                                                <option value="released">Released</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${getPriorityColor(priorityValue)}`}>
                                                {priorityValue.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-300 capitalize flex items-center gap-2">
                                                    {issue.type === 'bug' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                                                    {issue.type === 'content' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                                                    {issue.type === 'other' && <CheckCircle2 className="w-4 h-4 text-slate-400" />}
                                                    {issue.type}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono mt-1">{issue.version}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-md">
                                                <p className="text-slate-300 line-clamp-2">{issue.description}</p>
                                                <p className="text-xs text-slate-500 mt-1 font-mono truncate">{issue.path}</p>
                                                {issue.attachmentUrl && (
                                                    <a
                                                        href={issue.attachmentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-slate-900 rounded border border-slate-700 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                                    >
                                                        <ImageIcon className="w-3 h-3" />
                                                        View Screenshot
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-white">{issue.userEmail}</span>
                                                {isFromTester && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-brand-400 font-medium">
                                                        <UserCheck className="w-3 h-3" />
                                                        Tester
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 font-medium">
                                                    {issue.timestamp?.toDate().toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {issue.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            {showDeleted ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => restoreIssue(issue.id)}
                                                        className="p-2 hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-500 rounded-lg transition-colors"
                                                        title="Restore Issue"
                                                    >
                                                        <RefreshCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => permanentDeleteIssue(issue.id)}
                                                        className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"
                                                        title="Permanently Delete"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => deleteIssue(issue.id)}
                                                    className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"
                                                    title="Move to Trash"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Issue Detail Drawer */}
            <IssueDetailDrawer
                issue={selectedIssue}
                onClose={() => setSelectedIssue(null)}
                onUpdate={() => {
                    // Firestore listener will auto-update, just close drawer
                    setSelectedIssue(null);
                }}
            />
        </div>
    );

    function getPriorityColor(priority: Issue['priority']) {
        switch (priority) {
            case 'p0': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'p1': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'p2': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'p3': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    }
}
