import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';



interface MasteryData {
    [domain: string]: {
        correct: number;
        total: number;
    };
}

export const SmartQuizService = {
    /**
     * Identifies domains where the user has < 60% mastery.
     */
    getWeakDomains: (masteryData: MasteryData): string[] => {
        const weakDomains: string[] = [];
        for (const [domain, stats] of Object.entries(masteryData)) {
            if (stats.total > 0) {
                const percentage = (stats.correct / stats.total) * 100;
                if (percentage < 60) {
                    weakDomains.push(domain);
                }
            }
        }
        return weakDomains;
    },

    /**
     * Generates a "Smart Quiz" focusing on weak areas and spaced repetition.
     * Returns a list of Question IDs.
     */
    generateSmartQuiz: async (userId: string, examId: string, masteryData: MasteryData, maxQuestions: number = 10): Promise<string[]> => {
        console.log("Generating Smart Quiz for", userId, "with limit", maxQuestions);
        const weakDomains = SmartQuizService.getWeakDomains(masteryData);
        let targetDomains = weakDomains;

        // If no weak domains, pick 2 random domains to focus on
        if (targetDomains.length === 0) {
            const allDomains = Object.keys(masteryData);
            if (allDomains.length > 0) {
                targetDomains = allDomains.sort(() => 0.5 - Math.random()).slice(0, 2);
            } else {
                // Fallback if valid mastery data is missing
                targetDomains = ['People', 'Process'];
            }
        }

        console.log("Targeting domains:", targetDomains);

        // Calculate questions per domain (distribute maxQuestions evenly)
        const questionsPerDomain = Math.ceil(maxQuestions / targetDomains.length);

        // Fetch questions from these domains
        const questionIds: string[] = [];

        // We'll try to get questions from each target domain
        for (const domain of targetDomains) {
            // Stop if we have enough questions
            if (questionIds.length >= maxQuestions) break;

            try {
                // Fetch a batch to shuffle
                const batchSize = questionsPerDomain * 3; // Fetch 3x needed to allow for some randomness
                const q = query(
                    collection(db, 'questions'),
                    where('examId', '==', examId),
                    where('domain', '==', domain),
                    limit(batchSize)
                );

                const snap = await getDocs(q);
                const docs = snap.docs.map(d => d.id);

                // Shuffle and pick needed amount (adjust for remaining needed)
                const remainingNeeded = maxQuestions - questionIds.length;
                const toTake = Math.min(questionsPerDomain, remainingNeeded);

                const shuffled = docs.sort(() => 0.5 - Math.random()).slice(0, toTake);
                questionIds.push(...shuffled);
            } catch (err) {
                console.error(`Error fetching for domain ${domain}:`, err);
            }
        }

        // Final shuffle
        return questionIds.sort(() => 0.5 - Math.random());
    },

    /**
     * Generates a full 50-question simulation exam.
     * Fetches a broad set of questions and randomly selects 50.
     */
    generateSimulationExam: async (examId: string, size: number = 50): Promise<string[]> => {
        console.log("Generatign Simulation Exam for", examId);
        try {
            // 1. Fetch a large batch of question IDs (e.g. up to 150) to ensure randomness
            // Note: In production with thousands of questions, this needs a better random index strategy.
            const q = query(
                collection(db, 'questions'),
                where('examId', '==', examId),
                limit(200)
            );

            const snap = await getDocs(q);
            const allIds = snap.docs.map(doc => doc.id);

            // 2. Shuffle and slice
            const shuffled = allIds.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, size);

        } catch (error) {
            console.error("Error generating simulation:", error);
            return [];
        }
    }
}

