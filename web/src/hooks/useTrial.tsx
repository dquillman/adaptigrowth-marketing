
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface TrialData {
    status: "active" | "expired" | "converted" | "none";
    startDate?: any; // Firestore Timestamp
    endDate?: any; // Firestore Timestamp
    daysRemaining?: number;
}

export function useTrial() {
    const [trial, setTrial] = useState<TrialData>({ status: 'none' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkTrial = async () => {
            if (!auth.currentUser) return;

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const snap = await getDoc(userRef);

                if (snap.exists()) {
                    const data = snap.data();
                    if (data.trial) {
                        const trialData = data.trial;
                        // Calculate Derived Status
                        const now = new Date();
                        const endDate = trialData.endDate instanceof Timestamp ? trialData.endDate.toDate() : null;

                        let currentStatus = trialData.status;

                        // Auto-expire check
                        if (currentStatus === 'active' && endDate && now > endDate) {
                            // It expired! Update DB
                            currentStatus = 'expired';
                            // We do this optimistically but also trigger a write
                            // We don't await this to keep UI fast, but in a real app might want to
                            updateDoc(userRef, { 'trial.status': 'expired' }).catch(console.error);
                        }

                        // Calculate days remaining
                        let daysRemaining = 0;
                        if (currentStatus === 'active' && endDate) {
                            const diff = endDate.getTime() - now.getTime();
                            daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                        }

                        if (isMounted) {
                            setTrial({
                                ...trialData,
                                status: currentStatus,
                                daysRemaining
                            });
                        }
                    } else {
                        if (isMounted) setTrial({ status: 'none' });
                    }
                }
            } catch (err) {
                console.error("Error fetching trial:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkTrial();

        // Listen for auth changes to re-check
        const unsub = auth.onAuthStateChanged((user) => {
            if (user) checkTrial();
            else {
                setTrial({ status: 'none' });
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, []);

    const startTrial = async () => {
        if (!auth.currentUser) return;

        try {
            setLoading(true);
            const now = new Date();
            const endDate = new Date();
            endDate.setDate(now.getDate() + 7);

            const trialPayload = {
                status: 'active',
                startDate: Timestamp.fromDate(now),
                endDate: Timestamp.fromDate(endDate)
            };

            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, { trial: trialPayload }, { merge: true });

            // Optimistic update
            setTrial({
                ...trialPayload,
                status: 'active' as const, // explicit cast
                daysRemaining: 7
            });

            return true;
        } catch (err) {
            console.error("Failed to start trial:", err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { trial, loading, startTrial };
}
