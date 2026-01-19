import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { APP_VERSION } from "../version";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCta = () => {
    if (user) {
      navigate("/app");
    } else {
      navigate("/login?mode=signup");
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen font-sans selection:bg-brand-500/30 text-slate-200">
      {/* Version Label */}
      <div className="absolute top-0 w-full bg-slate-950/50 text-center py-1 text-xs font-mono text-white z-[100]">
        Version: {APP_VERSION}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Exam Coach Pro AI Logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight text-white">Exam Coach Pro AI</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/login")}
              className="rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-950 hover:bg-slate-200 transition-all hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-20 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />

        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Aligned with the 2025 PMP Exam Content Outline (ECO)
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-7xl mb-6">
            Don't Just Quiz Yourself. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-500">
              Train With an AI Tutor.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10 leading-relaxed">
            Most apps just test you. Exam Coach Pro explains the <i>why</i> behind every answer,
            finds your blind spots, and builds a custom plan to get you passing confidenty.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <button
              onClick={handleCta}
              className="w-full sm:w-auto rounded-full bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:scale-105 transition-all"
            >
              Meet Your AI Tutor
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('problem');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto rounded-full border border-slate-700 bg-slate-800/50 px-8 py-4 text-base font-bold text-white hover:bg-slate-800 transition-all"
            >
              See How It Works
            </button>
          </div>

          {/* Hero Image */}
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/50 p-2 shadow-2xl backdrop-blur-sm">
            <img
              src="/assets/dashboard-preview.png"
              alt="Exam Coach Pro AI Dashboard"
              className="rounded-xl shadow-inner w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-700"
            />
          </div>
        </div>
      </section>

      {/* Section 1: The Real Problem */}
      <section id="problem" className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-12">The Real Reason Smart People Fail</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <div className="text-red-400 text-xl font-bold mb-2">Passive Reading</div>
              <p className="text-slate-400 text-sm">Reading textbooks cover-to-cover doesn't work. You need active recall to build memory.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <div className="text-red-400 text-xl font-bold mb-2">Random Drilling</div>
              <p className="text-slate-400 text-sm"> Answering random questions is inefficient. You need to focus on what you <i>don't</i> know.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <div className="text-red-400 text-xl font-bold mb-2">Missing The "Why"</div>
              <p className="text-slate-400 text-sm">Getting a question right by guessing is dangerous. You need to understand the underlying logic.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: How Exam Coach Pro AI Fixes This (The Solution) */}
      <section className="py-24 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">Your New Competitive Advantage</h2>
            <p className="text-slate-400">You already have the books. Exam Coach Pro AI is the coach that tells you what to study—and what to skip.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Adaptive */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 hover:border-brand-500/30 transition-colors">
              <div className="text-4xl mb-6">💡</div>
              <h3 className="text-xl font-bold text-white mb-3">Answers That Teach</h3>
              <p className="text-slate-400 leading-relaxed">
                Stop wasting time on topics you already know. The AI finds your weak domains (e.g., "Cost Management") and drills them until you master them.
              </p>
            </div>

            {/* Feature 2: Verbal Mode */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 hover:border-brand-500/30 transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
              <div className="text-4xl mb-6">🧬</div>
              <h3 className="text-xl font-bold text-white mb-3">Pattern Recognition</h3>
              <p className="text-slate-400 leading-relaxed">
                The AI spots the traps you keep falling for (like "Misreading Agile Roles") and drills them until they become your strengths.
              </p>
            </div>

            {/* Feature 3: Smart Readiness */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 hover:border-brand-500/30 transition-colors">
              <div className="text-4xl mb-6">📅</div>
              <h3 className="text-xl font-bold text-white mb-3">Plans That Adapt</h3>
              <p className="text-slate-400 leading-relaxed">
                Life happens. Our dynamic study plans adjust automatically based on your mastery level and how much time you actually have.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Exam Realism & Confidence */}
      <section id="features" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500">
                <img
                  src="/assets/exam-preview.png"
                  alt="Exam Simulator Interface"
                  className="rounded-xl w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Real Simulation. <br />
                <span className="text-brand-400">Total Confidence.</span>
              </h2>
              <p className="text-lg text-slate-400">
                The PMP isn't just about what you know—it's about staying focused for 4 hours.
                Our full mock exams and AI tutor prepare you for the mental marathon.
              </p>

              <ul className="space-y-4">
                {[
                  "Deep Dive 'Why' Explanations",
                  "AI-Powered Pattern Detection",
                  "Authorized Exam Content Outline (ECO) 2025",
                  "Stamina & Focus Tracking"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-brand-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCta}
                className="mt-4 text-brand-400 font-bold hover:text-brand-300 flex items-center gap-2 group"
              >
                Assess Your Readiness <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-600/10" />
        <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">Stop Guessing. Start Understanding.</h2>
          <p className="text-xl text-slate-400 mb-10">
            Join the professionals who found clarity with Exam Coach Pro AI.
          </p>
          <button
            onClick={handleCta}
            className="rounded-full bg-white px-10 py-4 text-lg font-bold text-slate-900 hover:bg-slate-100 hover:scale-105 transition-all shadow-xl"
          >
            Start For Free
          </button>
          <p className="mt-6 text-sm text-slate-500">No credit card required for trial.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Exam Coach Pro AI Logo" className="h-6 w-6 rounded object-contain" />
            <span className="text-slate-400 font-semibold">Exam Coach Pro AI</span>
          </div>
          <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Exam Coach Pro AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
