import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp();

const db = admin.firestore();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface MasteryData {
    correct: number;
    total: number;
    lastReviewed?: admin.firestore.Timestamp;
    interval?: number; // SM-2 interval
    ef?: number; // SM-2 ease factor
}

// Simple SM-2 implementation for MVP
const calculatePriority = (mastery: MasteryData | undefined): number => {
    if (!mastery || mastery.total === 0) return 100; // High priority if never seen
    const accuracy = mastery.correct / mastery.total;
    if (accuracy < 0.6) return 80; // High priority if struggling
    if (accuracy < 0.8) return 50; // Medium priority
    return 10; // Low priority if mastered
};

export const getAdaptiveQuestions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const examId = data.examId || 'default-exam';
    const count = data.count || 10;

    try {
        // 1. Fetch User Mastery
        const masteryRef = db.collection('userMastery').doc(`${userId}_${examId}`);
        const masteryDoc = await masteryRef.get();
        const masteryData = masteryDoc.exists ? masteryDoc.data()?.masteryData || {} : {};

        // 2. Determine Weakest Domains
        // We'll fetch all questions for now (MVP) and filter/sort in memory.
        // In production, we'd query specific collections based on metadata.
        const questionsSnapshot = await db.collection('questions').where('examId', '==', examId).limit(100).get();
        const allQuestions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Score Questions based on Domain Mastery
        const scoredQuestions = allQuestions.map((q: any) => {
            const domain = q.domain || 'General';
            const domainMastery = masteryData[domain];
            const priority = calculatePriority(domainMastery);
            // Add some randomness so it's not the same questions every time
            return { ...q, score: priority + Math.random() * 20 };
        });

        // 4. Sort and Return Top N
        scoredQuestions.sort((a, b) => b.score - a.score);
        return scoredQuestions.slice(0, count);

    } catch (error) {
        console.error("Error fetching adaptive questions:", error);
        throw new functions.https.HttpsError('internal', 'Unable to fetch questions');
    }
});

import axios from 'axios';

