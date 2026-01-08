import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { getExamDomains } from './ExamMetadata';

export interface DomainReadiness {
    domain: string;
    score: number; // 0-100
    totalQuestions: number;
    status: 'Weak' | 'Moderate' | 'Strong' | 'Insufficient';
}

export interface ReadinessReport {
    overallScore: number; // 0-100
    trend: 'improving' | 'declining' | 'stable';
    domainBreakdown: DomainReadiness[];
    totalQuestionsAnswered: number;
    mockExamsTaken: number;
    examId: string;
}

export const PredictionEngine = {
    /**
     * Calculates the user's readiness score for a specific exam.
     * Uses a weighted algorithm:
     * - 60% Overall Accuracy
     * - 30% Recent Performance (Last 5 attempts)
     * - 10% Consistency (Variance) - Simplified for now to just be part of recent trend
     */
    calculateReadiness: async (userId: string, examId: string): Promise<ReadinessReport> => {
        try {
            const attemptsRef = collection(db, 'quizAttempts');
            const q = query(
                attemptsRef,
                where('userId', '==', userId),
                where('examId', '==', examId),
                orderBy('timestamp', 'desc'),
                limit(50) // Analyze last 50 attempts
            );

            const snapshot = await getDocs(q);
            const attempts = snapshot.docs.map(d => d.data());

            if (attempts.length === 0) {
                return {
                    overallScore: 0,
                    trend: 'stable',
                    domainBreakdown: [],
                    totalQuestionsAnswered: 0,
                    mockExamsTaken: 0,
                    examId
                };
            }

            // --- 1. Overall Stats ---
            let totalCorrect = 0;
            let totalQuestions = 0;
            let mockCount = 0;

            // Domain Aggregation
            const domainStats: Record<string, { correct: number; total: number }> = {};

            // Initialize with all expected domains for this exam
            const expectedDomains = getExamDomains(examId);
            expectedDomains.forEach(d => {
                domainStats[d.name] = { correct: 0, total: 0 };
            });

            attempts.forEach(attempt => {
                totalCorrect += attempt.score;
                totalQuestions += attempt.totalQuestions;

                if (attempt.mode === 'simulation') mockCount++;

                // Process Details if available
                if (attempt.details && Array.isArray(attempt.details)) {
                    attempt.details.forEach((d: { domain: string; isCorrect: boolean }) => {
                        if (!d.domain) return;
                        if (!domainStats[d.domain]) domainStats[d.domain] = { correct: 0, total: 0 };
                        domainStats[d.domain].total++;
                        if (d.isCorrect) domainStats[d.domain].correct++;
                    });
                } else if (attempt.domain && attempt.domain !== 'Mixed') {
                    // Fallback for attempts without details but with specific domain
                    const d = attempt.domain;
                    if (!domainStats[d]) domainStats[d] = { correct: 0, total: 0 };
                    domainStats[d].total += attempt.totalQuestions;
                    domainStats[d].correct += attempt.score;
                }
            });

            const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

            // --- 2. Recent Trend (Last 5) ---
            const recentAttempts = attempts.slice(0, 5);
            let recentCorrect = 0;
            let recentTotal = 0;
            recentAttempts.forEach(a => {
                recentCorrect += a.score;
                recentTotal += a.totalQuestions;
            });
            const recentAccuracy = recentTotal > 0 ? (recentCorrect / recentTotal) * 100 : 0;

            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (recentAccuracy > overallAccuracy + 5) trend = 'improving';
            if (recentAccuracy < overallAccuracy - 5) trend = 'declining';

            // --- 3. Weighted Score ---
            // 70% Overall, 30% Recent to reward improvement
            const weightedScore = Math.round((overallAccuracy * 0.7) + (recentAccuracy * 0.3));

            // --- 4. Domain Breakdown ---
            const breakdown: DomainReadiness[] = Object.entries(domainStats).map(([domain, stats]) => {
                const s = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                let status: 'Weak' | 'Moderate' | 'Strong' | 'Insufficient' = 'Insufficient';

                if (stats.total >= 10) {
                    if (s >= 75) status = 'Strong';
                    else if (s < 60) status = 'Weak';
                    else status = 'Moderate';
                }

                return {
                    domain,
                    score: Math.round(s),
                    totalQuestions: stats.total,
                    status
                };
            }).sort((a, b) => {
                // Sort Priority: Weak (0) -> Insufficient (1) -> Moderate (2) -> Strong (3)
                const priority = { 'Weak': 0, 'Insufficient': 1, 'Moderate': 2, 'Strong': 3 };
                return priority[a.status] - priority[b.status];
            }); // Sort by status priority

            return {
                overallScore: weightedScore,
                trend,
                domainBreakdown: breakdown,
                totalQuestionsAnswered: totalQuestions,
                mockExamsTaken: mockCount,
                examId
            };

        } catch (error) {
            console.error("Prediction Engine Error:", error);
            throw error;
        }
    }
};
