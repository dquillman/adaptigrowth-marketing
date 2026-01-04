import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AIGenerator from '../components/AIGenerator';

interface Exam {
    id: string;
    name: string;
    description: string;
    questionCount: number;
    domains?: string[];
    isPublished?: boolean;
}

export default function Dashboard() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    console.log("Dashboard v0.1.7 Loaded - Premium UI Active");
    const [showGenerator, setShowGenerator] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'exams'));
            const examsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Exam[];
            setExams(examsData);
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'exams', examId));
                setExams(exams.filter(e => e.id !== examId));
            } catch (error) {
                console.error("Error deleting exam:", error);
                alert("Failed to delete exam. Check console.");
            }
        }
    };

    const handleGenerateClick = (examId: string) => {
        setSelectedExamId(examId);
        setShowGenerator(true);
    };

    const [importing, setImporting] = useState(false);

    const handleImportClick = () => {
        document.getElementById('csvInput')?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const { parseExamCSV } = await import('../utils/csvParser');
            const importedExams = parseExamCSV(text);

            console.log("Importing exams:", importedExams);

            try {
                for (const exam of importedExams) {
                    await addDoc(collection(db, 'exams'), {
                        ...exam,
                        questionCount: 0,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
                alert(`Successfully imported ${importedExams.length} exams!`);
                fetchExams();
            } catch (error) {
                console.error("Error importing exams:", error);
                alert("Failed to import exams.");
            } finally {
                setImporting(false);
                if (event.target) event.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
    );

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-bold text-white font-display tracking-tight">Exam Management</h2>
                    <p className="text-slate-400 mt-2 text-lg">Orchestrate your content and AI generation pipelines.</p>
                </div>
                <div className="flex gap-4">
                    <input
                        type="file"
                        id="csvInput"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={handleImportClick}
                        disabled={importing}
                        className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-2"
                    >
                        {importing ? 'Importing...' : 'Import CSV'}
                    </button>
                    <button
                        onClick={() => navigate('/exams/new')}
                        className="bg-white text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-brand-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Exam
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {exams.map((exam) => (
                    <div key={exam.id} className="group relative bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:border-brand-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(2,132,199,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-3">
                                    <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center text-brand-400 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300 shadow-inner border border-white/5">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-slate-950/50 text-slate-400 text-xs font-bold px-3 py-1 rounded-full border border-white/5 uppercase tracking-wider">
                                        {exam.questionCount} Items
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${exam.isPublished ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                        {exam.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-3 font-display tracking-tight group-hover:text-brand-200 transition-colors">{exam.name}</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{exam.description}</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleGenerateClick(exam.id)}
                                    className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:from-brand-500 hover:to-indigo-500 transition-all shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 group/btn"
                                >
                                    <svg className="w-4 h-4 group-hover/btn:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Generate 100 Questions
                                </button>
                                <div className="flex gap-3">
                                    <Link
                                        to={`/exams/${exam.id}`}
                                        className="flex-1 px-5 py-3 bg-slate-800/50 text-slate-300 rounded-xl text-sm font-bold hover:bg-white hover:text-slate-950 transition-all border border-white/5 text-center"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteExam(exam.id)}
                                        className="px-3 py-3 bg-slate-800 text-slate-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-slate-700"
                                        title="Delete Exam"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showGenerator && selectedExamId && (
                <AIGenerator
                    examId={selectedExamId}
                    availableDomains={exams.find(e => e.id === selectedExamId)?.domains || []}
                    onClose={() => setShowGenerator(false)}
                />
            )}
        </div>
    );
}
