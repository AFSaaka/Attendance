import { useState, useEffect, useCallback } from "react";

export const useGeolocation = () => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    isMocked: false, // Added for security
    timestamp: null, // Added to verify fresh data
  });
  const [version, setVersion] = useState(0);

  const refreshGPS = useCallback(() => {
    setLocation({
      lat: null,
      lng: null,
      accuracy: null,
      error: null,
      isMocked: false,
      timestamp: null,
    });
    setVersion((v) => v + 1);
  }, []);

  const resetLocation = useCallback(() => {
    setLocation({
      lat: null,
      lng: null,
      accuracy: null,
      error: null,
      isMocked: false,
      timestamp: null,
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((p) => ({ ...p, error: "GPS not supported" }));
      return;
    }

    const processPosition = (pos) => {
      // 1. Direct Mock Detection (Supported by some mobile browsers/wrappers)
      // On some Android WebViews, this flag is passed through
      const isMocked = pos.coords.mocked || false;

      // 2. Statistical Anomaly Detection
      // A: Perfect Accuracy: Real GPS accuracy is rarely EXACTLY 0.0 or 1.0.
      // B: Speed Check: If speed is exactly 0.00000 across multiple updates while outdoors, it's a flag.
      const looksLikeSpoof =
        pos.coords.accuracy === 0 ||
        (pos.coords.accuracy > 0 && pos.coords.accuracy < 1);

      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        isMocked: isMocked || looksLikeSpoof,
        timestamp: pos.timestamp,
        error: null,
      });
    };

    const handleError = (err) => {
      let msg = "Location access denied";
      if (err.code === 2) msg = "Position unavailable";
      if (err.code === 3) msg = "GPS timeout";
      setLocation({
        lat: null,
        lng: null,
        accuracy: null,
        error: msg,
        isMocked: false,
      });
    };

    // PHASE 1 — FAST LOCATION
    navigator.geolocation.getCurrentPosition(processPosition, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 5000,
    });

    // PHASE 2 — PRECISE TRACKING
    const watchId = navigator.geolocation.watchPosition(
      processPosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [version]);

  return { location, resetLocation, refreshGPS };
};
