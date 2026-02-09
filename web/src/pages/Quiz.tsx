import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import TutorBreakdown, { type TutorResponse } from '../components/TutorBreakdown';
import type { PatternData } from '../components/PatternInsightCard';
import { doc, setDoc, getDoc, collection, query, getDocs, addDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { XPService } from '../services/xpService';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionUpsellModal from '../components/SubscriptionUpsellModal';
import { useExam } from '../contexts/ExamContext';
import { SmartQuizService } from '../services/smartQuiz';
import { useMarketingCopy } from '../hooks/useMarketingCopy';
import { QuizRunService } from '../services/QuizRunService';
import { UsageEventService } from '../services/UsageEventService';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSmartQuizReview } from '../contexts/SmartQuizReviewContext';
import QuestionProvenanceBadge from '../components/QuestionProvenanceBadge';

interface Question {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    domain: string;
    examId?: string;
    imageUrl?: string; // New field for AI image
    difficulty?: number; // 1-10
}

export default function Quiz() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showExplanation, setShowExplanation] = useState(false);
    const [explanationExpanded, setExplanationExpanded] = useState(false); // New: Track manual expansion
    const [tutorBreakdown, setTutorBreakdown] = useState<TutorResponse | null>(null);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [domainResults, setDomainResults] = useState<Record<string, { correct: number; total: number }>>({});
    const [quizDetails, setQuizDetails] = useState<any[]>([]);

    // Thinking Trap Suggestion State
    const [sessionTraps, setSessionTraps] = useState<Map<string, { count: number, pattern: PatternData }>>(new Map());

    // Mastery Transparency State
    const [showMasteryInfo, setShowMasteryInfo] = useState(false);
    const [questionProgressMap, setQuestionProgressMap] = useState<Map<string, any>>(new Map());

    // Smart Quiz Review (app-level context)
    const smartReview = useSmartQuizReview();

    // Diagnostic Persistence State -> MOVED to below line 77 to access 'location'


    const { isPro, canTakeQuiz, incrementDailyCount } = useSubscription();
    const [showUpsell, setShowUpsell] = useState(false);
    const copy = useMarketingCopy();

    // Measurement Metrics
    const [explanationRenderTime, setExplanationRenderTime] = useState<number | null>(null);

    // Block access immediately if limit reached via direct URL, but handle graceful redirect/modal
    useEffect(() => {
        if (!loading && !canTakeQuiz) {
            setShowUpsell(true);
        }
    }, [loading, canTakeQuiz]);



    // ...


    // ...
    const { examId: paramExamId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Unified Quiz Run State
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [quizType, setQuizType] = useState<string>('standard');

    // Initialize activeRunId from location state on mount if resuming
    useEffect(() => {
        if (location.state?.runId) {
            setActiveRunId(location.state.runId);
        }
    }, [location.state]);

    // Global context fallback
    const { selectedExamId, examDomains } = useExam();

    const [activeExamId, setActiveExamId] = useState<string>('');
    const [reinforcementMessage, setReinforcementMessage] = useState<string | null>(null);

    useEffect(() => {
        // Determine the effective exam ID
        // Priority: URL Param > Context > Default
        const effectiveId = paramExamId || selectedExamId || 'default-exam';
        setActiveExamId(effectiveId);

        // Pre-Quiz Reinforcement Check
        const checkReinforcement = () => {
            const MEMORY_KEY = 'exam_coach_reinforcement';
            const FREQUENCY_KEY = 'exam_coach_last_reinforcement_shown';
            const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
            const ONE_DAY = 24 * 60 * 60 * 1000;

            try {
                const memoryStr = localStorage.getItem(MEMORY_KEY);
                if (!memoryStr) return;

                const memory = JSON.parse(memoryStr);
                const now = Date.now();

                if ((now - memory.timestamp) > SEVEN_DAYS) return;

                const lastShownStr = localStorage.getItem(FREQUENCY_KEY);
                if (lastShownStr) {
                    const lastShown = parseInt(lastShownStr, 10);
                    if ((now - lastShown) < ONE_DAY) return;
                }

                setReinforcementMessage(`Quick reminder: You’re getting better at spotting ${memory.patternName}.`);
                localStorage.setItem(FREQUENCY_KEY, now.toString());
            } catch (e) {
                console.error("Reinforcement check failed", e);
            }
        };
        checkReinforcement();
    }, [paramExamId, selectedExamId]);

    useEffect(() => {
        const fetchSmartQuestions = async () => {
            if (!activeExamId) return;

            try {
                const user = auth.currentUser;
                if (!user) return;

                console.log("Fetching questions and progress for:", activeExamId);
                setLoading(true);

                // TRAP MODE
                if (location.state?.mode === 'trap') {
                    console.log("Initializing Trap Practice Mode...");
                    const trapIds = await SmartQuizService.generateTrapQuiz(
                        location.state.patternId,
                        location.state.domainTags,
                        activeExamId,
                        isPro ? 7 : 5,
                        location.state.masteryScore || 0
                    );

                    try {
                        const newRunId = await QuizRunService.createRun(
                            user.uid,
                            activeExamId,
                            'trap',
                            'trap',
                            trapIds,
                            {
                                patternId: location.state.patternId,
                                patternName: location.state.patternName || 'Thinking Trap'
                            }
                        );
                        setActiveRunId(newRunId);
                        setQuizType('trap');
                    } catch (e) {
                        console.error("Failed to persist trap run", e);
                    }

                    const fetchedQs: Question[] = [];
                    for (const id of trapIds) {
                        const docRef = doc(db, 'questions', id);
                        const d = await getDoc(docRef);
                        if (d.exists()) {
                            const data = d.data();
                            fetchedQs.push({
                                id: d.id,
                                ...data,
                                difficulty: data.difficulty
                            } as Question);
                        }
                    }
                    setQuestions(fetchedQs);
                    setLoading(false);
                    return;
                }

                // DIAGNOSTIC CHECK (Legacy/Specific Logic) OR UNIFIED RESUME
                // If we have a runId, we resume regardless of mode
                if (location.state?.runId) {
                    console.log("Resuming Quiz Run:", location.state.runId);
                    const run = await QuizRunService.getRunById(user.uid, location.state.runId);

                    if (run) {
                        // Re-fetch questions from snapshot IDs
                        setQuizType(run.quizType || run.type || 'standard'); // Derived from DATA
                        const fetchedQs: Question[] = [];
                        for (const id of run.snapshot.questionIds) {
                            const docRef = doc(db, 'questions', id);
                            const d = await getDoc(docRef);
                            if (d.exists()) {
                                fetchedQs.push({ id: d.id, ...d.data() } as Question);
                            }
                        }
                        setQuestions(fetchedQs);
                        if (run.snapshot.currentQuestionIndex !== undefined) {
                            setCurrentQuestionIndex(run.snapshot.currentQuestionIndex);
                        }
                        setLoading(false);
                        return;
                    }
                }

                // If Diagnostic Mode AND NO runId -> Create Logic
                if (location.state?.mode === 'diagnostic' && !location.state?.runId) {
                    console.log("Initializing Diagnostic Mode...");

                    // Domain-balanced diagnostic: 3 questions per domain
                    const diagIds = await SmartQuizService.generateDiagnosticExam(activeExamId, examDomains);

                    // PERSISTENCE: Create Run
                    try {
                        const runId = await QuizRunService.createRun(
                            auth.currentUser!.uid,
                            activeExamId,
                            'diagnostic',
                            'diagnostic',
                            diagIds
                        );

                        await addDoc(collection(db, 'quizAttempts'), {
                            userId: auth.currentUser!.uid,
                            examId: activeExamId,
                            mode: 'diagnostic',
                            completed: false,
                            runId,
                            totalQuestions: diagIds.length,
                            timestamp: new Date()
                        });
                        setActiveRunId(runId);
                        setQuizType('diagnostic');
                    } catch (e) {
                        console.error("Failed to persist diagnostic start", e);
                    }

                    const fetchedQs: Question[] = [];
                    for (const id of diagIds) {
                        const docRef = doc(db, 'questions', id);
                        const d = await getDoc(docRef);
                        if (d.exists()) {
                            fetchedQs.push({ id: d.id, ...d.data() } as Question);
                        }
                    }
                    setQuestions(fetchedQs);
                    setLoading(false);
                    return;
                }

                // Check for Smart Quiz (passed via state)
                const stateIds = location.state?.questionIds as string[] | undefined;
                if (stateIds && stateIds.length > 0) {
                    console.log("Loading specific Smart Quiz questions:", stateIds);
                    const fetchedQs: Question[] = [];
                    for (const id of stateIds) {
                        // Note: In a real app, use where('documentId', 'in', [...]) for better performance if < 30 items
                        const docRef = doc(db, 'questions', id);
                        const d = await getDoc(docRef);
                        if (d.exists()) {
                            fetchedQs.push({ id: d.id, ...d.data() } as Question);
                        }
                    }
                    setQuestions(fetchedQs);
                    setLoading(false);
                    return;
                }

                // 1. Fetch questions (optionally filtered by domain)
                const questionsRef = collection(db, 'questions');
                let constraints: any[] = [where('examId', '==', activeExamId)];

                const filterDomain = location.state?.filterDomain as string | undefined;
                if (filterDomain) {
                    console.log("Filtering quiz by domain:", filterDomain);
                    constraints.push(where('domain', '==', filterDomain));
                }

                let q = query(questionsRef, ...constraints);

                // If no specific exam questions found, maybe fallback? 
                // For now, let's stick to the selected exam.

                const questionsSnap = await getDocs(q);
                // ... rest of logic

                const allQuestions = questionsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Question[];

                if (allQuestions.length === 0) {
                    setQuestions([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch User's Progress for these questions
                const progressRef = collection(db, 'users', user.uid, 'questionProgress');
                const progressSnap = await getDocs(progressRef);
                const progressMap = new Map();
                progressSnap.forEach(doc => {
                    progressMap.set(doc.id, doc.data());
                });
                setQuestionProgressMap(progressMap);

                // 3. Categorize Questions
                const learning: Question[] = [];
                const newQs: Question[] = [];
                const mastered: Question[] = [];

                allQuestions.forEach(q => {
                    const prog = progressMap.get(q.id);
                    if (!prog) {
                        newQs.push(q);
                    } else if (prog.status === 'mastered') {
                        mastered.push(q);
                    } else {
                        learning.push(q);
                    }
                });

                console.log(`Smart Stats: New: ${newQs.length}, Learning: ${learning.length}, Mastered: ${mastered.length}`);

                // 4. Selection Logic (SRS Algorithm)
                // Priority: Learning (Review) > New > Mastered (Refresh)
                // 4. Selection Logic (SRS Algorithm)
                // Priority: Learning (Review) > New > Mastered (Refresh)

                // Limit questions based on plan
                const TARGET_SIZE = isPro ? 10 : 5;
                let selected: Question[] = [];
                const selectedIds = new Set<string>(); // LAYER 1: Session Uniqueness

                const shuffle = (arr: any[]) => arr.sort(() => 0.5 - Math.random());

                const addUnique = (candidates: Question[]) => {
                    for (const c of candidates) {
                        if (selected.length >= TARGET_SIZE) break;
                        if (!selectedIds.has(c.id)) {
                            selected.push(c);
                            selectedIds.add(c.id);
                        }
                    }
                };

                // A. Add all 'Learning' questions
                addUnique(shuffle(learning));

                // B. Fill with 'New' questions
                if (selected.length < TARGET_SIZE) {
                    // We can just add unique from the shuffled "new" bucket
                    addUnique(shuffle(newQs));
                }

                // C. Fill with 'Mastered' questions
                // If filtering by specific domain, we ALLOW mastered questions to fill the quiz
                // to ensure the user gets a full 10-question set if available.
                if (selected.length < TARGET_SIZE && mastered.length > 0) {
                    // If filterDomain is active, we are more aggressive about reusing mastered content
                    const remaining = TARGET_SIZE - selected.length;
                    const toTake = filterDomain ? remaining : Math.min(remaining, Math.ceil(TARGET_SIZE * 0.3));

                    // Shuffle mastered and add strictly unique
                    const shuffledMastered = shuffle(mastered);
                    let taken = 0;
                    for (const m of shuffledMastered) {
                        if (taken >= toTake) break;
                        if (selected.length >= TARGET_SIZE) break;
                        if (!selectedIds.has(m.id)) {
                            selected.push(m);
                            selectedIds.add(m.id);
                            taken++;
                        }
                    }
                }

                // selected = selected.slice(0, TARGET_SIZE); // Already handled by logic loops but safe to keep if simple array concat was used.
                // Re-shuffle final selection so order isn't purely Learning -> New -> Mastered
                selected = selected.sort(() => 0.5 - Math.random());

                console.log("Selected Smart Questions:", selected);
                console.log("Selected Smart Questions:", selected);
                setQuestions(selected);

                // UNIFIED PERSISTENCE: Create Run for Smart/Weakest Modes if not resuming
                if (!location.state?.runId) {
                    const mode = location.state?.mode || 'smart';
                    const type = mode === 'diagnostic' ? 'diagnostic' : 'daily'; // map simple types
                    const qIds = selected.map(q => q.id);

                    try {
                        const newRunId = await QuizRunService.createRun(user.uid, activeExamId, type, mode, qIds);
                        setActiveRunId(newRunId);
                        setQuizType(type);
                    } catch (e) {
                        console.error("Failed to create start run persistence", e);
                    }
                }

            } catch (error) {
                console.error("Error fetching smart questions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSmartQuestions();
    }, [activeExamId]);

    const handleOptionSelect = (index: number) => {
        if (showExplanation) return;
        setSelectedOption(index);
    };

    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
    const [questionDurations, setQuestionDurations] = useState<number[]>([]);

    useEffect(() => {
        setQuestionStartTime(Date.now());
    }, [currentQuestionIndex, loading]);

    const handleSubmit = () => {
        if (selectedOption === null) return;

        const endTime = Date.now();
        const duration = (endTime - questionStartTime) / 1000; // in seconds
        setQuestionDurations([...questionDurations, duration]);

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.correctAnswer;

        if (isCorrect) {
            setScore(score + 1);
        }

        // Track domain results
        const domain = currentQuestion.domain || 'Process';
        setDomainResults(prev => ({
            ...prev,
            [domain]: {
                correct: (prev[domain]?.correct || 0) + (isCorrect ? 1 : 0),
                total: (prev[domain]?.total || 0) + 1
            }
        }));

        // Track Details for Readiness Engine
        // We can't know if they viewed the explanation yet (it happens AFTER this function).
        // So we just push the basic info here, and we'll need to UPDATE the last item in the array 
        // when they click "Next" or "Show Explanation". 
        // ACTUALLY: Easier to just save it to a temp state 'currentResult' and push to 'quizDetails' on handleNext.
        // But to keep diff small, I will push it now with 'explanationViewed: false', and we can ignore exact precision for now,
        // OR better: tracked via the separate 'explanationExpanded' state which we can read during 'saveQuizResults' if we stored the whole array in state?
        // Wait, 'quizDetails' is updated here.

        // REFACTOR: We need to push to quizDetails AFTER the question is finished (on handleNext), not on submit.
        // But existing logic pushes on submit. 
        // Let's modify handleNext to append the detail for the COMPLETED question.

        // Temporary fix: We will rely on 'explanationExpanded' being set during the review phase.
        // But 'quizDetails' is an array. We need to update the LAST item? 
        setShowExplanation(true);
        setExplanationRenderTime(Date.now()); // Start latency timer
        setExplanationExpanded(false); // Reset for new question
        setTutorBreakdown(null); // Reset breakdown

        // Trigger Tutor Breakdown generation if incorrect (or just pre-fetch?)
        // For MVP, if incorrect, we might want to fetch it.
        // Actually, let's fetch it on demand OR if incorrect to show immediately.
        if (!isCorrect) {
            setExplanationExpanded(true); // Open automatically on wrong
            fetchTutorBreakdown(currentQuestion, selectedOption);
        } else {
            // For TRAP MODE, we MUST fetch breakdown to ensure the backend updates user_pattern_stats
            // so the user can 'graduate' from the trap.
            if (location.state?.mode === 'trap') {
                fetchTutorBreakdown(currentQuestion, selectedOption);
            }
        }

        // Save Granular Question Progress (SRS)
        updateQuestionProgress(currentQuestion.id, isCorrect);

        // Usage event: core action (answer submitted), capped at 20/session
        const userId = auth.currentUser?.uid;
        const coreKey = 'ec_usage_core_count';
        const count = parseInt(sessionStorage.getItem(coreKey) || '0', 10);
        if (count < 20 && userId) {
            UsageEventService.emit(userId, 'coreAction');
            sessionStorage.setItem(coreKey, String(count + 1));
        }
    };

    const updateQuestionProgress = async (questionId: string, isCorrect: boolean) => {
        const user = auth.currentUser;
        if (!user) return;

        // PERSISTENCE: Save diagnostic progress if applicable
        // Unified Persistence: Save progress
        if (activeRunId) {
            try {
                if (selectedOption !== null) {
                    await QuizRunService.saveProgress(user.uid, activeRunId, {
                        questionId,
                        selectedOption: selectedOption,
                        isCorrect
                    }, questions.length > currentQuestionIndex + 1 ? currentQuestionIndex + 1 : currentQuestionIndex);
                }
            } catch (e) {
                console.error("Failed to save quiz progress", e);
            }
        }

        const progressRef = doc(db, 'users', user.uid, 'questionProgress', questionId);

        try {
            const docSnap = await getDoc(progressRef);
            let currentConsecutive = 0;
            let status = 'new';

            if (docSnap.exists()) {
                const data = docSnap.data();
                currentConsecutive = data.consecutiveCorrect || 0;
                status = data.status || 'new';
            }

            // Logic: 
            // Correct -> Increment consecutive. If >= Threshold, mark Mastered.
            // Incorrect -> Reset consecutive to 0. Status = 'learning'.

            const newConsecutive = isCorrect ? currentConsecutive + 1 : 0;
            let newStatus = status;

            const MASTERY_THRESHOLD = 2; // Keep in sync or move to state

            if (!isCorrect) {
                newStatus = 'learning';
            } else if (newConsecutive >= MASTERY_THRESHOLD) {
                newStatus = 'mastered';
            } else {
                newStatus = 'learning';
            }

            await setDoc(progressRef, {
                questionId,
                status: newStatus,
                consecutiveCorrect: newConsecutive,
                lastAttempted: new Date(),
                examId: questions[currentQuestionIndex].examId || 'unknown',
                domain: questions[currentQuestionIndex].domain || 'General' // Save domain for dashboard aggregation
            }, { merge: true });

            console.log(`Updated progress for ${questionId}: ${newStatus} (${newConsecutive})`);

        } catch (error) {
            console.error("Error updating question progress:", error);
        }
    };

    // PMP Doctrine Guard: PMP questions use stored doctrine explanations, not AI-generated Coach Breakdown
    const isPMPExam = (examId?: string) => examId === '7qmPagj9A6RpkC0CwGkY' || examId?.toLowerCase().startsWith('pmp');

    const fetchTutorBreakdown = async (question: Question, selectedOptIdx: number) => {
        setLoadingBreakdown(true);
        try {
            // PMP Guard: Use stored doctrine explanation directly, skip AI generation
            if (isPMPExam(question.examId)) {
                setTutorBreakdown({
                    verdict: '', // No AI verdict for PMP - doctrine explanation is complete
                    comparison: [], // No option analysis - doctrine covers this
                    examLens: question.explanation, // The doctrine explanation IS the exam lens
                    isPMPDoctrine: true // Flag for rendering
                } as TutorResponse & { isPMPDoctrine?: boolean });
                setLoadingBreakdown(false);
                return;
            }

            const generateFn = httpsCallable(functions, 'generateTutorBreakdown');
            const result = await generateFn({
                questionStem: question.stem,
                options: question.options,
                correctAnswerIndex: question.correctAnswer,
                userSelectedOptionIndex: selectedOptIdx,
                correctRationale: question.explanation,
                examDomain: question.domain
            });
            setTutorBreakdown(result.data as TutorResponse);

            // Track Thinking Traps for Suggestion Engine
            const responseData = result.data as TutorResponse;
            if (responseData.pattern && responseData.pattern.pattern_id) {
                setSessionTraps(prev => {
                    const newMap = new Map(prev);
                    const pid = responseData.pattern!.pattern_id;
                    const existing = newMap.get(pid);

                    if (existing) {
                        newMap.set(pid, { ...existing, count: existing.count + 1 });
                    } else {
                        newMap.set(pid, { count: 1, pattern: responseData.pattern! });
                    }
                    console.log("Tracked Pattern Miss:", pid, newMap.get(pid)?.count);
                    return newMap;
                });
            }
        } catch (err) {
            console.error("Failed to generate tutor breakdown:", err);
            // Fallback: Create a simple breakdown from the existing explanation
            setTutorBreakdown({
                verdict: "Coach is seemingly offline. Here is the standard explanation:",
                comparison: [{
                    optionIndex: question.correctAnswer,
                    text: question.options[question.correctAnswer],
                    explanation: "Correct Answer" // Minimal placeholder
                }],
                examLens: question.explanation
            });
        } finally {
            setLoadingBreakdown(false);
        }
    };

    const [depthContent, setDepthContent] = useState<string | null>(null);
    const [depthLoading, setDepthLoading] = useState(false);

    const handleExpandDepth = async (type: 'simple' | 'memory') => {
        setDepthLoading(true);
        try {
            const generateFn = httpsCallable(functions, 'generateTutorDeepDive');
            const result = await generateFn({
                context: tutorBreakdown,
                style: type
            });
            // @ts-ignore
            setDepthContent(result.data.content);
        } catch (err) {
            console.error("Failed to generate depth:", err);
            setDepthContent("Could not generate deep dive at this time.");
        } finally {
            setDepthLoading(false);
        }
    };

    const saveQuizResults = async (explicitDetails?: any[]) => {
        const user = auth.currentUser;
        if (!user) {
            console.error("No user logged in, cannot save results");
            return;
        }

        const userId = user.uid;
        // Don't re-derive activeExamId from question. Use the state variable which directed the fetch.
        // const activeExamId = questions[currentQuestionIndex]?.examId || 'default-exam';

        const masteryId = `${userId}_${activeExamId}`;
        const masteryRef = doc(db, 'userMastery', masteryId);

        // Prep Data for both specific persistence and legacy run completion
        const totalDuration = questionDurations.reduce((a, b) => a + b, 0);
        // Use the number of questions actually answered (details captured) as the total
        const finalDetails = explicitDetails || quizDetails;
        const answeredCount = finalDetails.length;

        try {
            const masteryDoc = await getDoc(masteryRef);
            let newMastery: Record<string, { correct: number; total: number }> = {};

            if (masteryDoc.exists()) {
                const currentData = masteryDoc.data();
                newMastery = { ...(currentData.masteryData || {}) };
            }

            Object.entries(domainResults).forEach(([domain, stats]) => {
                if (!newMastery[domain]) {
                    newMastery[domain] = { correct: 0, total: 0 };
                }
                newMastery[domain].correct += stats.correct;
                newMastery[domain].total += stats.total;
            });

            await setDoc(masteryRef, {
                userId,
                examId: activeExamId,
                masteryData: newMastery
            }, { merge: true });

            console.log('Mastery updated successfully');

            // Save Quiz Attempt
            const attemptRef = collection(db, 'quizAttempts');

            // Determine primary domain for the quiz
            const filterDomain = location.state?.filterDomain;
            const primaryDomain = filterDomain || 'Mixed'; // Use specific domain if filtered, otherwise Mixed

            if (answeredCount === 0) return; // Don't save empty attempts

            // EQV Telemetry: Effective Question Variety (uniqueQuestionsSeen / totalQuestionsPresented)
            const newQuestionCount = questions.filter(q => !questionProgressMap.has(q.id)).length;
            const eqv = questions.length > 0 ? newQuestionCount / questions.length : 0;

            await addDoc(attemptRef, {
                userId,
                examId: activeExamId,
                score,
                totalQuestions: answeredCount, // Use answered count
                timestamp: new Date(),
                domain: primaryDomain,
                timeSpent: totalDuration,
                averageTimePerQuestion: answeredCount > 0 ? totalDuration / answeredCount : 0,
                details: finalDetails,
                mode: location.state?.mode || 'standard', // Track mode for Drift Analysis
                isPro: isPro, // Track tier for Drift Analysis
                eqv: parseFloat(eqv.toFixed(4)) // Effective Question Variety (internal telemetry)
            });
            console.log('Quiz attempt saved successfully');

        } catch (error) {
            console.error("Error saving results:", error);
        }

        // Award XP
        // Base XP per question: 10
        // Bonus for score: score * 5
        const xpEarned = (questions.length * 10) + (score * 5);
        await XPService.awardXP(xpEarned, `Completed Quiz (${score}/${questions.length})`, activeExamId);

        // Update Subscription Context optimistically
        incrementDailyCount(quizDetails.length);

        // PERSISTENCE: Complete Diagnostic
        // PERSISTENCE: Complete Run
        if (activeRunId) {
            await QuizRunService.completeRun(userId, activeRunId, {
                score,
                totalQuestions: answeredCount,
                domainResults,
                timeSpent: totalDuration,
                averageTimePerQuestion: answeredCount > 0 ? totalDuration / answeredCount : 0,
                mode: location.state?.mode || 'standard'
            });
        }

        // Usage event: diagnostic completion
        if ((location.state?.mode || 'standard') === 'diagnostic' && userId) {
            UsageEventService.emit(userId, 'completion');
        }
    };

    const triggerSmartQuizReview = async (isPartial: boolean) => {
        const mode = location.state?.mode;
        // Only trigger for smart-family modes (smart, weakest, standard/undefined)
        if (mode === 'diagnostic' || mode === 'trap') return;

        // Open modal via app-level context (survives route changes)
        smartReview.openReview({ isPartial, isPro });

        // Free users: locked modal, no OpenAI call
        if (!isPro) return;

        try {
            const answeredCount = quizDetails.length;
            const total = isPartial ? answeredCount : questions.length;
            const percent = total > 0 ? Math.round((score / total) * 100) : 0;

            // Derive weakest domain from domainResults
            let weakest_domain: string = 'Process';
            let worstAccuracy = Infinity;
            for (const [domain, stats] of Object.entries(domainResults)) {
                if (stats.total > 0) {
                    const acc = stats.correct / stats.total;
                    if (acc < worstAccuracy) {
                        worstAccuracy = acc;
                        weakest_domain = domain;
                    }
                }
            }

            // Derive thinking traps summary
            const traps = Array.from(sessionTraps.values());
            const trapNames = traps.filter(t => t.count >= 1).map(t => t.pattern.pattern_name);
            const thinking_traps = trapNames.length > 0 ? trapNames.join(', ') : '';

            const generateReview = httpsCallable(functions, 'generateSmartQuizReview');
            const result = await generateReview({
                total,
                correct: score,
                percent,
                weakest_domain,
                thinking_traps
            });

            const data = result.data as { reviewText: string };
            smartReview.setReviewText(data.reviewText);
        } catch (error) {
            console.error('Failed to generate smart quiz review:', error);
            smartReview.setLoading(false);
        }
    };

    const handleNext = async () => {
        // Save details for the JUST FINISHED question
        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.correctAnswer;

        setQuizDetails(prev => [...prev, {
            questionId: currentQuestion.id,
            selectedOption,
            correctOption: currentQuestion.correctAnswer,
            isCorrect,
            domain: currentQuestion.domain,
            explanationViewed: explanationExpanded,
            actionLatency: explanationRenderTime ? (Date.now() - explanationRenderTime) / 1000 : null, // Metric: Time to Next
        }]);

        // PERSISTENCE: Save Progress
        if (activeRunId && auth.currentUser) {
            try {
                await QuizRunService.saveProgress(
                    auth.currentUser.uid,
                    activeRunId,
                    {
                        questionId: currentQuestion.id,
                        selectedOption: selectedOption !== null ? selectedOption : -1, // -1 for skip if allowed? Assuming selectedOption is required by UI
                        isCorrect: isCorrect
                    },
                    currentQuestionIndex + 1 // Next Index to resume from
                );
            } catch (e) {
                console.error("Failed to save progress", e);
            }
        }

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setShowExplanation(false);
            setExplanationExpanded(false);
            setTutorBreakdown(null);
            setDepthContent(null);
        } else {
            // End of quiz. We need to save this last question's details immediately before saving results.
            // But state updates are async. 
            // So we'll construct the final details array manually for the save function.
            const finalDetails = [...quizDetails, {
                questionId: currentQuestion.id,
                selectedOption,
                correctOption: currentQuestion.correctAnswer,
                isCorrect,
                domain: currentQuestion.domain,
                explanationViewed: explanationExpanded,
                actionLatency: explanationRenderTime ? (Date.now() - explanationRenderTime) / 1000 : null
            }];

            await saveQuizResults(finalDetails);
            triggerSmartQuizReview(false);

            // Re-enable Thinking Traps display after quiz completion
            localStorage.removeItem('exam_coach_traps_suppressed');

            setQuizCompleted(true);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading quiz...</div>;
    }

    if (questions.length === 0) {
        return <div className="min-h-screen flex items-center justify-center">No questions found. Please add some in the Admin CMS.</div>;
    }

    if (quizCompleted) {
        // DIAGNOSTIC SUMMARY (First Session Reveal)
        if (location.state?.mode === 'diagnostic') {
            const traps = Array.from(sessionTraps.values());
            const topTrap = traps.length > 0 ? traps.sort((a, b) => b.count - a.count)[0] : null;

            // Derive weakest domain for display
            let weakestDomain: string | null = null;
            let worstAcc = Infinity;
            for (const [domain, stats] of Object.entries(domainResults)) {
                if (stats.total > 0) {
                    const acc = stats.correct / stats.total;
                    if (acc < worstAcc) {
                        worstAcc = acc;
                        weakestDomain = domain;
                    }
                }
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950">
                    <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-black/20 text-center max-w-md w-full border border-slate-700 animate-in fade-in zoom-in duration-500">

                        <div className="mb-6">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                                <span className="text-4xl">🔎</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white font-display mb-2">Analysis Complete. Here’s what I found.</h2>
                            <p className="text-slate-400">I've mapped your baseline strengths and blind spots.</p>
                        </div>

                        {/* REVEAL LOGIC */}
                        {topTrap ? (
                            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 border border-indigo-500/30 rounded-xl p-6 mb-8 text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                <h3 className="text-indigo-300 font-bold uppercase tracking-wider text-xs mb-2">Insight Detected</h3>
                                <p className="text-white text-lg font-medium leading-relaxed mb-4">
                                    "You just encountered a common PMI Thinking Trap: <strong className="text-indigo-400">{topTrap.pattern.pattern_name}</strong>."
                                </p>
                                <p className="text-slate-400 text-sm italic border-l-2 border-indigo-500/30 pl-3">
                                    {topTrap.pattern.core_rule}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
                                <h3 className="text-slate-300 font-bold mb-2">Analysis</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    "As you practice, the system learns exactly how PMI patterns affect your answers. Keep going to unlock deeper insights."
                                </p>
                            </div>
                        )}

                        <div className="text-left mb-6">
                            <h4 className="text-slate-300 font-semibold text-sm mb-2">What this analysis means</h4>
                            <p className="text-slate-400 text-sm leading-relaxed mb-2">
                                This was not a pass/fail test. It was a short diagnostic designed to help us understand how you think and where you'll benefit most from practice.
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Based on your responses, we'll guide you toward your weakest domain so you can focus your time where it matters most.
                            </p>
                            {weakestDomain && (
                                <p className="text-slate-300 text-sm leading-relaxed mt-2">
                                    Based on your responses so far, your weakest domain appears to be <strong className="text-white">{weakestDomain}</strong>. That's where focused practice is likely to give you the fastest improvement.
                                </p>
                            )}
                            {topTrap && (
                                <p className="text-slate-400 text-sm leading-relaxed mt-2">
                                    We also noticed a recurring pattern related to <strong className="text-slate-300">{topTrap.pattern.pattern_name}</strong>. You may see questions designed to challenge this area as you continue — this helps strengthen real-world decision-making.
                                </p>
                            )}
                        </div>

                        {/* Mastery Explanation Disclosure */}
                        <div className="mb-6 text-left">
                            <button
                                onClick={() => setShowMasteryInfo(!showMasteryInfo)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mx-auto"
                            >
                                <span>Why you may see repeated questions</span>
                                {showMasteryInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {showMasteryInfo && (
                                <div className="mt-3 bg-slate-700/30 border border-slate-600 rounded-xl p-5 text-sm text-slate-400 space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-300 mb-1">How mastery works</h4>
                                        <p>ExamCoach confirms understanding by requiring correct answers more than once. This prevents progress through guessing and mirrors how the PMP exam tests consistency across scenarios.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-300 mb-1">About the questions</h4>
                                        <p>All questions are original and written to PMP standards. They are modeled on real exam patterns and domains — not copied from actual PMP exam questions.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {topTrap ? (
                                <button
                                    onClick={() => {
                                        if (isPro) {
                                            navigate('/app/quiz', {
                                                state: {
                                                    mode: 'trap',
                                                    patternId: topTrap.pattern.pattern_id,
                                                    patternName: topTrap.pattern.pattern_name,
                                                    domainTags: topTrap.pattern.domain_tags,
                                                    masteryScore: 0 // Reset for practice
                                                }
                                            });
                                        } else {
                                            setShowUpsell(true);
                                        }
                                    }}
                                    className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transition-all"
                                >
                                    {isPro ? `[ Practice This Trap ]` : `[ ${copy.pro_value_primary} ]`}
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/app/planner', {
                                        state: {
                                            source: 'diagnostic',
                                            recommendedDomain: weakestDomain
                                        }
                                    })}
                                    className="w-full bg-brand-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-brand-500 shadow-lg shadow-brand-500/30 transition-all"
                                >
                                    Continue to Your Study Plan
                                </button>
                            )}

                            {topTrap && (
                                <button
                                    onClick={() => navigate('/app/planner', {
                                        state: {
                                            source: 'diagnostic',
                                            recommendedDomain: weakestDomain
                                        }
                                    })}
                                    className="block text-slate-500 hover:text-white text-sm font-medium py-2 w-full"
                                >
                                    Continue to Your Study Plan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // TRAP MODE SUMMARY
        if (location.state?.mode === 'trap') {
            const accuracy = (score / questions.length) * 100;
            const trapName = location.state.patternName || "Thinking Trap";

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950">
                    <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-black/20 text-center max-w-md w-full border border-slate-700">
                        {/* Reinforcement Memory Generation */}
                        {(() => {
                            // Generate and store if not already done for this session
                            // We can use a simple check or just overwrite since it's the end of session
                            const REINFORCEMENT_KEY = 'exam_coach_reinforcement';

                            // Only generate if accuracy is decent (e.g. > 40%) to avoid reinforcing failure
                            if (accuracy > 40) {
                                const messages = [
                                    "You’re starting to recognize this trap earlier.",
                                    "You’re catching this pattern faster than before.",
                                    "This trap is becoming easier to spot."
                                ];
                                // Specific deterministic choice based on pattern name length to differ slightly per pattern but be consistent
                                const idx = (trapName.length + Math.floor(accuracy)) % messages.length;
                                const message = messages[idx];

                                try {
                                    localStorage.setItem(REINFORCEMENT_KEY, JSON.stringify({
                                        message,
                                        patternId: location.state.patternId,
                                        patternName: trapName,
                                        timestamp: Date.now()
                                    }));
                                } catch (e) {
                                    console.error("Failed to save reinforcement", e);
                                }
                            }
                            return null;
                        })()}

                        <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-500/20">
                            {accuracy > 70 ? '📈' : accuracy > 40 ? '⚖️' : '🔧'}
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2 font-display">{trapName}</h2>
                        <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider font-bold">Session Complete</p>

                        <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">Session Accuracy</span>
                                <span className={`font-bold text-lg ${accuracy > 70 ? 'text-emerald-400' : 'text-slate-200'}`}>
                                    {Math.round(accuracy)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4">
                                <div
                                    className={`h-2 rounded-full transition-all ${accuracy > 70 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                                    style={{ width: `${accuracy}%` }}
                                ></div>
                            </div>
                            <p className="text-slate-300 text-sm italic">
                                "{accuracy > 80
                                    ? "Excellent work. You successfully avoided the trap signals."
                                    : accuracy > 50
                                        ? "You’re starting to recognize this trap earlier. Keep going."
                                        : "This pattern is tricky. Review the core rule and try again tomorrow."}"
                            </p>
                        </div>

                        {/* Mastery Explanation Disclosure */}
                        <div className="mb-6 text-left">
                            <button
                                onClick={() => setShowMasteryInfo(!showMasteryInfo)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mx-auto"
                            >
                                <span>Why you may see repeated questions</span>
                                {showMasteryInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {showMasteryInfo && (
                                <div className="mt-3 bg-slate-700/30 border border-slate-600 rounded-xl p-5 text-sm text-slate-400 space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-300 mb-1">How mastery works</h4>
                                        <p>ExamCoach confirms understanding by requiring correct answers more than once. This prevents progress through guessing and mirrors how the PMP exam tests consistency across scenarios.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-300 mb-1">About the questions</h4>
                                        <p>All questions are original and written to PMP standards. They are modeled on real exam patterns and domains — not copied from actual PMP exam questions.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link to="/app" className="block w-full bg-brand-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-brand-500 shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-black/20 text-center max-w-md w-full border border-slate-700">
                    <h2 className="text-3xl font-bold text-white mb-4 font-display">Quiz Completed!</h2>
                    <p className="text-xl text-slate-300 mb-6">You scored <span className="font-bold text-brand-400">{score} / {questions.length}</span></p>

                    {/* Mastery Explanation Disclosure */}
                    <div className="mb-6 text-left">
                        <button
                            onClick={() => setShowMasteryInfo(!showMasteryInfo)}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mx-auto"
                        >
                            <span>Why you may see repeated questions</span>
                            {showMasteryInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showMasteryInfo && (
                            <div className="mt-3 bg-slate-700/30 border border-slate-600 rounded-xl p-5 text-sm text-slate-400 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-slate-300 mb-1">How mastery works</h4>
                                    <p>ExamCoach confirms understanding by requiring correct answers more than once. This prevents progress through guessing and mirrors how the PMP exam tests consistency across scenarios.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-300 mb-1">About the questions</h4>
                                    <p>All questions are original and written to PMP standards. They are modeled on real exam patterns and domains — not copied from actual PMP exam questions.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Thinking Trap Suggestion Logic */}
                    {(() => {
                        // Logic: Find first pattern with >= 2 misses
                        if (location.state?.mode === 'trap') return null; // Don't suggest while already in a trap session

                        const traps = Array.from(sessionTraps.values());
                        // Sort by count desc
                        traps.sort((a, b) => b.count - a.count);
                        const topTrap = traps[0];

                        // THRESHOLD: >= 2 misses to trigger suggestion
                        if (topTrap && topTrap.count >= 2) {
                            // COOLDOWN CHECK
                            const STORAGE_KEY = 'exam_coach_suggestion_history';
                            const COOLDOWN_HOURS = 4;

                            try {
                                const historyStr = localStorage.getItem(STORAGE_KEY);
                                if (historyStr) {
                                    const history = JSON.parse(historyStr);
                                    const lastId = history.patternId;
                                    const lastTime = history.timestamp;
                                    const now = Date.now();

                                    // If same pattern and within cooldown window, SUPPRESS
                                    if (lastId === topTrap.pattern.pattern_id && (now - lastTime) < (COOLDOWN_HOURS * 60 * 60 * 1000)) {
                                        console.log("Suppressing suggestion due to cooldown:", topTrap.pattern.pattern_name);
                                        return null;
                                    }
                                }

                                // valid suggestion, save to history (side effect in render is bad practice usually, but for this simple key update it's acceptable vs useEffect complexity)
                                // Better: We should ideally do this in a useEffect, but to keep the architecture simple for this MVP polish:
                                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                                    patternId: topTrap.pattern.pattern_id,
                                    timestamp: Date.now()
                                }));

                            } catch (e) {
                                console.error("Error reading suggestion history", e);
                            }

                            return (
                                <div className="mb-8 bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                    <div className="flex items-start gap-3 text-left">
                                        <div className="bg-indigo-500/20 p-2 rounded-lg text-xl">🛡️</div>
                                        <div>
                                            <h4 className="text-indigo-200 font-bold text-sm uppercase tracking-wide mb-1">
                                                Suggested Thinking Trap
                                            </h4>
                                            <h3 className="text-white font-bold text-lg mb-2">
                                                {topTrap.pattern.pattern_name}
                                            </h3>
                                            <p className="text-indigo-200/80 text-sm mb-4">
                                                This pattern may be worth practicing next.
                                            </p>

                                            <button
                                                onClick={() => {
                                                    if (isPro) {
                                                        navigate('/app/quiz', {
                                                            state: {
                                                                mode: 'trap',
                                                                patternId: topTrap.pattern.pattern_id,
                                                                patternName: topTrap.pattern.pattern_name,
                                                                domainTags: topTrap.pattern.domain_tags
                                                            }
                                                        });
                                                    } else {
                                                        setShowUpsell(true);
                                                    }
                                                }}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                                            >
                                                {isPro ? "[ Practice This Trap ]" : "[ Unlock Trap Mastery ]"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <Link to="/app" className="inline-block bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-500 shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 px-4 py-4 sticky top-0 z-50">
                <div className="mx-auto max-w-4xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {quizType === 'diagnostic' ? (
                            <button
                                onClick={async () => {
                                    if (window.confirm("Exit Diagnostic? Your progress will not be saved.")) {
                                        if (activeRunId) {
                                            const { QuizRunService } = await import('../services/QuizRunService');
                                            await QuizRunService.completeRun(auth.currentUser!.uid, activeRunId, {
                                                abort: true,
                                                score: score,
                                                totalQuestions: questions.length
                                            });
                                        }
                                        navigate('/app');
                                    }
                                }}
                                className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 group"
                            >
                                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="hidden sm:inline text-sm font-medium">Exit Diagnostic</span>
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    if (window.confirm("Quit and save your progress so far?")) {
                                        triggerSmartQuizReview(true);
                                        if (activeRunId) {
                                            // Unified Mode: Pause — navigate (modal survives in App.tsx)
                                            navigate('/app');
                                        } else {
                                            // Legacy Mode: Submit immediately
                                            // BUG FIX: If user has SUBMITTED the current question (showExplanation is true),
                                            // but not yet clicked NEXT, we need to include this question's details.
                                            let finalDetails = quizDetails;

                                            if (showExplanation) {
                                                const currentQuestion = questions[currentQuestionIndex];
                                                const isCorrect = selectedOption === currentQuestion.correctAnswer;

                                                finalDetails = [...quizDetails, {
                                                    questionId: currentQuestion.id,
                                                    selectedOption,
                                                    correctOption: currentQuestion.correctAnswer,
                                                    isCorrect,
                                                    domain: currentQuestion.domain,
                                                    explanationViewed: explanationExpanded,
                                                    actionLatency: explanationRenderTime ? (Date.now() - explanationRenderTime) / 1000 : null
                                                }];
                                            }

                                            await saveQuizResults(finalDetails);
                                            // Re-enable Thinking Traps display after quiz completion
                                            localStorage.removeItem('exam_coach_traps_suppressed');
                                            setQuizCompleted(true);
                                        }
                                    }
                                }}
                                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="hidden sm:inline text-sm font-medium">Quit & Save</span>
                            </button>
                        )}
                        <div className="h-6 w-px bg-slate-700"></div>
                        <span className="text-sm font-medium text-slate-400 font-display">{currentQuestion.domain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-400">Q{currentQuestionIndex + 1}</span>
                        <span className="text-sm text-slate-500">/ {questions.length}</span>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-800 w-full">
                <div
                    className="h-full bg-brand-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                {/* Mode Info Header */}
                <div className="w-full max-w-3xl mb-6">
                    {location.state?.mode === 'smart' ? (
                        <div className="bg-brand-900/30 border border-brand-500/30 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-2xl">🧠</span>
                            <div>
                                <h3 className="text-brand-300 font-bold mb-1">Daily Practice Mode</h3>
                                <p className="text-sm text-slate-300">
                                    Our AI selects questions to optimize your learning: introducing new topics while reviewing past material to ensure implementation.
                                </p>
                            </div>
                        </div>
                    ) : location.state?.mode === 'weakest' ? (
                        <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-2xl">⚡</span>
                            <div>
                                <h3 className="text-purple-300 font-bold mb-1">Smart Practice: {location.state.filterDomain}</h3>
                                <p className="text-sm text-slate-300">
                                    We identified <strong>{location.state.filterDomain}</strong> as your weakest area. This session is focused on turning that weakness into a strength.
                                </p>
                            </div>
                        </div>
                    ) : location.state?.filterDomain ? (
                        <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-2xl">⚡</span>
                            <div>
                                <h3 className="text-purple-300 font-bold mb-1">{location.state.filterDomain} Practice Mode</h3>
                                <p className="text-sm text-slate-300">
                                    This session targets the <strong>{location.state.filterDomain}</strong> domain to help you turn weaknesses into strengths.
                                </p>
                            </div>
                        </div>
                    ) : location.state?.mode === 'trap' ? (
                        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-2xl">🛡️</span>
                            <div>
                                <h3 className="text-indigo-300 font-bold mb-1">Trap Repair: {location.state.patternName}</h3>
                                <p className="text-sm text-slate-300">
                                    Focused practice to master this specific exam pattern.
                                </p>
                            </div>
                        </div>
                    ) : quizType === 'diagnostic' ? (
                        <div className="bg-gradient-to-r from-brand-900/30 to-brand-800/30 border border-brand-500/30 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-2xl">🔎</span>
                            <div>
                                <h3 className="text-brand-300 font-bold mb-1">I’m analyzing your logic, not just your score.</h3>
                                <p className="text-sm text-slate-300">
                                    Don't worry about getting these wrong. I'm just finding your baseline.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-2xl">📝</span>
                            <div>
                                <h3 className="text-slate-300 font-bold mb-1">General Practice Mode</h3>
                                <p className="text-sm text-slate-400">
                                    Standard practice mode using questions from the current exam config.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-3xl mb-4">
                    <QuestionProvenanceBadge />
                </div>

                <div className="w-full max-w-3xl">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 border border-slate-700 overflow-hidden">

                        {/* AI Scenario Image */}
                        {currentQuestion.imageUrl && (
                            <div className="w-full h-48 sm:h-64 bg-slate-900 relative overflow-hidden group">
                                <img
                                    src={currentQuestion.imageUrl}
                                    alt="Scenario Visualization"
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-105 transform"
                                />
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                        <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                        AI Scene
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Pre-Quiz Reinforcement Banner (Only on Q1) */}
                        {reinforcementMessage && currentQuestionIndex === 0 && (
                            <div className="px-8 pt-6 pb-0 animate-in slide-in-from-top-2 duration-700">
                                <p className="text-slate-500 text-xs italic text-center">
                                    {reinforcementMessage}
                                </p>
                            </div>
                        )}

                        <div className="p-8 md:p-10">
                            {questionProgressMap.has(currentQuestion.id) && (
                                <p className="text-xs text-slate-500 mb-2 tracking-wide uppercase">Mastery check</p>
                            )}
                            <h2 className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-8 font-display">
                                {currentQuestion.stem}
                            </h2>

                            <div className="space-y-3">
                                {currentQuestion.options.map((opt, i) => {
                                    let borderClass = 'border-slate-700 hover:border-brand-500/50 hover:bg-slate-700/50';
                                    let textClass = 'text-slate-300';
                                    let dotClass = 'border-slate-500 group-hover:border-brand-400';

                                    if (selectedOption === i) {
                                        borderClass = 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10';
                                        textClass = 'text-brand-300 font-medium';
                                        dotClass = 'border-brand-500 bg-brand-500';
                                    }

                                    if (showExplanation) {
                                        if (i === currentQuestion.correctAnswer) {
                                            borderClass = 'border-emerald-500 bg-emerald-500/10';
                                            textClass = 'text-emerald-300 font-medium';
                                            dotClass = 'border-emerald-500 bg-emerald-500';
                                        } else if (selectedOption === i) {
                                            borderClass = 'border-red-500 bg-red-500/10';
                                            textClass = 'text-red-300 font-medium';
                                            dotClass = 'border-red-500 bg-red-500';
                                        }
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleOptionSelect(i)}
                                            disabled={showExplanation}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group ${borderClass}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${dotClass}`}>
                                                {selectedOption === i && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <span className={`text-base ${textClass}`}>
                                                {opt}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {showExplanation && explanationExpanded && (
                                <div className="mt-6">
                                    <div className="bg-blue-900/20 rounded-lg border border-blue-500/30 text-blue-200 p-4 mb-4">
                                        <p className="font-bold mb-1 text-blue-100">Let’s walk through the thinking behind this question.</p>
                                    </div>

                                    {!tutorBreakdown && !loadingBreakdown ? (
                                        <div className="text-center p-4">
                                            <button
                                                onClick={() => fetchTutorBreakdown(currentQuestion, selectedOption!)}
                                                className="text-brand-400 hover:text-brand-300 underline"
                                            >
                                                {isPMPExam(currentQuestion.examId) ? 'View PMI Doctrine Explanation' : 'Load Coach Breakdown'}
                                            </button>
                                            <div className="mt-4 p-4 bg-slate-800/50 rounded text-slate-300 text-left">
                                                <p className="font-bold text-slate-400 text-xs uppercase mb-2">Standard Explanation</p>
                                                {currentQuestion.explanation}
                                            </div>
                                        </div>
                                    ) : isPMPExam(currentQuestion.examId) && tutorBreakdown ? (
                                        /* PMP Doctrine Explanation - Clean, pattern-based rendering */
                                        <div className="mt-6 bg-indigo-900/30 backdrop-blur-sm rounded-xl border border-indigo-500/30 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <div className="bg-indigo-900/50 px-6 py-3 border-b border-indigo-500/20 flex items-center gap-2">
                                                <span className="text-xl">📐</span>
                                                <h3 className="text-indigo-200 font-bold font-display">PMI Decision Doctrine</h3>
                                            </div>
                                            <div className="p-6">
                                                <div className="prose prose-invert prose-sm max-w-none">
                                                    {tutorBreakdown.examLens.split('\n\n').map((paragraph, idx) => (
                                                        <div key={idx} className="mb-4 last:mb-0">
                                                            {paragraph.startsWith('PMI Decision Lens:') ? (
                                                                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4 mb-4">
                                                                    <p className="text-emerald-300 font-bold text-lg">
                                                                        {paragraph}
                                                                    </p>
                                                                </div>
                                                            ) : paragraph.startsWith('Why this conflicts:') ? (
                                                                <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-4 mb-4">
                                                                    <h4 className="text-amber-400 font-bold text-sm mb-2">Why This Conflicts</h4>
                                                                    <p className="text-slate-300 text-sm leading-relaxed">
                                                                        {paragraph.replace('Why this conflicts:', '').trim()}
                                                                    </p>
                                                                </div>
                                                            ) : paragraph.startsWith('Pattern:') ? (
                                                                <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-4">
                                                                    <h4 className="text-blue-400 font-bold text-sm mb-2">🎯 Pattern to Remember</h4>
                                                                    <p className="text-blue-200 text-sm font-medium">
                                                                        {paragraph.replace('Pattern:', '').trim()}
                                                                    </p>
                                                                </div>
                                                            ) : paragraph.startsWith('Note:') ? (
                                                                <div className="bg-slate-800/50 rounded-lg p-4">
                                                                    <p className="text-slate-400 text-sm italic">
                                                                        {paragraph.replace('Note:', '💡').trim()}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-slate-300 text-sm leading-relaxed">
                                                                    {paragraph}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Legacy Coach Breakdown for non-PMP exams */
                                        <TutorBreakdown
                                            breakdown={tutorBreakdown}
                                            loading={loadingBreakdown}
                                            onExpandDepth={handleExpandDepth}
                                            depthContent={depthContent}
                                            depthLoading={depthLoading}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/30 px-8 py-4 border-t border-slate-700/50 flex justify-end">
                            {!showExplanation ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={selectedOption === null}
                                    className="bg-brand-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-brand-500/30 hover:bg-brand-500 hover:shadow-brand-500/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    Submit Answer
                                </button>
                            ) : (
                                <div className="flex gap-4">
                                    {!explanationExpanded && (
                                        <button
                                            onClick={() => setExplanationExpanded(true)}
                                            className="bg-blue-600/20 text-blue-300 border border-blue-500/30 px-6 py-3 rounded-xl font-medium hover:bg-blue-600/30 transition-all"
                                        >
                                            Show Explanation
                                        </button>
                                    )}
                                    <button
                                        onClick={handleNext}
                                        className="bg-brand-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-brand-500/30 hover:bg-brand-500 hover:shadow-brand-500/40 transition-all transform hover:-translate-y-0.5"
                                    >
                                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <footer className="py-6 text-center text-xs text-slate-600">
                v1.0.1
            </footer>

            <SubscriptionUpsellModal
                isOpen={showUpsell}
                onClose={() => window.location.href = '/app'}
                reason="daily_limit"
            />
        </div>
    );
}

