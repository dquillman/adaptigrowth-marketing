import * as functions from "firebase-functions";
import OpenAI from "openai";

// Lazy init OpenAI (same pattern as tutor.ts)
let openai: OpenAI;
const getOpenAI = () => {
    if (!openai) {
        const apiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn("OPENAI_API_KEY is not set in functions.config().openai.key or env vars.");
        }
        openai = new OpenAI({
            apiKey: apiKey || "dummy-key-for-build",
        });
    }
    return openai;
};

interface SmartQuizReviewPayload {
    total: number;
    correct: number;
    percent: number;
    weakest_domain: "People" | "Process" | "Business Environment";
    thinking_traps?: string;
}

export const generateSmartQuizReview = functions.https.onCall(async (data: SmartQuizReviewPayload, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
    }

    const { total, correct, percent, weakest_domain, thinking_traps } = data;

    if (total == null || correct == null || percent == null || !weakest_domain) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Required fields: total, correct, percent, weakest_domain."
        );
    }

    const trapsText = thinking_traps || "None detected";

    const systemPrompt = `You are an encouraging but honest PMP exam coach. A user just finished a Smart Practice Quiz. Write a short coaching review based on their results.

User Data:
- Total questions: ${total}
- Correct: ${correct}
- Accuracy: ${percent}%
- Weakest domain: ${weakest_domain}
- Thinking traps: ${trapsText}

Guidelines:
- Open with an honest read on how they did. If they scored well, say so without overdoing it. If they struggled, acknowledge it without softening it into nothing.
- Name their weakest domain and explain what PMI actually tests in that area. Be specific: People means servant leadership and conflict resolution, Process means choosing the right framework for the situation, Business Environment means tying decisions to organizational value.
- If thinking traps were detected, call out the pattern directly and explain how PMI designs questions to exploit it. Tell them what to look for before selecting an answer.
- If thinking_traps is empty or inconclusive, infer a likely pattern from the weakest domain instead.
- Give exactly one concrete next step.
- Close with one sentence of genuine encouragement. No cliches.

Rules:
- Under 250 words.
- Write as one continuous voice.
- Never say 'template', 'section', or 'outline'.
- Do not repeat raw numbers unless meaningful.
- Be direct but never discouraging.
- Vary phrasing naturally.`;

    try {
        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate the coaching review now." },
            ],
        });

        const reviewText = (completion.choices[0].message.content || "").trim();
        return { reviewText };
    } catch (error: any) {
        console.error("Error generating smart quiz review:", error);
        throw new functions.https.HttpsError("internal", `Failed to generate review: ${error.message}`);
    }
});
