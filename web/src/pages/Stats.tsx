import SpeedAccuracyChart from '../components/analytics/SpeedAccuracyChart';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Stats() {
    const { checkPermission } = useSubscription();
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white font-display">Your Statistics</h1>
                    <p className="text-slate-400 mt-1">Deep dive into your performance metrics.</p>
                </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white font-display mb-6">Performance Trends</h3>
                <div className="relative">
                    <div className={!checkPermission('analytics') ? "blur-md pointer-events-none opacity-50 select-none" : ""}>
                        <SpeedAccuracyChart currentExamId={localStorage.getItem('selectedExamId') || 'default-exam'} />
                    </div>

                    {!checkPermission('analytics') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-xl border border-slate-700">
                                <Lock className="w-6 h-6 text-brand-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Pro Feature</h3>
                            <p className="text-slate-300 mb-6 text-center max-w-sm">
                                Upgrade to unlock detailed performance analytics and trends.
                            </p>
                            <button
                                onClick={() => navigate('/app/pricing')}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all"
                            >
                                Upgrade Now
                            </button>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
