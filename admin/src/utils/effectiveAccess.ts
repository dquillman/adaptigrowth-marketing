
export interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    creationTime: string;
    lastSignInTime: string;
    plan?: string;  // "starter" | "pro"
    isPro?: boolean;
    testerOverride?: boolean;
    testerExpiresAt?: { _seconds: number, _nanoseconds: number };
    trial?: boolean | {
        status: "active" | "expired" | "converted";
        endDate: { _seconds: number, _nanoseconds: number };
    };
    trialEndsAt?: { _seconds: number, _nanoseconds: number };
}

export type AccessType = 'tester' | 'trial' | 'pro' | 'tester_invalid' | 'expired_trial' | 'none';

export interface AccessStatus {
    type: AccessType;
    label: string;
    subtext?: string;
    badgeColor: string; // Tailwind class partial
}

export function getEffectiveAccess(user: UserData): AccessStatus {
    const now = new Date();

    // 1. Tester (Highest Priority)
    if (user.testerOverride) {
        if (user.testerExpiresAt) {
            const expiresAt = new Date(user.testerExpiresAt._seconds * 1000);
            if (expiresAt > now) {
                return {
                    type: 'tester',
                    label: 'Active (Tester)',
                    subtext: `Ends ${expiresAt.toLocaleDateString()}`,
                    badgeColor: 'purple'
                };
            }
            return {
                type: 'tester_invalid',
                label: 'Tester (Invalid)',
                badgeColor: 'slate'
            };
        }
        return {
            type: 'tester_invalid',
            label: 'Tester (Invalid)',
            badgeColor: 'slate'
        };
    }

    // 2. Authoritative Trial Definition
    // Rule: user.trial === true AND user.trialEndsAt > now
    if (user.trial === true && user.trialEndsAt) {
        // Handle serialization from callable function (usually {_seconds, _nanoseconds})
        // Safe check for seconds presence
        const seconds = user.trialEndsAt._seconds;
        if (typeof seconds === 'number') {
            const expiresAt = new Date(seconds * 1000);
            if (expiresAt > now) {
                return {
                    type: 'trial',
                    label: 'Active (Trial)',
                    subtext: `Ends ${expiresAt.toLocaleDateString()}`,
                    badgeColor: 'yellow'
                };
            } else {
                return {
                    type: 'expired_trial',
                    label: 'Expired',
                    badgeColor: 'red'
                };
            }
        }
    }

    // Legacy Trial Object Fallback (Migration support)
    if (typeof user.trial === 'object' && user.trial && 'endDate' in user.trial) {
        const legacyTrial = user.trial as { endDate: { _seconds: number, _nanoseconds: number } };
        const expiresAt = new Date(legacyTrial.endDate._seconds * 1000);
        if (expiresAt > now) {
            return {
                type: 'trial',
                label: 'Active (Trial)',
                subtext: `Ends ${expiresAt.toLocaleDateString()}`,
                badgeColor: 'yellow'
            };
        }
    }

    // 3. Paid Pro
    if (user.plan === 'pro' || (user.isPro && !user.trial)) {
        return {
            type: 'pro',
            label: 'Paid / Pro',
            badgeColor: 'emerald'
        };
    }

    // 4. Default
    return {
        type: 'none',
        label: 'Starter', // Changed from "-" to "Starter" for clarity
        badgeColor: 'slate'
    };
}
