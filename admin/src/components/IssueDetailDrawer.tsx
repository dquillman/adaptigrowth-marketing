import { X, AlertCircle, MessageSquare, CheckCircle2, Image as ImageIcon, UserCheck } from 'lucide-react';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useState, useEffect } from 'react';

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
    feedbackReceived: boolean;
    lastActiveAt?: Timestamp;
}

interface IssueDetailDrawerProps {
    issue: Issue | null;
    onClose: () => void;
    onUpdate: () => void;
}

export default function IssueDetailDrawer({ issue, onClose, onUpdate }: IssueDetailDrawerProps) {
    const [adminNotes, setAdminNotes] = useState('');
    const [resolution, setResolution] = useState('');
    const [saving, setSaving] = useState(false);
    const [matchedTester, setMatchedTester] = useState<Tester | null>(null);

    useEffect(() => {
        if (issue) {
            setAdminNotes(issue.adminNotes || '');
            setResolution(issue.resolution || '');
            checkForMatchingTester();
        }
    }, [issue]);

    const checkForMatchingTester = async () => {
        if (!issue?.userEmail) return;

        try {
            const testersRef = collection(db, 'testers');
            const q = query(testersRef, where('email', '==', issue.userEmail));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const testerDoc = snapshot.docs[0];
                setMatchedTester({
                    id: testerDoc.id,
                    ...testerDoc.data()
                } as Tester);
            } else {
                setMatchedTester(null);
            }
        } catch (error) {
            console.error('Error checking for tester:', error);
        }
    };

    const handleSave = async () => {
        if (!issue) return;

        setSaving(true);
        try {
            await updateDoc(doc(db, 'issues', issue.id), {
                adminNotes,
                resolution,
                updatedAt: Timestamp.now()
            });
            onUpdate();
        } catch (error) {
            console.error('Error saving issue:', error);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: Issue['status']) => {
        if (!issue) return;

        try {
            await updateDoc(doc(db, 'issues', issue.id), {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handlePriorityChange = async (newPriority: Issue['priority']) => {
        if (!issue) return;

        try {
            await updateDoc(doc(db, 'issues', issue.id), {
                priority: newPriority,
                updatedAt: Timestamp.now()
            });
            onUpdate();
        } catch (error) {
            console.error('Error updating priority:', error);
        }
    };

    const markAsTesterFeedback = async () => {
        if (!matchedTester) return;

        try {
            await updateDoc(doc(db, 'testers', matchedTester.id), {
                feedbackReceived: true,
                lastActiveAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setMatchedTester({ ...matchedTester, feedbackReceived: true });
            alert('Tester feedback marked successfully');
        } catch (error) {
            console.error('Error marking tester feedback:', error);
            alert('Failed to mark tester feedback');
        }
    };

    const getStatusColor = (status: Issue['status']) => {
        switch (status) {
            case 'new': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'needs_info': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'working': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'fixed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'released': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const getPriorityColor = (priority: Issue['priority']) => {
        switch (priority) {
            case 'p0': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'p1': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'p2': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'p3': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    if (!issue) return null;

    const showResolution = issue.status === 'fixed' || issue.status === 'released';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-900 border-l border-white/5 z-50 overflow-y-auto">
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white font-display">Issue Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Status
                            </label>
                            <select
                                value={issue.status}
                                onChange={(e) => handleStatusChange(e.target.value as Issue['status'])}
                                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-bold uppercase tracking-wider outline-none cursor-pointer ${getStatusColor(issue.status)} bg-slate-800/50`}
                            >
                                <option value="new">New</option>
                                <option value="needs_info">Needs Info</option>
                                <option value="working">Working</option>
                                <option value="fixed">Fixed</option>
                                <option value="released">Released</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Priority
                            </label>
                            <select
                                value={issue.priority || 'p2'}
                                onChange={(e) => handlePriorityChange(e.target.value as Issue['priority'])}
                                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-bold uppercase tracking-wider outline-none cursor-pointer ${getPriorityColor(issue.priority || 'p2')} bg-slate-800/50`}
                            >
                                <option value="p0">P0 - Critical</option>
                                <option value="p1">P1 - High</option>
                                <option value="p2">P2 - Medium</option>
                                <option value="p3">P3 - Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Tester Badge */}
                    {matchedTester && (
                        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-brand-400" />
                                    <span className="text-sm font-bold text-brand-400">Tester Feedback</span>
                                </div>
                                {!matchedTester.feedbackReceived && (
                                    <button
                                        onClick={markAsTesterFeedback}
                                        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Mark as Tester Feedback
                                    </button>
                                )}
                                {matchedTester.feedbackReceived && (
                                    <span className="text-xs text-emerald-400 font-medium">✓ Marked</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Type & Version */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Type
                            </label>
                            <div className="flex items-center gap-2 text-slate-300">
                                {issue.type === 'bug' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                                {issue.type === 'content' && <MessageSquare className="w-5 h-5 text-blue-400" />}
                                {issue.type === 'other' && <CheckCircle2 className="w-5 h-5 text-slate-400" />}
                                <span className="font-medium capitalize">{issue.type}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                App Version
                            </label>
                            <span className="text-slate-300 font-mono text-sm">{issue.version}</span>
                        </div>
                    </div>

                    {/* User & Path */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            User Email
                        </label>
                        <span className="text-white font-medium">{issue.userEmail}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Route / Path
                        </label>
                        <code className="text-brand-400 font-mono text-sm bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700 inline-block">
                            {issue.path}
                        </code>
                    </div>

                    {/* Timestamp */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Reported On
                        </label>
                        <div className="text-slate-300">
                            <div className="font-medium">
                                {issue.timestamp?.toDate().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                            <div className="text-sm text-slate-500 font-mono">
                                {issue.timestamp?.toDate().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Description
                        </label>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-slate-200 whitespace-pre-wrap">
                            {issue.description}
                        </div>
                    </div>

                    {/* Screenshot */}
                    {issue.attachmentUrl && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Screenshot
                            </label>
                            <a
                                href={issue.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-brand-400 hover:text-brand-300 transition-colors"
                            >
                                <ImageIcon className="w-4 h-4" />
                                View Screenshot
                            </a>
                        </div>
                    )}

                    {/* Admin Notes */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Admin Notes
                        </label>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add internal notes about this issue..."
                            rows={4}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                        />
                    </div>

                    {/* Resolution (conditional) */}
                    {showResolution && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Resolution
                            </label>
                            <textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                placeholder="Describe how this issue was resolved..."
                                rows={4}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                            />
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 text-white font-bold rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
