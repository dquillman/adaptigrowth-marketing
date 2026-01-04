import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Settings() {
    const [exporting, setExporting] = useState(false);

    const handleExportAll = async () => {
        setExporting(true);
        try {
            // Fetch all exams
            const examsSnap = await getDocs(collection(db, 'exams'));
            const exams = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch all questions
            const questionsSnap = await getDocs(collection(db, 'questions'));
            const questions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const backupData = {
                timestamp: new Date().toISOString(),
                exams,
                questions
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `exam_coach_backup_${new Date().toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export data.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div>
                <h2 className="text-4xl font-bold text-white font-display tracking-tight">Settings</h2>
                <p className="text-slate-400 mt-2 text-lg">Manage global configurations and data.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Data Management */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        Data Management
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Create a full backup of all exams and questions. Useful for migration or safety.
                    </p>
                    <button
                        onClick={handleExportAll}
                        disabled={exporting}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all border border-white/5 flex items-center justify-center gap-2"
                    >
                        {exporting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export All Data
                            </>
                        )}
                    </button>
                </div>

                {/* System Info */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        System Info
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-slate-400">Version</span>
                            <span className="text-white font-mono">v1.3.0</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-slate-400">Environment</span>
                            <span className="text-emerald-400 font-bold text-sm px-2 py-1 bg-emerald-500/10 rounded">Production</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-400">Status</span>
                            <span className="text-white">Operational</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
