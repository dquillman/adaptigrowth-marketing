import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../App';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface SubscriptionContextType {
    isPro: boolean;
    loading: boolean;
    questionsAnsweredToday: number;
    dailyLimit: number;
    canTakeQuiz: boolean; // Computed: (isPro || questionsAnsweredToday < dailyLimit)
    incrementDailyCount: (count: number) => void; // Optimistic update
    checkPermission: (feature: 'analytics' | 'simulator' | 'visual_mnemonics') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);
    const [questionsAnsweredToday, setQuestionsAnsweredToday] = useState(0);

    const DAILY_LIMIT = 5;

    // 1. Listen for Pro Status
    useEffect(() => {
        if (!user) {
            setIsPro(false);
            setLoading(false);
            return;
        }

        const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setIsPro(doc.data()?.isPro || false);
            } else {
                setIsPro(false);
            }
            setLoading(false);
        });

        return () => unsubscribeProfile();
    }, [user]);

    // 2. Calculate Daily Usage
    useEffect(() => {
        const fetchDailyUsage = async () => {
            if (!user) {
                setQuestionsAnsweredToday(0);
                return;
            }

            // Calculate start of today (Local Time)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTimestamp = Timestamp.fromDate(today);

            try {
                // Query attempts from today
                const q = query(
                    collection(db, 'quizAttempts'),
                    where('userId', '==', user.uid),
                    where('timestamp', '>=', todayTimestamp)
                );

                const snapshot = await getDocs(q);
                let total = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Assuming 'totalQuestions' is the count field
                    total += (data.totalQuestions || 0);
                });

                setQuestionsAnsweredToday(total);
            } catch (error) {
                console.error("Error fetching daily usage:", error);
            }
        };

        if (user) {
            fetchDailyUsage();
        }
    }, [user]);

    const incrementDailyCount = (count: number) => {
        setQuestionsAnsweredToday(prev => prev + count);
    };

    const checkPermission = (_feature: 'analytics' | 'simulator' | 'visual_mnemonics') => {
        // Feature variable kept for future granular permissions if needed
        if (isPro) return true;
        // Starter plan blocked features
        return false;
    };

    const canTakeQuiz = isPro || (questionsAnsweredToday < DAILY_LIMIT);

    return (
        <SubscriptionContext.Provider value={{
            isPro,
            loading,
            questionsAnsweredToday,
            dailyLimit: DAILY_LIMIT,
            canTakeQuiz,
            incrementDailyCount,
            checkPermission
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}
