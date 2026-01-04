import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Exam {
    id: string;
    name: string;
    description: string;
    questionCount: number;
}

export default function ExamList() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'exams'));
                const examsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Exam[];
                // Filter out unpublished exams
                setExams(examsData.filter((e: any) => e.isPublished));
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white font-display tracking-tight">Available Exams</h1>
                        <p className="text-slate-400 mt-1">Select an exam to start practicing.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam) => (
                        <div key={exam.id} className="bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-brand-500/30 transition-all hover:shadow-lg hover:shadow-brand-500/10 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-slate-500 bg-slate-950/50 px-2 py-1 rounded-lg border border-white/5">
                                    {exam.questionCount} Qs
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 font-display">{exam.name}</h3>
                            <p className="text-slate-400 text-sm mb-6 line-clamp-2">{exam.description}</p>

                            <Link
                                to="/"
                                onClick={() => {
                                    localStorage.setItem('selectedExamId', exam.id);
                                }}
                                className="block w-full text-center bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-500 transition-colors shadow-lg shadow-brand-900/20"
                            >
                                Select Exam
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
