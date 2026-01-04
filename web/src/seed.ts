import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBBlyZqdAJw_yNNfUQfVW59eYgkrBJLUCQ",
    authDomain: "exam-coach-ai-platform.firebaseapp.com",
    projectId: "exam-coach-ai-platform",
    storageBucket: "exam-coach-ai-platform.firebasestorage.app",
    messagingSenderId: "980138578480",
    appId: "1:980138578480:web:f796be8a414d778a6bd3f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// connectFirestoreEmulator(db, 'localhost', 8080);

const sampleQuestions = [
    {
        stem: "Which of the following is a key output of the 'Direct and Manage Project Work' process?",
        options: ["Work performance data", "Project management plan", "Accepted deliverables", "Change requests"],
        correctAnswer: 0,
        explanation: "Work performance data is a key output, representing raw observations and measurements identified during activities being performed to carry out the project work.",
        domain: "Process",
        examId: "default-exam",
        difficulty: "Medium"
    },
    {
        stem: "A team member is constantly late to meetings and not completing tasks on time. What is the best conflict resolution technique to use?",
        options: ["Smooth/Accommodate", "Force/Direct", "Collaborate/Problem Solve", "Withdraw/Avoid"],
        correctAnswer: 2,
        explanation: "Collaborate/Problem Solve is the best approach to understand the root cause of the behavior and find a long-term solution.",
        domain: "People",
        examId: "default-exam",
        difficulty: "Hard"
    },
    {
        stem: "What is the primary purpose of the 'Develop Project Charter' process?",
        options: ["To define the detailed project scope", "To formally authorize the project", "To identify all stakeholders", "To create the project budget"],
        correctAnswer: 1,
        explanation: "The Project Charter formally authorizes the existence of the project and provides the project manager with the authority to apply organizational resources to project activities.",
        domain: "Process",
        examId: "default-exam",
        difficulty: "Easy"
    },
    {
        stem: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2,
        explanation: "Paris is the capital and most populous city of France.",
        domain: "Business Environment",
        examId: "default-exam",
        difficulty: "Easy"
    }
];

async function seed() {
    console.log("Seeding questions...");
    let i = 1;
    for (const q of sampleQuestions) {
        const id = `question_${i++}`;
        await setDoc(doc(db, "questions", id), q);
        console.log(`Added question ${id}: ${q.stem.substring(0, 20)}...`);
    }
    console.log("Done!");
}

seed();
