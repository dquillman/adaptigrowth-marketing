const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'exam-coach-ai-platform' });
const db = admin.firestore();

const SIX_SIGMA_GB_ID = 'XGfL6RE2ls7cokP2tqMa';

const questions = [
    // ===== Domain I: Overview — Six Sigma and the Organization (11%) =====
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Overview: Six Sigma and the Organization',
        stem: 'A manufacturing company wants to reduce cycle time while maintaining quality output. Which Lean principle focuses on producing only what the downstream process needs, when it needs it?',
        options: [
            'Just-in-Time (JIT)',
            'Poka-yoke',
            'Theory of Constraints',
            '5S',
        ],
        correctAnswer: 0,
        explanation: 'Just-in-Time (JIT) is the Lean principle of producing and delivering items exactly when needed in the exact quantity required, minimizing inventory waste. Poka-yoke is mistake-proofing. Theory of Constraints focuses on identifying and exploiting bottlenecks. 5S is a workplace organization methodology.',
        difficulty: 'Medium',
    },

    // ===== Domain II: Define Phase (20%) =====
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Define Phase',
        stem: 'A Green Belt is developing a project charter. Which element of the charter ensures the project addresses a measurable business need and has clear boundaries?',
        options: [
            'Problem statement and project scope',
            'Team member biographies',
            'Detailed statistical analysis plan',
            'Control chart selection criteria',
        ],
        correctAnswer: 0,
        explanation: 'The problem statement defines the measurable gap between current and desired performance, while the project scope sets boundaries for what the team will and will not address. Together, these charter elements ensure the project is focused on a real, quantifiable business need. Team bios, statistical plans, and control charts are not part of the project charter.',
        difficulty: 'Medium',
    },
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Define Phase',
        stem: 'A project team uses a Kano model to classify customer requirements. A feature that customers expect as a baseline — and whose absence causes strong dissatisfaction — is classified as a:',
        options: [
            'Must-be (basic) requirement',
            'Performance (one-dimensional) requirement',
            'Delighter (attractive) requirement',
            'Indifferent requirement',
        ],
        correctAnswer: 0,
        explanation: 'In the Kano model, must-be (basic) requirements are expected by customers as a given. Their presence does not increase satisfaction, but their absence causes strong dissatisfaction. Performance requirements increase satisfaction linearly. Delighters are unexpected features that create excitement. Indifferent features have little effect either way.',
        difficulty: 'Medium',
    },

    // ===== Domain III: Measure Phase (20%) =====
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Measure Phase',
        stem: 'A process has a specification range of 10.0 ± 0.5 mm. The process standard deviation is 0.08 mm and the process mean is 10.02 mm. What does the Cpk value tell you about this process?',
        options: [
            'The process capability relative to the nearest specification limit',
            'The total spread of the process relative to the specification range',
            'The long-term defect rate in parts per million',
            'The measurement system repeatability and reproducibility',
        ],
        correctAnswer: 0,
        explanation: 'Cpk measures process capability relative to the nearest specification limit, accounting for how centered the process is. Unlike Cp (which only considers spread vs. specification width), Cpk penalizes off-center processes. It is calculated as the minimum of (USL − mean)/(3σ) and (mean − LSL)/(3σ). A Cpk ≥ 1.33 is generally considered capable.',
        difficulty: 'Hard',
    },
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Measure Phase',
        stem: 'During a Gage R&R study, the percent contribution from Repeatability is 45% and from Reproducibility is 5%. What is the most appropriate conclusion?',
        options: [
            'The measurement instrument itself has excessive variation; consider calibration or replacement',
            'Different operators are the primary source of measurement variation',
            'The measurement system is acceptable for production use',
            'Part-to-part variation is too high and the process needs improvement',
        ],
        correctAnswer: 0,
        explanation: 'Repeatability refers to variation from the measurement instrument (same operator, same part, same conditions). At 45%, the instrument contributes excessive variation. Reproducibility (operator-to-operator variation) is only 5%, so operators are not the issue. A total Gage R&R above 30% is generally unacceptable. The corrective action should focus on the instrument — calibrating, repairing, or replacing it.',
        difficulty: 'Hard',
    },

    // ===== Domain IV: Analyze Phase (18%) =====
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Analyze Phase',
        stem: 'A team performs a hypothesis test comparing the mean fill weight of two production lines. The p-value is 0.03 and the significance level (α) is 0.05. What is the correct conclusion?',
        options: [
            'Reject the null hypothesis; there is a statistically significant difference between the two lines',
            'Fail to reject the null hypothesis; the difference is not statistically significant',
            'Accept the null hypothesis; the two lines are identical',
            'The test is inconclusive and a larger sample size is needed',
        ],
        correctAnswer: 0,
        explanation: 'When the p-value (0.03) is less than the significance level α (0.05), we reject the null hypothesis. This means there is sufficient statistical evidence to conclude the two production lines have different mean fill weights. We never "accept" the null — we either reject it or fail to reject it. The result is not inconclusive since p < α gives a clear decision.',
        difficulty: 'Medium',
    },
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Analyze Phase',
        stem: 'A Green Belt constructs a fishbone (Ishikawa) diagram to investigate high defect rates. Which of the following best describes the purpose of this tool?',
        options: [
            'To organize and display potential causes of a problem by category',
            'To quantify the correlation between two continuous variables',
            'To determine if a process is in statistical control',
            'To prioritize defects by frequency using the 80/20 rule',
        ],
        correctAnswer: 0,
        explanation: 'A fishbone (Ishikawa or cause-and-effect) diagram organizes potential root causes into categories (typically the 6 Ms: Man, Machine, Material, Method, Measurement, Mother Nature). It is a brainstorming and categorization tool, not a quantitative analysis. Correlation is measured with scatter plots or regression. Statistical control uses control charts. The 80/20 rule is applied via Pareto charts.',
        difficulty: 'Easy',
    },

    // ===== Domain V: Improve Phase (16%) =====
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Improve Phase',
        stem: 'A team runs a 2³ full factorial Design of Experiments (DOE) to optimize a coating process. How many experimental runs are required (without replication)?',
        options: [
            '8',
            '6',
            '9',
            '16',
        ],
        correctAnswer: 0,
        explanation: 'A full factorial DOE with k factors at 2 levels each requires 2^k runs. For 3 factors: 2³ = 8 runs. Each run represents a unique combination of high and low levels for all factors. A 2² factorial would need 4 runs, a 2⁴ would need 16 runs. Replication would multiply the total (e.g., 2 replicates × 8 = 16 total runs).',
        difficulty: 'Medium',
    },
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Improve Phase',
        stem: 'A packaging line frequently stops because the wrong box size is loaded. Which Lean tool is most appropriate to prevent this error from occurring?',
        options: [
            'Poka-yoke (mistake-proofing)',
            'Value stream mapping',
            'SIPOC diagram',
            'Pareto chart',
        ],
        correctAnswer: 0,
        explanation: 'Poka-yoke (mistake-proofing) uses physical or procedural mechanisms to prevent errors before they happen — such as designing box feeders that only accept the correct size. Value stream mapping visualizes process flow. SIPOC documents suppliers, inputs, process, outputs, and customers. Pareto charts prioritize problems by frequency. Only poka-yoke directly prevents the error at the source.',
        difficulty: 'Easy',
    },

    // ===== Domain VI: Control Phase (15%) =====
    {
        examId: SIX_SIGMA_GB_ID,
        type: 'mcq',
        domain: 'Control Phase',
        stem: 'A Green Belt is selecting a control chart for monitoring the fraction of defective units in daily samples of varying size. Which control chart is most appropriate?',
        options: [
            'p-chart',
            'X-bar and R chart',
            'c-chart',
            'Individual and Moving Range (I-MR) chart',
        ],
        correctAnswer: 0,
        explanation: 'The p-chart monitors the proportion (fraction) of defective units and accommodates varying sample sizes by recalculating control limits for each subgroup. X-bar and R charts are for continuous (variable) data. The c-chart counts defects per unit but requires a constant sample size. I-MR charts track individual continuous measurements. Since the data is attribute (defective/not defective) with varying sample sizes, the p-chart is the correct choice.',
        difficulty: 'Medium',
    },
];

async function main() {
    console.log(`Seeding ${questions.length} Six Sigma Green Belt questions...`);

    const batch = db.batch();
    for (const q of questions) {
        const ref = db.collection('questions').doc();
        batch.set(ref, {
            ...q,
            isPublished: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'seed-sixsigma-gb-v1',
        });
        console.log(`  + ${q.domain} | ${q.stem.substring(0, 60)}...`);
    }

    await batch.commit();
    console.log(`\nDone! ${questions.length} Six Sigma Green Belt questions added.`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
