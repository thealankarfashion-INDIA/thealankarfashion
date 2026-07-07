// src/hooks/useStoreAnnouncements.ts
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from '@/lib/supabaseStore';
import { getDB } from '../lib/supabase';
import { loadStoreSeed } from '../lib/storeSeed';
import type { Announcement } from '../lib/types';

let cachedAnnouncements: Announcement[] | null = null;
let fetchPromise: Promise<Announcement[]> | null = null;

const useStoreAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(cachedAnnouncements || []);
  const [loading, setLoading] = useState(!cachedAnnouncements);

  useEffect(() => {
    let isMounted = true;

    if (cachedAnnouncements) {
      setAnnouncements(cachedAnnouncements);
      setLoading(false);
      return;
    }

    const fetchAnnouncements = async () => {
      try {
        if (!fetchPromise) {
          fetchPromise = (async () => {
            const q = query(collection(getDB(), 'announcements'), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
              const data = doc.data();
              return { id: doc.id, ...data } as Announcement;
            });
          })();
        }

        let data = await fetchPromise;
        if (data.length === 0) {
          data = (await loadStoreSeed()).announcements || [];
        }
        cachedAnnouncements = data;

        if (isMounted) {
          setAnnouncements(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Supabase fetch error in announcements, using seed fallback');
        const seedAnnouncements = (await loadStoreSeed()).announcements || [];
        cachedAnnouncements = seedAnnouncements;
        if (isMounted) {
          setAnnouncements(seedAnnouncements);
          setLoading(false);
        }
      }
    };

    fetchAnnouncements();

    return () => {
      isMounted = false;
    };
  }, []);

  return { announcements, loading };
};

export default useStoreAnnouncements;
