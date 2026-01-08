export interface ExamDomainDefinition {
    name: string;
    weight: number;
    topics: string[];
}

export const EXAM_DEFINITIONS: Record<string, ExamDomainDefinition[]> = {
    // Default PMP
    'default-exam': [
        { name: 'Process', weight: 0.50, topics: ['Project Integration', 'Scope Management', 'Schedule', 'Cost', 'Quality', 'Resources', 'Communications', 'Risk', 'Procurement', 'Stakeholders'] },
        { name: 'People', weight: 0.42, topics: ['Conflict Resolution', 'Leading a Team', 'Supporting Team Performance', 'Empowering Members', 'Training', 'Building a Team'] },
        { name: 'Business Environment', weight: 0.08, topics: ['Compliance', 'delivering Value', 'Organizational Change'] }
    ],
    // Explicit PMP ID if used
    'pmp': [
        { name: 'Process', weight: 0.50, topics: ['Project Integration', 'Scope Management', 'Schedule', 'Cost', 'Quality', 'Resources', 'Communications', 'Risk', 'Procurement', 'Stakeholders'] },
        { name: 'People', weight: 0.42, topics: ['Conflict Resolution', 'Leading a Team', 'Supporting Team Performance', 'Empowering Members', 'Training', 'Building a Team'] },
        { name: 'Business Environment', weight: 0.08, topics: ['Compliance', 'delivering Value', 'Organizational Change'] }
    ]
};

export const getExamDomains = (examId: string): ExamDomainDefinition[] => {
    return EXAM_DEFINITIONS[examId] || EXAM_DEFINITIONS['default-exam'];
};
