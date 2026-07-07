// src/hooks/useStoreVideos.ts
import { useEffect, useState, useCallback } from "react";
import { collection, query, orderBy, getDocs } from "@/lib/supabaseStore";
import { getDB } from "../lib/supabase";
import { loadStoreSeed } from "../lib/storeSeed";
import type { TestingVideo } from "../lib/types";

let cachedVideos: TestingVideo[] | null = null;
let fetchPromise: Promise<TestingVideo[]> | null = null;

export default function useStoreVideos() {
  const [videos, setVideos] = useState<TestingVideo[]>(cachedVideos || []);
  const [loading, setLoading] = useState<boolean>(!cachedVideos);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    cachedVideos = null;
    fetchPromise = null;
    setError(null);
    setLoading(true);
    setRetryCount(c => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (cachedVideos) {
      setVideos(cachedVideos);
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!fetchPromise) {
          fetchPromise = (async () => {
            const col = collection(getDB(), "testingVideos");
            const q = query(col, orderBy("displayOrder", "asc"));
            const snap = await getDocs(q);
            
            return snap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                title: data.title ?? "",
                youtubeUrl: data.youtubeUrl ?? "",
                youtubeVideoId: data.youtubeVideoId ?? data.videoId ?? "",
                videoId: data.videoId ?? "",
                thumbnailUrl: data.thumbnailUrl ?? data.thumbnail ?? "",
                thumbnail: data.thumbnail ?? "",
                duration: data.duration ?? "",
                badgeText: data.badgeText ?? "",
                highlightText: data.highlightText ?? "",
                isActive: data.isActive !== false,
                displayOrder: data.displayOrder ?? 0,
                startDate: data.startDate ?? "",
                endDate: data.endDate ?? "",
                createdAt: data.createdAt ?? null,
                updatedAt: data.updatedAt ?? null,
              } as TestingVideo;
            });
          })();
        }

        let data = await fetchPromise;
        if (data.length === 0) {
          data = (await loadStoreSeed()).testingVideos || [];
        }
        cachedVideos = data;
        
        if (isMounted) {
          setVideos(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Supabase fetch error in testingVideos, using seed fallback');
        const seedVideos = (await loadStoreSeed()).testingVideos || [];
        cachedVideos = seedVideos;
        if (isMounted) {
          setError(err);
          setVideos(seedVideos);
          setLoading(false);
        }
      }
    };

    fetchVideos();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  return { videos, loading, error, retry };
}
