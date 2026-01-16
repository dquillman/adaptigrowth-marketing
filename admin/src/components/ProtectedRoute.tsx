import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    setError('User profile not found.');
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                const role = profileDoc.data()?.role;

                if (role !== 'admin') {
                    console.warn(`Access denied: User ${currentUser.email} has role '${role}', expected 'admin'`);
                    setError('Admin access required');
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                // User is admin
                setIsAdmin(true);
                setError(null);
                setLoading(false);

            } catch (err) {
                if (mounted) {
                    console.error('Error checking admin status:', err);
                    setError('Error verifying admin access');
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
                <div className="max-w-md w-full p-8 bg-slate-900/50 backdrop-blur-xl border border-red-500/30 rounded-3xl text-center shadow-2xl relative z-10">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl text-red-500">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
                    <p className="text-slate-400 mb-8">{error || 'You do not have administrative privileges.'}</p>
                    <button
                        onClick={async () => {
                            await signOut(auth);
                            window.location.href = '/login';
                        }}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 transform hover:-translate-y-0.5"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
