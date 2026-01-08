import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SmartQuizService } from '../services/smartQuiz';
import { XPService } from '../services/xpService';

export interface Question {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    domain: string;
    examId?: string;
    imageUrl?: string;
}

export const useSimulator = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [flagged, setFlagged] = useState<Record<number, boolean>>({});
    const [timeLeft, setTimeLeft] = useState(3600); // Default 60 mins
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentExamId, setCurrentExamId] = useState<string>('default-exam');

    useEffect(() => {
        const loadExam = async () => {
            const user = auth.currentUser;
            const examId = localStorage.getItem('selectedExamId') || 'default-exam';
            setCurrentExamId(examId);

            if (!user) {
                navigate('/login');
                return;
            }

            try {
                // Check if directed from Planner with specific settings
                const state = location.state as { mode?: string; count?: number; durationMinutes?: number } | null;

                // Default to 50 questions (Standard Drill)
                let questionCount = 50;
                let durationSeconds = questionCount * 72; // ~1.2 mins per question

                if (state?.mode === 'full-mock') {
                    // PMP Standard: 180 questions, 230 minutes (3h 50m)
                    questionCount = 180;
                    durationSeconds = 230 * 60;
                } else if (state?.count) {
                    // Custom overrides
                    questionCount = state.count;
                    if (state.durationMinutes) {
                        durationSeconds = state.durationMinutes * 60;
                    } else {
                        durationSeconds = questionCount * 72;
                    }
                }

                setTimeLeft(durationSeconds);

                // Note: The SmartQuizService might need to handle fetching 180 unique questions.
                // If the DB is small, this might return duplicates or fewer questions.
                const ids = await SmartQuizService.generateSimulationExam(examId, questionCount);

                if (ids.length === 0) {
                    alert("No questions found for this exam.");
                    navigate('/app/simulator');
                    return;
                }

                const questionsData: Question[] = [];
                // In a real app, we'd batch this or use a where 'in' query if ID limit permits
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
                navigate('/app/simulator');
            } finally {
                setLoading(false);
            }
        };

        loadExam();
    }, [navigate]);

    useEffect(() => {
        if (loading || isSubmitting) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitExam(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, isSubmitting]);

    const handleAnswer = useCallback((optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    }, [currentIndex]);

    const handleFlag = useCallback(() => {
        setFlagged(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
    }, [currentIndex]);

    const submitExam = async (autoSubmit = false) => {
        if (!autoSubmit && !window.confirm("Are you sure you want to finish the exam?")) {
            return;
        }

        setIsSubmitting(true);
        const user = auth.currentUser;
        if (!user) return;

        let score = 0;
        const details: { questionId: string; selectedOption: number; correctOption: number; isCorrect: boolean; domain: string; }[] = [];

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

        const timeSpent = (questions.length * 72) - timeLeft; // Crude calc based on initial time

        try {
            await addDoc(collection(db, 'quizAttempts'), {
                userId: user.uid,
                examId: currentExamId,
                score,
                totalQuestions: questions.length,
                timestamp: new Date(),
                mode: 'simulation',
                timeSpent,
                details
            });

            await XPService.awardXP(questions.length * 5 + score * 10, "Completed Exam Simulator");

            navigate('/app/simulator/results', {
                state: {
                    score,
                    total: questions.length,
                    timeSpent,
                    questions,
                    answers_map: answers,
                    flagged
                }
            });

        } catch (error) {
            console.error("Error saving exam:", error);
            // Fallback navigation
            navigate('/app/simulator/results', {
                state: { score, total: questions.length, timeSpent, questions, answers_map: answers, flagged }
            });
        }
    };

    return {
        loading,
        questions,
        currentIndex,
        setCurrentIndex,
        answers,
        flagged,
        timeLeft,
        handleAnswer,
        handleFlag,
        submitExam
    };
};
