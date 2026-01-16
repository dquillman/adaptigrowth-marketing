import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User as UserIcon, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * IdentityIndicator Component
 * Displays the logged-in user's email and role (ADMIN or USER).
 * Role is fetched from Firestore: users/{uid}.role
 */
export default function IdentityIndicator() {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Fetch role from Firestore user profile
                    const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (profileDoc.exists()) {
                        setRole(profileDoc.data()?.role || 'user');
                    } else {
                        setRole('user');
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setRole('user');
                }
            } else {
                setRole(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    if (!user) return null;

    const isAdmin = role?.toLowerCase() === 'admin';

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/40 backdrop-blur-md rounded-full border border-white/5 text-xs font-medium shadow-lg">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px] lg:max-w-[250px]">{user.email}</span>
                </div>
                <div className="h-3 w-px bg-white/10"></div>
                <div className={`flex items-center gap-1.5 ${isAdmin ? 'text-brand-400 font-bold' : 'text-slate-500'}`}>
                    {isAdmin && <Shield className="w-3.5 h-3.5" />}
                    <span className="uppercase tracking-wider">
                        {isAdmin ? 'ADMIN' : 'USER'}
                    </span>
                </div>
            </div>

            <button
                onClick={handleLogout}
                className="p-2.5 bg-slate-800/40 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-full border border-white/5 transition-all group shadow-lg"
                title="Sign Out"
            >
                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
    );
}
