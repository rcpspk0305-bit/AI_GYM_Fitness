import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCTSG1KA7AOOC8QrV0Kga5MujQrXm3Imwk",
  authDomain: "ai-gym-assistant-3b384.firebaseapp.com",
  projectId: "ai-gym-assistant-3b384",
  storageBucket: "ai-gym-assistant-3b384.firebasestorage.app",
  messagingSenderId: "811980417367",
  appId: "1:811980417367:web:29daebb3815440f756b612"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);