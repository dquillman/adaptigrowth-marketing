import { Timestamp, type DocumentData } from 'firebase/firestore';

export type UserPlan = 'free' | 'trial' | 'pro';
export type AccessLevel = 'free' | 'pro';

export interface UserEntitlement {
    isFree: boolean;
    isTrialActive: boolean;
    isTrialExpired: boolean;
    isPro: boolean;
    daysRemaining: number;
    hoursRemaining: number;

    // Internal data for context consistency/updates
    plan: UserPlan;
    accessLevel: AccessLevel;
    trialConsumed: boolean;
    trialEndsAt: Date | null;
}

/**
 * Calculates the user's current entitlement state based on their Firestore document.
 * This is the SINGLE SOURCE OF TRUTH for access control.
 */
export function getUserEntitlement(userData: DocumentData | undefined): UserEntitlement {
    // Default safe state (Free)
    const defaultState: UserEntitlement = {
        isFree: true,
        isTrialActive: false,
        isTrialExpired: false,
        isPro: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        plan: 'free',
        accessLevel: 'free',
        trialConsumed: false,
        trialEndsAt: null
    };

    if (!userData) {
        return defaultState;
    }

    const now = new Date();
    const plan = (userData.plan as UserPlan) || 'free';
    const trialConsumed = userData.trialConsumed || false;

    // Handle explicit legacy "isPro" override if present (migration safety)
    if (userData.isPro === true) {
        return {
            ...defaultState,
            isFree: false,
            isPro: true,
            plan: 'pro',
            accessLevel: 'pro',
            trialConsumed: true // Assume consumed if they bought it
        };
    }

    // Pro Plan (Paid)
    if (plan === 'pro') {
        return {
            ...defaultState,
            isFree: false,
            isPro: true,
            plan: 'pro',
            accessLevel: 'pro',
            trialConsumed: true
        };
    }

    // Trial Plan
    if (plan === 'trial') {
        const trialEndsAt = userData.trialEndsAt instanceof Timestamp
            ? userData.trialEndsAt.toDate()
            : null;

        if (trialEndsAt) {
            const diffMs = trialEndsAt.getTime() - now.getTime();
            const isExpired = diffMs <= 0;

            if (isExpired) {
                // Expired: Technically 'free' access, but we flag isTrialExpired for UI.
                return {
                    ...defaultState,
                    isFree: true, // Access is free
                    isTrialActive: false,
                    isTrialExpired: true,
                    isPro: false,
                    plan: 'trial', // DB still says trial until update
                    accessLevel: 'free',
                    trialConsumed: true,
                    trialEndsAt
                };
            } else {
                // Active Trial
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                return {
                    isFree: false,
                    isTrialActive: true,
                    isTrialExpired: false,
                    isPro: true,
                    daysRemaining: days,
                    hoursRemaining: hours,
                    plan: 'trial',
                    accessLevel: 'pro',
                    trialConsumed: true,
                    trialEndsAt
                };
            }
        }
    }

    // Default: Free
    return {
        ...defaultState,
        plan: 'free',
        accessLevel: 'free',
        trialConsumed: trialConsumed,
        isTrialExpired: trialConsumed // If consumed and not pro/active, it's effectively expired/used
    };
}
