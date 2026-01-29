interface SmartQuizReviewModalProps {
    open: boolean;
    onClose: () => void;
    reviewText?: string;
    loading: boolean;
    isPartial: boolean;
}

export default function SmartQuizReviewModal({ open, onClose, reviewText, loading, isPartial }: SmartQuizReviewModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/30 max-w-lg w-full mx-4 p-6 animate-in fade-in zoom-in duration-300">
                <h2 className="text-xl font-bold text-white font-display mb-4">
                    {isPartial ? 'Your Progress So Far' : 'Your Smart Practice Review'}
                </h2>

                <div className="text-slate-300 text-sm leading-relaxed mb-6 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                    {loading ? (
                        <p className="text-slate-400 italic">Reviewing your progress...</p>
                    ) : reviewText ? (
                        <p className="whitespace-pre-line">{reviewText}</p>
                    ) : (
                        <p className="text-slate-400">Your results are saved. Coaching review will be available soon.</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        disabled
                        className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600/50 text-white/50 font-medium cursor-not-allowed"
                    >
                        Start Targeted Practice
                    </button>
                </div>
            </div>
        </div>
    );
}
