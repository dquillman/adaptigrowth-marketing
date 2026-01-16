import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Admin Guard Hook
 * Checks if current user has admin role
 * Redirects non-admins to login with error message
 */
export function useAdminGuard() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Not logged in
                navigate('/login', { replace: true });
                setIsLoading(false);
                return;
            }

            try {
                // Check user role in Firestore
                const profileDoc = await getDoc(doc(db, 'users', user.uid));

                if (!profileDoc.exists()) {
                    console.error('User profile not found');
                    alert('User profile not found. Please contact support.');
                    await auth.signOut();
                    navigate('/login', { replace: true });
                    setIsLoading(false);
                    return;
                }

                const role = profileDoc.data()?.role;

                if (role !== 'admin') {
                    console.warn(`Access denied: User ${user.email} has role '${role}'`);
                    alert('Admin access required. You will be logged out.');
                    await auth.signOut();
                    navigate('/login', { replace: true });
                    setIsLoading(false);
                    return;
                }

                // User is admin
                setIsAdmin(true);
                setIsLoading(false);

            } catch (error) {
                console.error('Error checking admin status:', error);
                alert('Error verifying admin access. Please try again.');
                navigate('/login', { replace: true });
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    return { isAdmin, isLoading };
}
