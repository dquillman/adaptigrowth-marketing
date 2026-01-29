import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export interface QuizRunSnapshot {
    currentQuestionIndex: number;
    questionIds: string[]; // Store order of question IDs
}

export interface QuizRun {
    id: string;
    userId: string;
    examId: string;
    quizType: 'diagnostic' | 'daily' | 'practice' | 'trap' | 'simulation' | 'smart' | 'weakest' | 'eval';
    type?: string; // Legacy field - DEPRECATED
    mode: string; // "smart", "trap", "diagnostic", "standard", etc. (from location.state)
    status: 'in_progress' | 'completed' | 'abandoned';

    // For Resuming
    snapshot: QuizRunSnapshot;

    // Progress
    answers: {
        questionId: string;
        selectedOption: number;
        isCorrect: boolean;
        timestamp: any;
    }[];

    createdAt: any;
    updatedAt: any;
    completedAt?: any;
    results?: any;

    // Metadata for UI
    meta?: {
        filterDomain?: string; // For "weakest" or domain filtered modes
        patternId?: string;    // For "trap" mode
        patternName?: string;  // For "trap" mode
    };
}

export const QuizRunService = {
    /**
     * Creates a new Quiz Run document.
     */
    createRun: async (
        userId: string,
        examId: string,
        quizType: QuizRun['quizType'],
        mode: string,
        questionIds: string[],
        meta?: QuizRun['meta']
    ): Promise<string> => {
        try {
            const runsRef = collection(db, 'quizRuns', userId, 'runs');
            const newRunRef = doc(runsRef);

            const runData: QuizRun = {
                id: newRunRef.id,
                userId,
                examId,
                quizType,
                // type: quizType, // LEGACY: We explicitly STOP writing 'type' to catch schema drift
                mode,
                status: 'in_progress',
                snapshot: {
                    currentQuestionIndex: 0,
                    questionIds
                },
                answers: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                meta: meta || {}
            };

            await setDoc(newRunRef, runData);
            console.log("Created Unified Quiz Run:", newRunRef.id);
            return newRunRef.id;

        } catch (error) {
            console.error("Error creating quiz run:", error);
            throw error;
        }
    },

    /**
     * Saves progress: Appends answer AND updates snapshot state.
     */
    saveProgress: async (
        userId: string,
        runId: string,
        answer: { questionId: string, selectedOption: number, isCorrect: boolean },
        nextIndex: number
    ) => {
        try {
            const runRef = doc(db, 'quizRuns', userId, 'runs', runId);

            // We use a transaction or just simple update. Simple update is fine for this MVP.
            // We need to read current answers to append? Or arrayUnion.
            // ArrayUnion is safer for concurrency but order matches insertion usually.
            // However, we also need to update 'snapshot.currentQuestionIndex'.

            // To ensure array integrity, let's just getDoc -> update. 
            // In a low-concurrency single-user scenario this is perfectly safe.

            const snap = await getDoc(runRef);
            if (!snap.exists()) return; // Run deleted?

            const data = snap.data() as QuizRun;

            const newAnswer = {
                ...answer,
                timestamp: new Date()
            };

            // DEDUPLICATION: Check if we already have an answer for this question
            const existingIndex = (data.answers || []).findIndex(a => a.questionId === newAnswer.questionId);

            let updatedAnswers;
            if (existingIndex !== -1) {
                // Replace existing answer
                updatedAnswers = [...(data.answers || [])];
                updatedAnswers[existingIndex] = newAnswer;
            } else {
                // Append new answer
                updatedAnswers = [...(data.answers || []), newAnswer];
            }

            await updateDoc(runRef, {
                answers: updatedAnswers,
                'snapshot.currentQuestionIndex': nextIndex,
                updatedAt: serverTimestamp()
            } as any);

        } catch (error) {
            console.error("Error saving quiz progress:", error);
        }
    },

    /**
     * Completes the run.
     */
    completeRun: async (userId: string, runId: string, results: any) => {
        try {
            const runRef = doc(db, 'quizRuns', userId, 'runs', runId);
            await updateDoc(runRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                results,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error completing quiz run:", error);
        }
    },

    /**
     * Gets the latest IN_PROGRESS run for the user.
     * Optionally filtered by Exam.
     */
    getLatestActiveRun: async (userId: string, _examId?: string): Promise<QuizRun | null> => {
        try {
            const runsRef = collection(db, 'quizRuns', userId, 'runs');
            const constraints = [
                where('status', '==', 'in_progress'),
                orderBy('updatedAt', 'desc'),
                limit(1)
            ];

            // If examId provided, we add it. 
            // Note: This requires Composite Index (status ASC, examId ASC, updatedAt DESC).
            // Without index, this query will fail.
            // Safe fallback: Query all active runs, filter in memory (rarely > 1 active run anyway).

            // GLOBAL RESUME CONTEXT: Return latest run regardless of Exam ID
            // This ensures a user sees their active session even if they switched exam contexts.
            // if (examId) {
            //    constraints.unshift(where('examId', '==', examId));
            // }

            // TRY/CATCH specifically for index errors
            try {
                // @ts-ignore
                const q = query(runsRef, ...constraints);
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    return snapshot.docs[0].data() as QuizRun;
                }
            } catch (queryError: any) {
                if (queryError.code === 'failed-precondition') {
                    console.warn("Missing Index for QuizRun query. Falling back to client-side filter.");
                    // Fallback: Query ONLY status=in_progress and sort/filter client side
                    const fallbackQ = query(runsRef, where('status', '==', 'in_progress'), orderBy('updatedAt', 'desc'), limit(5));
                    const snap = await getDocs(fallbackQ);

                    // Return first match regardless of examId
                    if (!snap.empty) {
                        return snap.docs[0].data() as QuizRun;
                    }
                }
                throw queryError;
            }

            return null;
        } catch (error) {
            console.error("Error fetching latest run:", error);
            return null;
        }
    },

    /**
     * Get a specific run by ID (for resuming via direct link/startup).
     */
    getRunById: async (userId: string, runId: string): Promise<QuizRun | null> => {
        try {
            const docRef = doc(db, 'quizRuns', userId, 'runs', runId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as QuizRun;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
};

