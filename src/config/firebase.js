import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCCWSu_cfW2nA5Twx8M_5yGTI5td9uAvXI',
  authDomain: 'kodomarket-1c6a7.firebaseapp.com',
  projectId: 'kodomarket-1c6a7',
  storageBucket: 'kodomarket-1c6a7.firebasestorage.app',
  messagingSenderId: '909101195878',
  appId: '1:909101195878:web:02aa737810e43f8ea343a7'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
