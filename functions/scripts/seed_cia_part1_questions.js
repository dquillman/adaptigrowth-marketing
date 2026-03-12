const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'exam-coach-ai-platform' });
const db = admin.firestore();

const CIA_PART1_ID = 'dtgTymjijqUr4NEIHbE1';

const questions = [
    // ===== Domain A: Foundations of Internal Auditing (35%) — 9 questions =====
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'According to the IIA Standards, the primary purpose of internal auditing is to:',
        options: [
            'Provide independent, objective assurance and consulting to add value and improve operations',
            'Detect and prevent all fraud within the organization through continuous monitoring and investigation',
            'Ensure the organization complies with all applicable laws, regulations, and contractual obligations',
            'Prepare and validate the organization\'s financial statements in advance of the external audit',
        ],
        correctAnswer: 0,
        explanation: 'The IIA defines internal auditing as an independent, objective assurance and consulting activity designed to add value and improve an organization\'s operations. While fraud detection, compliance, and financial reporting may be part of audit work, the primary purpose is broader — helping the organization accomplish its objectives through systematic evaluation of risk management, control, and governance.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'The internal audit charter should be approved by:',
        options: [
            'The board or its designated committee',
            'The Chief Financial Officer of the organization',
            'The external audit firm engaged by the organization',
            'The Chief Audit Executive acting independently',
        ],
        correctAnswer: 0,
        explanation: 'The IIA Standards require the internal audit charter to be approved by the board (or the audit committee acting on the board\'s behalf). The charter defines the purpose, authority, and responsibility of the internal audit activity. Board approval ensures the audit function has proper organizational standing and authority. The CAE drafts the charter but cannot self-approve it.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'Which of the following best distinguishes an assurance engagement from a consulting engagement?',
        options: [
            'In assurance, the auditor independently determines the scope; in consulting, the client sets the scope',
            'Assurance engagements are mandatory under the Standards; consulting engagements are expressly prohibited',
            'Assurance focuses exclusively on future risks; consulting focuses only on past performance outcomes',
            'Only consulting engagements require formal reporting of results and recommendations to management',
        ],
        correctAnswer: 0,
        explanation: 'The key distinction is scope determination: in assurance engagements, the internal auditor independently evaluates evidence and determines scope based on risk. In consulting engagements, the nature and scope are agreed upon with the engagement client. Both are legitimate services under the Standards, both may address past or future risks, and both require appropriate communication of results.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'A Quality Assurance and Improvement Program (QAIP) must include all of the following EXCEPT:',
        options: [
            'Annual rotation of all internal audit staff to different departments within the organization',
            'Ongoing internal monitoring of audit performance through supervisory review',
            'Periodic internal self-assessments with documented action plans',
            'External assessments conducted by a qualified assessor at least once every five years',
        ],
        correctAnswer: 0,
        explanation: 'The QAIP requires ongoing monitoring (supervisory review of engagements), periodic internal assessments (self-assessments with action plans), and external assessments at least every five years by a qualified, independent assessor. Staff rotation is not a QAIP requirement — it may be a good practice for development but is unrelated to quality assurance of the audit function.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'The Chief Audit Executive (CAE) should functionally report to:',
        options: [
            'The board or audit committee',
            'The Chief Executive Officer of the organization',
            'The Chief Financial Officer of the organization',
            'The lead external audit partner for the engagement',
        ],
        correctAnswer: 0,
        explanation: 'To maintain organizational independence, the CAE must functionally report to the board or its audit committee. Functional reporting includes approving the audit charter, risk-based plan, budget, and CAE appointment/removal. Administrative reporting (day-to-day operations) may be to the CEO or another senior executive, but functional independence requires a direct line to the board.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'When the internal audit activity does not conform with the IIA Standards, the CAE must:',
        options: [
            'Disclose the nonconformance and its impact to senior management and the board',
            'Immediately suspend all ongoing audit engagements until full conformance is achieved',
            'Resign from the CAE position and recommend an external replacement to the board',
            'Request the external auditor to assume internal audit responsibilities going forward',
        ],
        correctAnswer: 0,
        explanation: 'When nonconformance with the Standards affects the overall scope or operation of internal audit, the CAE must disclose the nonconformance and its impact to senior management and the board. This transparency allows governance bodies to understand limitations and take corrective action. Suspension of activities, resignation, or outsourcing are not required responses to nonconformance.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'Internal audit\'s coordination with external auditors primarily benefits the organization by:',
        options: [
            'Reducing duplication of effort and ensuring comprehensive audit coverage',
            'Allowing the internal audit function to delegate its core responsibilities to external auditors',
            'Enabling external auditors to direct and prioritize the internal audit risk-based plan',
            'Eliminating the need for a Quality Assurance and Improvement Program for internal audit',
        ],
        correctAnswer: 0,
        explanation: 'Coordination between internal and external auditors reduces redundant testing and maximizes overall audit coverage. However, internal audit must maintain its independence — it cannot delegate its responsibilities or let external auditors direct its risk-based plan. The QAIP remains required regardless of the level of external audit coordination.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'Which type of internal audit engagement evaluates whether organizational processes achieve their intended outcomes efficiently?',
        options: [
            'Operational audit',
            'Financial audit',
            'Compliance audit',
            'Forensic investigation audit',
        ],
        correctAnswer: 0,
        explanation: 'Operational audits evaluate the efficiency and effectiveness of organizational processes in achieving their objectives. Financial audits focus on the accuracy and reliability of financial information. Compliance audits assess adherence to laws, regulations, and policies. Forensic audits investigate suspected fraud or irregularities. Operational audits are among the most common engagements for internal audit.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Foundations of Internal Auditing',
        stem: 'An internal audit activity has completed an external quality assessment. The results indicate general conformance with the Standards. The CAE may state that the activity "conforms with the International Standards for the Professional Practice of Internal Auditing" only if:',
        options: [
            'The results of the QAIP, including external assessment, support the statement',
            'The board grants explicit written permission to use the conformance statement',
            'The external assessor is a qualified partner from a Big Four accounting firm',
            'All prior-year audit findings have been fully resolved and verified by management',
        ],
        correctAnswer: 0,
        explanation: 'The CAE may state conformance with the Standards only when supported by QAIP results. The external assessment must conclude that the activity generally conforms. There is no requirement that the assessor be a Big Four firm — they must be qualified and independent. Board permission is not a prerequisite for the statement, and unresolved findings do not prevent conformance if the audit process itself meets Standards.',
        difficulty: 'Hard',
    },

    // ===== Domain B: Ethics and Professionalism (20%) — 5 questions =====
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Ethics and Professionalism',
        stem: 'An internal auditor discovers that a close family member manages the department being audited. According to the IIA Code of Ethics, the auditor should:',
        options: [
            'Disclose the relationship and recuse from the engagement',
            'Proceed with the audit but thoroughly document the relationship in the workpapers',
            'Ask the family member to temporarily transfer to another department during fieldwork',
            'Complete the audit as assigned and have a senior colleague review all conclusions',
        ],
        correctAnswer: 0,
        explanation: 'The IIA Code of Ethics requires objectivity — auditors must not participate in activities where they have, or could reasonably be perceived to have, an impairment. A close family relationship with the auditee is a clear objectivity impairment. The auditor must disclose the conflict and be removed from the engagement. Simply documenting it or having a peer review does not eliminate the impairment.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Ethics and Professionalism',
        stem: 'The IIA Code of Ethics includes four principles. Which of the following is NOT one of them?',
        options: [
            'Transparency',
            'Integrity',
            'Objectivity',
            'Confidentiality',
        ],
        correctAnswer: 0,
        explanation: 'The four principles of the IIA Code of Ethics are Integrity, Objectivity, Confidentiality, and Competency. Transparency is not one of the four principles, though it may be a desirable quality in governance. Internal auditors are expected to be truthful (integrity) and protect information (confidentiality), which can sometimes limit full transparency.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Ethics and Professionalism',
        stem: 'An internal auditor is asked to audit a process that they helped design six months ago. This situation most directly threatens:',
        options: [
            'Individual objectivity',
            'Organizational independence',
            'Due professional care',
            'Continuing professional development requirements',
        ],
        correctAnswer: 0,
        explanation: 'Auditing a process you helped design creates a self-review threat to individual objectivity — you are essentially evaluating your own work. Organizational independence relates to the audit function\'s position within the organization (reporting lines). Due professional care concerns the quality of audit work. CPD relates to maintaining skills. The auditor should disclose the prior involvement and be reassigned.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Ethics and Professionalism',
        stem: 'Due professional care requires an internal auditor to:',
        options: [
            'Apply the care and skill expected of a reasonably prudent and competent auditor',
            'Guarantee that all significant risks and control weaknesses within the scope are identified',
            'Obtain professional certifications relevant to every specific area being audited',
            'Perform detailed substantive testing of every transaction within the audit scope',
        ],
        correctAnswer: 0,
        explanation: 'Due professional care means applying the care, skill, and diligence that a reasonably prudent internal auditor would exercise in similar circumstances. It does not require absolute assurance, testing every transaction, or expertise in every domain. Auditors must consider the complexity of the work, materiality, and the adequacy of controls, exercising professional judgment throughout.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Ethics and Professionalism',
        stem: 'An auditor receives a gift from an auditee during fieldwork. According to the IIA Code of Ethics, the auditor should:',
        options: [
            'Decline the gift to avoid any real or perceived impairment to professional objectivity',
            'Accept the gift if its value falls below the organization\'s established materiality threshold',
            'Accept the gift but fully disclose the receipt in the final audit report to management',
            'Accept the gift and reciprocate with a gift of equal value to maintain professional courtesy',
        ],
        correctAnswer: 0,
        explanation: 'The IIA Code of Ethics prohibits accepting anything that may impair or be presumed to impair professional judgment. Even gifts of nominal value can create the perception of bias. The safest course is to decline the gift entirely. Organizational policies may set thresholds, but the ethical standard prioritizes avoiding any appearance of compromised objectivity.',
        difficulty: 'Easy',
    },

    // ===== Domain C: Governance, Risk Management, and Control (30%) — 7 questions =====
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'The Three Lines Model designates internal audit as the:',
        options: [
            'Third line — providing independent assurance on governance and risk management',
            'First line — owning and managing risk directly in daily operations',
            'Second line — providing expertise, monitoring, and challenge on risk-related matters',
            'An external oversight body that operates separate from all three lines',
        ],
        correctAnswer: 0,
        explanation: 'In the Three Lines Model (updated from "Three Lines of Defence" by the IIA in 2020), the first line is management (owns and manages risk), the second line is risk management and compliance functions (expertise, monitoring, challenge), and the third line is internal audit (independent assurance). The governing body (board) oversees all three lines. Internal audit\'s independence from the first and second lines is essential.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'According to COSO\'s Internal Control — Integrated Framework, which component establishes the tone at the top and the foundation for all other components?',
        options: [
            'Control environment',
            'Risk assessment',
            'Control activities',
            'Monitoring activities',
        ],
        correctAnswer: 0,
        explanation: 'The control environment is the foundation of COSO\'s five components. It encompasses the organization\'s ethical values, governance structure, management philosophy, and commitment to competence — collectively known as "tone at the top." Risk assessment identifies threats, control activities are policies and procedures, information and communication ensures relevant data flows, and monitoring evaluates control effectiveness over time.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'Residual risk is best defined as:',
        options: [
            'The risk remaining after management implements controls or risk responses',
            'The total risk exposure before any controls or mitigations are applied',
            'The risk of a specific control failing to operate as designed by management',
            'The risk associated with new and emerging threats that have not yet been assessed',
        ],
        correctAnswer: 0,
        explanation: 'Residual risk is what remains after management applies risk responses (controls, mitigation, transfer, avoidance). Inherent risk is the total risk before controls. Control risk relates to control effectiveness. Emerging risk refers to new threats. The board decides whether residual risk is within the organization\'s risk appetite; if not, additional controls or responses are needed.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'A detective control is designed to:',
        options: [
            'Identify errors or irregularities after they have occurred',
            'Prevent errors or unauthorized actions from happening in the first place',
            'Correct problems that have already been identified through other means',
            'Transfer risk to a third party through insurance or contractual arrangements',
        ],
        correctAnswer: 0,
        explanation: 'Detective controls identify errors, irregularities, or unauthorized activities after they occur (e.g., reconciliations, exception reports, audit trails). Preventive controls stop issues before they happen (e.g., segregation of duties, access controls). Corrective controls remedy identified problems (e.g., backup restoration, disciplinary action). Risk transfer is a risk response strategy, not a control type.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'The COSO Enterprise Risk Management framework emphasizes that risk management should be:',
        options: [
            'Integrated with strategy-setting and performance management across the organization',
            'A standalone compliance function reporting only to external regulators and oversight bodies',
            'Limited to financial risks identified during the annual audit planning cycle',
            'Delegated entirely to the internal audit function as a third-line responsibility',
        ],
        correctAnswer: 0,
        explanation: 'COSO ERM (2017) emphasizes integrating risk management with strategy and performance. Risk considerations should influence strategic choices and day-to-day decision-making across the entire organization. ERM is not a compliance-only activity, not limited to financial risks, and not the responsibility of internal audit alone — management owns risk, and internal audit provides assurance.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'Segregation of duties is an example of which type of control?',
        options: [
            'Preventive control',
            'Detective control',
            'Corrective control',
            'Compensating control',
        ],
        correctAnswer: 0,
        explanation: 'Segregation of duties is a preventive control that divides critical functions among different people to prevent any single individual from committing and concealing errors or fraud. For example, the person who authorizes payments should not also process them. Detective controls (like reconciliations) find issues after the fact. Corrective controls fix identified issues. Compensating controls are alternatives when primary controls are not feasible.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Governance, Risk Management, and Control',
        stem: 'An organization\'s risk appetite is best described as:',
        options: [
            'The amount and type of risk the organization is willing to accept in pursuit of its objectives',
            'The maximum financial loss the organization can absorb before reaching insolvency or bankruptcy',
            'The specific risk thresholds set for each business unit by the internal audit function',
            'The probability of a risk event occurring within the next fiscal year based on historical data',
        ],
        correctAnswer: 0,
        explanation: 'Risk appetite is a broad statement of the amount and type of risk an organization is willing to accept to achieve its strategic objectives. It is set by the board and senior management, not by internal audit. It differs from risk tolerance (acceptable variation around specific objectives) and risk capacity (maximum risk an organization can bear). It is not limited to financial loss or time-bound probability.',
        difficulty: 'Medium',
    },

    // ===== Domain D: Fraud Risks (15%) — 4 questions =====
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Fraud Risks',
        stem: 'The Fraud Triangle identifies three conditions that are typically present when fraud occurs. Which of the following is one of these conditions?',
        options: [
            'Rationalization — the perpetrator justifies the fraudulent behavior to themselves',
            'Segregation of duties — key controls are properly designed and implemented',
            'External audit — the organization is subject to independent review by auditors',
            'Transparency — management openly communicates financial results to stakeholders',
        ],
        correctAnswer: 0,
        explanation: 'The Fraud Triangle consists of three elements: Opportunity (weak controls allow fraud), Pressure/Incentive (financial or personal motivation), and Rationalization (the perpetrator justifies the act). Segregation of duties, external audit, and transparency are controls or governance mechanisms that help prevent fraud — they are not conditions that enable it.',
        difficulty: 'Easy',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Fraud Risks',
        stem: 'An employee who has sole authority to receive cash, record transactions, and reconcile bank statements presents which type of fraud risk?',
        options: [
            'Asset misappropriation due to lack of segregation of duties',
            'Financial statement fraud through deliberate revenue manipulation by management',
            'Corruption through bribery or kickback schemes involving external vendors',
            'Regulatory fraud through false compliance reporting submitted to oversight bodies',
        ],
        correctAnswer: 0,
        explanation: 'When one person controls custody of assets (receiving cash), recordkeeping, and reconciliation, there is no check on their actions — creating a high risk of asset misappropriation. They could steal cash and alter records to conceal it. This is a classic segregation of duties failure. Financial statement fraud typically involves management manipulation, corruption involves third-party dealings, and regulatory fraud involves false external reporting.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Fraud Risks',
        stem: 'Which of the following is a common red flag indicating potential financial statement fraud?',
        options: [
            'Revenue growth significantly outpacing industry peers without a clear business explanation',
            'A well-documented and consistently applied accounting policy across all reporting periods',
            'Regular rotation of external audit firms every five years in accordance with best practices',
            'Strong tone at the top with a clearly communicated zero-tolerance fraud policy',
        ],
        correctAnswer: 0,
        explanation: 'Unexplained revenue growth that significantly exceeds industry norms is a classic red flag for financial statement fraud — it may indicate fictitious revenue, premature recognition, or channel stuffing. Consistent accounting policies, audit firm rotation, and strong tone at the top are positive indicators. Auditors should apply professional skepticism when financial results seem too good to be true.',
        difficulty: 'Medium',
    },
    {
        examId: CIA_PART1_ID,
        type: 'mcq',
        domain: 'Fraud Risks',
        stem: 'During an engagement, an internal auditor suspects fraud. The auditor\'s most appropriate first action is to:',
        options: [
            'Notify appropriate management and the CAE of the suspicion promptly',
            'Immediately confront the suspected perpetrator to obtain a confession or explanation',
            'Conduct a full forensic investigation independently before notifying management',
            'Report the suspicion directly to law enforcement authorities without delay',
        ],
        correctAnswer: 0,
        explanation: 'When an auditor suspects fraud, the appropriate first step is to notify the CAE and appropriate levels of management. The auditor should not confront the suspect (this could compromise an investigation), conduct a forensic investigation alone (this requires specialized skills and authority), or go directly to law enforcement (this decision belongs to management and legal counsel). The CAE will determine the appropriate course of action.',
        difficulty: 'Medium',
    },
];

function shuffleOptions(q) {
    const opts = [...q.options];
    const correctText = opts[q.correctAnswer];
    // Fisher-Yates shuffle
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return { ...q, options: opts, correctAnswer: opts.indexOf(correctText) };
}

async function deleteExisting() {
    const snap = await db.collection('questions').where('examId', '==', CIA_PART1_ID).get();
    if (snap.empty) { console.log('No existing CIA Part 1 questions to delete.'); return; }
    const batchSize = 500;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
    console.log(`Deleted ${docs.length} existing CIA Part 1 questions.`);
}

(async () => {
    await deleteExisting();
    const shuffled = questions.map(shuffleOptions);
    const batchSize = 500;
    for (let i = 0; i < shuffled.length; i += batchSize) {
        const batch = db.batch();
        shuffled.slice(i, i + batchSize).forEach(q => {
            const ref = db.collection('questions').doc();
            batch.set(ref, q);
        });
        await batch.commit();
    }
    console.log(`Seeded ${shuffled.length} CIA Part 1 questions (options shuffled)`);
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
