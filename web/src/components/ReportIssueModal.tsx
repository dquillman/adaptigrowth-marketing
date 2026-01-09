import { useState } from 'react';
import { X, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { APP_VERSION } from '../version';

interface ReportIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReportIssueModal({ isOpen, onClose }: ReportIssueModalProps) {
    const { user } = useAuth();
    const location = useLocation();

    const [type, setType] = useState<'bug' | 'content' | 'other'>('bug');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setLoading(true);

        try {
            await addDoc(collection(db, 'issues'), {
                userId: user?.uid || 'anonymous',
                userEmail: user?.email || 'anonymous',
                type,
                description,
                path: location.pathname,
                timestamp: serverTimestamp(),
                status: 'new',
                version: APP_VERSION
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setDescription('');
                setType('bug');
            }, 2000);
        } catch (error) {
            console.error("Error submitting issue:", error);
            alert("Failed to submit issue. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Report an Issue</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Thank You!</h3>
                                <p className="text-slate-400">Your report has been submitted successfully.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Issue Type
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                >
                                    <option value="bug">Bug / Error</option>
                                    <option value="content">Content Issue (Question/Answer)</option>
                                    <option value="other">Feature Request / Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe what happened..."
                                    rows={4}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                                    required
                                />
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                                <p>Make sure to include details so we can reproduce it.</p>
                                <p>Device info and current page ({location.pathname}) will be included automatically.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
}
