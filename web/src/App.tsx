import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { onAuthStateChanged, type User, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { APP_VERSION, DISPLAY_VERSION } from "./version";
import { isValidVersion, evaluateVersion } from "./utils/versionCheck";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ExamList from "./pages/ExamList";
import Quiz from "./pages/Quiz";
import About from "./pages/About";
import Help from "./pages/Help";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";
import SimulatorIntro from "./pages/SimulatorIntro";
import Simulator from "./pages/Simulator";
import SimulatorResults from "./pages/SimulatorResults";
import Stats from "./pages/Stats";
import SetupPlanner from "./pages/planner/SetupPlanner";
import StudySchedule from "./pages/planner/StudySchedule";
import VerbalMode from "./pages/VerbalMode";
import ReadinessReportPage from "./pages/ReadinessReport";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import Faq from "./pages/Faq";

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

import { useSessionTracker } from "./hooks/useSessionTracker";

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { closeSession } = useSessionTracker(user);

  useEffect(() => {
    // Safety check for auth initialization failure
    if (!auth) {
      console.error("Firebase Auth not initialized correctly.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await closeSession();
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still sign out if session close fails
      await signOut(auth);
    }
  };

  if (!auth && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8 bg-slate-800 rounded-xl border border-red-500/30">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Configuration Error</h1>
          <p className="text-slate-300">Firebase failed to initialize. Please check your network connection or configuration.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Version Enforcement ---
// State machine: loading → (ok | warn | block)
// 'loading' — Firestore check in progress; children not rendered
// 'ok'      — current or ahead of latest; normal rendering
// 'warn'    — behind latest but at or above minimum; non-blocking banner
// 'block'   — below minimum; full-screen block, children not rendered
type VersionStatus = 'loading' | 'ok' | 'warn' | 'block';

function VersionGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VersionStatus>('loading');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'version'));

        if (cancelled) return;

        if (!snap.exists()) {
          setStatus('ok');
          return;
        }

        const data = snap.data();
        const remoteLatest: string | undefined = data?.latest;
        const remoteMinimum: string | undefined = data?.minimum;

        if (!remoteLatest || !isValidVersion(remoteLatest)) {
          console.warn(`VersionGate: invalid or missing latest version "${remoteLatest}" — failing open`);
          setStatus('ok');
          return;
        }

        let validMinimum: string | undefined;
        if (remoteMinimum) {
          if (isValidVersion(remoteMinimum)) {
            validMinimum = remoteMinimum;
          } else {
            console.warn(`VersionGate: invalid minimum version "${remoteMinimum}" — defaulting to latest`);
          }
        }

        const result = evaluateVersion(APP_VERSION, remoteLatest, validMinimum);
        setStatus(result);
      } catch {
        if (cancelled) return;
        // Network, permissions, or parse error — fail-open
        setStatus('ok');
      }
    };

    check();

    return () => { cancelled = true; };
  }, []);

  switch (status) {
    case 'loading':
      return (
        <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      );
    case 'block':
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
          <div className="text-center p-8 bg-slate-800 rounded-2xl border border-slate-700 max-w-md shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-3">Update required</h1>
            <p className="text-slate-400 mb-6 leading-relaxed">
              A new version of ExamCoach is available.<br />
              Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
            >
              Refresh Now
            </button>
          </div>
        </div>
      );
    case 'warn':
      return (
        <>
          {!dismissed && (
            <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600/95 text-white text-sm text-center py-2.5 px-4 flex items-center justify-center gap-3 shadow-lg">
              <span>A newer version of ExamCoach is available. Refresh for the latest features.</span>
              <button
                onClick={() => window.location.reload()}
                className="underline font-medium hover:text-white/90"
              >
                Refresh
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-white/70 hover:text-white ml-2"
                aria-label="Dismiss"
              >
                &#x2715;
              </button>
            </div>
          )}
          {children}
        </>
      );
    case 'ok':
      return <>{children}</>;
  }
}

