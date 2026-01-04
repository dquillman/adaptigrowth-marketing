import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import ReactMarkdown from 'react-markdown';
import BlueprintEditor from '../components/BlueprintEditor';
import AnalyticsCharts from '../components/AnalyticsCharts';
import RichTextEditor from '../components/RichTextEditor';
import AIGenerator from '../components/AIGenerator';
import { AutoLeveler } from '../services/AutoLeveler';

interface Question {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    domain?: string;
    difficulty?: string;
    imageUrl?: string | null;
}

export default function ExamEditor() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const isNew = examId === 'new';

    // Tabs: 'settings' | 'questions'
    const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');

    // Exam Data
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [domains, setDomains] = useState<string[]>(['People', 'Process', 'Business Environment']);
    const [blueprint, setBlueprint] = useState<any[]>([]); // Store blueprint for weights
    const [isPublished, setIsPublished] = useState(false);

    // Auto-Leveling Config
    const [totalQuestions, setTotalQuestions] = useState(200);
    const [easyPct, setEasyPct] = useState(10);
    const [mediumPct, setMediumPct] = useState(45);
    const [hardPct, setHardPct] = useState(45);

    // Questions Data
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // UI States
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);

    // Edit State
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [isLeveling, setIsLeveling] = useState(false);
    const [levelingStatus, setLevelingStatus] = useState('');

    // Filter State
    const [filterDomain, setFilterDomain] = useState<string>('All');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('All');

    useEffect(() => {
        if (!isNew && examId) {
            fetchExam(examId);
            fetchQuestions(examId);
        }
    }, [examId, isNew]);

    const fetchExam = async (id: string) => {
        try {
            const docRef = doc(db, 'exams', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name);
                setDescription(data.description);
                setIsPublished(data.isPublished || false);
                setBlueprint(data.blueprint?.map((b: any) => ({
                    ...b,
                    weight: typeof b.weight === 'string'
                        ? parseInt(b.weight.replace(/%/g, '')) || 0
                        : b.weight || 0
                })) || []);

                // Load Config
                if (data.config) {
                    setTotalQuestions(data.config.totalQuestions || 200);
                    setEasyPct(data.config.easyPct || 10);
                    setMediumPct(data.config.mediumPct || 45);
                    setHardPct(data.config.hardPct || 45);
                }

                if (data.domains && Array.isArray(data.domains)) {
                    setDomains(data.domains);
                }
            }
        } catch (error) {
            console.error("Error fetching exam:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (id: string) => {
        setLoadingQuestions(true);
        try {
            const q = query(collection(db, 'questions'), where('examId', '==', id));
            const querySnapshot = await getDocs(q);
            const qs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Question[];
            setQuestions(qs);
        } catch (error) {
            console.error("Error fetching questions:", error);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();

        if (easyPct + mediumPct + hardPct !== 100) {
            alert(`Difficulty percentages must sum to 100%. Current sum: ${easyPct + mediumPct + hardPct}%`);
            return;
        }

        setSaving(true);
        try {
            const examData = {
                name,
                description,
                domains: domains.filter(d => d.trim() !== ''), // Filter empty strings
                blueprint: blueprint.map(b => ({ ...b, weight: Number(b.weight) || 0 })), // Ensure numbers
                isPublished,
                config: {
                    totalQuestions,
                    easyPct,
                    mediumPct,
                    hardPct
                },
                updatedAt: new Date(),
                // Only set questionCount on creation if it doesn't exist, otherwise trust the increment logic
                ...(isNew && { questionCount: 0 })
            };

            if (isNew) {
                const docRef = await addDoc(collection(db, 'exams'), examData);
                navigate(`/exams/${docRef.id}`); // Navigate to the new exam's editor
            } else if (examId) {
                await setDoc(doc(db, 'exams', examId), examData, { merge: true });
                alert("Settings saved!");
            }
        } catch (error) {
            console.error("Error saving exam:", error);
            alert("Failed to save exam");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (questionId: string) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await deleteDoc(doc(db, 'questions', questionId));
            setQuestions(questions.filter(q => q.id !== questionId));

            // Decrement count
            if (examId) {
                await updateDoc(doc(db, 'exams', examId), {
                    questionCount: increment(-1)
                });
            }
        } catch (error) {
            console.error("Error deleting question:", error);
            alert("Failed to delete question");
        }
    };

    const handleEditClick = (q: Question) => {
        setEditingQuestion(q);
    };



    const handleDeleteAllQuestions = async () => {
        if (!examId) return;

        // Double confirmation for safety
        if (!window.confirm("⚠️ WARNING: This will delete ALL questions for this exam.")) return;
        if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return;

        try {
            const functions = getFunctions();
            const deleteFn = httpsCallable(functions, 'deleteExamQuestions');

            await deleteFn({ examId });

            alert('All questions deleted successfully.');
            fetchQuestions(examId);
            fetchExam(examId); // Update count
        } catch (error) {
            console.error("Error deleting questions:", error);
            alert("Failed to delete questions. Check console.");
        }
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(questions, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `${name.replace(/\s+/g, '_')}_questions.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleAutoLevel = async () => {
        if (!examId) return;
        setIsLeveling(true);
        setLevelingStatus("Analyzing current distribution...");

        const config = {
            targetTotal: totalQuestions,
            ratios: {
                Easy: easyPct / 100,
                Medium: mediumPct / 100,
                Hard: hardPct / 100
            }
        };

        try {
            const report = await AutoLeveler.analyze(examId, domains, blueprint, config);
            const gaps = report.filter(r => r.current < r.target);

            if (gaps.length === 0) {
                alert(`Exam matches target of ${totalQuestions} questions with defined ratios! No gaps found.`);
                setIsLeveling(false);
                return;
            }

            const totalMissing = gaps.reduce((sum, r) => sum + (r.target - r.current), 0);
            const breakdown = gaps.map(r => `• ${r.domain} (${r.difficulty}): +${r.target - r.current}`).join('\n');

            if (!window.confirm(`Target: ${totalQuestions} Questions\nFound ${totalMissing} missing questions to reach target:\n\n${breakdown}\n\nProceed with Auto-Generation?`)) {
                setIsLeveling(false);
                return;
            }

            setLevelingStatus("Initializing Auto-Leveler Agents...");

            const finalReport = await AutoLeveler.execute(examId, domains, blueprint, config, (status) => {
                setLevelingStatus(status);
            });

            const actuallyGenerated = finalReport.reduce((sum, r) => sum + r.generated, 0);
            alert(`Auto-Leveling Complete! Generated ${actuallyGenerated} new questions.`);
            fetchQuestions(examId);
            fetchExam(examId);

        } catch (error) {
            console.error("Auto-Leveling failed:", error);
            alert("Auto-Leveling encountered an error. Check console.");
        } finally {
            setIsLeveling(false);
            setLevelingStatus('');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            setImporting(true);
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = async (event) => {
                try {
                    if (event.target?.result && typeof event.target.result === 'string') {
                        const importedQuestions = JSON.parse(event.target.result);
                        if (!Array.isArray(importedQuestions)) throw new Error("Invalid format: Expected array");

                        let count = 0;
                        for (const q of importedQuestions) {
                            // Basic validation
                            if (!q.stem || !q.options || q.correctAnswer === undefined) continue;

                            await addDoc(collection(db, 'questions'), {
                                ...q,
                                examId: examId, // Force current exam ID
                                importedAt: new Date()
                            });
                            count++;
                        }

                        // Update count
                        if (examId) {
                            await updateDoc(doc(db, 'exams', examId), {
                                questionCount: increment(count)
                            });
                        }

                        alert(`Successfully imported ${count} questions!`);
                        if (examId) fetchQuestions(examId);
                    }
                } catch (error) {
                    console.error("Import error:", error);
                    alert("Failed to import. Check JSON format.");
                } finally {
                    setImporting(false);
                    // Reset input
                    e.target.value = '';
                }
            };
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
    );

    const handleAddQuestion = () => {
        setEditingQuestion({
            id: 'new_' + Date.now(),
            stem: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: '',
            domain: domains[0] || '',
            difficulty: 'Medium',
            imageUrl: ''
        });
    };

    const toggleSelectQuestion = (id: string) => {
        const newSelected = new Set(selectedQuestionIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedQuestionIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedQuestionIds.size} questions?`)) return;

        try {
            const batchPromises = Array.from(selectedQuestionIds).map(id => deleteDoc(doc(db, 'questions', id)));
            await Promise.all(batchPromises);

            // Update UI
            setQuestions(questions.filter(q => !selectedQuestionIds.has(q.id)));
            setSelectedQuestionIds(new Set());

            // Update count
            if (examId) {
                await updateDoc(doc(db, 'exams', examId), {
                    questionCount: increment(-selectedQuestionIds.size)
                });
            }
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert("Failed to delete selection.");
        }
    };

    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingQuestion) return;

        try {
            if (editingQuestion.id.startsWith('new_')) {
                // Add new
                const { id, ...data } = editingQuestion;
                await addDoc(collection(db, 'questions'), {
                    ...data,
                    examId: examId,
                    createdAt: new Date()
                });

                // Update count
                if (examId) {
                    await updateDoc(doc(db, 'exams', examId), {
                        questionCount: increment(1)
                    });
                }
            } else {
                // Update existing
                const { id, ...data } = editingQuestion;
                await setDoc(doc(db, 'questions', id), data, { merge: true });
            }

            // Refresh local state (simplified)
            if (examId) fetchQuestions(examId);
            setEditingQuestion(null);
        } catch (error) {
            console.error("Error saving question:", error);
            alert("Failed to save question");
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-white font-display tracking-tight">
                            {isNew ? 'Create New Exam' : name || 'Edit Exam'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs border ${isPublished ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-400 border-white/5'}`}>
                                {isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            <p className="text-slate-400">Manage exam details and content.</p>
                        </div>
                    </div>
                </div>

                {!isNew && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">Published</span>
                        <button
                            onClick={() => setIsPublished(!isPublished)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${isPublished ? 'bg-brand-500' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                        <div className="h-6 w-px bg-white/10 mx-2"></div>
                        <button
                            type="submit"
                            form="exam-settings-form"
                            disabled={saving}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'settings'
                                ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            {!isNew && (
                <div className="flex gap-1 bg-slate-900/40 p-1 rounded-xl border border-white/5 w-fit">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings'
                            ? 'bg-brand-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'questions'
                            ? 'bg-brand-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Questions ({questions.length})
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">

                {/* SETTINGS TAB */}
                {(activeTab === 'settings' || isNew) && (
                    <form id="exam-settings-form" onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Exam Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. AWS Solutions Architect"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-lg"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the certification..."
                                rows={4}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-lg resize-none"
                            />
                        </div>

                        {/* Exam Configuration */}
                        <div className="bg-slate-950/30 rounded-xl border border-white/5 p-6 space-y-6">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Configuration
                            </h3>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Questions Target</label>
                                    <input
                                        type="number"
                                        value={totalQuestions}
                                        onChange={(e) => setTotalQuestions(Number(e.target.value))}
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    {/* Spacer or Total Check */}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Difficulty Distribution (%)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">Easy</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={easyPct}
                                                onChange={(e) => setEasyPct(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                                            />
                                            <span className="absolute right-3 top-2 text-slate-600">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">Medium</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={mediumPct}
                                                onChange={(e) => setMediumPct(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                                            />
                                            <span className="absolute right-3 top-2 text-slate-600">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">Hard</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={hardPct}
                                                onChange={(e) => setHardPct(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 font-bold focus:border-red-500 focus:outline-none"
                                            />
                                            <span className="absolute right-3 top-2 text-slate-600">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-xs mt-2 text-right font-mono ${easyPct + mediumPct + hardPct === 100 ? 'text-green-500' : 'text-red-500'}`}>
                                    Total: {easyPct + mediumPct + hardPct}% {easyPct + mediumPct + hardPct !== 100 && '(Must equal 100)'}
                                </div>
                            </div>
                        </div>

                        {/* Analytics & Blueprint */}
                        <div>
                            <AnalyticsCharts blueprint={blueprint} questions={questions} domains={domains} />
                        </div>

                        <BlueprintEditor
                            blueprint={blueprint}
                            onChange={(newBlueprint) => {
                                setBlueprint(newBlueprint);
                                setDomains(newBlueprint.map(b => b.domain));
                            }}
                        />

                        <div className="pt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-brand-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-900/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}

                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && !isNew && (
                    <div className="space-y-6">
                        {/* Toolbar */}
                        <div className="flex justify-between items-center pb-6 border-b border-white/5">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleDeleteAllQuestions}
                                    className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete All
                                </button>
                                <div className="h-6 w-px bg-white/10 mx-2"></div>
                                <select
                                    value={filterDomain}
                                    onChange={(e) => setFilterDomain(e.target.value)}
                                    className="bg-slate-800 text-slate-300 rounded-lg text-sm font-bold px-3 py-2 border border-white/5 focus:outline-none focus:border-brand-500 hover:bg-slate-700 transition-colors"
                                >
                                    <option value="All">All Domains</option>
                                    {domains.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterDifficulty}
                                    onChange={(e) => setFilterDifficulty(e.target.value)}
                                    className="bg-slate-800 text-slate-300 rounded-lg text-sm font-bold px-3 py-2 border border-white/5 focus:outline-none focus:border-brand-500 hover:bg-slate-700 transition-colors"
                                >
                                    <option value="All">All Difficulties</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                                <button
                                    onClick={handleExport}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold hover:bg-white hover:text-slate-900 transition-all border border-white/5 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Export JSON
                                </button>
                                <label className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold hover:bg-white hover:text-slate-900 transition-all border border-white/5 flex items-center gap-2 cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    {importing ? 'Importing...' : 'Import JSON'}
                                    <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
                                </label>
                            </div>
                            <div className="flex gap-2">
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAutoLevel}
                                    disabled={isLeveling}
                                    className={`px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 ${isLeveling ? 'opacity-75 cursor-wait' : ''}`}
                                >
                                    {isLeveling ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="truncate max-w-[150px]">{levelingStatus || 'Leveling...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Auto Level
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowAIGenerator(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    AI Gen
                                </button>
                                <button
                                    onClick={handleAddQuestion}
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20"
                                >
                                    + Add Question
                                </button>
                            </div>
                        </div>

                        {/* Bulk Actions Toolbar */}
                        {selectedQuestionIds.size > 0 && (
                            <div className="bg-brand-900/50 border border-brand-500/30 rounded-xl p-3 flex justify-between items-center animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-brand-100 pl-2">{selectedQuestionIds.size} selected</span>
                                    <div className="h-4 w-px bg-brand-500/30"></div>
                                    <button
                                        onClick={() => setSelectedQuestionIds(new Set())}
                                        className="text-xs text-brand-300 hover:text-white"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete Selected
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        {loadingQuestions ? (
                            <div className="text-center py-12 text-slate-500">Loading questions...</div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                                No questions found. Import some or add one manually!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {questions.filter(q => {
                                    const domainMatch = filterDomain === 'All' || q.domain === filterDomain;
                                    const difficultyMatch = filterDifficulty === 'All' || (q.difficulty || 'Medium') === filterDifficulty;
                                    return domainMatch && difficultyMatch;
                                }).map((q, i) => (
                                    <div key={q.id} className={`group flex items-start p-4 rounded-xl border transition-all ${selectedQuestionIds.has(q.id) ? 'bg-brand-900/10 border-brand-500/50' : 'bg-slate-950/30 border-white/5 hover:border-brand-500/30'}`}>
                                        <div className="pt-1 pr-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestionIds.has(q.id)}
                                                onChange={() => toggleSelectQuestion(q.id)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 focus:ring-offset-slate-900 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 flex justify-between">
                                            <div className="flex gap-4 flex-1 min-w-0 pr-4">
                                                <span className="text-slate-500 font-mono text-sm pt-1 shrink-0">#{i + 1}</span>
                                                <div className="min-w-0">
                                                    <div className="text-slate-200 font-medium line-clamp-2 prose prose-invert prose-sm max-w-none">
                                                        <ReactMarkdown>{q.stem}</ReactMarkdown>
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        {q.domain && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs border border-white/5">{q.domain}</span>}
                                                        {q.difficulty && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs border border-white/5">{q.difficulty}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => handleEditClick(q)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setEditingQuestion(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-2xl font-bold text-white font-display mb-6">
                            {editingQuestion.id.startsWith('new_') ? 'Add Question' : 'Edit Question'}
                        </h3>

                        <form onSubmit={handleSaveQuestion} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question Stem</label>
                                <RichTextEditor
                                    value={editingQuestion.stem}
                                    onChange={(val) => setEditingQuestion({ ...editingQuestion, stem: val })}
                                    placeholder="Enter question stem (markdown supported)..."
                                />
                            </div>

                            {/* Image URL Field */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Image URL (Optional)</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editingQuestion.imageUrl || ''}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                                    />
                                    {editingQuestion.imageUrl && (
                                        <div className="relative w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-white/10 group">
                                            <img
                                                src={editingQuestion.imageUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                                                Image Preview
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Domain</label>
                                    <select
                                        value={editingQuestion.domain || ''}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, domain: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                                        required
                                    >
                                        <option value="" disabled>Select Domain</option>
                                        {domains.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Difficulty</label>
                                    <select
                                        value={editingQuestion.difficulty || 'Medium'}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Options</label>
                                <div className="space-y-3">
                                    {editingQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <input
                                                type="radio"
                                                name="correctAnswer"
                                                checked={editingQuestion.correctAnswer === idx}
                                                onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: idx })}
                                                className="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700"
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...editingQuestion.options];
                                                    newOptions[idx] = e.target.value;
                                                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                                                }}
                                                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Explanation</label>
                                <RichTextEditor
                                    value={editingQuestion.explanation}
                                    onChange={(val) => setEditingQuestion({ ...editingQuestion, explanation: val })}
                                    placeholder="Explain the correct answer..."
                                    minHeight="100px"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingQuestion(null)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 transition-colors"
                                >
                                    Save Question
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showAIGenerator && (
                <AIGenerator
                    examId={examId!}
                    availableDomains={domains}
                    onClose={() => setShowAIGenerator(false)}
                />
            )}
        </div>
    );
}

