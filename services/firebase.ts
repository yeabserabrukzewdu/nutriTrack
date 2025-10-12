import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtwThwsz9A2rBW0JZuRU4eqrvAkUVyJ1M",
  authDomain: "nutrisnap-add87.firebaseapp.com",
  projectId: "nutrisnap-add87",
  storageBucket: "nutrisnap-add87.firebasestorage.app",
  messagingSenderId: "489641031561",
  appId: "1:489641031561:web:3ff1e8d31ddcbd565a9358",
  measurementId: "G-3QFJJ5LPDR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
