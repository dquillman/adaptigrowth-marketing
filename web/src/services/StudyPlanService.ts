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
    generatePlan: (userId: string, examId: string, examDate: Date, weeklyHours: number): StudyPlan => {
        const startDate = new Date();
        const daysUntilExam = Math.ceil((examDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const tasks: DailyTask[] = [];
        const currentDate = new Date(startDate);

        // Define domains for different exams (fallback to PMP)
        const domains = getExamDomains(examId);

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
            if (rand > 0.50 && rand <= 0.92) selectedDomain = domains[1]; // 42% for People
            if (rand > 0.92) selectedDomain = domains[2]; // 8% for Business

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

            // Every other day (that isn't Saturday), add a Quiz
            if (i % 2 === 0) {
                tasks.push({
                    id: `task-${i}-quiz`,
                    date: new Date(currentDate),
                    domain: selectedDomain.name as any,
                    topic: `Practice Quiz: ${topic}`,
                    activityType: 'quiz',
                    completed: false,
                    durationMinutes: 15
                });
            }

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

    getCurrentPlan: async (userId: string): Promise<StudyPlan | null> => {
        try {
            const q = query(
                collection(db, 'study_plans'),
                where("userId", "==", userId),
                where("status", "==", "active"),
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
