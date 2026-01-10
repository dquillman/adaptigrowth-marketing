import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { APP_VERSION } from '../version';
import { useSidebar } from '../contexts/SidebarContext';
import { LayoutDashboard, BookOpen, ChevronLeft, ChevronRight, Calendar, BarChart2, Mic, Target } from 'lucide-react';

export default function Sidebar() {
    const { logout, user } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();
    const { isCollapsed, toggleSidebar } = useSidebar();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/");
        } catch (error) {
            console.error("Failed to logout", error);
        }
    };

    const menuItems = [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Study Plan", path: "/app/planner", icon: <Calendar className="w-5 h-5" /> },
        { label: "Verbal Mode", path: "/app/verbal", icon: <Mic className="w-5 h-5" /> },
        { label: "Readiness", path: "/app/readiness", icon: <Target className="w-5 h-5" /> },
        { label: "Exams", path: "/app/exams", icon: <BookOpen className="w-5 h-5" /> },
        { label: "Stats", path: "/app/stats", icon: <BarChart2 className="w-5 h-5" /> },
    ];

    return (
        <aside className={`fixed left-0 top-0 z-40 h-screen ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300`}>
            {/* Brand */}
            <div className={`flex px-6 py-6 items-center gap-2 border-b border-slate-900 ${isCollapsed ? 'justify-center' : ''} relative`}>
                <div className="h-8 w-8 min-w-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center font-bold text-white">E</div>
                {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-lg font-bold tracking-tight text-white truncate">Exam Coach Pro AI</span>
                        <span className="text-[10px] text-white font-mono truncate">Version: {APP_VERSION}</span>
                    </div>
                )}
                {/* Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg z-50`}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
                {menuItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : ''}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-brand-600/10 text-brand-400 border border-brand-600/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-900"
                                } ${isCollapsed ? 'justify-center' : ''}`}
                        >
                            {item.icon}
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile / Logout */}
            <div className={`p-4 border-t border-slate-800 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                <div className={`flex items-center gap-3 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="h-10 w-10 min-w-10 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                            {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                        </div>
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.displayName || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Log out" : ""}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {!isCollapsed && "Log out"}
                </button>
            </div>
        </aside>
    );
}
