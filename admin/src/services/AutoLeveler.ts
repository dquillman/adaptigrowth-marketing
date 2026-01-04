
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Service to handle Auto-Leveling of Exams.
 * Enforces:
 * - Total Questions: 200 (or as close as possible)
 * - Distributed evenly among domains
 * - Difficulty Split: 10% Easy, 45% Medium, 45% Hard
 */

export interface LevelingConfig {
    targetTotal: number;
    ratios: {
        Easy: number;
        Medium: number;
        Hard: number;
    };
}



interface LevelingReport {
    domain: string;
    difficulty: string;
    current: number;
    target: number;
    generated: number;
}

export const AutoLeveler = {

    /**
     * Analyzes the current exam and returns a report of what is missing.
     */
    /**
     * Analyzes the current exam and returns a report of what is missing.
     */
    analyze: async (examId: string, domains: string[], blueprint: any[] = [], config: LevelingConfig): Promise<LevelingReport[]> => {
        if (!domains.length) return [];

        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, where('examId', '==', examId));
        const snapshot = await getDocs(qQuery);

        const questions = snapshot.docs.map(d => d.data());

        const currentTotal = questions.length;
        // Global limit check: We can only add up to (Target - Current) questions.
        // If existing > target, we add 0.
        const globalRemaining = Math.max(0, config.targetTotal - currentTotal);

        // --- Step 1: Calculate Exact Domain Targets (Sum == config.targetTotal) ---

        let domainWeights = domains.map(d => {
            const bp = blueprint.find(b => b.domain === d);
            // Default to 1 if no weight provided (equal distribution logic handles normalization)
            return { domain: d, weight: bp && bp.weight ? Number(bp.weight) : 0 };
        });

        const totalWeight = domainWeights.reduce((sum, d) => sum + d.weight, 0);

        // Normalize weights (if all 0 or total != 100, make them even or proportional)
        let normalizedDomains;
        if (totalWeight === 0) {
            // Even split
            const even = 1 / domains.length;
            normalizedDomains = domainWeights.map(d => ({ ...d, nWeight: even }));
        } else {
            normalizedDomains = domainWeights.map(d => ({ ...d, nWeight: d.weight / totalWeight }));
        }

        // Apply Largest Remainder Method
        let currentDomainSum = 0;
        const domainTargets = normalizedDomains.map(d => {
            const exact = config.targetTotal * d.nWeight;
            const floor = Math.floor(exact);
            const remainder = exact - floor;
            currentDomainSum += floor;
            return { ...d, target: floor, remainder };
        });

        let domainLeftover = config.targetTotal - currentDomainSum;
        // Distribute 1 to domains with highest remainder until leftover is 0
        domainTargets.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < domainLeftover; i++) {
            domainTargets[i].target += 1;
        }

        // --- Step 2: Calculate Exact Difficulty Targets per Domain (Sum == DomainTarget) ---

        const report: LevelingReport[] = [];
        // Helper to get normalized difficulty weights
        const diffRatios = [
            { id: 'Easy', weight: config.ratios.Easy },
            { id: 'Medium', weight: config.ratios.Medium },
            { id: 'Hard', weight: config.ratios.Hard }
        ];
        const totalDiffWeight = diffRatios.reduce((s, d) => s + d.weight, 0); // Should be 1 (or 100)

        for (const dt of domainTargets) {
            const domainQuestions = questions.filter(q => q.domain === dt.domain);

            // Calculate Difficulty Targets using Largest Remainder Method
            let currentDiffSum = 0;
            const diffTargets = diffRatios.map(r => {
                const nWeight = totalDiffWeight > 0 ? (r.weight / totalDiffWeight) : (1 / 3);
                const exact = dt.target * nWeight;
                const floor = Math.floor(exact);
                const remainder = exact - floor;
                currentDiffSum += floor;
                return { ...r, target: floor, remainder };
            });

            let diffLeftover = dt.target - currentDiffSum;
            diffTargets.sort((a, b) => b.remainder - a.remainder);
            for (let i = 0; i < diffLeftover; i++) {
                diffTargets[i].target += 1;
            }

            // Push to report
            for (const diffT of diffTargets) {
                const count = domainQuestions.filter(q => q.difficulty === diffT.id).length;
                report.push({
                    domain: dt.domain,
                    difficulty: diffT.id,
                    current: count,
                    target: diffT.target,
                    generated: 0
                });
            }
        }

        // --- Step 3: Clamp Gaps to fits Global Remaining ---
        // We have exact ideal targets now. But if we already have *too many* questions in some buckets,
        // the sum of Gaps might exceed 'globalRemaining'.

        let rawGaps = report.map(b => ({ ...b, gap: Math.max(0, b.target - b.current) }));
        const totalRawGap = rawGaps.reduce((sum, b) => sum + b.gap, 0);

        if (totalRawGap > globalRemaining) {
            console.warn(`AutoLeveler: Ideal gaps (${totalRawGap}) exceed allowance (${globalRemaining}). Clamping.`);

            let allowed = 0;
            // Iterate gaps (sorted? or strict order? sorted by size makes sense to fill big holes first)
            // But preserving domain balance is better. Let's just fill sequentially for stability.
            // Or better: Reduce all gaps proportionally? No, integers.
            // Let's simple fill sequentially.

            for (const item of rawGaps) {
                if (item.gap > 0 && allowed < globalRemaining) {
                    const take = Math.min(item.gap, globalRemaining - allowed);
                    item.target = item.current + take;
                    allowed += take;
                } else {
                    item.target = item.current; // Caps it at current, so gap becomes 0
                }
            }
        } else {
            // We have space for all gaps. All good.
        }

        return rawGaps.map(g => ({
            domain: g.domain,
            difficulty: g.difficulty,
            current: g.current,
            target: g.target,
            generated: 0
        }));
    },

    /**
     * Executes the leveling process.
     * Uses 'generateQuestions' (Single Topic) cloud function in a loop to fill specific gaps.
     * We avoid 'batchGenerateQuestions' because we need granular control per Domain + Difficulty.
     */
    execute: async (examId: string, domains: string[], blueprint: any[], config: LevelingConfig, onProgress?: (status: string) => void): Promise<LevelingReport[]> => {
        const report = await AutoLeveler.analyze(examId, domains, blueprint, config);
        const gaps = report.filter(r => r.current < r.target);

        if (gaps.length === 0) return report;

        const functions = getFunctions();
        const generateFn = httpsCallable(functions, 'generateQuestions'); // Use single topic generator for precision

        for (const gap of gaps) {
            let needed = gap.target - gap.current;

            while (needed > 0) {
                const cappedNeeded = Math.min(needed, 5); // Cap at 5 per request to avoid timeout/rate-limits

                if (onProgress) {
                    onProgress(`Generating ${['Easy', 'Medium', 'Hard'].find(d => d === gap.difficulty)} questions for domain: ${gap.domain} (Missing: ${needed})...`);
                }

                try {
                    // Fetch existing stems for this domain to avoid duplicates
                    const existingQuery = query(
                        collection(db, 'questions'),
                        where('examId', '==', examId),
                        where('domain', '==', gap.domain)
                    );
                    const existingDocs = await getDocs(existingQuery);
                    const existingStems = existingDocs.docs.map(d => d.data().stem);

                    const result: any = await generateFn({
                        topic: gap.domain,
                        count: cappedNeeded,
                        difficulty: gap.difficulty,
                        existingStems: existingStems
                    });

                    const newQuestionsData = result.data as any[];

                    if (newQuestionsData && newQuestionsData.length > 0) {
                        // Add to Firestore
                        const batchPromises = newQuestionsData.map((q: any) => addDoc(collection(db, 'questions'), {
                            examId,
                            stem: q.stem,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            domain: gap.domain,
                            difficulty: gap.difficulty,
                            source: "AI-AutoLeveler",
                            createdAt: new Date()
                        }));

                        await Promise.all(batchPromises);

                        // Update report
                        gap.generated += newQuestionsData.length;
                        needed -= newQuestionsData.length;

                        // Update Exam Count
                        const examRef = doc(db, 'exams', examId);
                        await updateDoc(examRef, {
                            questionCount: increment(newQuestionsData.length)
                        });
                    } else {
                        // AI didn't return anything (maybe duplicated everything?). Break to avoid infinite loop.
                        console.warn(`AI returned 0 questions for ${gap.domain}. Stopping this gap.`);
                        break;
                    }

                } catch (error) {
                    console.error(`Failed to generate for ${gap.domain} [${gap.difficulty}]`, error);
                    // Break loop on error for this gap, proceed to next gap
                    break;
                }
            }
        }

        return report;
    }
};
