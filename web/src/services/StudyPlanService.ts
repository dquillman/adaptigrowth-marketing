import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { StudyPlan, DailyTask } from '../types/StudyPlan';
import { getExamDomains } from './ExamMetadata';
import { deriveDomainResultsFromAnswers } from './QuizRunService';

/** Maps a raw Firestore document snapshot to a typed StudyPlan. */
function mapFirestorePlan(id: string, data: Record<string, any>): StudyPlan {
    return {
        ...data,
        id,
        anchorDomain: data.anchorDomain as string | undefined,
        startDate: (data.startDate as Timestamp).toDate(),
        examDate: (data.examDate as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
        tasks: (data.tasks || []).map((t: any) => ({
            ...t,
            date: (t.date as Timestamp).toDate()
        }))
    } as StudyPlan;
}

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

    archiveCurrentPlan: async (userId: string, examId?: string) => {
        try {
            // Query by userId + status only — no composite index required.
            // examId filtering is done client-side to avoid needing an additional index.
            const q = query(
                collection(db, 'study_plans'),
                where("userId", "==", userId),
                where("status", "==", "active")
            );
            const snapshot = await getDocs(q);

            const docsToArchive = examId
                ? snapshot.docs.filter(d => d.data().examId === examId)
                : snapshot.docs;

            await Promise.all(
                docsToArchive.map(d =>
                    updateDoc(doc(db, 'study_plans', d.id), { status: 'archived' })
                )
            );
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
                const d = querySnapshot.docs[0];
                return mapFirestorePlan(d.id, d.data());
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
     * Recalculates the study plan anchor domain using a performance-first model.
     *
     * Priority order:
     *   1. Real quiz history (non-diagnostic, completed) — primary signal.
     *      Minimum sample of 5 total answered questions required to trust the data.
     *      - Domains with < 5 answers → "under-measured": rotate exposure (fewest answers first)
     *      - All domains ≥ 5 answers → pick lowest accuracy domain
     *   2. Completed diagnostic run — fallback when quiz history is insufficient.
     *
     * Preserves past tasks, regenerates today+future tasks locked to chosen domain.
     */
    recalculatePlanFromProgress: async (
        userId: string,
        examId: string,
        existingPlan: StudyPlan,
        examName?: string,
        domainNames?: string[]
    ): Promise<{ success: boolean; domain?: string; reason?: 'underMeasured' | 'lowestAccuracy'; plan?: StudyPlan; error?: string }> => {
        try {
            const runsRef = collection(db, 'quizRuns', userId, 'runs');
            const MIN_SAMPLE = 5;

            // ── Step 1: Fetch completed quiz runs ─────────────────────────────────────
            // Query only on status='completed' — no composite index required.
            // NOTE: quizType is stored under meta.quizType in the current schema, not at
            // the top-level quizType field, so the != filter must be done in JS.
            // examId and quizType exclusion are both applied client-side below.
            let totalQuizAnswers = 0;
            const domainStats: Record<string, { totalAnswered: number; totalCorrect: number }> = {};

            try {
                const quizQuery = query(
                    runsRef,
                    where('status', '==', 'completed'),
                    limit(50)
                );
                const quizSnap = await getDocs(quizQuery);

                // Filter client-side: correct exam, exclude diagnostics (meta.quizType field)
                const filteredRuns = quizSnap.docs
                    .map(d => d.data())
                    .filter(run =>
                        run.examId === examId &&
                        run.meta?.quizType !== 'diagnostic'
                    );

                // ── Step 2: Aggregate domain performance across all quiz runs ─────────
                for (const run of filteredRuns) {
                    const answers: any[] = run.answers || [];
                    for (const a of answers) {
                        if (!a.domain) continue; // skip answers without domain tag
                        if (!domainStats[a.domain]) {
                            domainStats[a.domain] = { totalAnswered: 0, totalCorrect: 0 };
                        }
                        domainStats[a.domain].totalAnswered++;
                        if (a.isCorrect) domainStats[a.domain].totalCorrect++;
                    }
                }

                totalQuizAnswers = Object.values(domainStats).reduce(
                    (sum, s) => sum + s.totalAnswered, 0
                );
            } catch (quizErr: any) {
                // Network error — fall through to diagnostic fallback.
                console.warn('[PLAN] quiz run query failed, will use diagnostic fallback:', quizErr?.code);
            }

            console.log('[PLAN] totalQuizAnswers:', totalQuizAnswers);
            console.log('[PLAN] domainStats:', JSON.stringify(domainStats));

            // ── Step 3: Apply Minimum Sample Rule ────────────────────────────────────
            let newAnchorDomain: string | null = null;
            let reason: 'underMeasured' | 'lowestAccuracy' | undefined;
            let fallbackToDiagnostic = false;

            if (totalQuizAnswers >= MIN_SAMPLE) {
                const knownDomains = getExamDomains(examId, examName, domainNames);
                const knownDomainNames = knownDomains.map(d => d.name);

                // Domains that haven't reached the minimum sample threshold yet
                const underMeasured = knownDomainNames
                    .filter(d => (domainStats[d]?.totalAnswered ?? 0) < MIN_SAMPLE)
                    .sort((a, b) => {
                        // Fewest answers first → ensures broadest domain coverage
                        const diff = (domainStats[a]?.totalAnswered ?? 0) - (domainStats[b]?.totalAnswered ?? 0);
                        return diff !== 0 ? diff : a.localeCompare(b); // alphabetical tie-break
                    });

                if (underMeasured.length > 0) {
                    // Rotate exposure: focus on least-seen domain first
                    newAnchorDomain = underMeasured[0];
                    reason = 'underMeasured';
                } else {
                    // All domains adequately sampled — target weakest by accuracy
                    const ranked = Object.entries(domainStats)
                        .filter(([d]) => knownDomainNames.includes(d))
                        .map(([d, s]) => ({
                            domain: d,
                            accuracy: s.totalAnswered > 0 ? s.totalCorrect / s.totalAnswered : 0
                        }))
                        .sort((a, b) => {
                            const diff = a.accuracy - b.accuracy;
                            return diff !== 0 ? diff : a.domain.localeCompare(b.domain);
                        });

                    newAnchorDomain = ranked[0]?.domain ?? null;
                    reason = 'lowestAccuracy';
                }
            } else {
                fallbackToDiagnostic = true;
            }

            console.log('[PLAN] fallbackToDiagnostic:', fallbackToDiagnostic);

            // ── Step 4: Diagnostic fallback (only when quiz data is insufficient) ────
            if (fallbackToDiagnostic) {
                const { DiagnosticService } = await import('./DiagnosticService');

                const diagQuery = query(
                    runsRef,
                    where('quizType', '==', 'diagnostic'),
                    where('status', '==', 'completed'),
                    limit(10)
                );
                const diagSnap = await getDocs(diagQuery);

                // Filter by examId client-side, most recent first
                const examDiagDocs = diagSnap.docs
                    .filter(d => d.data().examId === examId)
                    .sort((a, b) => (b.data().completedAt?.seconds ?? 0) - (a.data().completedAt?.seconds ?? 0));

                for (const d of examDiagDocs) {
                    const data = d.data();
                    newAnchorDomain = DiagnosticService.getWeakestDomain(data);

                    // Re-derive from raw answers when domainResults is empty (old runs)
                    if (!newAnchorDomain && Array.isArray(data.answers) && data.answers.length > 0) {
                        const answersWithDomain = (data.answers as any[]).filter(
                            a => a.domain && a.selectedOption !== undefined
                        );
                        if (answersWithDomain.length > 0) {
                            const rederived = deriveDomainResultsFromAnswers(answersWithDomain);
                            newAnchorDomain = DiagnosticService.getWeakestDomain({
                                results: { domainResults: rederived }
                            });
                        }
                    }

                    if (newAnchorDomain) break;
                }
            }

            // ── Step 5: Safety fallback — guarantees a domain whenever quiz data exists ─
            // Triggered only if all prior branches left newAnchorDomain null but domainStats
            // is non-empty (e.g. knownDomainNames filter excluded all recorded domains).
            if (!newAnchorDomain && Object.keys(domainStats).length > 0) {
                const safetyRanked = Object.entries(domainStats)
                    .map(([d, s]) => ({
                        domain: d,
                        accuracy: s.totalAnswered > 0 ? s.totalCorrect / s.totalAnswered : 0,
                        totalAnswered: s.totalAnswered
                    }))
                    .sort((a, b) => {
                        const diff = a.accuracy - b.accuracy;
                        return diff !== 0 ? diff : a.totalAnswered - b.totalAnswered;
                    });
                newAnchorDomain = safetyRanked[0]?.domain ?? null;
                reason = 'lowestAccuracy';
                console.log('[PLAN] safetyFallbackTriggered:', newAnchorDomain);
            }

            console.log('[PLAN] chosenDomain:', newAnchorDomain);

            if (!newAnchorDomain) {
                return {
                    success: false,
                    error: 'Not enough progress yet. Complete a quiz or run a diagnostic to start your plan.'
                };
            }

            // ── Preserve past tasks and completed tasks from today ────────────────────
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const preservedTasks = existingPlan.tasks.filter(t => {
                const taskDate = new Date(t.date);
                taskDate.setHours(0, 0, 0, 0);
                if (taskDate.getTime() < today.getTime()) return true;           // past
                if (taskDate.getTime() === today.getTime() && t.completed) return true; // today + done
                return false; // today incomplete + future → regenerate with new anchor
            });

            // ── Generate future tasks locked to chosen anchor domain ──────────────────
            const domains = getExamDomains(examId, examName, domainNames);
            const anchorDomain = domains.find(d => d.name === newAnchorDomain) || domains[0];

            const futureTasks: DailyTask[] = [];
            const currentDate = new Date(today);
            let dayIndex = 0;

            while (currentDate < existingPlan.examDate) {
                if (currentDate.getDay() === 6) {
                    // Saturdays → full mock exam
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

                futureTasks.push({
                    id: `recalc-${dayIndex}-read`,
                    date: new Date(currentDate),
                    domain: anchorDomain.name as any,
                    topic: `Review: ${topic}`,
                    activityType: 'reading',
                    completed: false,
                    durationMinutes: 30
                });

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

            // ── Persist updated plan ──────────────────────────────────────────────────
            if (!existingPlan.id) {
                return { success: false, error: 'Plan ID not found.' };
            }

            const planRef = doc(db, 'study_plans', existingPlan.id);
            await updateDoc(planRef, {
                tasks: [...preservedTasks, ...futureTasks],
                anchorDomain: newAnchorDomain,
                lastRecalculatedAt: new Date()
            });

            // Read the document back by ID — not by query — so we always get exactly
            // the document we updated, regardless of how many active plan docs exist.
            // This also verifies the write and primes the local document cache.
            const verifySnap = await getDoc(planRef);
            if (verifySnap.exists() && !verifySnap.data().anchorDomain) {
                console.warn('[PLAN] anchorDomain missing after updateDoc — re-applying:', newAnchorDomain);
                await updateDoc(planRef, { anchorDomain: newAnchorDomain });
            }

            // Build the plan from the verified snapshot and return it directly.
            // The caller can use this instead of calling getCurrentPlan(), eliminating
            // the document-mismatch risk from a sorted query returning a different doc.
            const freshPlan = verifySnap.exists()
                ? mapFirestorePlan(existingPlan.id, verifySnap.data())
                : undefined;

            return { success: true, domain: newAnchorDomain ?? undefined, reason, plan: freshPlan };

        } catch (error: any) {
            console.error('[PLAN] EXCEPTION in recalculatePlanFromProgress:', error?.code, error?.message, error);
            return { success: false, error: 'Failed to update plan. Please try again.' };
        }
    }
};
