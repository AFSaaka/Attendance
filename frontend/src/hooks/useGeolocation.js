import { useState, useEffect, useCallback } from "react";

export const useGeolocation = () => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    error: null,
  });
  const [version, setVersion] = useState(0);

  // UPDATED: Now accepts manual updates from the dashboard
  const refreshGPS = useCallback((manualData = null) => {
    if (manualData) {
      // If the dashboard sends data directly, use it
      setLocation(manualData);
    } else {
      // If the button is clicked, clear and restart
      setLocation({ lat: null, lng: null, error: null });
      setVersion((v) => v + 1);
    }
  }, []);

  const resetLocation = useCallback(() => {
    setLocation({ lat: null, lng: null, error: null });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: "GPS not supported" }));
      return;
    }

    const handleError = (err) => {
      let errorMessage = "Location Access Denied";
      if (err.code === 3) errorMessage = "GPS Timeout - Are you indoors?";
      if (err.code === 2) errorMessage = "Position Unavailable";
      setLocation({ lat: null, lng: null, error: errorMessage });
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
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
