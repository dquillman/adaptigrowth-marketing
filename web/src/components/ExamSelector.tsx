import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';

interface Exam {
    id: string;
    name: string;
}

interface ExamSelectorProps {
    currentExamId: string;
    onExamChange: (examId: string) => void;
}

export default function ExamSelector({ currentExamId, onExamChange }: ExamSelectorProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // Filter for published exams only
                const q = query(collection(db, 'exams'), where('isPublished', '==', true));
                const snapshot = await getDocs(q);

                const fetchedExams = snapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name || 'Unnamed Exam'
                }));
                setExams(fetchedExams);
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, []);

    const handleSelect = (examId: string) => {
        onExamChange(examId);
        setIsOpen(false);
    };

    const currentExamName = exams.find(e => e.id === currentExamId)?.name || 'Select Exam';

    if (loading) return <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse" />;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-white font-medium transition-all"
            >
                <span>{currentExamName}</span>
                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                        {exams.map((exam) => (
                            <button
                                key={exam.id}
                                onClick={() => handleSelect(exam.id)}
                                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between
                                    ${currentExamId === exam.id
                                        ? 'bg-brand-500/10 text-brand-300'
                                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {exam.name}
                                {currentExamId === exam.id && (
                                    <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
