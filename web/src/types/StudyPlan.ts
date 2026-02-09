export interface DailyTask {
    id: string;
    date: Date; // Timestamp in Firestore
    domain: 'People' | 'Process' | 'Business Environment' | 'Mixed';
    topic: string;
    activityType: 'reading' | 'quiz' | 'review' | 'mock-exam';
    completed: boolean;
    durationMinutes: number;
}

export interface StudyPlan {
    id?: string;
    userId: string;
    examId: string; // Linked exam
    startDate: Date;
    examDate: Date;
    weeklyHours: number;
    tasks: DailyTask[];
    createdAt: Date;
    status: 'active' | 'completed' | 'archived';
    anchorDomain?: string; // v15: diagnostic weakest domain used for plan generation
}
