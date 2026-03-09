const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'exam-coach-ai-platform' });
const db = admin.firestore();

const SHRM_CP_ID = 'bpfawZDj3qalhoU4mdd3';

const questions = [
    // ===== PEOPLE Domain (19%) — 7 questions =====
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'An organization is experiencing high turnover among new hires within the first 90 days. Which strategy would most directly address this issue?',
        options: [
            'Implementing a structured onboarding program with mentorship and milestone check-ins',
            'Increasing base salaries by 10% across all entry-level positions',
            'Conducting annual employee engagement surveys',
            'Reducing the probationary period from 90 to 30 days',
        ],
        correctAnswer: 0,
        explanation: 'Early turnover is most often caused by poor onboarding — new hires feel disconnected, unclear on expectations, or unsupported. A structured onboarding program with mentorship and regular check-ins directly addresses integration and engagement during the critical first 90 days. Salary increases address compensation but not belonging. Annual surveys are too infrequent. Shortening probation does not fix the root cause.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'Which federal law requires employers with 50 or more employees to provide up to 12 weeks of unpaid, job-protected leave for qualifying family and medical reasons?',
        options: [
            'Family and Medical Leave Act (FMLA)',
            'Americans with Disabilities Act (ADA)',
            'Fair Labor Standards Act (FLSA)',
            'Consolidated Omnibus Budget Reconciliation Act (COBRA)',
        ],
        correctAnswer: 0,
        explanation: 'FMLA provides eligible employees of covered employers up to 12 weeks of unpaid, job-protected leave per year for qualifying events (birth/adoption, serious health condition, military family leave). ADA addresses disability accommodation. FLSA governs wages and overtime. COBRA provides continuation of health insurance after employment ends.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'A company wants to ensure pay equity across its workforce. Which approach is most appropriate as a first step?',
        options: [
            'Conducting a comprehensive compensation audit comparing pay by job, tenure, and demographics',
            'Immediately raising all female employees\' salaries by 5%',
            'Eliminating all variable pay programs',
            'Outsourcing payroll to a third-party vendor',
        ],
        correctAnswer: 0,
        explanation: 'A compensation audit systematically analyzes pay data to identify statistically significant disparities based on protected characteristics while controlling for legitimate factors (job level, experience, performance, location). Blanket raises without analysis may overcorrect or miss the root cause. Eliminating variable pay removes a tool that can reward performance. Outsourcing payroll does not address equity.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'Succession planning is most effective when it:',
        options: [
            'Identifies and develops internal talent for critical roles before vacancies occur',
            'Is limited to C-suite positions only',
            'Relies exclusively on external recruitment for leadership roles',
            'Is conducted once every five years as part of strategic planning',
        ],
        correctAnswer: 0,
        explanation: 'Effective succession planning proactively identifies critical roles throughout the organization and develops internal candidates to fill them. It should be ongoing, not a one-time event. Limiting it to the C-suite leaves gaps in middle management. Relying only on external hires ignores institutional knowledge and demotivates existing employees. Regular review ensures the pipeline stays current.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'An HR professional is designing a training needs assessment. Which method provides the most direct insight into performance gaps?',
        options: [
            'Comparing current job performance data against established competency standards',
            'Reviewing the company\'s mission statement',
            'Surveying employees about their preferred training topics',
            'Benchmarking the training budget against industry averages',
        ],
        correctAnswer: 0,
        explanation: 'A training needs assessment identifies gaps between current performance and desired competency levels. Comparing actual job performance data against established standards directly reveals where skills fall short. Mission statements are too high-level. Employee preferences may not align with organizational needs. Budget benchmarks address resource allocation, not skill gaps.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'Which recruitment metric best measures the effectiveness of an organization\'s sourcing channels?',
        options: [
            'Quality of hire by source',
            'Total number of applicants received',
            'Average time to fill all positions',
            'Total recruitment budget spent',
        ],
        correctAnswer: 0,
        explanation: 'Quality of hire by source tracks which channels produce the best-performing, longest-retained employees — directly measuring sourcing effectiveness. Total applicant volume does not indicate quality. Time to fill measures process speed, not source effectiveness. Budget spent measures cost, not outcomes. The best sourcing channels produce high-quality hires efficiently.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'People',
        stem: 'Under the Fair Labor Standards Act (FLSA), which of the following employees is most likely classified as non-exempt?',
        options: [
            'An administrative assistant earning $32,000 annually who performs routine clerical tasks',
            'A salaried marketing director who manages a team and exercises independent judgment',
            'A licensed attorney earning $180,000 who provides legal counsel',
            'A software engineer earning $120,000 who designs system architecture independently',
        ],
        correctAnswer: 0,
        explanation: 'FLSA exemption requires meeting both a salary threshold and a duties test. The administrative assistant performs routine clerical work (fails the duties test for administrative exemption) and earns below the salary threshold. The marketing director meets the executive exemption (manages employees, exercises judgment). The attorney and software engineer meet the professional and computer employee exemptions respectively.',
        difficulty: 'Hard',
    },

    // ===== ORGANIZATION Domain (18%) — 6 questions =====
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Organization',
        stem: 'An organization is undergoing a major restructuring. According to change management best practices, which action should HR take first?',
        options: [
            'Develop a communication plan that explains the rationale, timeline, and impact on employees',
            'Immediately terminate all employees in affected departments',
            'Wait until the restructuring is complete before informing employees',
            'Delegate all communication to the legal department',
        ],
        correctAnswer: 0,
        explanation: 'Effective change management starts with clear, transparent communication. Employees need to understand why the change is happening, how it affects them, and what support is available. Early communication builds trust and reduces anxiety. Immediate termination without planning is reckless. Withholding information breeds rumors. Legal should review communications but not own the employee messaging.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Organization',
        stem: 'In a unionized workplace, which of the following is a mandatory subject of bargaining under the National Labor Relations Act (NLRA)?',
        options: [
            'Wages, hours, and working conditions',
            'The selection of the company\'s CEO',
            'The organization\'s marketing strategy',
            'Board of directors composition',
        ],
        correctAnswer: 0,
        explanation: 'Under the NLRA, mandatory bargaining subjects include wages, hours, and terms and conditions of employment. Employers must bargain in good faith on these topics. CEO selection, marketing strategy, and board composition are management prerogatives and not mandatory bargaining subjects, though some decisions affecting working conditions may trigger bargaining obligations.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Organization',
        stem: 'An HR shared services model is characterized by:',
        options: [
            'Centralizing routine HR transactions to improve efficiency and consistency across locations',
            'Assigning a dedicated HR generalist to each individual employee',
            'Outsourcing all HR functions to an external provider',
            'Eliminating the HR department entirely and distributing tasks to line managers',
        ],
        correctAnswer: 0,
        explanation: 'HR shared services centralizes transactional and administrative HR functions (payroll, benefits administration, employee records) into a single service center. This improves efficiency, consistency, and cost-effectiveness while freeing HR business partners to focus on strategic work. It is different from full outsourcing or eliminating HR. Individual HR assignment is impractical at scale.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Organization',
        stem: 'During a reduction in force (RIF), which federal law requires employers with 100+ employees to provide 60 days\' advance written notice?',
        options: [
            'Worker Adjustment and Retraining Notification Act (WARN)',
            'Americans with Disabilities Act (ADA)',
            'Title VII of the Civil Rights Act',
            'Employee Retirement Income Security Act (ERISA)',
        ],
        correctAnswer: 0,
        explanation: 'The WARN Act requires employers with 100 or more employees to provide 60 calendar days\' advance written notice of plant closings and mass layoffs. ADA addresses disability discrimination. Title VII prohibits employment discrimination based on protected characteristics. ERISA regulates employee benefit plans. Failure to comply with WARN can result in back pay and benefits liability.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Organization',
        stem: 'Which organizational development intervention focuses on improving team effectiveness by examining how members interact, make decisions, and resolve conflicts?',
        options: [
            'Team building',
            'Job enlargement',
            'Benchmarking',
            'Rightsizing',
        ],
        correctAnswer: 0,
        explanation: 'Team building is an OD intervention that focuses on improving how team members work together — examining communication patterns, decision-making processes, roles, and conflict resolution. Job enlargement adds tasks to a role (job design). Benchmarking compares performance against best practices. Rightsizing adjusts workforce size to match organizational needs.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Organization',
        stem: 'An HRIS (Human Resource Information System) provides the greatest strategic value when it:',
        options: [
            'Enables data-driven workforce analytics that inform business decisions',
            'Replaces all face-to-face HR interactions with automated chatbots',
            'Stores employee records in paper files as a backup',
            'Is used exclusively by the IT department without HR input',
        ],
        correctAnswer: 0,
        explanation: 'The strategic value of HRIS lies in its ability to aggregate and analyze workforce data — turnover trends, compensation analysis, workforce planning, and predictive analytics — to support evidence-based decisions. It complements but does not replace human interaction. Paper backups undermine digital efficiency. HRIS should be owned and directed by HR with IT support.',
        difficulty: 'Medium',
    },

    // ===== WORKPLACE Domain (13%) — 5 questions =====
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Workplace',
        stem: 'Under OSHA regulations, employers are required to:',
        options: [
            'Provide a workplace free from recognized hazards that are causing or likely to cause death or serious harm',
            'Guarantee that no workplace injuries will ever occur',
            'Allow employees to refuse any work assignment they consider unpleasant',
            'Provide unlimited personal protective equipment at no cost for personal use',
        ],
        correctAnswer: 0,
        explanation: 'OSHA\'s General Duty Clause (Section 5(a)(1)) requires employers to provide a workplace free from recognized hazards likely to cause death or serious physical harm. It does not guarantee zero injuries, allow refusal of any unpleasant work, or require unlimited PPE. Employers must identify hazards, implement controls, train employees, and maintain records.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Workplace',
        stem: 'Title VII of the Civil Rights Act prohibits employment discrimination based on all of the following EXCEPT:',
        options: [
            'Sexual orientation (prior to the 2020 Bostock decision)',
            'Race',
            'Religion',
            'National origin',
        ],
        correctAnswer: 0,
        explanation: 'Title VII originally prohibited discrimination based on race, color, religion, sex, and national origin. Sexual orientation was not explicitly covered until the Supreme Court\'s 2020 Bostock v. Clayton County decision, which held that discrimination based on sexual orientation or gender identity is a form of sex discrimination under Title VII. Before Bostock, it was not a protected class under federal law.',
        difficulty: 'Hard',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Workplace',
        stem: 'Corporate social responsibility (CSR) programs benefit an organization by:',
        options: [
            'Enhancing employer brand, attracting talent, and building stakeholder trust',
            'Eliminating all regulatory compliance requirements',
            'Guaranteeing increased quarterly profits',
            'Replacing the need for an ethics policy',
        ],
        correctAnswer: 0,
        explanation: 'CSR programs demonstrate an organization\'s commitment to ethical, social, and environmental responsibilities. Benefits include stronger employer brand, improved talent attraction and retention, enhanced reputation, and deeper stakeholder trust. CSR does not exempt organizations from compliance, guarantee profits, or replace formal ethics policies.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Workplace',
        stem: 'An employer with international operations must consider which of the following when managing expatriate assignments?',
        options: [
            'Tax equalization, cultural training, repatriation planning, and host-country employment laws',
            'Only the employee\'s home-country employment contract',
            'Eliminating all home-country benefits during the assignment',
            'Requiring expatriates to resign and be rehired in the host country',
        ],
        correctAnswer: 0,
        explanation: 'Expatriate management requires a holistic approach: tax equalization ensures employees are not penalized by dual taxation, cultural training supports adaptation, repatriation planning addresses re-entry challenges, and host-country laws must be followed. Ignoring host-country laws creates legal liability. Eliminating benefits or requiring resignation damages the employment relationship and retention.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Workplace',
        stem: 'A workplace investigation into a harassment complaint should be:',
        options: [
            'Prompt, thorough, impartial, and documented',
            'Delayed until the annual performance review cycle',
            'Conducted only if the complainant files a formal written grievance',
            'Handled exclusively by the accused employee\'s direct supervisor',
        ],
        correctAnswer: 0,
        explanation: 'Workplace investigations must be prompt (timely response), thorough (interview all relevant parties, review evidence), impartial (no conflicts of interest), and documented (maintain written records). Delay increases liability and harm. Employers must investigate even informal complaints. The accused\'s supervisor should not investigate due to conflict of interest. Proper investigations protect both the complainant and the organization.',
        difficulty: 'Medium',
    },

    // ===== Behavioral Competencies — Leadership (6 questions) =====
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Leadership and Navigation',
        stem: 'An HR manager learns that a new company policy will significantly change employee workflows. Several department heads are resistant. What is the most effective leadership approach?',
        options: [
            'Meet with resistant leaders individually to understand their concerns and collaboratively address barriers to adoption',
            'Send a company-wide email announcing the policy is non-negotiable',
            'Delay implementation indefinitely until all resistance disappears',
            'Implement the policy only in departments that are supportive',
        ],
        correctAnswer: 0,
        explanation: 'Effective leadership involves understanding resistance and addressing it through dialogue. Meeting individually shows respect, uncovers specific concerns, and creates buy-in. Dictating compliance generates resentment. Indefinite delay stalls progress. Partial implementation creates inconsistency and fairness issues. Change leaders succeed by building coalitions, not forcing compliance.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Ethical Practice',
        stem: 'An HR professional discovers that a senior executive has been expensing personal travel as business travel. What is the most appropriate action?',
        options: [
            'Report the matter through the organization\'s established ethics reporting channels',
            'Ignore it because the executive outranks the HR professional',
            'Confront the executive publicly at the next leadership meeting',
            'Adjust the expense reports to make them appear legitimate',
        ],
        correctAnswer: 0,
        explanation: 'HR professionals have an ethical obligation to report wrongdoing through proper channels, regardless of the perpetrator\'s rank. Ignoring it violates the duty of integrity. Public confrontation is unprofessional and may compromise an investigation. Covering up the behavior makes the HR professional complicit. Proper reporting channels (ethics hotline, audit committee, compliance officer) ensure appropriate handling.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Diversity, Equity, and Inclusion',
        stem: 'An organization wants to reduce unconscious bias in its hiring process. Which approach is most evidence-based?',
        options: [
            'Using structured interviews with standardized scoring rubrics for all candidates',
            'Allowing each interviewer to use their own preferred questions',
            'Making hiring decisions based solely on gut instinct and cultural fit',
            'Eliminating interviews entirely and hiring based on resumes alone',
        ],
        correctAnswer: 0,
        explanation: 'Structured interviews with standardized questions and scoring rubrics are the most effective, evidence-based method for reducing interviewer bias. Every candidate is evaluated on the same criteria using the same questions, making comparisons objective. Unstructured interviews and "gut instinct" amplify bias. Resume-only decisions miss critical competencies and also carry bias risks.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Diversity, Equity, and Inclusion',
        stem: 'Which of the following best describes equity in the workplace?',
        options: [
            'Providing fair access, opportunity, and advancement by addressing systemic barriers that affect different groups',
            'Treating every employee exactly the same regardless of circumstances',
            'Giving preferential treatment to underrepresented groups in all decisions',
            'Focusing exclusively on demographic representation in hiring',
        ],
        correctAnswer: 0,
        explanation: 'Equity recognizes that different people face different barriers and provides fair access, opportunity, and advancement by addressing those systemic disparities. It differs from equality (treating everyone identically), which ignores context. Equity is not about preferential treatment but about removing obstacles. It extends beyond hiring to include development, promotion, compensation, and workplace culture.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Leadership and Navigation',
        stem: 'An HR director needs to gain executive support for a new employee wellness program. Which influencing strategy is most effective?',
        options: [
            'Present data linking wellness programs to reduced healthcare costs, lower absenteeism, and improved retention',
            'Threaten to resign if the program is not approved',
            'Implement the program without executive approval and present results later',
            'Ask employees to petition the CEO directly',
        ],
        correctAnswer: 0,
        explanation: 'Influencing executives requires speaking their language — business outcomes. Data showing ROI through reduced costs, lower absenteeism, and improved retention creates a compelling business case. Threats damage credibility. Acting without approval violates organizational governance. Employee petitions may create adversarial dynamics. HR professionals build influence through credible, data-driven proposals aligned with business goals.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Ethical Practice',
        stem: 'A manager asks HR to provide confidential employee medical information to help with staffing decisions. The HR professional should:',
        options: [
            'Decline the request and explain that medical information is protected and can only be shared on a need-to-know basis as permitted by law',
            'Provide the information since the manager has a legitimate staffing need',
            'Share the information but ask the manager to keep it confidential',
            'Provide the information only if the employee has been absent frequently',
        ],
        correctAnswer: 0,
        explanation: 'Employee medical information is protected under ADA, HIPAA, and GINA. HR must maintain confidentiality and cannot share medical details with managers unless legally permitted and on a need-to-know basis (e.g., necessary accommodations). The HR professional should explain what information can be shared and help the manager address staffing needs without accessing protected data.',
        difficulty: 'Medium',
    },

    // ===== Behavioral Competencies — Interpersonal (5 questions) =====
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Relationship Management',
        stem: 'Two department managers are in a heated conflict over shared resources. As the HR professional, the most appropriate first step is to:',
        options: [
            'Meet with each manager separately to understand their perspectives and underlying interests',
            'Assign the resources to the manager with more seniority',
            'Escalate the issue to the CEO without gathering information',
            'Send an email telling both managers to work it out themselves',
        ],
        correctAnswer: 0,
        explanation: 'Effective conflict resolution starts with understanding each party\'s perspective and underlying interests. Individual meetings allow honest conversation without the pressure of the other party present. Seniority-based decisions ignore merit. Premature escalation wastes leadership time. Telling managers to figure it out abdicates HR\'s conflict resolution role and may allow the situation to worsen.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Communication',
        stem: 'When delivering a difficult message to employees — such as a benefits reduction — the most effective communication approach is to:',
        options: [
            'Be transparent about the reasons, acknowledge the impact, and provide information about available support',
            'Bury the announcement in a lengthy company newsletter',
            'Have the IT department send an automated notification with no explanation',
            'Wait until employees notice the change on their own',
        ],
        correctAnswer: 0,
        explanation: 'Difficult messages require transparency, empathy, and support. Explaining the business rationale shows respect. Acknowledging the impact validates employee concerns. Providing support resources (EAP, FAQ, meetings) helps employees process the change. Hiding, automating, or ignoring the communication erodes trust and increases anxiety and resentment.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Global Mindset',
        stem: 'An HR professional is developing policies for a multinational organization with employees in countries that have different holiday schedules and labor laws. The best approach is to:',
        options: [
            'Create a flexible global policy framework that accommodates local laws and cultural practices',
            'Apply the U.S. holiday schedule uniformly to all countries',
            'Eliminate all paid holidays to ensure equal treatment',
            'Allow each country office to operate without any HR policy guidance',
        ],
        correctAnswer: 0,
        explanation: 'A "think globally, act locally" approach creates consistent global principles while accommodating local requirements. Local labor laws are legally binding and must be followed. Imposing U.S. standards violates local laws and ignores cultural differences. Eliminating holidays creates resentment. No guidance creates inconsistency and compliance risk. The framework ensures consistency without rigidity.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Relationship Management',
        stem: 'Building credibility as an HR professional is best accomplished by:',
        options: [
            'Consistently delivering on commitments, demonstrating business knowledge, and maintaining confidentiality',
            'Always agreeing with senior management to avoid conflict',
            'Sharing confidential employee information to build trust with managers',
            'Focusing exclusively on administrative tasks and avoiding strategic conversations',
        ],
        correctAnswer: 0,
        explanation: 'HR credibility is built through reliability (delivering on promises), business acumen (speaking the language of the business), and ethical conduct (protecting confidentiality). Always agreeing eliminates HR\'s value as an independent voice. Sharing confidential information violates ethics and trust. Avoiding strategy limits HR to a transactional role without organizational influence.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Communication',
        stem: 'Active listening in a workplace conversation is best demonstrated by:',
        options: [
            'Paraphrasing the speaker\'s points, asking clarifying questions, and withholding judgment until they finish',
            'Formulating your response while the speaker is talking',
            'Multitasking during the conversation to maximize productivity',
            'Interrupting with solutions before the speaker finishes explaining the problem',
        ],
        correctAnswer: 0,
        explanation: 'Active listening involves fully concentrating on the speaker, paraphrasing to confirm understanding, asking clarifying questions, and reserving judgment. It builds trust and ensures accurate comprehension. Formulating responses while listening means you are not fully present. Multitasking signals disrespect. Premature solutions may miss the real issue and make the speaker feel unheard.',
        difficulty: 'Easy',
    },

    // ===== Behavioral Competencies — Business (5 questions) =====
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Business Acumen',
        stem: 'An HR professional is asked to justify the ROI of a leadership development program. Which metric would be most compelling to the CFO?',
        options: [
            'Reduced turnover costs and improved internal promotion rates for leadership positions',
            'The number of training hours completed by participants',
            'Employee satisfaction scores for the training sessions',
            'The number of external speakers invited to present',
        ],
        correctAnswer: 0,
        explanation: 'CFOs respond to financial impact. Reduced turnover costs (recruiting, hiring, onboarding savings) and improved internal promotion rates (lower external hiring costs, faster time-to-productivity) directly tie to the bottom line. Training hours and satisfaction scores measure activity, not outcomes. External speakers are inputs, not results. Business acumen means translating HR outcomes into financial language.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Consultation',
        stem: 'A line manager asks HR for help addressing declining team performance. As an internal consultant, the HR professional should first:',
        options: [
            'Diagnose the root cause by reviewing performance data, interviewing team members, and assessing environmental factors',
            'Recommend terminating the lowest-performing team member immediately',
            'Suggest the manager attend a leadership course without further analysis',
            'Transfer the entire team to a different department',
        ],
        correctAnswer: 0,
        explanation: 'Effective consultation starts with diagnosis before prescription. Reviewing data, interviewing team members, and assessing environmental factors (workload, tools, management style, team dynamics) reveals the root cause. Immediate termination, training recommendations, or transfers without understanding the problem are reactive and may not address the actual issue.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Analytical Aptitude',
        stem: 'An HR analyst notices that voluntary turnover has increased 15% over the past year. Which analysis would provide the most actionable insight?',
        options: [
            'Exit interview trend analysis segmented by department, tenure, and reason for leaving',
            'Comparing the company\'s revenue to the previous year',
            'Counting the total number of employees hired in the same period',
            'Reviewing the company\'s social media follower count',
        ],
        correctAnswer: 0,
        explanation: 'Exit interview analysis segmented by department, tenure, and departure reason reveals patterns — whether turnover is concentrated in specific areas, among new hires, or driven by common themes (compensation, management, growth). Revenue, hiring volume, and social media metrics do not explain why people leave. Actionable analytics require examining the right data at the right level of detail.',
        difficulty: 'Medium',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Business Acumen',
        stem: 'Aligning HR strategy with business strategy requires HR professionals to:',
        options: [
            'Understand the organization\'s competitive position, financial goals, and workforce implications of business decisions',
            'Focus exclusively on compliance and administrative efficiency',
            'Implement the same HR programs as the organization\'s top competitor',
            'Defer all strategic decisions to the finance department',
        ],
        correctAnswer: 0,
        explanation: 'Strategic HR alignment means understanding the business context — competitive landscape, financial targets, growth plans — and translating those into workforce strategies. Compliance-only HR is tactical, not strategic. Copying competitors ignores unique organizational needs. Deferring to finance abdicates HR\'s strategic role. HR earns its seat at the table by connecting people strategy to business outcomes.',
        difficulty: 'Easy',
    },
    {
        examId: SHRM_CP_ID, type: 'mcq', domain: 'Consultation',
        stem: 'When coaching a manager who struggles with giving constructive feedback to employees, the HR professional should:',
        options: [
            'Model the behavior by demonstrating effective feedback techniques and providing practice scenarios',
            'Give the feedback to the employee on the manager\'s behalf permanently',
            'Tell the manager that feedback is not important in a modern workplace',
            'Recommend the manager avoid all difficult conversations',
        ],
        correctAnswer: 0,
        explanation: 'Coaching involves developing the manager\'s own capability — modeling techniques, providing frameworks (like SBI: Situation-Behavior-Impact), and offering practice opportunities builds lasting skill. Taking over feedback permanently creates dependency. Dismissing feedback\'s importance is factually wrong. Avoiding difficult conversations allows problems to fester and performance to decline.',
        difficulty: 'Medium',
    },
];

async function main() {
    console.log(`Seeding ${questions.length} SHRM-CP questions...`);

    // Firestore batches limited to 500 ops
    const batch = db.batch();
    for (const q of questions) {
        const ref = db.collection('questions').doc();
        batch.set(ref, {
            ...q,
            isPublished: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'seed-shrm-cp-v1',
        });
        console.log(`  + ${q.domain} | ${q.stem.substring(0, 60)}...`);
    }

    await batch.commit();
    console.log(`\nDone! ${questions.length} SHRM-CP questions added.`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
