
import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Eye
} from 'lucide-react';

interface ExamUpdateSource {
    id: string;
    name: string;
    url: string;
    type: 'pdf' | 'web';
    status: 'ok' | 'changed' | 'error' | 'manual_review' | 'reviewed_ok';
    lastCheckedAt: any;
    lastChangeDetectedAt?: any;
    lastHumanReviewedAt?: any;
    lastErrorCode?: number;
    lastErrorMessage?: string;
    notes?: string;
}

export default function ExamUpdateMonitorPage() {
    const [sources, setSources] = useState<ExamUpdateSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [marking, setMarking] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'exam_update_sources'), orderBy('name'));
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ExamUpdateSource[];
                setSources(data);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Firestore error:", err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleCheckNow = async () => {
        setChecking(true);
        try {
            const checkFn = httpsCallable(functions, 'triggerExamUpdateCheck');
            await checkFn();
        } catch (error) {
            console.error("Manual check failed:", error);
            alert("Failed to trigger update check.");
        } finally {
            setChecking(false);
        }
    };

    const handleSeed = async () => {
        if (!confirm("This will add default PMI sources. Continue?")) return;
        setChecking(true);
        try {
            const seedFn = httpsCallable(functions, 'seedExamSources');
            await seedFn();
        } catch (e: any) {
            console.error(e);
            alert('Failed to seed sources: ' + e.message);
        } finally {
            setChecking(false);
        }
    };

    const handleMarkReviewed = async (id: string) => {
        if (!confirm("Confirm you have manually verified this source has NO significant changes?")) return;
        setMarking(id);
        try {
            const markFn = httpsCallable(functions, 'markSourceReviewed');
            await markFn({ sourceId: id, status: 'reviewed_ok', note: 'Manual verification via Admin UI' });
        } catch (e: any) {
            console.error(e);
            alert("Failed to mark reviewed: " + e.message);
        } finally {
            setMarking(null);
        }
    };

    // --- Computed State for Banner ---
    const anyChanged = sources.some(s => s.status === 'changed');
    const anyManualOrError = sources.some(s => s.status === 'manual_review' || s.status === 'error');

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="p-8 text-center">
            <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Access Error</h2>
            <p className="text-slate-400 mt-2 mb-6 max-w-md mx-auto">{error}</p>
            <p className="text-sm text-slate-500">Try refreshing the page or checking your permissions.</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">Exam Update Monitor</h1>
                    <p className="text-slate-400 mt-1">Automatically tracking official PMI sources for exam changes.</p>
                </div>
                {sources.length === 0 && (
                    <button
                        onClick={handleSeed}
                        disabled={checking}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                        {checking ? 'Seeding...' : 'Seed Default Sources'}
                    </button>
                )}
            </div>

            {/* Status Banner */}
            {anyChanged ? (
                // RED: Changes Detected
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-start gap-4 animate-pulse">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Update Needed</h2>
                        <p className="text-red-400">
                            Changes detected in monitored sources. Review and update question mapping.
                        </p>
                    </div>
                </div>
            ) : anyManualOrError ? (
                // YELLOW: Manual Review Required
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-start gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl">
                        <Eye className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Manual Review Required</h2>
                        <p className="text-amber-400">
                            Some sources blocked automation or had errors. Open and review to confirm no changes.
                        </p>
                    </div>
                </div>
            ) : (
                // GREEN: All Systems Normal
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">All Systems Normal</h2>
                        <p className="text-emerald-400">
                            No changes detected. Sources verified.
                        </p>
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Activity className="w-4 h-4" />
                    <span>Monitored Sources: <strong className="text-white">{sources.length}</strong></span>
                </div>
                <button
                    onClick={handleCheckNow}
                    disabled={checking}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 border border-white/10"
                >
                    <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                    {checking ? 'Check Now' : 'Check Now'}
                </button>
            </div>

            {/* Sources Table */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Source Name</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Check / Review</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sources.map((source) => (
                            <tr key={source.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 w-1/3">
                                    <div className="font-bold text-white">{source.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{source.url}</div>
                                    {source.lastErrorMessage && (
                                        <div className="text-xs text-red-400 mt-1 font-mono">Error: {source.lastErrorMessage}</div>
                                    )}
                                </td>
                                <td className="p-4">
                                    {source.status === 'ok' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle2 className="w-3 h-3" /> OK
                                        </span>
                                    )}
                                    {source.status === 'reviewed_ok' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <CheckCircle2 className="w-3 h-3" /> Reviewed
                                        </span>
                                    )}
                                    {source.status === 'changed' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                                            <AlertTriangle className="w-3 h-3" /> Changed
                                        </span>
                                    )}
                                    {source.status === 'manual_review' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            <Eye className="w-3 h-3" /> Manual Review
                                        </span>
                                    )}
                                    {source.status === 'error' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                            <AlertTriangle className="w-3 h-3" /> Error
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-slate-400 font-mono">
                                    <div className="flex flex-col gap-1">
                                        <div title="Last Automated Check">
                                            <span className="text-xs uppercase opacity-50">Auto:</span> {source.lastCheckedAt?.toDate().toLocaleDateString() || '-'}
                                        </div>
                                        {source.lastHumanReviewedAt && (
                                            <div title="Last Human Review" className="text-blue-300">
                                                <span className="text-xs uppercase opacity-50 text-slate-400">Human:</span> {source.lastHumanReviewedAt?.toDate().toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    {/* Action Buttons */}
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-white/10 hover:border-white/20 transition-all"
                                    >
                                        Open <ExternalLink className="w-3 h-3" />
                                    </a>

                                    {(source.status === 'manual_review' || source.status === 'changed') && (
                                        <button
                                            onClick={() => handleMarkReviewed(source.id)}
                                            disabled={marking === source.id}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/20 transition-all disabled:opacity-50"
                                        >
                                            {marking === source.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-3 h-3" />
                                            )}
                                            Mark Reviewed
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {sources.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                                    No sources configured. Use the button above to seed defaults.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
