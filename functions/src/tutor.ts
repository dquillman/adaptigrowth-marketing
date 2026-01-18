import * as functions from "firebase-functions";
import OpenAI from "openai";

// Lazy init OpenAI
let openai: OpenAI;
const getOpenAI = () => {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("OPENAI_API_KEY is not set.");
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
        });
    }
    return openai;
};

interface TutorPayload {
    questionStem: string;
    options: string[];
    correctAnswerIndex: number;
    userSelectedOptionIndex: number;
    correctRationale: string; // The existing curated explanation
    examDomain?: string; // e.g., "People", "Process", "Business Environment"
}

interface TutorResponse {
    verdict: string; // "Option B is incorrect because..."
    comparison: {
        optionIndex: number;
        text: string;
        explanation: string; // Why this option is right/wrong
    }[];
    examLens: string; // "On the exam, remember that..."
}

export const generateTutorBreakdown = functions.https.onCall(async (data: TutorPayload, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { questionStem, options, correctAnswerIndex, userSelectedOptionIndex, correctRationale, examDomain } = data;

    // Validation
    if (!questionStem || !options || correctAnswerIndex === undefined || userSelectedOptionIndex === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }


    const client = getOpenAI();

    // Explicitly check for valid key (since getOpenAI might return client with dummy key)
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-deploy') {
        console.error("Missing OPENAI_API_KEY in environment variables.");
        // We throw a handled error so the client receives it nicely instead of a 500 crash
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Tutor Service is not configured (Missing API Key).'
        );
    }

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o", // Use high-quality model for reasoning
            messages: [
                {
                    role: "system",
                    content: `You are an expert Exam Tutor for professional certification exams (like PMP). 
Your goal is to explain WHY the user's answer is wrong and the correct one is right, using ONLY the provided context.
You must NOT introduce new facts outside the rationale. You must NOT generalize broadly.
You must be precise, concise, and exam-focused.

OUTPUT FORMAT: JSON only, strictly matching this schema:
{
  "verdict": "string (Direct explanation of why the USER's specific choice was wrong/right. Start with 'Option X is...'. If correct, affirm why. If wrong, pinpoint the specific error in reasoning.)",
  "comparison": [
    { "optionIndex": 0, "text": "Option text", "explanation": "Brief reason why this is correct or incorrect." },
    ... covering relevant options ...
  ],
  "examLens": "string (A 'Pro Tip' or 'Exam Mindset' takeaway. E.g., 'The exam expects you to prioritize X over Y.')"
}

RULES:
1. Verdict: Be direct. "B is incorrect because it implies X, but the agile mindset requires Y."
2. Choice Comparison: Briefly cover the specific reasons for the user's choice vs correct choice. You can skip obviously irrelevant distractors if the user didn't pick them, but it's better to be comprehensive if concise.
3. Exam Lens: Focus on the "Mental Model" needed for this type of question.
4. If correctRationale is provided, USE IT as the source of truth. Do not contradict it.
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

        const result = JSON.parse(content) as TutorResponse;
        return result;

    } catch (error) {
        console.error("Error generating tutor breakdown:", error);
        throw new functions.https.HttpsError('internal', 'Failed to generate tutor breakdown');
    }
});

export const generateTutorDeepDive = functions.https.onCall(async (data: { context: TutorResponse, style: 'simple' | 'memory' }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');

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
    } catch (error) {
        console.error("Deep Dive Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to generate deep dive.');
    }
});
