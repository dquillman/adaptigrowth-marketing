import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Layout,
    CheckCircle2,
    Zap,
    Target,
    Trophy,
    ArrowDown,
    ChevronLeft,
    MessageSquare
} from 'lucide-react';
import ReportIssueModal from '../components/ReportIssueModal';

export default function Help() {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500/30">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
                <div className="mx-auto max-w-5xl px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/app" className="text-slate-400 hover:text-white transition-colors group flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 group-hover:border-slate-500 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </div>
                            <span className="font-bold">Back to Dashboard</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold font-display text-white">
                            Success Roadmap
                        </h1>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-2xl px-6 py-12">

                {/* Intro */}
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl font-bold font-display text-white">Your Path to Mastery</h2>
                    <p className="text-lg text-slate-400">
                        Follow this simple workflow to maximize your score.
                    </p>
                </div>

                {/* FLOW CHART */}
                <div className="relative space-y-8">
                    {/* Connecting Line */}
                    <div className="absolute left-8 top-8 bottom-8 w-1 bg-slate-800 rounded-full -z-10"></div>

                    {/* Step 1: Select Exam */}
                    <div className="relative flex gap-6 group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 group-hover:border-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center shrink-0 transition-all z-10">
                            <Layout className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex-1 group-hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white">1. Select Your Exam</h3>
                                <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">SETUP</span>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                Ensure the correct exam is selected in the top-left dropdown. Your progress is tracked separately for each exam.
                            </p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="pl-6 text-slate-700">
                        <ArrowDown className="w-6 h-6 animate-bounce" />
                    </div>

                    {/* Step 2: Daily Check-in */}
                    <div className="relative flex gap-6 group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 group-hover:border-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center shrink-0 transition-all z-10">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex-1 group-hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white">2. Daily Check-in</h3>
                                <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DAILY</span>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                Look at your <strong className="text-emerald-400">Mastery Rings</strong> on the dashboard.
                                Your goal is to get all rings to 100%. This shows you exactly how much of the content you've mastered.
                            </p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="pl-6 text-slate-700">
                        <ArrowDown className="w-6 h-6 animate-bounce delay-75" />
                    </div>

                    {/* Step 3: Smart Practice */}
                    <div className="relative flex gap-6 group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 group-hover:border-brand-500 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center justify-center shrink-0 transition-all z-10">
                            <Zap className="w-8 h-8 text-brand-400" />
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex-1 group-hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-white">3. Smart Practice</h3>
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">CORE</span>
                                </div>
                            </div>

                            <p className="text-slate-400 leading-relaxed mb-6">
                                Click <strong className="text-brand-400">Smart Start</strong>. The AI picks questions you need to review.
                            </p>

                            {/* Branching Logic Visualization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Starter Plan</div>
                                    <div className="flex items-center gap-2 text-white mb-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                                        <span>5 Questions / Day</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Perfect for maintaining your daily streak.</p>
                                </div>
                                <div className="bg-gradient-to-br from-brand-900/40 to-slate-900/40 rounded-xl p-4 border border-brand-500/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs font-bold text-brand-400 uppercase tracking-wider">Pro Plan</div>
                                        <Zap className="w-3 h-3 text-brand-400" />
                                    </div>
                                    <div className="flex items-center gap-2 text-white mb-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                        <span>Unlimited Practice</span>
                                    </div>
                                    <p className="text-xs text-slate-400">Accelerate your mastery with no limits.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="pl-6 text-slate-700">
                        <ArrowDown className="w-6 h-6 animate-bounce delay-150" />
                    </div>

                    {/* Step 4: Target Weaknesses */}
                    <div className="relative flex gap-6 group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 group-hover:border-amber-500 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center shrink-0 transition-all z-10">
                            <Target className="w-8 h-8 text-amber-400" />
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex-1 group-hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white">4. Target Weaknesses</h3>
                                <span className="text-xs font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">REFINE</span>
                            </div>
                            <p className="text-slate-400 leading-relaxed mb-4">
                                Use the <strong>Analytics</strong> tab to see advanced breakdowns of your performance.
                            </p>
                            <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="p-1.5 bg-slate-800 rounded text-amber-400 shrink-0 mt-0.5">
                                    <Target className="w-3 h-3" />
                                </div>
                                <div className="text-sm">
                                    <strong className="text-white block mb-0.5">Pro Feature: Deep Analytics</strong>
                                    <span className="text-slate-400">Unlock detailed readiness reports and domain-level trend analysis to spot weak points instantly.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="pl-6 text-slate-700">
                        <ArrowDown className="w-6 h-6 animate-bounce delay-200" />
                    </div>

                    {/* Step 5: Simulator */}
                    <div className="relative flex gap-6 group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 group-hover:border-rose-500 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center shrink-0 transition-all z-10">
                            <Trophy className="w-8 h-8 text-rose-400" />
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex-1 group-hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white">5. Exam Simulator</h3>
                                <span className="text-xs font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">PRO ONLY</span>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                Periodically take a full mock exam. This simulates the real test environment:
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-500">
                                    <li><strong>50 Questions</strong> in 60 minutes.</li>
                                    <li><strong>No Feedback</strong> until the end.</li>
                                    <li><strong>History Tracking</strong> to see your score improve.</li>
                                </ul>
                            </p>
                        </div>
                    </div>

                </div>

                {/* XP & Levels Breakdown */}
                <div className="mt-12 bg-slate-800/30 rounded-2xl p-8 border border-slate-700/50">
                    <h3 className="text-2xl font-bold text-white mb-6 font-display text-center">How XP & Levels Work</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-500/20 rounded-lg text-brand-400">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-white">Earning XP</h4>
                            </div>
                            <ul className="space-y-2 text-slate-400 text-sm">
                                <li className="flex justify-between">
                                    <span>Attempt a Question</span>
                                    <span className="text-white font-bold">+10 XP</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Correct Answer Bonus</span>
                                    <span className="text-white font-bold">+5 XP</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Daily Streak Bonus</span>
                                    <span className="text-white font-bold">+50 XP</span>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-white">Exam-Specific Levels</h4>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Your <strong>Level</strong> is specific to each exam (e.g., PMP vs CompTIA).
                                As you earn XP, you'll level up, unlocking cooler badges and showing your growing mastery of that specific subject.
                            </p>
                        </div>
                    </div>
                </div>
                <p className="text-slate-500 mb-8 italic">
                    "Consistency is the key to mastery."
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/app" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-8 py-4 rounded-xl font-bold hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg hover:shadow-brand-500/25 group">
                        Start My Session
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>

                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-slate-800 text-slate-300 border border-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all group"
                    >
                        <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-white" />
                        Report a Problem
                    </button>
                </div>
            </div>

            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />

        </div>

    );
}
