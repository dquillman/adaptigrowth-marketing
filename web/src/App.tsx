import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { onAuthStateChanged, type User, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { APP_VERSION } from "./version";

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

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    await signOut(auth);
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

// --- Layouts ---
function AppLayout() {
  const { isCollapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex relative">
      {/* Global Version Label */}
      <div className="absolute top-0 right-0 w-full text-right pr-4 py-1 text-xs font-mono text-white/50 pointer-events-none z-50">
        Version: {APP_VERSION}
      </div>
      <Sidebar />
      <div className={`flex-1 ${isCollapsed ? 'ml-20' : 'ml-64'} p-8 transition-all duration-300`}>
        <Outlet />
      </div>
    </div>
  );
}

import { ExamProvider } from "./contexts/ExamContext";

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <ExamProvider>
          <SubscriptionProvider>
            <Router>
              <Routes>
                {/* Public Routes (Accessible to everyone) */}
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />

                {/* Auth Routes (Only for logged out users) */}
                <Route element={<PublicOnly />}>
                  <Route path="/login" element={<Login />} />
                </Route>

                {/* Protected Routes (Accessible only when logged in) */}
                <Route path="/app" element={<RequireAuth />}>
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
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SubscriptionProvider>
        </ExamProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;
