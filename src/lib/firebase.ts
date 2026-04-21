import { initializeApp } from "firebase/app";
import { getAuth, sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBik28A3rkn2duvB2riVb_mGdaBz3vfwZc",
  authDomain: "virtual-physican-17e0d.firebaseapp.com",
  projectId: "virtual-physican-17e0d",
  storageBucket: "virtual-physican-17e0d.firebasestorage.app",
  messagingSenderId: "75016581742",
  appId: "1:75016581742:web:3afdf3fcfa8e657f286c7f",
  measurementId: "G-D551MTV3XE",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode, onAuthStateChanged };
