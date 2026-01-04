import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface AIGeneratorProps {
    examId: string;
    availableDomains: string[];
    onClose: () => void;
}

export default function AIGenerator({ examId, availableDomains, onClose }: AIGeneratorProps) {
    const [mode, setMode] = useState<'topic' | 'batch'>('topic');
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        setStatus('Initializing AI agent...');

        try {
            const functions = getFunctions();

            if (mode === 'batch') {
                // Batch Generation
                const batchGenerateFn = httpsCallable(functions, 'batchGenerateQuestions', { timeout: 900000 });
                const result = await batchGenerateFn({
                    examId: examId,
                    targetCount: count,
                    difficulty: difficulty // Pass difficulty
                });

                const response = result.data as any;
                if (response.success) {
                    setStatus(`Success! ${response.message}`);
                    setTimeout(() => {
                        onClose();
                        window.location.reload();
                    }, 2000);
                } else {
                    setStatus('Error: Batch generation failed.');
                }

            } else {
                // Single Topic Generation
                const generateQuestionsFn = httpsCallable(functions, 'generateQuestions');

                // Fetch existing stems to avoid duplicates (pass to AI)
                const existingQuestionsQuery = query(collection(db, 'questions'), where('examId', '==', examId));
                const existingDocs = await getDocs(existingQuestionsQuery);
                const existingStems = existingDocs.docs.map(d => d.data().stem);

                const result = await generateQuestionsFn({
                    topic: topic || "Project Management",
                    count: count,
                    difficulty: difficulty, // Pass difficulty
                    existingStems: existingStems
                });

                const newQuestionsData = result.data as any[];

                if (!newQuestionsData || newQuestionsData.length === 0) {
                    setStatus('Warning: AI returned no questions.');
                    setLoading(false);
                    return;
                }

                // 3. Add to Firestore
                const newQuestions = newQuestionsData.map((q: any) => ({
                    examId,
                    stem: q.stem,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    domain: q.domain || "Process",
                    difficulty: q.difficulty || "Medium",
                    source: q.source || "AI-OpenAI-GPT4o",
                    imageUrl: q.imageUrl || null,
                    createdAt: new Date()
                }));

                const batchPromises = newQuestions.map((q: any) => addDoc(collection(db, 'questions'), q));
                await Promise.all(batchPromises);

                // Update exam question count
                const examRef = doc(db, 'exams', examId);
                await updateDoc(examRef, {
                    questionCount: increment(newQuestions.length)
                });

                setStatus(`Success! Generated ${newQuestions.length} fresh questions.`);
                setTimeout(() => {
                    onClose();
                    window.location.reload();
                }, 1000);
            }

        } catch (error) {
            console.error("Error generating:", error);
            setStatus('Error: AI Generation failed. Check console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full overflow-hidden relative">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="p-8 border-b border-white/5 relative z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-white font-display flex items-center gap-3">
                                <span className="text-3xl">✨</span> AI Generator
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">Powered by Gemini Pro</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8 relative z-10">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setMode('topic')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'topic' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Single Topic
                        </button>
                        <button
                            onClick={() => { setMode('batch'); setCount(100); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'batch' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Full Exam Batch
                        </button>
                    </div>

                    {mode === 'topic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Topic / Domain</label>
                                <select
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-lg appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Select a Domain</option>
                                    {availableDomains.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Difficulty</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                                <option value="Mixed">Mixed (Auto-Distribute)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quantity {mode === 'topic' ? '(Max 50)' : '(Batch Size)'}</label>
                        {mode === 'topic' ? (
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={count}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        // Clamp value between 1 and 50
                                        if (val < 0) return;
                                        setCount(val);
                                    }}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono text-lg"
                                />
                                {count > 20 && (
                                    <div className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-amber-400 flex items-center gap-1 font-bold">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        High count may timeout
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                {[50, 100, 200].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setCount(num)}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all border ${count === num
                                            ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105'
                                            : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${status.includes('Error') || status.includes('Warning')
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                            }`}>
                            {status.includes('Error') || status.includes('Warning') ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                            {status}
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="relative z-10">Crafting Questions...</span>
                            </>
                        ) : (
                            <>
                                <span className="relative z-10">Generate Questions</span>
                                <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
