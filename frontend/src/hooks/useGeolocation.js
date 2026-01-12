import { useState, useEffect, useCallback } from "react";

export const useGeolocation = () => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
  });
  const [version, setVersion] = useState(0);

  const refreshGPS = useCallback(() => {
    setLocation({ lat: null, lng: null, accuracy: null, error: null });
    setVersion((v) => v + 1);
  }, []);

  const resetLocation = useCallback(() => {
    setLocation({ lat: null, lng: null, accuracy: null, error: null });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((p) => ({ ...p, error: "GPS not supported" }));
      return;
    }

    const handleError = (err) => {
      let msg = "Location access denied";
      if (err.code === 2) msg = "Position unavailable";
      if (err.code === 3) msg = "GPS timeout";
      setLocation({ lat: null, lng: null, accuracy: null, error: msg });
    };

    /* ---------------------------
       PHASE 1 — FAST LOCATION
       --------------------------- */
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
        });
      },
      () => {}, // Ignore errors here, phase 2 will handle
      {
        enableHighAccuracy: false,
        maximumAge: 300000, // 5 minutes cache
        timeout: 5000,
      }
    );

    /* ---------------------------
       PHASE 2 — PRECISE TRACKING
       --------------------------- */
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
        });
      },
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [version]);

  return { location, resetLocation, refreshGPS };
};
