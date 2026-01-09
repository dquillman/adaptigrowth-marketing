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
    ],
    // ITIL 4 Foundation
    'itil-4-foundation': [
        { name: 'General Management Practices', weight: 0.30, topics: ['Architecture Management', 'Continual Improvement', 'Information Security Management', 'Knowledge Management', 'Measurement and Reporting', 'Organizational Change Management', 'Portfolio Management', 'Project Management', 'Relationship Management', 'Risk Management', 'Service Financial Management', 'Strategy Management', 'Supplier Management', 'Workforce and Talent Management'] },
        { name: 'Service Management Practices', weight: 0.50, topics: ['Availability Management', 'Business Analysis', 'Capacity and Performance Management', 'Change Control', 'Incident Management', 'IT Asset Management', 'Monitoring and Event Management', 'Problem Management', 'Release Management', 'Service Catalogue Management', 'Service Configuration Management', 'Service Continuity Management', 'Service Design', 'Service Desk', 'Service Level Management', 'Service Request Management', 'Service Validation and Testing'] },
        { name: 'Technical Management Practices', weight: 0.20, topics: ['Deployment Management', 'Infrastructure and Platform Management', 'Software Development and Management'] }
    ]
};

// Helper to find topics for a given domain name by searching all known definitions
const findTopicsForDomain = (domainName: string): string[] => {
    const normalizedDomain = domainName.toLowerCase();
    for (const examKey in EXAM_DEFINITIONS) {
        const domains = EXAM_DEFINITIONS[examKey];
        const match = domains.find(d => d.name.toLowerCase() === normalizedDomain || normalizedDomain.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(normalizedDomain));
        if (match) return match.topics;
    }
    // Fallback topics if completely unknown
    return [`Review ${domainName} concepts`, `Practice ${domainName} questions`, `Advanced ${domainName} application`];
};

export const getExamDomains = (examId: string, examName?: string, customDomains?: string[]): ExamDomainDefinition[] => {
    // 1. If custom domains are provided (from Firestore/Dashboard), use them as the source of truth for NAMES
    if (customDomains && customDomains.length > 0) {
        const weightPerDomain = 1 / customDomains.length;
        return customDomains.map(name => ({
            name,
            weight: weightPerDomain,
            topics: findTopicsForDomain(name)
        }));
    }

    // 2. Try exact ID match (legacy/compatibility)
    if (EXAM_DEFINITIONS[examId]) {
        return EXAM_DEFINITIONS[examId];
    }

    // 3. Try Name match (fuzzy)
    if (examName) {
        const normalized = examName.toLowerCase();
        if (normalized.includes('itil')) return EXAM_DEFINITIONS['itil-4-foundation'];
        if (normalized.includes('pmp')) return EXAM_DEFINITIONS['default-exam'];
    }

    // 4. Fallback
    return EXAM_DEFINITIONS['default-exam'];
};
