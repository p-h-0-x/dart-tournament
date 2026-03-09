import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAoClQntINK1Ed1LHAUnZ3U36x4Gssnu00',
  authDomain: 'dart-tournament-53648.firebaseapp.com',
  projectId: 'dart-tournament-53648',
  storageBucket: 'dart-tournament-53648.firebasestorage.app',
  messagingSenderId: '426845479054',
  appId: '1:426845479054:web:8e8608eee7612eecae69df',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
