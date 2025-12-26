/**
 * Haversine Formula: Calculates distance in meters between two coordinates.
 * This works offline as it's pure mathematics.
 */

export const calculateProgramProgress = (startDate) => {
  if (!startDate) return { week: 1, day: 1 };

  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const week = Math.floor(diffDays / 7) + 1;
  const currentDay = (diffDays % 7) + 1;

  return {
    week: week > 0 ? week : 1,
    day: currentDay > 0 ? currentDay : 1,
  };
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371e3; // Earth's radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaP = ((lat2 - lat1) * Math.PI) / 180;
  const deltaL = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Checks if a student is within the allowed range (e.g., 200 meters)
 */
export const checkIsInRange = (distance, threshold = 200) => {
  if (distance === null) return false;
  return distance <= threshold;
};
// src/utils/gpsUtils.js
