import SpeedAccuracyChart from '../components/analytics/SpeedAccuracyChart';

export default function Stats() {
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
                <SpeedAccuracyChart currentExamId={localStorage.getItem('selectedExamId') || 'default-exam'} />
            </div>


        </div>
    );
}
