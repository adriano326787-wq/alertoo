import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { db } from '../services/firebase';
import { captureError } from '../services/sentry';
import { BRAZIL_STATES, getStateCentroid } from '../utils/brazilGeo';
import { ZoomTier } from '../utils/mapZoom';
import { RoadEvent } from '../types';
import { EntertainmentEvent } from '../types/entertainment';

interface UseStatePinsOptions {
  zoomTier: ZoomTier;
  zoomLevel: number;
  exploreStateUF: string | null;
  allRoadEvents: RoadEvent[];
  allEntertainmentEvents: EntertainmentEvent[];
  mapRef: React.RefObject<any>;
  setExploreStateUF: (uf: string | null) => void;
}

export function useStatePins({
  zoomTier,
  zoomLevel,
  exploreStateUF,
  allRoadEvents,
  allEntertainmentEvents,
  mapRef,
  setExploreStateUF,
}: UseStatePinsOptions) {
  const isStatePinView = zoomTier === 'distant' && zoomLevel <= 8;

  const [otherStateCounts, setOtherStateCounts] = useState<Record<string, number> | null>(null);

  // Pre-carrega doc de contagens no mount para que os pins apareçam imediatamente ao fazer zoom out
  useEffect(() => {
    getDoc(doc(db, 'stats', 'eventCountsByState'))
      .then((snap) => {
        if (snap.exists()) setOtherStateCounts(snap.data().counts ?? null);
      })
      .catch((e) => captureError(e, { where: 'useStatePins.preloadCounts' }));
  }, []);

  // Listener em tempo real apenas quando isStatePinView está ativo
  useEffect(() => {
    if (!isStatePinView) return;
    const unsub = onSnapshot(
      doc(db, 'stats', 'eventCountsByState'),
      (snap) => {
        const data = snap.data();
        setOtherStateCounts(data?.counts ?? null);
      },
      () => {},
    );
    return unsub;
  }, [isStatePinView]);

  // Fallback local: agrega contagens dos eventos em memória quando o doc Firestore ainda não chegou
  const effectiveStateCounts = useMemo<Record<string, number> | null>(() => {
    if (otherStateCounts) return otherStateCounts;
    if (!isStatePinView) return null;
    const counts: Record<string, number> = {};
    allRoadEvents.forEach((ev) => {
      if (ev.stateUF) counts[ev.stateUF] = (counts[ev.stateUF] ?? 0) + 1;
    });
    allEntertainmentEvents.forEach((ev) => {
      if (ev.stateUF) counts[ev.stateUF] = (counts[ev.stateUF] ?? 0) + 1;
    });
    return Object.keys(counts).length > 0 ? counts : null;
  }, [otherStateCounts, allRoadEvents, allEntertainmentEvents, isStatePinView]);

  const otherStatePins = useMemo(() => {
    if (!isStatePinView || !effectiveStateCounts) return [];
    const excludeUF = exploreStateUF ?? null;
    return BRAZIL_STATES
      .filter((s) => s.uf !== excludeUF && (effectiveStateCounts[s.uf] ?? 0) > 0)
      .map((s) => {
        const centroid = getStateCentroid(s.uf);
        return centroid ? { uf: s.uf, count: effectiveStateCounts[s.uf], ...centroid } : null;
      })
      .filter((p): p is { uf: string; count: number; latitude: number; longitude: number } => p !== null);
  }, [isStatePinView, effectiveStateCounts, exploreStateUF]);

  const highlightedStateUF = useMemo(() => {
    if (otherStatePins.length === 0) return null;
    return otherStatePins.reduce((max, p) => (p.count > max.count ? p : max), otherStatePins[0]).uf;
  }, [otherStatePins]);

  const handleStatePinPress = useCallback((uf: string) => {
    const centroid = getStateCentroid(uf);
    if (!centroid || !mapRef.current) return;
    Haptics.selectionAsync().catch(() => {});
    mapRef.current.animateToRegion({
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      latitudeDelta: 4,
      longitudeDelta: 4,
    }, 600);
    setExploreStateUF(uf);
  }, [mapRef, setExploreStateUF]);

  return {
    isStatePinView,
    otherStatePins,
    highlightedStateUF,
    handleStatePinPress,
  };
}
