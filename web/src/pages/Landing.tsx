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
      navigate("/login");
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center font-bold text-white">A</div>
            <span className="text-lg font-bold tracking-tight text-white">AdaptiGrowth</span>
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
            Now updated for the 2025 PMP Exam
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-7xl mb-6">
            Pass the PMP Exam <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-500">
              Without the Burnout.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10 leading-relaxed">
            Stop studying "everything" and start studying what matters.
            AdaptiGrowth uses AI to identify your weak spots and builds a
            custom study plan that evolves with you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <button
              onClick={handleCta}
              className="w-full sm:w-auto rounded-full bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:scale-105 transition-all"
            >
              Start Your Free Trial
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('features');
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
              alt="AdaptiGrowth Dashboard"
              className="rounded-xl shadow-inner w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-700"
            />

          </div>
        </div>
      </section>



      {/* Features Section */}
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
                Simulate the Real Exam. <br />
                <span className="text-brand-400">Build Real Confidence.</span>
              </h2>
              <p className="text-lg text-slate-400">
                Don't let the exam format surprise you. Our simulator mimics the actual Pearson VUE testing environment, so on test day, the only thing you have to focus on is the answer.
              </p>

              <ul className="space-y-4">
                {[
                  "180-Question Full Mock Exams",
                  "Timed & Untimed Practice Modes",
                  "Detailed Explanations for Every Answer",
                  "AI-Powered Weakness Identification"
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
                Try the Simulator <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Grid */}
      <section className="py-24 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">Why AdaptiGrowth?</h2>
            <p className="text-slate-400">We don't just give you questions. We give you a path to passing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Adaptive Learning",
                desc: "Our AI analyzes your performance and adjusts your study plan daily. Focus only on what you don't know.",
                icon: "🎯"
              },
              {
                title: "Performance Tracking",
                desc: "Visualize your mastery across People, Process, and Business domains. Know exactly when you're ready to test.",
                icon: "📊"
              },
              {
                title: "Expert Content",
                desc: "Questions crafted by PMP certified experts, updated for the 2025 exam content outline.",
                icon: "🧠"
              }
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950 p-8 hover:border-brand-500/30 transition-colors">
                <div className="text-4xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-600/10" />
        <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to become a PMP?</h2>
          <p className="text-xl text-slate-400 mb-10">
            Start your journey towards certification today with the smartest study tool available.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-full bg-white px-10 py-4 text-lg font-bold text-slate-900 hover:bg-slate-100 hover:scale-105 transition-all shadow-xl"
          >
            Get Started for Free
          </button>
          <p className="mt-6 text-sm text-slate-500">No credit card required for trial.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center text-xs text-white font-bold">A</div>
            <span className="text-slate-400 font-semibold">AdaptiGrowth</span>
          </div>
          <p className="text-slate-600 text-sm">© {new Date().getFullYear()} AdaptiGrowth. All rights reserved.</p>
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
