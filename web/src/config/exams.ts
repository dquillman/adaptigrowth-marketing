export type ExamConfig = {
    id: string;
    name: string;
    fullMock?: { questionCount: number; durationMinutes: number };
};

export const EXAMS: Record<string, ExamConfig> = {
    pmp: {
        id: "pmp",
        name: "Project Management Professional",
        fullMock: { questionCount: 180, durationMinutes: 230 },
    },
};

export const DEFAULT_EXAM_ID = "pmp";

export function isExam(examId: string | undefined, configId: string): boolean {
    if (!examId) return false;
    return examId === configId;
}