// Helper to upload image to Firebase Storage
const uploadImageToStorage = async (imageUrl: string, prefix: string): Promise<string | null> => {
    // Try to get default bucket
    let bucket: any;
    try {
        bucket = admin.storage().bucket();
        console.log("Using default bucket:", bucket.name);
    } catch (e) {
        console.warn("Default bucket not found, falling back to candidates.");
    }

    const bucketCandidates = [
        bucket?.name, // Try default first
        "exam-coach-ai-platform.firebasestorage.app",
    ].filter(Boolean); // Remove null/undefined

    // Remove duplicates
    const uniqueBuckets = [...new Set(bucketCandidates)];

    for (const bucketName of uniqueBuckets) {
        try {
            console.log(`Attempting upload to bucket: ${bucketName}`);
            const targetBucket = admin.storage().bucket(bucketName);

            // Generate a unique token
            // Node 20+ has crypto
            const { randomUUID } = require('crypto');
            const token = randomUUID();

            const extension = 'png';
            const fileName = `${prefix}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
            const file = targetBucket.file(fileName);

            const response = await axios({
                url: imageUrl,
                method: 'GET',
                responseType: 'stream'
            });

            await new Promise((resolve, reject) => {
                response.data.pipe(file.createWriteStream({
                    metadata: {
                        contentType: 'image/png',
                        metadata: {
                            firebaseStorageDownloadTokens: token // Add token for public access
                        }
                    }
                }))
                    .on('error', reject)
                    .on('finish', resolve);
            });

            // Construct the persistent download URL
            // This works even with Uniform Bucket Level Access (UBLA)
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
            console.log("Upload successful. Public URL:", publicUrl);

            return publicUrl;
        } catch (error: any) {
            console.error(`Error uploading image to bucket ${bucketName}:`, error.message);
            // Continue to next candidate
        }
    }
    console.error("All bucket candidates failed.");
    return null;
};

export const generateQuestions = functions
    .runWith({ timeoutSeconds: 540, memory: '2GB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        const topic = data.topic || "Project Management";
        // Increase cap to 50 per request, but warn about timeouts in UI if possible
        const count = Math.min(data.count || 5, 50);
        const difficulty = data.difficulty || "Medium";
        const existingStems = new Set(data.existingStems || []);

        let difficultyPrompt = `Difficulty: ${difficulty}.`;
        if (difficulty === 'Mixed' || count > 20) {
            difficultyPrompt = "Difficulty: Mixed distribution (approx 30% Easy, 40% Medium, 30% Hard).";
        }

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a PMP Exam Question Generator. Return ONLY a raw JSON array of objects. Do not include markdown formatting."
                    },
                    {
                        role: "user",
                        content: `
                        Generate ${count} unique, high-quality PMP exam questions about "${topic}".
                        ${difficultyPrompt}
                        
                        Each object must have:
                        - stem: The question text (scenario-based).
                        - options: Array of 4 strings.
                        - correctAnswer: Index of the correct option (0-3).
                        - explanation: Detailed explanation of why the answer is correct.
                        - domain: Must be exactly "${topic}".
                        - difficulty: "${difficulty === 'Mixed' ? 'Varies (Easy, Medium, or Hard)' : difficulty}". **IMPORTANT:** If Mixed, you MUST incorrectly label each question as Easy, Medium, or Hard based on its actual complexity. Do NOT write "Mixed".
                        - visual_description: A short, vivid visual description of the scenario (e.g. "A construction site meeting in the rain", "A tense boardroom negotiation"). Max 15 words.
            
                        Ensure questions are NOT in this list of existing questions: ${JSON.stringify(Array.from(existingStems).slice(0, 50))}...
                    `
                    }
                ],
                response_format: { type: "json_object" }
            });

            const text = completion.choices[0].message.content || "[]";

            // OpenAI json_object mode usually returns { "questions": [...] } or just the array if prompted well
            // We'll parse and handle both key-based or array-based returns
            let questions: any[] = [];
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    questions = parsed;
                } else if (parsed.questions && Array.isArray(parsed.questions)) {
                    questions = parsed.questions;
                } else {
                    // fallback if it returns a wrapper object with different key
                    const key = Object.keys(parsed)[0];
                    if (Array.isArray(parsed[key])) {
                        questions = parsed[key];
                    }
                }
            } catch (e) {
                console.error("JSON parse error", e);
                questions = [];
            }



            // GENERATE IMAGES (DALL-E 2)
            // We do this in parallel to save time
            const questionsWithImages = await Promise.all(questions.map(async (q: any) => {
                let imageUrl = null;
                if (q.visual_description) {
                    try {
                        console.log(`Generating image for: "${q.visual_description}"`);
                        const imageResponse = await openai.images.generate({
                            model: "dall-e-2",
                            // Force photorealistic style
                            prompt: `Photorealistic 4k photo: ${q.visual_description}`,
                            n: 1,
                            size: "512x512"
                        });
                        const tempUrl = imageResponse.data?.[0]?.url || null;
                        console.log("OpenAI returned URL:", tempUrl ? "Yes" : "No");

                        if (tempUrl) {
                            try {
                                console.log("App Options:", JSON.stringify(admin.app().options));
                                const storageClient = admin.storage().bucket().storage;
                                const [buckets] = await storageClient.getBuckets();
                                console.log("Available buckets:", buckets.map((b: any) => b.name));
                            } catch (listErr: any) {
                                console.error("Failed to list buckets:", listErr.message || listErr);
                            }

                            // Persist image to Firebase Storage so it doesn't expire
                            imageUrl = await uploadImageToStorage(tempUrl, 'question_images');
                            console.log("Upload result:", imageUrl);
                        }
                    } catch (imgError: any) {
                        console.error("Image generation loop failed. Error details:", JSON.stringify(imgError, Object.getOwnPropertyNames(imgError), 2));
                    }
                }
                return {
                    ...q,
                    imageUrl,
                    domain: topic, // STRICTLY enforce the requested domain/topic
                    source: "AI-OpenAI-GPT4o-DALL-E",
                    createdAt: admin.firestore.Timestamp.now()
                };
            }));

            return questionsWithImages;

        } catch (error: any) {

            console.error("Error generating questions:", error);
            throw new functions.https.HttpsError('internal', `Failed to generate questions via AI: ${error.message}`);
        }
    });

export const batchGenerateQuestions = functions
    .runWith({ timeoutSeconds: 540, memory: '1GB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const examId = data.examId;
        const targetCount = Math.min(data.targetCount || 100, 100);

        if (!examId) {
            throw new functions.https.HttpsError('invalid-argument', 'examId is required');
        }

        try {
            // 1. Fetch Exam Details
            const examDoc = await db.collection('exams').doc(examId).get();
            if (!examDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Exam not found');
            }
            const examData = examDoc.data() || {};
            const examName = examData.name || "Exam";
            const examDescription = examData.description || "";
            const domains = examData.domains || [];
            const blueprint = examData.blueprint || [];

            // 2. Determine Distribution
            let distribution: {
                domain: string,
                subDomain?: string,
                count: number,
                difficulty?: string,
                questionType?: string,
                reference?: string,
                keywords?: string
            }[] = [];



            if (blueprint.length > 0) {
                // Use blueprint weights
                const totalWeight = blueprint.reduce((sum: number, item: any) => {
                    const w = typeof item.weight === 'string'
                        ? parseFloat(item.weight.replace('%', ''))
                        : (Number(item.weight) || 0);
                    return sum + (isNaN(w) ? 0 : w);
                }, 0);

                distribution = blueprint.map((item: any) => {
                    const w = typeof item.weight === 'string'
                        ? parseFloat(item.weight.replace('%', ''))
                        : (Number(item.weight) || 0);
                    const ratio = (isNaN(w) ? 0 : w) / (totalWeight || 1);
                    return {
                        domain: item.domain,
                        subDomain: item.subDomain,
                        count: Math.max(1, Math.round(targetCount * ratio)),
                        difficulty: item.difficulty,
                        questionType: item.questionType,
                        reference: item.reference,
                        keywords: item.keywords
                    };
                });
            } else {
                // Fallback: Deterministic/Even Distribution (More reliable than AI generation)
                console.log("No blueprint found. Distributing questions evenly across domains:", domains);

                if (domains && domains.length > 0) {
                    const countPerDomain = Math.floor(targetCount / domains.length);
                    let remainder = targetCount % domains.length;

                    // Check requested difficulty from data payload
                    const reqDifficulty = data.difficulty || 'Mixed';

                    distribution = domains.map((d: string) => {
                        // Distribute remainder one by one
                        const extra = remainder > 0 ? 1 : 0;
                        if (remainder > 0) remainder--;

                        return {
                            domain: d,
                            count: countPerDomain + extra,
                            difficulty: reqDifficulty === 'Mixed' ? undefined : reqDifficulty // If undefined, we can handle it in the prompt loop to ask for mix
                        };
                    });
                } else {
                    // Default if no domains exist
                    distribution = [{ domain: "General", count: targetCount, difficulty: data.difficulty || 'Medium' }];
                }
            }

            console.log(`Generating ${targetCount} questions for ${examName} with distribution:`, distribution);

            // 2b. Fetch Existing Questions (to avoid duplicates)
            // We fetch only the stems to save bandwidth/memory
            const existingQuestionsSnap = await db.collection('questions')
                .where('examId', '==', examId)
                .select('stem')
                .get();

            const existingStems = new Set(existingQuestionsSnap.docs.map(d => d.data().stem));
            console.log(`Found ${existingStems.size} existing questions for duplication check.`);

            // 3. Generate Questions in Batches (Chunked & Sequential)
            // Break down large counts into chunks of 5 to avoid JSON syntax errors
            const CHUNK_SIZE = 5;
            const generationTasks: {
                domain: string,
                subDomain?: string,
                count: number,
                difficulty?: string,
                questionType?: string,
                reference?: string,
                keywords?: string
            }[] = [];

            for (const item of distribution) {
                let remaining = item.count;
                while (remaining > 0) {
                    const chunkCount = Math.min(remaining, CHUNK_SIZE);
                    generationTasks.push({
                        ...item,
                        count: chunkCount
                    });
                    remaining -= chunkCount;
                }
            }

            const generatedQuestions: any[] = [];
            console.log(`Starting generation of ${generationTasks.length} chunks...`);

            for (const [index, item] of generationTasks.entries()) {
                // Get a random sample of existing stems to warn the AI against (context limit protection)
                const storedStemsArray = Array.from(existingStems);
                const randomSample = storedStemsArray.sort(() => 0.5 - Math.random()).slice(0, 30);

                try {
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content: `You are an expert exam question generator for the "${examName}". Description: ${examDescription}. Return a JSON object with a "questions" array.`
                            },
                            {
                                role: "user",
                                content: `
                                    Generate ${item.count} unique, high-quality multiple-choice questions.
                                    Domain: "${item.domain}"
                                    ${item.subDomain ? `Sub-Domain/Topic: "${item.subDomain}"` : ''}
                                    Difficulty Level: "${item.difficulty || 'Mixed (30% Easy, 40% Medium, 30% Hard)'}"
                                    ${item.questionType ? `Question Style: "${item.questionType}"` : ''}
                                    ${item.keywords ? `Focus Keywords: "${item.keywords}"` : ''}
                                    ${item.reference ? `Reference Source: "${item.reference}"` : ''}
                                    
                                    Each object in the "questions" array must have:
                                    - stem: The question text (scenario-based, professional tone).
                                    - options: Array of 4 strings.
                                    - correctAnswer: Index of the correct option (0-3).
                                    - explanation: Detailed explanation of why the answer is correct.
                                    ${item.reference ? `- explanation should cite: "${item.reference}"` : ''}
                                    - domain: "${item.domain}"
                                    ${item.subDomain ? `- subDomain: "${item.subDomain}"` : ''}
                                    - difficulty: "${item.difficulty || 'Varies (Easy, Medium, or Hard)'}". **IMPORTANT:** If you are asked to mix difficulties, specificy 'Easy', 'Medium', or 'Hard' for each question. Do NOT label them 'Mixed'.
                                    - visual_description: A short, vivid visual description of the scenario (e.g. "A construction site meeting in the rain", "A tense boardroom negotiation"). Max 15 words.
                                    
                                    CRITICAL: Do NOT generate questions identical or very similar to these existing ones:
                                    ${JSON.stringify(randomSample)}
                                    
                                    Ensure questions are challenging and relevant to the exam description.
                                `
                            }
                        ],
                        response_format: { type: "json_object" }
                    });

                    const text = completion.choices[0].message.content || "{}";
                    const parsed = JSON.parse(text);
                    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

                    if (questions.length > 0) {
                        // Client-side dedup check
                        const uniqueNew = questions.filter((q: any) => !existingStems.has(q.stem));

                        // Generate Images in Parallel for this chunk
                        const questionsWithImages = await Promise.all(uniqueNew.map(async (q: any) => {
                            let imageUrl = null;
                            if (q.visual_description) {
                                try {
                                    const imageResponse = await openai.images.generate({
                                        model: "dall-e-2",
                                        prompt: q.visual_description,
                                        n: 1,
                                        size: "256x256"
                                    });
                                    const tempUrl = imageResponse.data?.[0]?.url || null;

                                    if (tempUrl) {
                                        // Persist image to Firebase Storage so it doesn't expire
                                        imageUrl = await uploadImageToStorage(tempUrl, 'question_images');
                                    }
                                } catch (imgError) {
                                    console.error("Image generation failed for:", q.visual_description, imgError);
                                    // Fail gracefully
                                }
                            }

                            // Enforce metadata
                            q.domain = item.domain;
                            if (item.subDomain) q.subDomain = item.subDomain;

                            // Don't overwrite if AI provided a specific difficulty (for Mixed mode)
                            // But if item.difficulty is set (e.g. "Easy"), force it.
                            if (item.difficulty) {
                                q.difficulty = item.difficulty;
                            } else {
                                // Fallback if AI forgot to set it, but prefer AI's value
                                q.difficulty = q.difficulty || 'Medium';
                            }

                            q.imageUrl = imageUrl;
                            q.source = "AI-OpenAI-GPT4o-DALL-E"; // Update source

                            // Randomize options
                            if (q.options && typeof q.correctAnswer === 'number') {
                                const correctOptionText = q.options[q.correctAnswer];
                                for (let i = q.options.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
                                }
                                q.correctAnswer = q.options.indexOf(correctOptionText);
                            }

                            return q;
                        }));

                        questionsWithImages.forEach((q: any) => {
                            generatedQuestions.push(q);
                            existingStems.add(q.stem);
                        });

                        console.log(`Chunk ${index + 1}/${generationTasks.length} generated ${questionsWithImages.length} questions`);
                    }

                } catch (err) {
                    console.error(`Error generating chunk ${index + 1} for ${item.domain}:`, err);
                    // Continue to next chunk
                }

                if (index < generationTasks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }


            // 4. Save Generated Questions to Firestore (Batched)
            if (generatedQuestions.length > 0) {
                const BATCH_SIZE = 500;
                let batch = db.batch();
                let counter = 0;

                for (const q of generatedQuestions) {
                    const docRef = db.collection('questions').doc();
                    batch.set(docRef, {
                        ...q,
                        examId: examId,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    counter++;

                    if (counter === BATCH_SIZE) {
                        await batch.commit();
                        batch = db.batch();
                        counter = 0;
                    }
                }

                if (counter > 0) {
                    await batch.commit();
                }
            }

            // 5. Update Exam Question Count
            await db.collection('exams').doc(examId).update({
                questionCount: admin.firestore.FieldValue.increment(generatedQuestions.length)
            });

            return {
                success: true,
                count: generatedQuestions.length,
                message: `Successfully generated ${generatedQuestions.length} questions.`
            };

        } catch (error: any) {
            console.error("Error in batch generation:", error);
            throw new functions.https.HttpsError('internal', `Batch generation failed: ${error.message}`);
        }
    });

export const deleteExamQuestions = functions
    .runWith({ timeoutSeconds: 540, memory: '1GB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const examId = data.examId;
        if (!examId) {
            throw new functions.https.HttpsError('invalid-argument', 'examId is required');
        }

        try {
            const BATCH_SIZE = 500;
            const collectionRef = db.collection('questions');
            const query = collectionRef.where('examId', '==', examId).limit(BATCH_SIZE);

            return new Promise((resolve, reject) => {
                deleteQueryBatch(db, query, resolve)
                    .then(async () => {
                        // Reset count
                        await db.collection('exams').doc(examId).update({
                            questionCount: 0
                        });
                        resolve({ success: true, message: 'All questions deleted.' });
                    })
                    .catch(reject);
            });

        } catch (error: any) {
            console.error("Error deleting questions:", error);
            throw new functions.https.HttpsError('internal', `Delete failed: ${error.message}`);
        }
    });

/**
 * Resets all progress for a specific user and exam.
 * Deletes:
 * 1. userMastery document
 * 2. All quizAttempts for that exam
 */
export const resetExamProgress = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const examId = data.examId;

    if (!examId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "examId".');
    }

    try {
        const batch = db.batch();

        // 1. Delete userMastery document
        const masteryRef = db.collection('userMastery').doc(`${userId}_${examId}`);
        batch.delete(masteryRef);

        // 2. Query and delete all relevant quizAttempts
        // Note: Batch limit is 500. If user has > 500 attempts, this might need chunking.
        const attemptsQuery = db.collection('quizAttempts')
            .where('userId', '==', userId)
            .where('examId', '==', examId);

        const attemptsSnap = await attemptsQuery.get();

        attemptsSnap.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 3. Delete Question Progress (The Rings!)
        const progressQuery = db.collection('users').doc(userId).collection('questionProgress')
            .where('examId', '==', examId);

        const progressSnap = await progressQuery.get();
        progressSnap.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        return { success: true, count: attemptsSnap.size };

    } catch (error: any) {
        console.error("Error resetting progress:", error);
        throw new functions.https.HttpsError('internal', `Failed to reset progress: ${error.message}`);
    }
});

export { createCheckoutSession, createPortalSession, stripeWebhook, getSubscriptionDetails, cancelSubscription } from './stripe';


async function deleteQueryBatch(db: FirebaseFirestore.Firestore, query: FirebaseFirestore.Query, resolve: (value?: unknown) => void) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}