// --- Route Guards ---
function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function PublicOnly() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}

import Sidebar from "./components/Sidebar";

import { SidebarProvider, useSidebar } from "./contexts/SidebarContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

import TrialModal from "./components/TrialModal";

// --- Layouts ---
import IdentityIndicator from "./components/IdentityIndicator";

function AppLayout() {
  const { isCollapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex relative">
      <TrialModal />
      {/* Global Identity & Version Label */}
      <div className="absolute top-4 right-8 flex flex-col items-end gap-2 pointer-events-none z-50">
        <div className="pointer-events-auto">
          <IdentityIndicator />
        </div>
        <div className="text-xs font-mono text-white/30 px-2">
          v{DISPLAY_VERSION}
        </div>
      </div>

      <Sidebar />
      <div className={`flex-1 ${isCollapsed ? 'ml-20' : 'ml-64'} p-8 transition-all duration-300`}>
        <Outlet />
      </div>
    </div>
  );
}

import { ExamProvider } from "./contexts/ExamContext";
import { SmartQuizReviewProvider, useSmartQuizReview } from "./contexts/SmartQuizReviewContext";
import SmartQuizReviewModal from "./components/SmartQuizReviewModal";

// --- Analytics Hook ---
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

function useAnalytics() {
  useEffect(() => {
    const trackVisit = async () => {
      // Basic unique session tracking
      if (sessionStorage.getItem('visited_session')) return;

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const source = searchParams.get('utm_source') || 'direct'; // Default to direct

        // Log to backend
        const logVisitor = httpsCallable(functions, 'logVisitorEvent');
        await logVisitor({ source, path: window.location.pathname });

        // Mark session as tracked
        sessionStorage.setItem('visited_session', 'true');
        console.log('Analytics: Visit logged from', source);
      } catch (error) {
        console.error('Analytics: Failed to log visit', error);
      }
    };

    trackVisit();
  }, []);
}

function GlobalSmartQuizReviewModal() {
  const { state, closeReview } = useSmartQuizReview();
  return (
    <SmartQuizReviewModal
      open={state.open}
      onClose={closeReview}
      reviewText={state.reviewText}
      loading={state.loading}
      isPartial={state.isPartial}
      isPro={state.isPro}
    />
  );
}

function App() {
  useAnalytics(); // Initialize Analytics

  return (
    <VersionGate>
    <AuthProvider>
      <SidebarProvider>
        <ExamProvider>
          <SubscriptionProvider>
            <SmartQuizReviewProvider>
            <Routes>
              {/* Public Routes (Accessible to everyone) */}
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />

              {/* Auth Routes (Only for logged out users) */}
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Protected Routes (Accessible only when logged in) */}
              <Route path="/app/*" element={<RequireAuth />}>
                {/* Dashboard at /app root, no sidebar */}
                <Route index element={<Dashboard />} />

                <Route element={<AppLayout />}>
                  <Route path="exams" element={<ExamList />} />
                  <Route path="quiz" element={<Quiz />} />
                  <Route path="quiz/:examId" element={<Quiz />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="success" element={<Success />} />
                  <Route path="help" element={<Help />} />
                  <Route path="simulator" element={<SimulatorIntro />} />
                  <Route path="simulator/exam" element={<Simulator />} />
                  <Route path="simulator/results" element={<SimulatorResults />} />
                  <Route path="stats" element={<Stats />} />
                  <Route path="planner" element={<StudySchedule />} />
                  <Route path="planner/setup" element={<SetupPlanner />} />
                  <Route path="verbal" element={<VerbalMode />} />
                  <Route path="readiness" element={<ReadinessReportPage />} />
                  <Route path="diagnostics" element={<DiagnosticsPage />} />
                  <Route path="faq" element={<Faq />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <GlobalSmartQuizReviewModal />
            </SmartQuizReviewProvider>
          </SubscriptionProvider>
        </ExamProvider>
      </SidebarProvider>
    </AuthProvider>
    </VersionGate>
  );
}

export default App;

