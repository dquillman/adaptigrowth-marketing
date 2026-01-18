"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeakestPatterns = exports.generateTutorDeepDive = exports.generateTutorBreakdown = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const openai_1 = require("openai");
// Lazy init OpenAI
let openai;
const getOpenAI = () => {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("OPENAI_API_KEY is not set.");
        }
        openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
        });
    }
    return openai;
};
// Init Admin if not already
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Helper to slugify pattern name for ID
const generatePatternId = (name) => {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};
// Helper: Handle Pattern Persistence and Stats
const processPatternInteraction = async (userId, pattern, isCorrect) => {
    if (!pattern || !pattern.name)
        return;
    const patternId = generatePatternId(pattern.name);
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    // 1. Global Pattern (Upsert/Merge)
    const patternRef = db.collection('patterns').doc(patternId);
    batch.set(patternRef, {
        pattern_id: patternId,
        name: pattern.name,
        core_rule: pattern.core_rule,
        trap_signals: pattern.trap_signals,
        five_second_heuristic: pattern.five_second_heuristic,
        domain_tags: pattern.domain_tags,
        updated_at: now
    }, { merge: true });
    // 2. User Pattern Stats
    const statsRef = db.collection('users').doc(userId).collection('pattern_stats').doc(patternId);
    // We need to read existing stats to calculate mastery
    // Since we are in a batch/async flow and want speed, we'll use a transaction OR just separate reads. 
    // For simplicity and lower contention, we'll do a read-modify-write. 
    // Actually, let's just use increment/updates where possible, but mastery requires calculation.
    // Fetch current stats outside of batch for calculation
    const currentStatsSnap = await statsRef.get();
    let stats = currentStatsSnap.data() || {
        times_seen: 0,
        times_missed: 0,
        mastery_score: 0,
        first_seen_at: now
    };
    // Update Counts
    stats.times_seen = (stats.times_seen || 0) + 1;
    if (!isCorrect) {
        stats.times_missed = (stats.times_missed || 0) + 1;
    }
    stats.last_seen_at = now;
    // Recalculate Mastery Score (0-100)
    // Logic: Start at 0. Correct answer +10. Incorrect -15.
    // Bonus: If seen > 3 times and accuracy > 80%, boost.
    // specific implementation: 
    let score = stats.mastery_score || 0;
    if (isCorrect) {
        score = Math.min(100, score + 10);
    }
    else {
        score = Math.max(0, score - 15);
    }
    stats.mastery_score = score;
    batch.set(statsRef, stats, { merge: true });
    await batch.commit();
    console.log(`Pattern processed: ${patternId} for user ${userId}`);
};
exports.generateTutorBreakdown = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { questionStem, options, correctAnswerIndex, userSelectedOptionIndex, correctRationale, examDomain } = data;
    const userId = context.auth.uid;
    const isCorrect = userSelectedOptionIndex === correctAnswerIndex;
    // Validation
    if (!questionStem || !options || correctAnswerIndex === undefined || userSelectedOptionIndex === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    const client = getOpenAI();
    // Explicitly check for valid key (since getOpenAI might return client with dummy key)
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-deploy') {
        console.error("Missing OPENAI_API_KEY in environment variables.");
        // We throw a handled error so the client receives it nicely instead of a 500 crash
        throw new functions.https.HttpsError('failed-precondition', 'Tutor Service is not configured (Missing API Key).');
    }
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert Exam Tutor for professional certification exams (like PMP). 
Your goal is to explain WHY the user's answer is wrong and the correct one is right, using ONLY the provided context.
You must NOT introduce new facts outside the rationale. You must NOT generalize broadly.
You must be precise, concise, and exam-focused.

You also need to EXTRACT the underlying "Exam Pattern" or "Mindset Rule" that governs this question.
This pattern should be generalized enough to apply to other similar questions (deduplication key).

OUTPUT FORMAT: JSON only, strictly matching this schema:
{
  "verdict": "string (Direct explanation of why the USER's specific choice was wrong/right.)",
  "comparison": [
    { "optionIndex": 0, "text": "Option text", "explanation": "Brief reason." }
  ],
  "examLens": "string (A 'Pro Tip' or 'Exam Mindset' takeaway.)",
  "pattern": {
      "name": "string (Short, canonical name of the pattern, e.g. 'Servant Leader Mentality' or 'Change Control Board')",
      "core_rule": "string (1-2 sentence immutable rule, e.g. 'Never take action without an approved change request.')",
      "trap_signals": ["string", "string"], // e.g. 'Manager asks you to...', 'Urgent request'
      "five_second_heuristic": "string (Fast elimination rule, e.g. 'If implied update -> CHANGE REQUEST first.')",
      "domain_tags": ["string"] // e.g. 'Process', 'People'
  }
}

