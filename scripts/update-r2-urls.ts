/**
 * Script to update R2 public URLs in Firestore sentences collection
 * 
 * Run: npx tsx scripts/update-r2-urls.ts
 * Or: ts-node scripts/update-r2-urls.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

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
    console.log('Fetching sentences from Firestore...');
    const q = query(collection(db, 'sentences'));
    const snapshot = await getDocs(q);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const audioUrl = data.audioUrl as string | undefined;
      
      if (!audioUrl) {
        skipped++;
        continue;
      }
      
      if (audioUrl.includes(OLD_URL)) {
        const newUrl = audioUrl.replace(OLD_URL, NEW_URL);
        console.log(`Updating: ${docSnap.id}`);
        console.log(`  Old: ${audioUrl}`);
        console.log(`  New: ${newUrl}`);
        
        await updateDoc(doc(db, 'sentences', docSnap.id), {
          audioUrl: newUrl,
        });
        
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Completed!`);
    console.log(`   Updated: ${updated} sentences`);
    console.log(`   Skipped: ${skipped} sentences`);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateR2Urls().then(() => process.exit(0));

