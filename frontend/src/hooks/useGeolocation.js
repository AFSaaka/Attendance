import { useState, useEffect, useCallback } from "react";
export const useGeolocation = () => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    error: null,
  });
  const [version, setVersion] = useState(0); // Used to force a restart

  const refreshGPS = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const resetLocation = useCallback(() => {
    setLocation({ lat: null, lng: null, error: null });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: "GPS not supported" }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
        }),
      (err) =>
        setLocation((prev) => ({ ...prev, error: "Location Access Denied" })),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // maximumAge: 0 forces fresh data
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [version]); // Hook restarts whenever 'version' changes

  return { location, resetLocation, refreshGPS };
};
