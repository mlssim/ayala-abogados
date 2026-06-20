// ============================================
// AYALA ABOGADOS - FIREBASE CONFIGURATION
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY", // Reemplaza con tu API Key de Firebase
    authDomain: "ayala-abogados.firebaseapp.com",
    databaseURL: "https://ayala-abogados-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "ayala-abogados",
    storageBucket: "ayala-abogados.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

console.log('✅ Firebase inicializado correctamente');