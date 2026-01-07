import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../App";
import { APP_VERSION } from "../version";
import { useSidebar } from "../contexts/SidebarContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
        {
            label: "Dashboard", path: "/app", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            label: "Exams", path: "/app/exams", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            label: "Stats", path: "/app/stats", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
    ];

    return (
        <aside className={`fixed left-0 top-0 z-40 h-screen ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300`}>
            {/* Brand */}
            <div className={`flex px-6 py-6 items-center gap-2 border-b border-slate-900 ${isCollapsed ? 'justify-center' : ''} relative`}>
                <div className="h-8 w-8 min-w-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center font-bold text-white">A</div>
                {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-lg font-bold tracking-tight text-white truncate">AdaptiGrowth</span>
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
