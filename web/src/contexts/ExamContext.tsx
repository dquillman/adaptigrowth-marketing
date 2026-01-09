import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface ExamContextType {
    selectedExamId: string;
    examName: string;
    examDomains: string[];
    loading: boolean;
    switchExam: (examId: string) => Promise<void>;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function ExamProvider({ children }: { children: ReactNode }) {
    const [selectedExamId, setSelectedExamId] = useState<string>(() => {
        return localStorage.getItem('selectedExamId') || 'default-exam';
    });
    const [examName, setExamName] = useState<string>('');
    const [examDomains, setExamDomains] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Load exam metadata whenever selectedExamId changes
    useEffect(() => {
        const loadExamData = async () => {
            setLoading(true);
            try {
                // If it's a "default" placeholder, we might want to fetch the "first" available exam
                // But for now, let's assume we look up the ID.
                if (selectedExamId) {
                    const examRef = doc(db, 'exams', selectedExamId);
                    const snap = await getDoc(examRef);

                    if (snap.exists()) {
                        const data = snap.data();
                        setExamName(data.name || 'Unknown Exam');
                        setExamDomains(data.domains || []);
                    } else {
                        // Fallback if ID is invalid (e.g. deleted exam)
                        console.warn(`Exam ${selectedExamId} not found, falling back.`);
                        setExamName('Default Exam');
                        setExamDomains([]);
                    }
                }
            } catch (error) {
                console.error("Failed to load exam data", error);
            } finally {
                setLoading(false);
            }
        };

        loadExamData();
    }, [selectedExamId]);

    // Sync usage to User Profile (optional persistence)
    // We listen to Auth to ensure we save the preference to the user's profile for cross-device sync
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && selectedExamId) {
                // Update lastActiveExam in Firestore?
                // await updateDoc(doc(db, 'users', user.uid), { lastActiveExam: selectedExamId });
            }
        });
        return () => unsubscribe();
    }, []);

    const switchExam = async (examId: string) => {
        localStorage.setItem('selectedExamId', examId);
        setSelectedExamId(examId);
    };

    return (
        <ExamContext.Provider value={{ selectedExamId, examName, examDomains, loading, switchExam }}>
            {children}
        </ExamContext.Provider>
    );
}

export function useExam() {
    const context = useContext(ExamContext);
    if (context === undefined) {
        throw new Error('useExam must be used within an ExamProvider');
    }
    return context;
}
