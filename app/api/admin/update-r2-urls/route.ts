import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';

const OLD_URL = 'https://pub-6178945914f04b039aa677fb633b90c4.r2.dev';
const NEW_URL = 'https://pub-6d6ab55d3a4e4d238a8598295cbf8540.r2.dev';

export async function POST(request: Request) {
  try {
    console.log('Fetching sentences from Firestore...');
    const q = query(collection(db, 'sentences'));
    const snapshot = await getDocs(q);
    
    let updated = 0;
    let skipped = 0;
    const updates: Array<{ id: string; old: string; new: string }> = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const audioUrl = data.audioUrl || '';
      
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
        
        updates.push({ id: docSnap.id, old: audioUrl, new: newUrl });
        updated++;
      } else {
        skipped++;
      }
    }
    
    return NextResponse.json({
      success: true,
      updated,
      skipped,
      total: snapshot.size,
      updates,
    });
  } catch (error: any) {
    console.error('Error updating R2 URLs:', error);
    return NextResponse.json(
      { error: 'Failed to update URLs', detail: error?.message },
      { status: 500 }
    );
  }
}

