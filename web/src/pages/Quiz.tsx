import { Link, useParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, query, getDocs, addDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { XPService } from '../services/xpService';

interface Question {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    domain: string;
    examId?: string;
    imageUrl?: string; // New field for AI image
}

export default function Quiz() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [domainResults, setDomainResults] = useState<Record<string, { correct: number; total: number }>>({});



    // ...

    const { examId: paramExamId } = useParams();
    const location = useLocation();
    const [activeExamId, setActiveExamId] = useState<string>('');

    useEffect(() => {
        // Determine the effective exam ID
        const storedExamId = localStorage.getItem('selectedExamId');
        const effectiveId = paramExamId || storedExamId || 'default-exam';
        setActiveExamId(effectiveId);
    }, [paramExamId]);

    // ...

    useEffect(() => {
        const fetchSmartQuestions = async () => {
            if (!activeExamId) return; // Wait for ID determination

            try {
                const user = auth.currentUser;
                if (!user) return;

                console.log("Fetching questions and progress for:", activeExamId);
                setLoading(true);

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
                const TARGET_SIZE = 10;
                let selected: Question[] = [];

                const shuffle = (arr: any[]) => arr.sort(() => 0.5 - Math.random());

                // A. Add all 'Learning' questions
                selected = [...selected, ...shuffle(learning)];

                // B. Fill with 'New' questions
                if (selected.length < TARGET_SIZE) {
                    const needed = TARGET_SIZE - selected.length;
                    selected = [...selected, ...shuffle(newQs).slice(0, needed)];
                }

                // C. Fill with 'Mastered' questions
                // If filtering by specific domain, we ALLOW mastered questions to fill the quiz
                // to ensure the user gets a full 10-question set if available.
                if (selected.length < TARGET_SIZE && mastered.length > 0) {
                    const needed = TARGET_SIZE - selected.length;

                    // If filterDomain is active, we are more aggressive about reusing mastered content
                    // to ensure the user can practice the specific domain they clicked.
                    const toTake = filterDomain ? needed : Math.min(needed, Math.ceil(TARGET_SIZE * 0.3));

                    selected = [...selected, ...shuffle(mastered).slice(0, toTake)]; // Just take what is needed
                }

                selected = selected.slice(0, TARGET_SIZE);
                console.log("Selected Smart Questions:", selected);
                setQuestions(selected);

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

        setShowExplanation(true);

        // Save Granular Question Progress (SRS)
        updateQuestionProgress(currentQuestion.id, isCorrect);
    };

    const updateQuestionProgress = async (questionId: string, isCorrect: boolean) => {
        const user = auth.currentUser;
        if (!user) return;

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

    const saveQuizResults = async () => {
        const user = auth.currentUser;
        if (!user) {
            console.error("No user logged in, cannot save results");
            return;
        }

        const userId = user.uid;
        const activeExamId = questions[currentQuestionIndex]?.examId || 'default-exam';
        const masteryId = `${userId}_${activeExamId}`;
        const masteryRef = doc(db, 'userMastery', masteryId);

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
            const totalDuration = questionDurations.reduce((a, b) => a + b, 0);
            const avgTime = totalDuration / questions.length;

            const attemptRef = collection(db, 'quizAttempts');
            await addDoc(attemptRef, {
                userId,
                examId: activeExamId,
                score,
                totalQuestions: questions.length,
                timestamp: new Date(),
                domain: 'Mixed', // For now, since quizzes are mixed. Could be specific if we filter later.
                timeSpent: totalDuration,
                averageTimePerQuestion: avgTime
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
    };

    const handleNext = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            await saveQuizResults();
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
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-black/20 text-center max-w-md w-full border border-slate-700">
                    <h2 className="text-3xl font-bold text-white mb-4 font-display">Quiz Completed!</h2>
                    <p className="text-xl text-slate-300 mb-6">You scored <span className="font-bold text-brand-400">{score} / {questions.length}</span></p>
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
                        <Link to="/app" className="text-slate-400 hover:text-white transition-colors">
                            <span className="sr-only">Exit</span>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Link>
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
            <main className="flex-1 flex items-center justify-center p-4">
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

                        <div className="p-8 md:p-10">
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

                            {showExplanation && (
                                <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30 text-blue-200">
                                    <p className="font-bold mb-1 text-blue-100">Explanation:</p>
                                    <p>{currentQuestion.explanation}</p>
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
                                <button
                                    onClick={handleNext}
                                    className="bg-brand-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-brand-500/30 hover:bg-brand-500 hover:shadow-brand-500/40 transition-all transform hover:-translate-y-0.5"
                                >
                                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <footer className="py-6 text-center text-xs text-slate-600">
                v1.0.1
            </footer>
        </div>
    );
}
