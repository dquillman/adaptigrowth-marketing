import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, UserPlus, Edit2, Copy, Check, Search, Filter } from 'lucide-react';

interface Tester {
    id: string;
    name: string;
    email?: string;
    linkedinUrl?: string;
    location?: string;
    pmpStatus: 'planning' | 'studying' | 'scheduled' | 'passed';
    examTimeframe?: string;
    currentResources?: string;
    invitedAt: Timestamp;
    connectedAt?: Timestamp;
    firstLoginAt?: Timestamp;
    lastActiveAt?: Timestamp;
    feedbackReceived: boolean;
    status: 'active' | 'idle' | 'removed';
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export default function TestersPage() {
    const [testers, setTesters] = useState<Tester[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTester, setEditingTester] = useState<Tester | null>(null);
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pmpStatusFilter, setPmpStatusFilter] = useState<string>('all');
    const [feedbackFilter, setFeedbackFilter] = useState<string>('all');

    useEffect(() => {
        const q = query(collection(db, 'testers'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const testersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Tester[];
            setTesters(testersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredTesters = testers.filter(tester => {
        const matchesSearch =
            tester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tester.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

        const matchesStatus = statusFilter === 'all' || tester.status === statusFilter;
        const matchesPmpStatus = pmpStatusFilter === 'all' || tester.pmpStatus === pmpStatusFilter;
        const matchesFeedback = feedbackFilter === 'all' ||
            (feedbackFilter === 'yes' && tester.feedbackReceived) ||
            (feedbackFilter === 'no' && !tester.feedbackReceived);

        return matchesSearch && matchesStatus && matchesPmpStatus && matchesFeedback;
    });

    const toggleFeedbackReceived = async (testerId: string, currentValue: boolean) => {
        try {
            await updateDoc(doc(db, 'testers', testerId), {
                feedbackReceived: !currentValue,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error toggling feedback:', error);
        }
    };

    const updateTesterStatus = async (testerId: string, newStatus: Tester['status']) => {
        try {
            await updateDoc(doc(db, 'testers', testerId), {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const copyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    const getStatusColor = (status: Tester['status']) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'idle': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'removed': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const getPmpStatusColor = (pmpStatus: Tester['pmpStatus']) => {
        switch (pmpStatus) {
            case 'planning': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'studying': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'scheduled': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'passed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
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
                    <h1 className="text-3xl font-bold text-white font-display">Testers</h1>
                    <p className="text-slate-400 mt-1">Manage beta testers and track feedback</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex gap-2 text-sm">
                        <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                            Total: {testers.length}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-brand-400 border-brand-500/20">
                            Showing: {filteredTesters.length}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Tester
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search name, email..."
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
                        <option value="active">Active</option>
                        <option value="idle">Idle</option>
                        <option value="removed">Removed</option>
                    </select>
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                        value={pmpStatusFilter}
                        onChange={(e) => setPmpStatusFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none"
                    >
                        <option value="all">All PMP Statuses</option>
                        <option value="planning">Planning</option>
                        <option value="studying">Studying</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="passed">Passed</option>
                    </select>
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                        value={feedbackFilter}
                        onChange={(e) => setFeedbackFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none"
                    >
                        <option value="all">All Feedback</option>
                        <option value="yes">Received</option>
                        <option value="no">Not Received</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">PMP Status</th>
                                <th className="px-6 py-4">Invited</th>
                                <th className="px-6 py-4">Last Active</th>
                                <th className="px-6 py-4">Feedback</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTesters.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                        No testers match your filters
                                    </td>
                                </tr>
                            ) : filteredTesters.map((tester) => (
                                <tr key={tester.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-white font-medium">{tester.name}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={tester.status}
                                            onChange={(e) => updateTesterStatus(tester.id, e.target.value as Tester['status'])}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider outline-none cursor-pointer ${getStatusColor(tester.status)} bg-slate-900/50`}
                                        >
                                            <option value="active">Active</option>
                                            <option value="idle">Idle</option>
                                            <option value="removed">Removed</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${getPmpStatusColor(tester.pmpStatus)}`}>
                                            {tester.pmpStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                        {tester.invitedAt?.toDate().toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                        {tester.lastActiveAt ? tester.lastActiveAt.toDate().toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => toggleFeedbackReceived(tester.id, tester.feedbackReceived)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${tester.feedbackReceived
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                                }`}
                                        >
                                            {tester.feedbackReceived ? 'Yes' : 'No'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                        {tester.location || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {tester.email ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white">{tester.email}</span>
                                                <button
                                                    onClick={() => copyEmail(tester.email!)}
                                                    className="p-1 hover:bg-white/5 rounded transition-colors"
                                                    title="Copy email"
                                                >
                                                    {copiedEmail === tester.email ? (
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-3 h-3 text-slate-500" />
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setEditingTester(tester)}
                                            className="p-2 hover:bg-brand-500/10 text-slate-500 hover:text-brand-400 rounded-lg transition-colors"
                                            title="Edit Tester"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {(showAddModal || editingTester) && (
                <TesterModal
                    tester={editingTester}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingTester(null);
                    }}
                />
            )}
        </div>
    );
}

// Tester Modal Component
interface TesterModalProps {
    tester: Tester | null;
    onClose: () => void;
}

function TesterModal({ tester, onClose }: TesterModalProps) {
    const [formData, setFormData] = useState({
        name: tester?.name || '',
        email: tester?.email || '',
        linkedinUrl: tester?.linkedinUrl || '',
        location: tester?.location || '',
        pmpStatus: tester?.pmpStatus || 'planning' as Tester['pmpStatus'],
        examTimeframe: tester?.examTimeframe || '',
        currentResources: tester?.currentResources || '',
        status: tester?.status || 'active' as Tester['status'],
        notes: tester?.notes || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const now = Timestamp.now();
            const data = {
                ...formData,
                updatedAt: now,
                ...(tester ? {} : {
                    createdAt: now,
                    invitedAt: now,
                    feedbackReceived: false
                })
            };

            if (tester) {
                await updateDoc(doc(db, 'testers', tester.id), data);
            } else {
                await addDoc(collection(db, 'testers'), data);
            }

            onClose();
        } catch (error) {
            console.error('Error saving tester:', error);
            alert('Failed to save tester');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 rounded-2xl border border-white/5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-6">
                        <h2 className="text-2xl font-bold text-white font-display">
                            {tester ? 'Edit Tester' : 'Add Tester'}
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.linkedinUrl}
                                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    PMP Status
                                </label>
                                <select
                                    value={formData.pmpStatus}
                                    onChange={(e) => setFormData({ ...formData, pmpStatus: e.target.value as Tester['pmpStatus'] })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                >
                                    <option value="planning">Planning</option>
                                    <option value="studying">Studying</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="passed">Passed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Tester['status'] })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="idle">Idle</option>
                                    <option value="removed">Removed</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Exam Timeframe
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Q2 2026"
                                value={formData.examTimeframe}
                                onChange={(e) => setFormData({ ...formData, examTimeframe: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Current Resources
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Rita's book, Udemy course"
                                value={formData.currentResources}
                                onChange={(e) => setFormData({ ...formData, currentResources: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Notes
                            </label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500 resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 text-white font-bold rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : (tester ? 'Update Tester' : 'Add Tester')}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
