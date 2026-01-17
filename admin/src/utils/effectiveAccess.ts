
interface UserData {
    plan?: string;  // "starter" | "pro"
    isPro?: boolean;
    testerOverride?: boolean;
    testerExpiresAt?: { _seconds: number, _nanoseconds: number };
    trial?: {
        status: "active" | "expired" | "converted";
        endDate: { _seconds: number, _nanoseconds: number };
    };
}

export type AccessType = 'tester' | 'trial' | 'pro' | 'tester_invalid' | 'expired_trial' | 'none';

export interface AccessStatus {
    type: AccessType;
    label: string;
    subtext?: string;
    badgeColor: string; // Tailwind class partial, e.g. "purple" for bg-purple-500
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
            } else {
                return {
                    type: 'tester_invalid', // Expired = Invalid
                    label: 'Tester (Invalid)',
                    badgeColor: 'slate' // or red, per requirement "Tester (Invalid) badge"
                };
            }
        } else {
            // Edge case: Tester Override true but no expiry
            return {
                type: 'tester_invalid',
                label: 'Tester (Invalid)',
                badgeColor: 'slate' // Keep distinct but visible
            };
        }
    }

    // 2. Trial
    if (user.trial?.status === 'active' && user.trial.endDate) {
        const expiresAt = new Date(user.trial.endDate._seconds * 1000);
        if (expiresAt > now) {
            return {
                type: 'trial',
                label: 'Active (Trial)',
                subtext: `Ends ${expiresAt.toLocaleDateString()}`,
                badgeColor: 'yellow'
            };
        }
    }

    // 3. Paid Pro relative to Plan
    if (user.plan === 'pro' || (user.isPro && !user.testerOverride && !user.trial)) {
        // Fallback: If isPro is true but not tester/trial, assume paid.
        // We explicitly check !testerOverride to avoid double counting if logic failed elsewhere.
        return {
            type: 'pro',
            label: 'Paid / Pro',
            badgeColor: 'emerald'
        };
    }

    // 4. Expired Trial (Visual feedback)
    if (user.trial?.status === 'expired') {
        return {
            type: 'expired_trial',
            label: 'Expired',
            badgeColor: 'red'
        };
    }

    // 5. Default
    return {
        type: 'none',
        label: '-',
        badgeColor: 'slate'
    };
}
