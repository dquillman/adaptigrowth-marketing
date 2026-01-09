import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import QuestionEditor from './components/QuestionEditor';
import Dashboard from './pages/Dashboard';
import ExamEditor from './pages/ExamEditor';
import Login from './pages/Login';
import Settings from './pages/Settings';
import IssuesList from './pages/IssuesList';
import ProtectedRoute from './components/ProtectedRoute';

function Layout() {
  const location = useLocation();

  // Don't show sidebar on login page
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-transparent text-slate-200 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold font-display shadow-[0_0_15px_rgba(2,132,199,0.4)]">
              A
            </div>
            <h1 className="text-xl font-bold text-white font-display tracking-tight">Admin Console</h1>
          </div>
        </div>

        <nav className="mt-8 flex-1 px-4 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all group">
            <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link to="/questions/new" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all group">
            <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-medium">Add Question</span>
          </Link>
          <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all group">
            <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-medium">Settings</span>
          </Link>
          <Link to="/issues" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all group">
            <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-medium">Issues</span>
          </Link>
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">System Status</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
              <span className="text-sm text-slate-300">Operational</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-600 font-mono">v0.1.8</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10">
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/exams/:examId" element={
            <ProtectedRoute>
              <ExamEditor />
            </ProtectedRoute>
          } />
          <Route path="/questions/new" element={
            <ProtectedRoute>
              <QuestionEditor />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/issues" element={
            <ProtectedRoute>
              <IssuesList />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
