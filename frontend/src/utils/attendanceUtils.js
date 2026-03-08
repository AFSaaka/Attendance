// src/utils/attendanceUtils.js
import axios from "../api/axios";

/**
 * Saves attendance data to localStorage if the user is offline.
 */
export const saveAttendanceOffline = (data) => {
  const queue = JSON.parse(localStorage.getItem("pending_attendance") || "[]");

  // Ensure security flags are explicit so the backend doesn't reject them
  const offlineRecord = {
    ...data,
    offline_id: Date.now(),
    captured_at: data.captured_at || new Date().toISOString(),
    is_offline: true,
    retryCount: 0,
    // Ensure these exist for the hardened PHP backend
    is_mocked: data.is_mocked || false,
    accuracy: data.accuracy || null,
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

  const attemptIds = queue.map((item) => item.offline_id);

  try {
    // IMPORTANT: Ensure the endpoint matches your new PHP file name
    const response = await axios.post("student/submit_attendance", {
      records: queue,
    });

    // Only remove from localStorage if the server explicitly confirms sync count
    if (
      response.data.status === "success" &&
      response.data.details?.synced >= 0
    ) {
      const currentQueue = JSON.parse(
        localStorage.getItem("pending_attendance") || "[]",
      );

      const remaining = currentQueue.filter(
        (item) => !attemptIds.includes(item.offline_id),
      );

      if (remaining.length > 0) {
        localStorage.setItem("pending_attendance", JSON.stringify(remaining));
      } else {
        localStorage.removeItem("pending_attendance");
      }

      return {
        success: true,
        count: response.data.details.synced,
      };
    }
    return { success: false, message: "Server rejected sync format" };
  } catch (err) {
    console.error("Sync failed:", err.response?.data || err.message);

    // Handle retries: increment retryCount for each failed record
    const currentQueue = JSON.parse(
      localStorage.getItem("pending_attendance") || "[]",
    );
    const updatedQueue = currentQueue
      .map((record) => ({
        ...record,
        retryCount: record.retryCount + 1,
      }))
      .filter((record) => record.retryCount < 3);

    if (updatedQueue.length > 0) {
      localStorage.setItem("pending_attendance", JSON.stringify(updatedQueue));
    } else {
      localStorage.removeItem("pending_attendance");
    }

    return { success: false, message: "Network error" };
  }
};

/**
 * Progress calculation with timezone safety
 */
export const calculateProgramProgress = (startDateStr) => {
  if (!startDateStr) return { week: 1, day: 1 };

  const [year, month, day] = startDateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { week: 1, day: 1 };

  return {
    week: Math.floor(diffDays / 7) + 1,
    day: (diffDays % 7) + 1,
  };
};
