import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Use a flag to prevent state updates on unmounted component
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                if (mounted) {
                    setUser(null);
                    setIsAdmin(null);
                    setLoading(false);
                }
                return;
            }

            if (mounted) setUser(currentUser);

            try {
                // Check admin role in Firestore
                const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));

                if (!mounted) return;

                if (!profileDoc.exists()) {
                    console.error('User profile not found for', currentUser.email);
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                const role = profileDoc.data()?.role;

                if (role !== 'admin') {
                    console.warn(`Access denied: User ${currentUser.email} has role '${role}', expected 'admin'`);
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                // User is admin
                setIsAdmin(true);
                setLoading(false);

            } catch (err) {
                if (mounted) {
                    console.error('Error checking admin status:', err);
                    setIsAdmin(false);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (isAdmin === false) {
            signOut(auth).then(() => {
                window.location.href = '/login';
            });
        }
    }, [isAdmin]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]"></div>
                    <p className="text-slate-400 text-sm font-medium animate-pulse">Verifying Credentials...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (isAdmin === false) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <span className="text-2xl text-red-500">🔒</span>
                    </div>
                    <p className="text-slate-400 font-medium">Unauthorized. Redirecting...</p>
                </div>
            </div>
        );
    }

    return <Outlet />;
}
