import { useState, useEffect, useCallback } from "react";
import axios from "../api/axios";

export default function useAdminStats() {
  const [stats, setStats] = useState({
    registered_students: 0,
    total_students: 0,
    total_communities: 0,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);

    try {
      const res = await axios.get("/admin/stats");
      setStats(res.data?.stats || res.data);
      setError(null);
    } catch {
      setError("Failed to load metrics.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(() => fetchStats(true), 60000);
    return () => clearInterval(id);
  }, [fetchStats]);

  return { stats, isRefreshing, error };
}
