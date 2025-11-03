/**
 * Script to update R2 public URLs in Firestore sentences collection
 * 
 * Run: node scripts/update-r2-urls.js
 */

const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const OLD_URL = 'https://pub-6178945914f04b039aa677fb633b90c4.r2.dev';
const NEW_URL = 'https://pub-6d6ab55d3a4e4d238a8598295cbf8540.r2.dev';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateR2Urls() {
  try {
    const q = query(collection(db, 'sentences'));
    const snapshot = await getDocs(q);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const audioUrl = data.audioUrl || '';
      
      if (!audioUrl) {
        skipped++;
        continue;
      }
      
      if (audioUrl.includes(OLD_URL)) {
        const newUrl = audioUrl.replace(OLD_URL, NEW_URL);
        
        await updateDoc(doc(db, 'sentences', docSnap.id), {
          audioUrl: newUrl,
        });
        
        updated++;
      } else {
        skipped++;
      }
    }
    
  } catch (error) {
    throw error;
    process.exit(1);
  }
}

updateR2Urls().then(() => process.exit(0)).catch(err => {
  throw err;
  process.exit(1);
});

