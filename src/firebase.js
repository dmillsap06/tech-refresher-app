// Import the necessary functions from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

// Your web app's Firebase configuration, provided by you.
// It's a good practice to keep this in a separate file.
const firebaseConfig = {
    apiKey: "AIzaSyAZHFvQPYKI-mwqnYpo68KQfBuqrh8cHu0",
    authDomain: "tech-refresher-tracker.firebaseapp.com",
    projectId: "tech-refresher-tracker",
    storageBucket: "tech-refresher-tracker.appspot.com",
    messagingSenderId: "77905323989",
    appId: "1:77905323989:web:d469fd77315bab21efbf5c",
    measurementId: "G-4CT3NTJVNJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);


// Function to handle anonymous or custom token sign-in
// This is needed to secure Firestore rules later if we want to ensure
// only app users can read/write, even if they don't have passwords.
const signIn = async () => {
    if (auth.currentUser) {
        return auth.currentUser;
    }
    // The __initial_auth_token is a special variable that might be provided
    // in some environments. We check for it on the `window` object to avoid linting errors.
    if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
        await signInWithCustomToken(auth, window.__initial_auth_token);
    } else {
        await signInAnonymously(auth);
    }
    return auth.currentUser;
};


// Export the services to be used in other parts of the application
export { db, auth, signIn };