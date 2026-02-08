import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../App';
import { useExam } from '../contexts/ExamContext';
import { DiagnosticService } from '../services/DiagnosticService';

export default function StartHere() {
    const { user } = useAuth();
    const { selectedExamId } = useExam();
    const navigate = useNavigate();
    const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);

    // Check diagnostic completion status
    useEffect(() => {
        const checkDiagnostic = async () => {
            if (!user?.uid || !selectedExamId) return;

            const latestRun = await DiagnosticService.getLatestRun(user.uid, selectedExamId);
            setHasCompletedDiagnostic(latestRun?.status === 'completed');
        };

        checkDiagnostic();
    }, [user?.uid, selectedExamId]);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500/30">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
                <div className="mx-auto max-w-3xl px-6 h-20 flex items-center justify-between">
                    {hasCompletedDiagnostic ? (
                        <Link to="/app" className="text-slate-400 hover:text-white transition-colors group flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 group-hover:border-slate-500 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </div>
                            <span className="font-bold">Back to Dashboard</span>
                        </Link>
                    ) : (
                        <div />
                    )}
                    <h1 className="text-xl font-bold font-display text-white">
                        {hasCompletedDiagnostic ? 'New to ExamCoach?' : 'Welcome'}
                    </h1>
                </div>
            </header>

            <div className="mx-auto max-w-3xl px-6 py-12">
                {/* Intro */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-display text-white mb-4">
                        {hasCompletedDiagnostic ? 'New to ExamCoach?' : 'Before you begin'}
                    </h2>
                    {!hasCompletedDiagnostic ? (
                        <>
                            <p className="text-lg text-slate-400 max-w-xl mx-auto mb-2">
                                Would you like a 2-minute orientation before you begin?
                            </p>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                                Totally optional — you can skip straight to your diagnostic if you prefer.
                            </p>
                        </>
                    ) : (
                        <p className="text-lg text-slate-400 max-w-xl mx-auto">
                            A quick overview of how ExamCoach is different.
                        </p>
                    )}
                </div>

                {/* Skip to Diagnostic (pre-diagnostic users only) */}
                {!hasCompletedDiagnostic && (
                    <div className="text-center mb-8">
                        <button
                            onClick={() => {
                                localStorage.setItem('ec_onboarding_ack', 'true');
                                navigate('/app/quiz', { state: { mode: 'diagnostic' } });
                            }}
                            className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4"
                        >
                            Skip to Diagnostic
                        </button>
                    </div>
                )}

                {/* Single Orientation Video */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50">
                        <h3 className="font-bold text-white">A Smarter Way to Study</h3>
                    </div>
                    <div className="bg-slate-900">
                        <video
                            controls
                            preload="metadata"
                            className="w-full rounded-b-2xl border-t border-slate-700"
                        >
                            <source
                                src="/videos/ec/v15/ec-v15-video-01-a-smarter-way-to-study.mp4"
                                type="video/mp4"
                            />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>

                {/* CTA - Both paths converge to diagnostic (or planner if returning) */}
                <div className="mt-12 text-center">
                    {hasCompletedDiagnostic ? (
                        <Link
                            to="/app/planner"
                            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-8 py-4 rounded-xl font-bold hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg hover:shadow-brand-500/25 group"
                        >
                            Go to Your Study Plan
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    ) : (
                        <button
                            onClick={() => {
                                localStorage.setItem('ec_onboarding_ack', 'true');
                                navigate('/app/quiz', { state: { mode: 'diagnostic' } });
                            }}
                            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-8 py-4 rounded-xl font-bold hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg hover:shadow-brand-500/25 group"
                        >
                            Start Diagnostic
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
