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

/** Exam-specific lens names for structured Coach Breakdown explanations */
export const EXAM_LENS: Record<string, { lensName: string; framework: string }> = {
    pmp:                    { lensName: "PMI Decision Lens",              framework: "What would PMI want you to do?" },
    csm:                    { lensName: "Scrum Guide Lens",              framework: "What does the Scrum Guide say the role should do?" },
    "shrm-cp":              { lensName: "SHRM Competency Lens",          framework: "What aligns with SHRM behavioral competencies?" },
    "six-sigma-green-belt": { lensName: "DMAIC Lens",                    framework: "Where does this fall in Define-Measure-Analyze-Improve-Control?" },
    cpp:                    { lensName: "Payroll Compliance Lens",        framework: "What does federal/state payroll law require?" },
    "cia-part1":            { lensName: "IIA Standards Lens",             framework: "What do the IIA Standards of Practice say?" },
    "itil-4-foundation":    { lensName: "Service Value Lens",             framework: "How does this serve the ITIL service value chain?" },
    "comptia-security-plus":{ lensName: "Security Triad Lens",            framework: "CIA triad — which principle is being protected?" },
    "comptia-network-plus": { lensName: "OSI Troubleshooting Lens",       framework: "What layer is this, and what's the systematic fix?" },
    "comptia-a-plus-core2": { lensName: "Troubleshooting Methodology Lens", framework: "What step of the CompTIA troubleshooting model?" },
};

export const DEFAULT_EXAM_ID = "pmp";

export function isExam(examId: string | undefined, configId: string): boolean {
    if (!examId) return false;
    return examId === configId;
}
