import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';


interface DomainStats {
    correct: number;
    total: number;
}

export default function MasteryDetail() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [masteryData, setMasteryData] = useState<Record<string, DomainStats>>({});
    const [examDomains, setExamDomains] = useState<string[]>([]);
    const [examName, setExamName] = useState('Exam');

    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;

            const examId = localStorage.getItem('selectedExamId') || 'default-exam';
            const userId = auth.currentUser.uid;

            // 1. Fetch Exam Details (for Domain list)
            const examRef = doc(db, 'exams', examId);
            const examSnap = await getDoc(examRef);
            if (examSnap.exists()) {
                const data = examSnap.data();
                setExamDomains(data.domains || []);
                setExamName(data.name || 'Exam');
            }

            // 2. Listen to User Mastery
            const masteryId = `${userId}_${examId}`;
            const masteryRef = doc(db, 'userMastery', masteryId);

            const unsubscribe = onSnapshot(masteryRef, (docSnap) => {
                if (docSnap.exists()) {
                    setMasteryData(docSnap.data().masteryData || {});
                }
                setLoading(false);
            });

            return () => unsubscribe();
        };

        fetchData();
    }, []);

    const getDomainAccuracy = (domain: string) => {
        const stats = masteryData[domain];
        if (!stats || stats.total === 0) return 0;
        return Math.round((stats.correct / stats.total) * 100);
    };

    const handlePracticeDomain = async (domain: string) => {
        if (!auth.currentUser) return;

        // Navigate to quiz with specific domain intent
        // Note: The Quiz component needs to handle 'domain' in location state
        // For now, we will assume Quiz.tsx can handle a single domain filter passed in state
        navigate('/quiz', { state: { mode: 'practice', filterDomain: domain } });
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading mastery data...</div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold font-display">{examName} Mastery</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 mx-auto max-w-7xl w-full py-8 px-4 sm:px-6 lg:px-8">

                {/* Summary Stats Could Go Here */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {examDomains.map((domain) => {
                        const accuracy = getDomainAccuracy(domain);
                        const stats = masteryData[domain] || { correct: 0, total: 0 };

                        // Color coding based on accuracy
                        let colorClass = "bg-red-500";
                        if (accuracy >= 80) colorClass = "bg-emerald-500";
                        else if (accuracy >= 60) colorClass = "bg-yellow-500";

                        return (
                            <div key={domain} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 flex flex-col hover:border-slate-600 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg text-slate-100 break-all pr-2">{domain}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${accuracy >= 80 ? 'bg-emerald-500/20 text-emerald-400' : accuracy >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {accuracy}%
                                    </span>
                                </div>

                                <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-1000 ${colorClass}`}
                                        style={{ width: `${accuracy}%` }}
                                    ></div>
                                </div>

                                <p className="text-sm text-slate-400 mb-6">
                                    {stats.correct} / {stats.total} correct
                                </p>

                                <button
                                    onClick={() => handlePracticeDomain(domain)}
                                    className="mt-auto w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 h-auto whitespace-normal text-center"
                                >
                                    <span className="shrink-0">🎯</span> Practice {domain}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
