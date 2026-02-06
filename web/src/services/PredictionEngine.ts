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
    overallScore: number | null; // 0-100, or null when preliminary
    trend: 'improving' | 'declining' | 'stable';
    domainBreakdown: DomainReadiness[];
    totalQuestionsAnswered: number;
    mockExamsTaken: number;
    examId: string;
    isPreliminary: boolean;
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
            // Query from quizRuns/{userId}/runs - the actual data source
            const runsRef = collection(db, 'quizRuns', userId, 'runs');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let runs: any[] = [];

            try {
                // Try with composite query first (if index exists)
                const q = query(
                    runsRef,
                    where('examId', '==', examId),
                    where('status', '==', 'completed'),
                    orderBy('completedAt', 'desc'),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                runs = snapshot.docs.map(d => d.data());
            } catch {
                // Fallback: query only by status, filter client-side
                console.warn("PredictionEngine: Composite index not available, using fallback query");
                const fallbackQ = query(
                    runsRef,
                    where('status', '==', 'completed'),
                    limit(100)
                );
                const snapshot = await getDocs(fallbackQ);
                runs = snapshot.docs
                    .map(d => d.data())
                    .filter(r => r.examId === examId)
                    .sort((a, b) => {
                        const aTime = (a.completedAt as any)?.seconds || 0;
                        const bTime = (b.completedAt as any)?.seconds || 0;
                        return bTime - aTime;
                    })
                    .slice(0, 50);
            }

            if (runs.length === 0) {
                return {
                    overallScore: null,
                    trend: 'stable',
                    domainBreakdown: [],
                    totalQuestionsAnswered: 0,
                    mockExamsTaken: 0,
                    examId,
                    isPreliminary: true
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

            runs.forEach(run => {
                // Skip diagnostics
                if (run.mode === 'diagnostic' || run.quizType === 'diagnostic') return;

                const answers = run.answers || [];
                const total = answers.length;
                const correct = answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;

                // Skip runs with no valid question data
                if (total === 0) return;

                totalCorrect += correct;
                totalQuestions += total;

                if (run.mode === 'simulation' || run.quizType === 'simulation') mockCount++;

                // Process per-answer domain data if available
                answers.forEach((answer: { questionId?: string; domain?: string; isCorrect: boolean }) => {
                    // Domain might be stored on the answer or in results
                    const domain = answer.domain;
                    if (!domain) return;

                    if (!domainStats[domain]) domainStats[domain] = { correct: 0, total: 0 };
                    domainStats[domain].total++;
                    if (answer.isCorrect) domainStats[domain].correct++;
                });
            });

            const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

            // --- 2. Recent Trend (Last 5) ---
            const recentRuns = runs.slice(0, 5).filter(
                (r: { mode?: string; quizType?: string }) => r.mode !== 'diagnostic' && r.quizType !== 'diagnostic'
            );
            let recentCorrect = 0;
            let recentTotal = 0;
            recentRuns.forEach((r: { answers?: { isCorrect: boolean }[] }) => {
                const answers = r.answers || [];
                const correct = answers.filter(a => a.isCorrect).length;
                recentCorrect += correct;
                recentTotal += answers.length;
            });
            const recentAccuracy = recentTotal > 0 ? (recentCorrect / recentTotal) * 100 : 0;

            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (recentAccuracy > overallAccuracy + 5) trend = 'improving';
            if (recentAccuracy < overallAccuracy - 5) trend = 'declining';

            // --- 3. Weighted Score ---
            // 70% Overall, 30% Recent to reward improvement
            const weightedScore = Math.round((overallAccuracy * 0.7) + (recentAccuracy * 0.3));

            // --- 4. Volume Penalty (Confidence Adjustment) ---
            // If < 50 questions, apply a linear penalty to avoid overconfidence from small samples.
            // e.g. 10 questions = (50 - 10) * 0.5 = 20 points penalty.
            let confidencePenalty = 0;
            if (totalQuestions < 50) {
                confidencePenalty = (50 - totalQuestions) * 0.5;
            }

            const adjustedScore = Math.max(0, Math.round(weightedScore - confidencePenalty));

            // --- 5. Domain Breakdown ---
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
            });

            const isPreliminary = totalQuestions < 50;

            return {
                overallScore: isPreliminary ? null : adjustedScore,
                trend,
                domainBreakdown: breakdown,
                totalQuestionsAnswered: totalQuestions,
                mockExamsTaken: mockCount,
                examId,
                isPreliminary
            };

        } catch (error) {
            console.error("Prediction Engine Error:", error);
            throw error;
        }
    }
};
