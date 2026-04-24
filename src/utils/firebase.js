import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfYj4TS9-v2TNdg5FAbu0ImScqX8y4EvE",
  authDomain: "gidaanaliz-16c66.firebaseapp.com",
  projectId: "gidaanaliz-16c66",
  storageBucket: "gidaanaliz-16c66.firebasestorage.app",
  messagingSenderId: "907669562197",
  appId: "1:907669562197:web:09f9dca044c61ffbac45dc"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
