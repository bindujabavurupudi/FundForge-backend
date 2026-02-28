import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgi4UzYKEBHC--xnTKamWe1vIeISutgRQ",
  authDomain: "fundforge-81e36.firebaseapp.com",
  projectId: "fundforge-81e36",
  storageBucket: "fundforge-81e36.firebasestorage.app",
  messagingSenderId: "788234817053",
  appId: "1:788234817053:web:5fc8da32ac34f791d600f4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default firebaseConfig;
