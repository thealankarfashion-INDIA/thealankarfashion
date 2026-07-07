import { useState, useEffect, useCallback } from 'react';
import { getDB } from '@/lib/supabase';
import { doc, onSnapshot } from '@/lib/supabaseStore';

export interface DeliveryRange {
  id: string;
  min: number;
  max: number | null; // null represents infinity
  charge: number;
  expressCharge?: number;
}

export interface DeliverySettings {
  mode: 'fixed' | 'range';
  fixedCharge: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  expressDeliveryEnabled: boolean;
  expressDeliveryCharge: number;
  ranges: DeliveryRange[];
}

const defaultSettings: DeliverySettings = {
  mode: 'fixed',
  fixedCharge: 80,
  freeDeliveryEnabled: true,
  freeDeliveryThreshold: 999,
  expressDeliveryEnabled: true,
  expressDeliveryCharge: 150,
  ranges: [],
};

export function useDelivery() {
  const [settings, setSettings] = useState<DeliverySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    
    try {
      const db = getDB();
      unsubscribe = onSnapshot(doc(db, 'settings', 'deliverySettings'), (snap) => {
        if (snap.exists()) {
          setSettings({ ...defaultSettings, ...snap.data() } as DeliverySettings);
        } else {
          setSettings(defaultSettings);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching delivery settings:", error);
        setLoading(false);
      });
    } catch (err) {
      console.error("Supabase query error:", err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const calculateDelivery = useCallback((subtotal: number, type: 'Standard' | 'Express' = 'Standard') => {
    // 1. Check free delivery threshold (Only applies to Standard)
    if (type === 'Standard' && settings.freeDeliveryEnabled && subtotal >= settings.freeDeliveryThreshold) {
      return 0;
    }

    // 2. Calculate based on mode
    if (settings.mode === 'range' && settings.ranges.length > 0) {
      const activeRange = settings.ranges.find((range) => {
        const isAboveMin = subtotal >= range.min;
        const isBelowMax = range.max === null || subtotal <= range.max;
        return isAboveMin && isBelowMax;
      });

      if (activeRange) {
        return type === 'Express' ? (activeRange.expressCharge ?? settings.expressDeliveryCharge) : activeRange.charge;
      }
    }

    // 3. Fallback to fixed charge (or if mode is fixed)
    return type === 'Express' ? settings.expressDeliveryCharge : settings.fixedCharge;
  }, [settings]);

  const getFreeDeliveryProgress = useCallback((subtotal: number) => {
    if (!settings.freeDeliveryEnabled) return null;
    
    if (subtotal >= settings.freeDeliveryThreshold) {
      return { eligible: true, amountNeeded: 0, progressPercent: 100 };
    }
    
    const amountNeeded = settings.freeDeliveryThreshold - subtotal;
    const progressPercent = Math.min(100, Math.max(0, (subtotal / settings.freeDeliveryThreshold) * 100));
    
    return { eligible: false, amountNeeded, progressPercent };
  }, [settings]);

  return {
    settings,
    loading,
    calculateDelivery,
    getFreeDeliveryProgress,
  };
}
