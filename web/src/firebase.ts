import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFunctions, type Functions } from 'firebase/functions';
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getPerformance, type FirebasePerformance } from "firebase/performance";

const firebaseConfig = {
    apiKey: "AIzaSyBBlyZqdAJw_yNNfUQfVW59eYgkrBJLUCQ",
    authDomain: "exam-coach-ai-platform.firebaseapp.com",
    projectId: "exam-coach-ai-platform",
    storageBucket: "exam-coach-ai-platform.firebasestorage.app",
    messagingSenderId: "980138578480",
    appId: "1:980138578480:web:f796be8a414d778a6bd3f5"
};

console.log('Initializing Firebase...');
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let functions: Functions;
let analytics: Analytics;
let perf: FirebasePerformance;

try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase App initialized');
    db = getFirestore(app);
    console.log('Firestore initialized');
    auth = getAuth(app);
    console.log('Auth initialized');
    functions = getFunctions(app);
    analytics = getAnalytics(app);
    console.log('Analytics initialized');
    perf = getPerformance(app);
    console.log('Performance initialized');

    // if (location.hostname === "localhost") {
    //     connectFirestoreEmulator(db, 'localhost', 8080);
    //     connectAuthEmulator(auth, 'http://localhost:9099');
    //     connectFunctionsEmulator(functions, 'localhost', 5001);
    //     console.log("Connected to Firebase Emulators");
    // }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

const googleProvider = new GoogleAuthProvider();
export { db, auth, googleProvider, functions, analytics, perf };
