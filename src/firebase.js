// Import the necessary functions from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';

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

// Export the services to be used in other parts of the application
export { db, auth };