import axios from "../api/axios";

/**
 * Saves attendance data to localStorage if the user is offline.
 */
export const saveAttendanceOffline = (data) => {
  try {
    const queue = JSON.parse(
      localStorage.getItem("pending_attendance") || "[]",
    );

    const offlineRecord = {
      ...data,
      offline_id: `off_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      captured_at: data.captured_at || new Date().toISOString(),
      is_offline: true,
      is_mocked: !!data.is_mocked, // Ensure boolean
      accuracy: data.accuracy || 0,
      device_id: data.device_id || localStorage.getItem("student_device_id"),
    };

    queue.push(offlineRecord);
    localStorage.setItem("pending_attendance", JSON.stringify(queue));
    return true;
  } catch (err) {
    console.error("Critical: Failed to save to localStorage", err);
    return false;
  }
};

/**
 * Attempts to sync all pending records to the server.
 */
export const syncOfflineAttendance = async () => {
  const queue = JSON.parse(localStorage.getItem("pending_attendance") || "[]");
  if (queue.length === 0) return { success: true, count: 0 };

  // We keep track of IDs we are attempting to sync
  const attemptIds = queue.map((item) => item.offline_id);

  try {
    // We send 'records' key which the PHP backend should expect for batch processing
    const response = await axios.post("student/submit_attendance", {
      records: queue,
    });

    // Check for success status from your PHP backend
    if (response.data.status === "success") {
      const currentQueue = JSON.parse(
        localStorage.getItem("pending_attendance") || "[]",
      );

      // Filter out only the records that were part of this successful sync batch
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
        count: response.data.details?.synced || queue.length,
      };
    }
    return {
      success: false,
      message: response.data.message || "Server rejected sync",
    };
  } catch (err) {
    console.error("Sync failed:", err.response?.data || err.message);
    return { success: false, message: "Network error" };
  }
};

/**
 * Progress calculation with timezone and format safety
 */
export const calculateProgramProgress = (startDateStr) => {
  if (!startDateStr || typeof startDateStr !== "string")
    return { week: 1, day: 1 };

  try {
    const [year, month, day] = startDateStr.split("-").map(Number);
    if (isNaN(year)) return { week: 1, day: 1 };

    const start = new Date(year, month - 1, day);
    start.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If student starts in the future, return Week 1 Day 1
    if (diffDays < 0) return { week: 1, day: 1 };

    return {
      week: Math.floor(diffDays / 7) + 1,
      day: (diffDays % 7) + 1,
    };
  } catch (e) {
    return { week: 1, day: 1 };
  }
};
