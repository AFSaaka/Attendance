// src/utils/attendanceUtils.js
import axios from "../api/axios";

/**
 * Saves attendance data to localStorage if the user is offline.
 */
export const saveAttendanceOffline = (data) => {
  const queue = JSON.parse(localStorage.getItem("pending_attendance") || "[]");

  const offlineRecord = {
    ...data,
    offline_id: Date.now(),
    captured_at: new Date().toISOString(),
    is_offline: true,
  };

  queue.push(offlineRecord);
  localStorage.setItem("pending_attendance", JSON.stringify(queue));
  return true;
};

/**
 * Attempts to sync all pending records to the server.
 */
export const syncOfflineAttendance = async () => {
  const queue = JSON.parse(localStorage.getItem("pending_attendance") || "[]");
  if (queue.length === 0) return { success: true, count: 0 };

  // Capture the IDs we are about to send
  const attemptIds = queue.map((item) => item.offline_id);

  try {
    const response = await axios.post("student/sync_attendance", {
      records: queue,
    });

    // If status is success, we clear the queue regardless of 'synced' vs 'skipped'
    if (response.data.status === "success") {
      const currentQueue = JSON.parse(
        localStorage.getItem("pending_attendance") || "[]"
      );

      // Only keep items that were NOT part of this sync attempt
      // This prevents deleting items that might have been added while the sync was running
      const remaining = currentQueue.filter(
        (item) => !attemptIds.includes(item.offline_id)
      );

      if (remaining.length > 0) {
        localStorage.setItem("pending_attendance", JSON.stringify(remaining));
      } else {
        localStorage.removeItem("pending_attendance");
      }

      return {
        success: true,
        count: response.data.details?.synced || 0,
        skipped: response.data.details?.skipped || 0,
      };
    }
    return { success: false, message: response.data.message };
  } catch (err) {
    console.error("Sync failed:", err);
    return { success: false, message: "Network still unavailable" };
  }
};

/**
 * Calculates current week and day based on start date
 * FIXED: Renamed to match Dashboard import and fixed timezone bug
 */
export const calculateProgramProgress = (startDateStr) => {
  if (!startDateStr) return { week: 1, day: 1 };

  // Manual splitting prevents the 'day-drifting' timezone bug
  const [year, month, day] = startDateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // If before start date, return week 1, day 1
  if (diffDays < 0) return { week: 1, day: 1 };

  return {
    week: Math.floor(diffDays / 7) + 1,
    day: (diffDays % 7) + 1,
  };
};
