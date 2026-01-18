import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function TrialModal() {
    const { user } = useAuth();
    const { isPro } = useSubscription();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user || isPro) return;

        const checkTrial = async () => {
            // Check session storage first (for "Not now")
            const snoozed = sessionStorage.getItem(`trial_snooze_${user.uid}`);
            if (snoozed) return; // Don't show if snoozed this session

            // Double check user profile for overrides or previous trials
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const data = userDoc.data();

            // If tester override is true, do NOT show trial modal
            // (Wait for subscription context to sync if needed, but context handles isPro)
            if (data?.testerOverride) {
                return;
            }

            // If valid trial exists, don't show prompt
            if (data?.trial?.status === 'active') {
                return;
            }

            // Only show if never had trial? Or simply if Starter?
            // "If user is Starter AND no trial AND no testerOverride"
            // We'll show it.
            setIsOpen(true);
        };

        // Delay slightly to allow context to settle
        const timer = setTimeout(checkTrial, 2000);
        return () => clearTimeout(timer);
    }, [user, isPro]);

    const handleStartTrial = () => {
        // Redirect to pricing or trigger checkout with trial
        window.location.href = '/app/pricing?trial=true';
    };

    const handleNotNow = () => {
        setIsOpen(false);
        // Snooze for 24h
        if (user) {
            sessionStorage.setItem(`trial_snooze_${user.uid}`, 'true');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-brand-500/30 rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>

                <div className="text-center">
                    <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                        <span className="text-2xl">🚀</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 font-display">Start your 7-day Pro trial</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Unlock infinite practice questions, full explanations, AI tutoring, and all Pro features.
                        <br /><br />
                        <span className="text-brand-400 font-medium">No payment required today.</span>
                    </p>

                    <button
                        onClick={handleStartTrial}
                        className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 mb-3 transform hover:-translate-y-0.5"
                    >
                        Start Free Trial
                    </button>

                    <button
                        onClick={handleNotNow}
                        className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
