export type ExamConfig = {
    id: string;
    name: string;
    fullMock?: { questionCount: number; durationMinutes: number };
};

export const PMP_EXAM_ID = "7qmPagj9A6RpkC0CwGkY";

export const EXAMS: Record<string, ExamConfig> = {
    [PMP_EXAM_ID]: {
        id: PMP_EXAM_ID,
        name: "Project Management Professional",
        fullMock: { questionCount: 180, durationMinutes: 230 },
    },
};

/** Exam-specific lens names for structured Coach Breakdown explanations.
 *  Keys are Firestore document IDs from the `exams` collection. */
export const EXAM_LENS: Record<string, { lensName: string; framework: string }> = {
    "7qmPagj9A6RpkC0CwGkY": { lensName: "PMI Decision Lens",              framework: "What would PMI want you to do?" },
    "IpECw0XAtBkgD1HyvYas": { lensName: "Scrum Guide Lens",              framework: "What does the Scrum Guide say the role should do?" },
    "bpfawZDj3qalhoU4mdd3": { lensName: "SHRM Competency Lens",          framework: "What aligns with SHRM behavioral competencies?" },
    "XGfL6RE2ls7cokP2tqMa": { lensName: "DMAIC Lens",                    framework: "Where does this fall in Define-Measure-Analyze-Improve-Control?" },
    "Vs3aNmifAJc9bYRFCxXc": { lensName: "Payroll Compliance Lens",        framework: "What does federal/state payroll law require?" },
    "dtgTymjijqUr4NEIHbE1": { lensName: "IIA Standards Lens",             framework: "What do the IIA Standards of Practice say?" },
    "6FKeXlV2dzv4I03tewcU": { lensName: "Service Value Lens",             framework: "How does this serve the ITIL service value chain?" },
    "79cuGMNydTwDMhyiDjry": { lensName: "Security Triad Lens",            framework: "CIA triad — which principle is being protected?" },
    "gp6QwBz0FXFIntLSQSYr": { lensName: "OSI Troubleshooting Lens",       framework: "What layer is this, and what's the systematic fix?" },
    "cxBsVz8AVaocdEYbgSMA": { lensName: "Troubleshooting Methodology Lens", framework: "What step of the CompTIA troubleshooting model?" },
};

export const DEFAULT_EXAM_ID = PMP_EXAM_ID;

export function isExam(examId: string | undefined, configId: string): boolean {
    if (!examId) return false;
    return examId === configId;
}
