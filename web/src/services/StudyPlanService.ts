import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { StudyPlan, DailyTask } from '../types/StudyPlan';
import { getExamDomains } from './ExamMetadata';

export const StudyPlanService = {
    /**
     * Generates a study schedule based on exam date and weekly hours.
     * Uses a weighted distribution to assign topics:
     * - Process: 50%
     * - People: 42%
     * - Business: 8%
     */
    generatePlan: (userId: string, examId: string, examDate: Date, weeklyHours: number, examName?: string, domainNames?: string[]): StudyPlan => {
        const startDate = new Date();
        const daysUntilExam = Math.ceil((examDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const tasks: DailyTask[] = [];
        const currentDate = new Date(startDate);

        // Define domains dynamically if provided, or fallback to known definitions
        const domains = getExamDomains(examId, examName, domainNames);

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

            const rand = Math.random();
            let selectedDomain = domains[0];
            let cumulativeWeight = 0;

            for (const domain of domains) {
                cumulativeWeight += domain.weight;
                if (rand <= cumulativeWeight) {
                    selectedDomain = domain;
                    break;
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

            // Add a Daily Quiz - Domain Quiz most days, Smart Quiz every 3rd day for reinforcement
            const isSmartQuizDay = i % 3 === 2; // Every 3rd day (days 2, 5, 8, etc.)

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
    }
};
