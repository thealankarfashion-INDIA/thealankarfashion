import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, getDocs, doc, deleteDoc, writeBatch } from '@/lib/supabaseStore';
import { getDB } from './supabase';

export interface AppRating {
  id: string;
  userId: string | null;
  userName: string | null;
  rating: number;
  comment?: string;
  createdAt: any;
}

export const addAppRating = async (userId: string | null, userName: string | null, rating: number, comment?: string) => {
  const db = getDB();
  const ratingsRef = collection(db, 'app_ratings');
  
  await addDoc(ratingsRef, {
    userId,
    userName: userName || 'Anonymous User',
    rating,
    comment: comment || null,
    createdAt: serverTimestamp()
  });
};

export const checkUserHasRated = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  const db = getDB();
  const q = query(collection(db, 'app_ratings'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const subscribeToRatings = (callback: (ratings: AppRating[]) => void) => {
  const db = getDB();
  const q = query(collection(db, 'app_ratings'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const ratings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AppRating[];
    callback(ratings);
  });
};

export const deleteAppRating = async (id: string) => {
  const db = getDB();
  await deleteDoc(doc(db, 'app_ratings', id));
};

export const deleteAllAppRatings = async () => {
  const db = getDB();
  const q = query(collection(db, 'app_ratings'));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return;
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.delete(document.ref);
  });
  
  await batch.commit();
};
