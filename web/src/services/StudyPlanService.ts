import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { StudyPlan, DailyTask } from '../types/StudyPlan';
import { getExamDomains } from './ExamMetadata';

export const StudyPlanService = {
    /**
     * Generates a study schedule based on exam date and weekly hours.
     * If an anchorDomain is provided (from diagnostic), the plan prioritizes
     * that domain for the first several days before mixing in others.
     */
    generatePlan: (
        userId: string,
        examId: string,
        examDate: Date,
        weeklyHours: number,
        examName?: string,
        domainNames?: string[],
        anchorDomain?: string  // New: From diagnostic's lowest domain
    ): StudyPlan => {
        const startDate = new Date();
        const daysUntilExam = Math.ceil((examDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const tasks: DailyTask[] = [];
        const currentDate = new Date(startDate);

        // Define domains dynamically if provided, or fallback to known definitions
        const domains = getExamDomains(examId, examName, domainNames);

        // Diagnostic Anchor Rule: If we have a recommended domain, prioritize it for first 5 days
        const ANCHOR_DAYS = 5; // First 5 days focus on anchor domain
        const hasAnchor = anchorDomain && domains.some(d => d.name === anchorDomain);

        // Simple deterministic generator
        for (let i = 0; i < daysUntilExam; i++) {
            // Skip if it's past the exam date
            if (currentDate >= examDate) break;

            // Check if it's a Saturday (6)
            if (currentDate.getDay() === 6) {
                tasks.push({
                    id: `task-${i}-mock`,
                    date: new Date(currentDate),
                    domain: 'Mixed' as any,
                    topic: `Full Mock Exam`,
                    activityType: 'mock-exam',
                    completed: false,
                    durationMinutes: 240 // 4 hours
                });

                // Advance to next day BEFORE skipping
                currentDate.setDate(currentDate.getDate() + 1);
                continue; // Skip standard generation for this day
            }

            // ANCHOR RULE: During anchor period, force the diagnostic's lowest domain
            // After anchor period, resume normal weighted random selection
            const isInAnchorPeriod = hasAnchor && i < ANCHOR_DAYS;

            let selectedDomain = domains[0];

            if (isInAnchorPeriod) {
                // Force anchor domain for first 5 days
                selectedDomain = domains.find(d => d.name === anchorDomain) || domains[0];
            } else {
                // Normal weighted random selection after anchor period
                const rand = Math.random();
                let cumulativeWeight = 0;
                for (const domain of domains) {
                    cumulativeWeight += domain.weight;
                    if (rand <= cumulativeWeight) {
                        selectedDomain = domain;
                        break;
                    }
                }
            }

            const topic = selectedDomain.topics[Math.floor(Math.random() * selectedDomain.topics.length)];

            // Create a Reading Task
            tasks.push({
                id: `task-${i}-read`,
                date: new Date(currentDate),
                domain: selectedDomain.name as any,
                topic: `Review: ${topic}`,
                activityType: 'reading',
                completed: false,
                durationMinutes: 30 // Default block
            });

            // ANCHOR RULE: No Smart/Mixed quizzes during anchor period
            // After anchor period: Smart Quiz every 3rd day for reinforcement
            const isSmartQuizDay = !isInAnchorPeriod && i % 3 === 2;

            tasks.push({
                id: `task-${i}-quiz`,
                date: new Date(currentDate),
                domain: isSmartQuizDay ? 'Mixed' as any : selectedDomain.name as any,
                topic: isSmartQuizDay ? 'Smart Quiz: Mixed Review' : `Domain Quiz: ${selectedDomain.name}`,
                activityType: 'quiz',
                completed: false,
                durationMinutes: isSmartQuizDay ? 20 : 15
            });

            // Advance to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            userId,
            examId,
            startDate,
            examDate,
            weeklyHours,
            tasks,
            createdAt: new Date(),
            status: 'active'
        };
    },

    savePlan: async (plan: StudyPlan) => {
        try {
            const docRef = await addDoc(collection(db, 'study_plans'), plan);
            return docRef.id;
        } catch (error) {
            console.error("Error saving study plan:", error);
            throw error;
        }
    },

    archiveCurrentPlan: async (userId: string) => {
        try {
            const q = query(
                collection(db, 'study_plans'),
                where("userId", "==", userId),
                where("status", "==", "active")
            );
            const snapshot = await getDocs(q);

            const promises = snapshot.docs.map(d =>
                updateDoc(doc(db, 'study_plans', d.id), { status: 'archived' })
            );

            await Promise.all(promises);
        } catch (error) {
            console.error("Error archiving plan:", error);
            throw error;
        }
    },

    getCurrentPlan: async (userId: string, examId?: string): Promise<StudyPlan | null> => {
        console.log("StudyPlanService.getCurrentPlan called with:", { userId, examId });
        try {
            const constraints = [
                where("userId", "==", userId),
                where("status", "==", "active")
            ];

            if (examId) {
                constraints.push(where("examId", "==", examId));
            }

            const q = query(
                collection(db, 'study_plans'),
                ...constraints,
                orderBy("createdAt", "desc"),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docData = querySnapshot.docs[0].data();
                return {
                    id: querySnapshot.docs[0].id,
                    ...docData,
                    startDate: (docData.startDate as Timestamp).toDate(),
                    examDate: (docData.examDate as Timestamp).toDate(),
                    createdAt: (docData.createdAt as Timestamp).toDate(),
                    tasks: docData.tasks.map((t: any) => ({
                        ...t,
                        date: (t.date as Timestamp).toDate()
                    }))
                } as StudyPlan;
            }
            return null;
        } catch (error) {
            console.error("Error fetching study plan:", error);
            return null;
        }
    },

    markTaskComplete: async (planId: string, taskId: string, isComplete: boolean) => {
        try {
            const planRef = doc(db, 'study_plans', planId);
            const snap = await getDoc(planRef);

            if (!snap.exists()) throw new Error("Plan not found");

            const data = snap.data();
            const tasks = data.tasks as DailyTask[];

            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return { ...t, completed: isComplete };
                }
                return t;
            });

            await updateDoc(planRef, { tasks: updatedTasks });
        } catch (error) {
            console.error("Error marking task complete:", error);
            throw error;
        }
    },

    /**
     * Recalculates the study plan based on current performance data.
     * - Fetches userMastery data to determine current weakest domain
     * - Preserves all past and today's tasks
     * - Regenerates future tasks with new anchor domain
     * Returns the new anchor domain for confirmation message.
     */
    recalculatePlanFromProgress: async (
        userId: string,
        examId: string,
        existingPlan: StudyPlan,
        examName?: string,
        domainNames?: string[]
    ): Promise<{ success: boolean; newAnchorDomain: string | null; error?: string }> => {
        try {
            // 1. Single canonical check: resolve weakest domain from latest COMPLETED diagnostic (v15)
            // Diagnostics are stored in quizRuns (QuizRunService), not the diagnostics collection.
            const { DiagnosticService } = await import('./DiagnosticService');
            const runsRef = collection(db, 'quizRuns', userId, 'runs');
            const diagQuery = query(
                runsRef,
                where('examId', '==', examId),
                where('mode', '==', 'diagnostic'),
                where('status', '==', 'completed'),
                orderBy('completedAt', 'desc'),
                limit(5)
            );
            console.log('[PLAN-DEBUG] querying quizRuns/', userId, '/runs WHERE examId=', examId, 'mode=diagnostic status=completed');
            const diagSnap = await getDocs(diagQuery);
            console.log('[PLAN-DEBUG] results:', diagSnap.size, 'docs');
            // Find first completed diagnostic with valid domainResults
            let newAnchorDomain: string | null = null;
            for (const d of diagSnap.docs) {
                const data = d.data();
                console.log('[PLAN-DEBUG] run', d.id, '→ results.domainResults=', JSON.stringify(data.results?.domainResults));
                newAnchorDomain = DiagnosticService.getWeakestDomain(data);
                console.log('[PLAN-DEBUG] getWeakestDomain →', newAnchorDomain);
                if (newAnchorDomain) break;
            }

            if (!newAnchorDomain) {
                console.log('[PLAN-DEBUG] BLOCKED — no valid diagnostic found for uid=', userId, 'examId=', examId);
                return { success: false, newAnchorDomain: null, error: 'No diagnostic results found. Please complete a diagnostic first.' };
            }

            // 3. Separate past/today tasks from future tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // FIX: v15 Sync Rule - Dropping "Today's" INCOMPLETE tasks so they regenerate with new anchor.
            // Only preserve:
            // 1. Tasks stricty in the past (< today)
            // 2. Tasks for today that are ALREADY COMPLETED (so we don't lose progress)
            const preservedTasks = existingPlan.tasks.filter(t => {
                const taskDate = new Date(t.date);
                taskDate.setHours(0, 0, 0, 0);

                if (taskDate.getTime() < today.getTime()) return true; // Past
                if (taskDate.getTime() === today.getTime() && t.completed) return true; // Today + Completed
                return false; // Drop Today's Incomplete (will be regenerated with new focus)
            });

            // 4. Generate new future tasks — v15: ALL tasks locked to diagnostic weakest domain
            const domains = getExamDomains(examId, examName, domainNames);
            const anchorDomain = domains.find(d => d.name === newAnchorDomain) || domains[0];

            const futureTasks: DailyTask[] = [];
            const currentDate = new Date(today);

            let dayIndex = 0;
            while (currentDate < existingPlan.examDate) {
                // Skip Saturdays (mock exam days)
                if (currentDate.getDay() === 6) {
                    futureTasks.push({
                        id: `recalc-${dayIndex}-mock`,
                        date: new Date(currentDate),
                        domain: 'Mixed' as any,
                        topic: 'Full Mock Exam',
                        activityType: 'mock-exam',
                        completed: false,
                        durationMinutes: 240
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                    dayIndex++;
                    continue;
                }

                const topic = anchorDomain.topics[Math.floor(Math.random() * anchorDomain.topics.length)];

                // Reading task — v15: anchor domain only
                futureTasks.push({
                    id: `recalc-${dayIndex}-read`,
                    date: new Date(currentDate),
                    domain: anchorDomain.name as any,
                    topic: `Review: ${topic}`,
                    activityType: 'reading',
                    completed: false,
                    durationMinutes: 30
                });

                // Quiz task — v15: anchor domain only, no Smart Quiz rotation
                futureTasks.push({
                    id: `recalc-${dayIndex}-quiz`,
                    date: new Date(currentDate),
                    domain: anchorDomain.name as any,
                    topic: `Domain Quiz: ${anchorDomain.name}`,
                    activityType: 'quiz',
                    completed: false,
                    durationMinutes: 15
                });

                currentDate.setDate(currentDate.getDate() + 1);
                dayIndex++;
            }

            // 5. Merge preserved + future tasks
            const mergedTasks = [...preservedTasks, ...futureTasks];

            // 6. Update the plan in Firestore
            if (!existingPlan.id) {
                return { success: false, newAnchorDomain: null, error: 'Plan ID not found.' };
            }

            const planRef = doc(db, 'study_plans', existingPlan.id);
            await updateDoc(planRef, {
                tasks: mergedTasks,
                anchorDomain: newAnchorDomain,
                lastRecalculatedAt: new Date()
            });

            return { success: true, newAnchorDomain };
        } catch (error: any) {
            console.error('[PLAN-DEBUG] EXCEPTION in recalculatePlanFromProgress:', error?.code, error?.message, error);
            return { success: false, newAnchorDomain: null, error: 'Failed to update plan. Please try again.' };
        }
    }
};
