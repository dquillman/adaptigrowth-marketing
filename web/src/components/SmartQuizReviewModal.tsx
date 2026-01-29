interface SmartQuizReviewModalProps {
    open: boolean;
    onClose: () => void;
    reviewText?: string;
    loading: boolean;
    isPartial: boolean;
    isPro: boolean;
}

export default function SmartQuizReviewModal({ open, onClose, reviewText, loading, isPartial, isPro }: SmartQuizReviewModalProps) {
    if (!open) return null;

    const paragraphs = reviewText ? reviewText.split(/\n\s*\n/) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/40 max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">{isPro ? '\uD83E\uDDE0' : '\uD83D\uDD12'}</span>
                        <h2 className="text-xl font-bold text-white font-display">
                            {isPartial ? 'Your Progress So Far' : 'Your Smart Practice Review'}
                        </h2>
                    </div>
                    <p className="text-sm text-slate-400 ml-10">
                        {isPro
                            ? 'Personalized coaching based on this quiz'
                            : 'Upgrade to Pro for personalized coaching'}
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    {isPro ? (
                        <div className="text-slate-300 text-sm leading-7 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent space-y-4">
                            {loading ? (
                                <p className="text-slate-400 italic">Reviewing your progress...</p>
                            ) : paragraphs.length > 0 ? (
                                paragraphs.map((p, i) => (
                                    <p key={i}>{p.trim()}</p>
                                ))
                            ) : (
                                <p className="text-slate-400">Your results are saved. Coaching review will be available soon.</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                                <span className="text-3xl">{'\uD83E\uDDE0'}</span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed mb-2">
                                Pro members get a personalized AI coaching review after every Smart Practice session.
                            </p>
                            <p className="text-slate-500 text-xs">
                                Your results are saved. Upgrade anytime to unlock coaching insights.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                    {!isPro && (
                        <button
                            onClick={() => { window.location.href = '/pricing'; }}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-500 shadow-lg shadow-brand-500/20 transition-all"
                        >
                            Upgrade to Pro
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
