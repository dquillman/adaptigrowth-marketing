import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, MessageSquare, CheckCircle2, Trash2, AlertCircle, ArrowUpDown, Search, Filter, Calendar, ArchiveRestore, RefreshCcw, XCircle, Image as ImageIcon } from 'lucide-react';

interface Issue {
    id: string;
    userId: string;
    userEmail: string;
    type: 'bug' | 'content' | 'other';
    description: string;
    path: string;
    timestamp: Timestamp;
    status: 'new' | 'working' | 'fixed' | 'released';
    version: string;
    deleted?: boolean;
    attachmentUrl?: string;
}

export default function IssuesList() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Issue; direction: 'asc' | 'desc' }>({
        key: 'timestamp',
        direction: 'desc'
    });

    useEffect(() => {
        // Fetch all (we'll filter client side for now as dataset is likely small)
        const q = query(collection(db, 'issues'), orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const issuesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Issue[];
            setIssues(issuesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Derived Data
    const filteredIssues = issues.filter(issue => {
        const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
        const matchesType = typeFilter === 'all' || issue.type === typeFilter;

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

        return matchesStatus && matchesType && matchesSearch && matchesDate && matchesDeleted;
    });

    const sortedIssues = [...filteredIssues].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;

        // Handle Timestamps specifically
        if (sortConfig.key === 'timestamp') {
            const tA = (aValue as Timestamp).toMillis();
            const tB = (bValue as Timestamp).toMillis();
            return sortConfig.direction === 'asc' ? tA - tB : tB - tA;
        }

        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;

        // Generic string comparison
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof Issue) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

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
                    <p className="text-slate-400 mt-1">Manage bug reports and feedback from users</p>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5">
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
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                </div>
                <div>
                    <button
                        onClick={() => setShowDeleted(!showDeleted)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${showDeleted
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
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center gap-1">
                                        Status
                                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center gap-1">
                                        Type
                                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                    </div>
                                </th>
                                <th className="px-6 py-4">Description</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => handleSort('userEmail')}
                                >
                                    <div className="flex items-center gap-1">
                                        User
                                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => handleSort('timestamp')}
                                >
                                    <div className="flex items-center gap-1">
                                        Date Reported
                                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedIssues.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No issues match your filters
                                    </td>
                                </tr>
                            ) : sortedIssues.map((issue) => (
                                <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={issue.status}
                                            onChange={(e) => updateStatus(issue.id, e.target.value as Issue['status'])}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider outline-none cursor-pointer ${getStatusColor(issue.status)} bg-opacity-100 bg-slate-900/50`}
                                        >
                                            <option value="new">New</option>
                                            <option value="working">Working</option>
                                            <option value="fixed">Fixed</option>
                                            <option value="released">Released</option>
                                        </select>
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
                                                    className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-slate-900 rounded border border-slate-700 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                                >
                                                    <ImageIcon className="w-3 h-3" />
                                                    View Screenshot
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-white">{issue.userEmail}</span>
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
                                    <td className="px-6 py-4 text-right">
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
