
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SmartQuizService } from '../services/smartQuiz';
import { XPService } from '../services/xpService';
import { Flag, Clock } from 'lucide-react';

interface Question {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    domain: string;
    examId?: string;
    imageUrl?: string;
}

export default function Simulator() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({}); // index -> selectedOption
    const [flagged, setFlagged] = useState<Record<number, boolean>>({}); // index -> boolean
    const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadExam = async () => {
            const user = auth.currentUser;
            const examId = localStorage.getItem('selectedExamId') || 'default-exam';

            if (!user) {
                navigate('/login');
                return;
            }

            try {
                // 1. Get IDs
                const ids = await SmartQuizService.generateSimulationExam(examId, 50);

                if (ids.length === 0) {
                    alert("No questions found for this exam.");
                    navigate('/simulator');
                    return;
                }

                // 2. Fetch full question objects
                const questionsData: Question[] = [];
                for (const id of ids) {
                    const docRef = doc(db, 'questions', id);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        questionsData.push({ id: snap.id, ...snap.data() } as Question);
                    }
                }
                setQuestions(questionsData);

            } catch (error) {
                console.error("Error loading exam:", error);
                alert("Failed to load exam. Please try again.");
                navigate('/simulator');
            } finally {
                setLoading(false);
            }
        };

        loadExam();
    }, []);

    // Timer
    useEffect(() => {
        if (loading || isSubmitting) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmitExam(true); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, isSubmitting]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    };

    const toggleFlag = () => {
        setFlagged(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
    };

    const handleSubmitExam = async (autoSubmit = false) => {
        if (!autoSubmit && !window.confirm("Are you sure you want to finish the exam? You cannot change your answers after submitting.")) {
            return;
        }

        setIsSubmitting(true);
        const user = auth.currentUser;
        if (!user) return;

        // Calculate Score
        let score = 0;
        const details: any[] = [];

        questions.forEach((q, index) => {
            const selected = answers[index];
            const isCorrect = selected === q.correctAnswer;
            if (isCorrect) score++;

            details.push({
                questionId: q.id,
                selectedOption: selected,
                correctOption: q.correctAnswer,
                isCorrect,
                domain: q.domain
            });
        });

        const timeSpent = 3600 - timeLeft;

        // Save Attempt
        try {
            await addDoc(collection(db, 'quizAttempts'), {
                userId: user.uid,
                examId: questions[0]?.examId || 'unknown',
                score,
                totalQuestions: questions.length,
                timestamp: new Date(),
                mode: 'simulation',
                timeSpent,
                details // For detailed review
            });

            // XP
            await XPService.awardXP(questions.length * 5 + score * 10, "Completed Exam Simulator");

            // Navigate to Results (passing data via state to avoid refetch)
            navigate('/simulator/results', {
                state: {
                    score,
                    total: questions.length,
                    timeSpent,
                    questions,
                    answers_map: answers
                }
            });

        } catch (error) {
            console.error("Error saving exam:", error);
            alert("Error saving results, but you can still view them.");
            navigate('/simulator/results', {
                state: {
                    score,
                    total: questions.length,
                    timeSpent,
                    questions,
                    answers_map: answers
                }
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Preparing Exam Environment...</p>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row h-screen overflow-hidden">
            {/* Sidebar (Navigation) */}
            <aside className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Questions</h2>
                    <div className="mt-2 flex items-center justify-between text-white font-mono text-xl font-bold bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                        <span className={timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}>
                            {formatTime(timeLeft)}
                        </span>
                        <Clock className="w-5 h-5 text-slate-500" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-5 gap-2 content-start">
                    {questions.map((_, idx) => {
                        const isAnswered = answers[idx] !== undefined;
                        const isFlagged = flagged[idx];
                        const isCurrent = idx === currentIndex;

                        let bgClass = "bg-slate-700 hover:bg-slate-600 text-slate-300";
                        if (isCurrent) bgClass = "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900";
                        else if (isFlagged) bgClass = "bg-amber-500/20 text-amber-400 border border-amber-500/50";
                        else if (isAnswered) bgClass = "bg-slate-600 text-slate-100";

                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center relative ${bgClass}`}
                            >
                                {idx + 1}
                                {isFlagged && <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full -mt-0.5 -mr-0.5"></div>}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={() => handleSubmitExam()}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition-colors mb-2"
                    >
                        Finish Exam
                    </button>
                    <button
                        onClick={() => navigate('/simulator')}
                        className="w-full text-slate-500 hover:text-white text-xs text-center p-2"
                    >
                        Quit Simulation
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
                {/* Header for Mobile */}
                <div className="md:hidden p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-white">Q {currentIndex + 1}/{questions.length}</span>
                    <span className="font-mono text-indigo-400 font-bold">{formatTime(timeLeft)}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full">
                    {/* Question Card */}
                    <div className="mb-6 flex justify-between items-start">
                        <span className="text-slate-400 font-mono text-sm">Question {currentIndex + 1} of {questions.length}</span>
                        <button
                            onClick={toggleFlag}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${flagged[currentIndex]
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            <Flag className={`w-4 h-4 ${flagged[currentIndex] ? 'fill-current' : ''}`} />
                            <span className="text-sm font-medium">{flagged[currentIndex] ? 'Flagged' : 'Flag for Review'}</span>
                        </button>
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-white mb-8 leading-relaxed">
                        {currentQ.stem}
                    </h2>

                    {currentQ.imageUrl && (
                        <div className="mb-8 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
                            <img src={currentQ.imageUrl} alt="Question Diagram" className="max-h-64 mx-auto md:max-h-80 object-contain p-4" />
                        </div>
                    )}

                    <div className="space-y-4 mb-12">
                        {currentQ.options.map((option, idx) => {
                            const isSelected = answers[currentIndex] === idx;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleOptionSelect(idx)}
                                    className={`group flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                        ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-600 text-transparent group-hover:border-slate-400'
                                        }`}>
                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-lg ${isSelected ? 'text-white font-medium' : 'text-slate-300 group-hover:text-white'}`}>
                                        {option}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Nav */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/95 backdrop-blur flex justify-between items-center max-w-4xl mx-auto w-full">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 rounded-lg font-medium text-slate-300 disabled:opacity-30 hover:bg-slate-800 transition-colors"
                    >
                        Previous
                    </button>

                    {currentIndex < questions.length - 1 ? (
                        <button
                            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            className="px-8 py-3 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            Next Question
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSubmitExam()}
                            className="px-8 py-3 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                        >
                            Finish & Submit
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
