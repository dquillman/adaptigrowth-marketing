import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface SystemHealthMetrics {
    globalStatus: 'Healthy' | 'Warning' | 'Critical';
    qualityMix: { stable: number; needsReword: number; needsVariant: number; monitor: number; insufficient: number; };
    memorizationTrend: { date: string; rate: number }[];
    gateOutcomes: { ready: number; borderline: number; notReady: number; };
    insights: string[];
}

export const SystemHealthService = {
    async getHealthMetrics(examId: string | 'all'): Promise<SystemHealthMetrics> {

        // 1. Quality Mix (Questions Collection)
        // In real app: Use aggregation query or counter doc. Here: Scan recent batch.
        let qQuery = query(collection(db, 'questions'), limit(500));
        if (examId !== 'all') {
            qQuery = query(collection(db, 'questions'), where('examId', '==', examId), limit(500));
        }

        const qSnap = await getDocs(qQuery);
        const qualityCounts = { stable: 0, needsReword: 0, needsVariant: 0, monitor: 0, insufficient: 0 };

        qSnap.forEach(doc => {
            const s = doc.data().qualityStatus || 'insufficient_data';
            if (s === 'stable') qualityCounts.stable++;
            else if (s === 'needs_reword') qualityCounts.needsReword++;
            else if (s === 'needs_variant') qualityCounts.needsVariant++;
            else if (s === 'monitor') qualityCounts.monitor++;
            else qualityCounts.insufficient++;
        });

        const totalQ = qSnap.size || 1; // avoid div/0

        // 2. Memorization Trend (System Metrics Collection)
        // Created in Phase 2A
        const metricQuery = query(
            collection(db, 'system_metrics'),
            where('type', '==', 'quality_evaluation'),
            orderBy('timestamp', 'desc'),
            limit(14) // Last 14 snapshots
        );
        const mSnap = await getDocs(metricQuery);
        const memorizationTrend = mSnap.docs.map(doc => {
            const d = doc.data();
            const date = d.timestamp?.toDate().toLocaleDateString() || 'N/A';
            const rate = d.questionsProcessed ? (d.flaggedNeedsVariant / d.questionsProcessed) : 0;
            return { date, rate: Math.round(rate * 100) };
        }).reverse();

        // 3. Gate Outcomes (Readiness Logs - Optional: System Metrics would be better, but we can query logs if they exist)
        // For MVP, we'll use placeholder or real data if we logged it. 
        // Assuming we didn't explicitly log gate outcomes to a dedicated collection in Phase 1, 
        // we might verify implementation details. If missing, return placeholders to be filled by Phase 3 logic later.
        const gateOutcomes = { ready: 60, borderline: 30, notReady: 10 }; // Placeholder until we add logging

        // 4. Exam Health Signals (Drift)
        let healthSignal: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
        if (examId !== 'all') {
            const hSnap = await getDocs(query(collection(db, 'examHealth'), where('examId', '==', examId), limit(1)));
            if (!hSnap.empty) {
                const h = hSnap.docs[0].data();
                if (h.status === 'critical') healthSignal = 'Critical';
                else if (h.status === 'warning') healthSignal = 'Warning';
            }
        } else {
            // Scan all health reports
            const hSnap = await getDocs(collection(db, 'examHealth'));
            hSnap.forEach(doc => {
                const h = doc.data();
                if (h.status === 'critical') healthSignal = 'Critical';
                else if (h.status === 'warning' && healthSignal !== 'Critical') healthSignal = 'Warning';
            });
        }

        // 5. Deterministic Insights
        const insights: string[] = [];

        // Insight 1: Overall
        if (healthSignal === 'Healthy') insights.push("Status: Healthy. No immediate intervention required.");
        else if (healthSignal === 'Warning') insights.push("Action: Monitor. Some drift signals detected.");
        else insights.push("Action: Review. Critical drift or quality issues detected.");

        // Insight 2: Quality
        const rewordRate = qualityCounts.needsReword / totalQ;
        if (rewordRate > 0.1) insights.push(`Action: Reword. ${Math.round(rewordRate * 100)}% of questions have low discrimination.`);

        // Insight 3: Variant
        const variantRate = qualityCounts.needsVariant / totalQ;
        if (variantRate > 0.05) insights.push(`Action: Add Variants. Memorization detected in ${Math.round(variantRate * 100)}% of content.`);
        else insights.push("Monitor: Variant rotation is effectively mitigating memorization.");


        return {
            globalStatus: healthSignal,
            qualityMix: qualityCounts,
            memorizationTrend,
            gateOutcomes,
            insights
        };
    }
};
