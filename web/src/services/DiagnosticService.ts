import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export interface DiagnosticRun {
    id: string;
    userId: string;
    examId: string;
    status: 'in_progress' | 'completed';
    startedAt: any;
    completedAt?: any;
    questionsShown: string[]; // List of Question IDs
    answers: {
        questionId: string;
        selectedOption: number;
        isCorrect: boolean;
        timestamp: any;
    }[];
    score?: number;
    summary?: any; // For any final breakdown data
}

export const DiagnosticService = {
    /**
     * Starts a new diagnostic run.
     */
    startDiagnostic: async (userId: string, examId: string, questions: string[]): Promise<string> => {
        try {
            // Create a ref for the new run
            const runsRef = collection(db, 'diagnostics', userId, 'runs');
            const newRunRef = doc(runsRef);

            const runData: DiagnosticRun = {
                id: newRunRef.id,
                userId,
                examId,
                status: 'in_progress',
                startedAt: serverTimestamp(),
                questionsShown: questions,
                answers: []
            };

            await setDoc(newRunRef, runData);
            console.log("Started Diagnostic Run:", newRunRef.id);
            return newRunRef.id;

        } catch (error) {
            console.error("Error starting diagnostic run:", error);
            throw error;
        }
    },

    /**
     * Saves a single answer to the current run.
     */
    saveProgress: async (userId: string, runId: string, answer: { questionId: string, selectedOption: number, isCorrect: boolean }) => {
        try {
            const runRef = doc(db, 'diagnostics', userId, 'runs', runId);

            // We need to append to the answers array.
            // Firestore arrayUnion is good, but let's just use it safely.
            // Note: Timestamp in arrayUnion might be tricky if we want serverTimestamp, so we use client date for array items usually,
            // or we read-modify-write if we need strict ordering?
            // arrayUnion puts it at the end usually if unique. 
            // Better to just update the doc with the new list if we had local state, 
            // but here we might not called with the full list.
            // Let's use getDoc -> update to be safe and simple for maintaining order.

            const snap = await getDoc(runRef);
            if (!snap.exists()) throw new Error("Run not found");

            const data = snap.data() as DiagnosticRun;
            const newAnswers = [...(data.answers || []), {
                ...answer,
                timestamp: new Date() // Client timestamp for the answer event itself
            }];

            await updateDoc(runRef, {
                answers: newAnswers,
                // update last active? 
                updatedAt: serverTimestamp()
            } as any);

        } catch (error) {
            console.error("Error saving progress:", error);
            // Non-blocking error? 
        }
    },

    /**
     * Marks the diagnostic as completed.
     */
    completeDiagnostic: async (userId: string, runId: string, finalScore: number, summary?: any) => {
        try {
            const runRef = doc(db, 'diagnostics', userId, 'runs', runId);
            await updateDoc(runRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                score: finalScore,
                summary: summary || {}
            });
            console.log("Completed Diagnostic Run:", runId);
        } catch (error) {
            console.error("Error completing diagnostic:", error);
        }
    },

    /**
     * Checks if there is an incomplete diagnostic run for this exam.
     */
    getLatestRun: async (userId: string, examId: string): Promise<DiagnosticRun | null> => {
        try {
            const runsRef = collection(db, 'diagnostics', userId, 'runs');
            const q = query(
                runsRef,
                where('examId', '==', examId),
                orderBy('startedAt', 'desc'),
                limit(1)
            );

            const snap = await getDocs(q);
            if (snap.empty) return null;

            return snap.docs[0].data() as DiagnosticRun;
        } catch (error) {
            console.error("Error getting latest run:", error);
            return null;
        }
    }
};
