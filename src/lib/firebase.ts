import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// let app: FirebaseApp | null = null;
// let auth: Auth | null = null;
// let db: Firestore | null = null;

// if (firebaseConfig.apiKey) {
//     try {
//         app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
//         auth = getAuth(app);
//         db = getFirestore(app);
//     } catch (e) {
//         console.error('Firebase initialization error. Please check your Firebase project configuration.', e);
//         app = null;
//         auth = null;
//         db = null;
//     }
// } else {
//     console.warn("Firebase API Key not found in environment variables. Firebase features will be disabled.");
// }

// export { app, auth, db };

const app = initializeApp(firebaseConfig);

// Initialize Firestore - ensure it's never null
let db: Firestore;
try {
  db = getFirestore(app);
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
  throw error;
}

// Initialize Auth
let auth: Auth;
try {
  auth = getAuth(app);
} catch (error) {
  console.error('Failed to initialize Auth:', error);
  throw error;
}

export { db, auth };
export default app;