RULES:
1. Verdict: Be direct. "B is incorrect because it implies X, but the agile mindset requires Y."
2. Choice Comparison: Briefly cover the specific reasons for choice vs correct choice.
3. Pattern Name: Be consistent. If it's about "Change Requests", call it "Formal Change Control".
4. If correctRationale is provided, USE IT as the source of truth.
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        question: questionStem,
                        options: options,
                        correctAnswer: options[correctAnswerIndex],
                        userSelection: options[userSelectedOptionIndex],
                        domain: examDomain,
                        rationale: correctRationale
                    })
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3, // Low temperature for factual consistency
        });
        const content = response.choices[0].message.content;
        if (!content) {
            throw new functions.https.HttpsError('internal', 'AI returned empty response');
        }
        const result = JSON.parse(content);
        // Fire-and-forget pattern processing (don't block UI response)
        if (result.pattern) {
            processPatternInteraction(userId, result.pattern, isCorrect).catch(err => {
                console.error("Failed to process pattern:", err);
            });
        }
        return result;
    }
    catch (error) {
        console.error("Error generating tutor breakdown:", error);
        throw new functions.https.HttpsError('internal', 'Failed to generate tutor breakdown');
    }
});
exports.generateTutorDeepDive = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    // Check for API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-deploy') {
        throw new functions.https.HttpsError('failed-precondition', 'Tutor Service is not configured (Missing API Key).');
    }
    const { context: breakdown, style } = data;
    const client = getOpenAI();
    const promptMap = {
        'simple': `Explain the core concept behind this verdict to a 5-year-old. Use a simple analogy. Keep it under 3 sentences. Verdict to explain: "${breakdown.verdict}"`,
        'memory': `Create a catchy, rhyming memory hook or mnemonic to help remember the key lesson from this verdict. Verdict: "${breakdown.verdict}". Exam Lens: "${breakdown.examLens}"`
    };
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a creative teaching assistant." },
                { role: "user", content: promptMap[style] || promptMap['simple'] }
            ],
            max_tokens: 150,
            temperature: 0.7
        });
        return { content: response.choices[0].message.content };
    }
    catch (error) {
        console.error("Deep Dive Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to generate deep dive.');
    }
});
exports.getWeakestPatterns = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = context.auth.uid;
    try {
        // 1. Fetch User Stats (Low mastery first)
        // We fetch a buffer (e.g., 20) to allow for effective in-memory tie-breaking
        const statsVerifySnapshot = await db.collection('users')
            .doc(userId)
            .collection('pattern_stats')
            .orderBy('mastery_score', 'asc')
            .limit(20)
            .get();
        if (statsVerifySnapshot.empty) {
            return [];
        }
        const statsDocs = statsVerifySnapshot.docs.map(doc => (Object.assign({ pattern_id: doc.id }, doc.data())));
        // 2. In-Memory Sort for Tie-Breakers
        // Rules: 
        // 1) Mastery ASC (already done primarily, but good to ensure)
        // 2) Times Missed DESC (High pain point)
        // 3) Last Seen DESC (Recency bias)
        statsDocs.sort((a, b) => {
            var _a, _b;
            if (a.mastery_score !== b.mastery_score)
                return a.mastery_score - b.mastery_score;
            if (a.times_missed !== b.times_missed)
                return b.times_missed - a.times_missed;
            return ((_a = b.last_seen_at) === null || _a === void 0 ? void 0 : _a.toMillis()) - ((_b = a.last_seen_at) === null || _b === void 0 ? void 0 : _b.toMillis());
        });
        // 3. Take Top 5
        const topWeakest = statsDocs.slice(0, 5);
        if (topWeakest.length === 0)
            return [];
        // 4. Join with Global Patterns
        const patternIds = topWeakest.map(s => s.pattern_id);
        const refs = patternIds.map(id => db.collection('patterns').doc(id));
        const patternSnaps = await db.getAll(...refs);
        // 5. Merge and Format
        const result = topWeakest.map(stat => {
            const patternDoc = patternSnaps.find(p => p.id === stat.pattern_id);
            const patternData = patternDoc === null || patternDoc === void 0 ? void 0 : patternDoc.data();
            return {
                pattern_id: stat.pattern_id,
                pattern_name: (patternData === null || patternData === void 0 ? void 0 : patternData.name) || 'Unknown Pattern',
                core_rule: (patternData === null || patternData === void 0 ? void 0 : patternData.core_rule) || 'No rule available.',
                five_second_heuristic: (patternData === null || patternData === void 0 ? void 0 : patternData.five_second_heuristic) || '',
                mastery_score: stat.mastery_score || 0,
                times_seen: stat.times_seen || 0,
                times_missed: stat.times_missed || 0,
                // last_seen: stat.last_seen_at?.toDate().toISOString() // Optional, excluded for cleanliness per requirements
            };
        });
        return result;
    }
    catch (error) {
        console.error("Error fetching weakest patterns:", error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch patterns.');
    }
});
//# sourceMappingURL=tutor.js.map