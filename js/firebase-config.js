// ============================================
// AYALA ABOGADOS - FIREBASE CONFIGURATION
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCaxlVIHZ38VoZ59mcSlnCfgaF9jJ9nxL8",
    authDomain: "ayala-abogados.firebaseapp.com",
    databaseURL: "https://ayala-abogados-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ayala-abogados",
    storageBucket: "ayala-abogados.appspot.com",
    messagingSenderId: "1040704468911",
    appId: "1:1040704468911:web:504d0cd8023da786bfa15a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

console.log('✅ Firebase inicializado correctamente');