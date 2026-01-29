import React, { useState, useEffect, useCallback } from "react";
import axios from "../api/axios";
import {
  Clock,
  Shield,
  User,
  ArrowRight,
  Info,
  AlertCircle,
  Download,
  Filter,
  Loader2,
} from "lucide-react";

const RecentActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState("7");

  // Wrapped in useCallback to prevent unnecessary re-renders in parent components
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/admin/get-system-activity");
      if (res.data.status === "success") {
        setLogs(res.data.data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to load activity logs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDownload = () => {
    const baseUrl = axios.defaults.baseURL || "";
    const downloadUrl = `${baseUrl}/admin/generate-log-file.?days=${days}`;
    window.location.href = downloadUrl;
  };

  return (
    <div>
      {/* FILTER & DOWNLOAD BAR */}
      <div style={styles.filterBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Filter size={18} color="#64748b" />
          <span
            style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}
          >
            Export Range:
          </span>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            style={styles.select}
          >
            <option value="1">Last 24 Hours</option>
            <option value="3">Last 3 Days</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>

          {/* Subtle loading indicator instead of a full-page spinner */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginLeft: "10px",
              }}
            >
              <Loader2 size={14} className="animate-spin" color="#198104" />
              <span style={{ fontSize: "11px", color: "#198104" }}>
                Syncing...
              </span>
            </div>
          )}
        </div>

        <button onClick={handleDownload} style={styles.downloadBtn}>
          <Download size={16} />
          Generate CSV
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* LOG LIST - Stable Container */}
      <div style={styles.container}>
        {logs.length === 0 && !loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
            No recent activity found.
          </p>
        ) : (
          // We show existing logs even if 'loading' is true to prevent layout jumping
          logs.slice(0, 5).map((log) => (
            <div key={log.id} style={styles.card}>
              <div style={styles.header}>
                <span style={styles.admin}>
                  <Shield size={14} style={{ marginRight: "5px" }} />
                  {log.admin_identity}
                </span>
                <span style={styles.time}>
                  <Clock size={12} style={{ marginRight: "4px" }} />
                  {new Date(log.created_at).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div style={styles.content}>
                <span style={styles.action}>
                  {log.action_type?.replace(/_/g, " ")}
                </span>
                <ArrowRight size={14} color="#94a3b8" />
                <span style={styles.target}>
                  <User size={14} style={{ marginRight: "5px" }} />
                  {log.target_name}
                  {log.target_uin && log.target_uin !== "N/A" && (
                    <small style={{ marginLeft: "4px", color: "#64748b" }}>
                      ({log.target_uin})
                    </small>
                  )}
                </span>
              </div>

              {log.description && (
                <div style={styles.footer}>
                  <Info
                    size={12}
                    style={{ marginRight: "6px", flexShrink: 0 }}
                  />
                  <span>{log.description}</span>
                </div>
              )}
            </div>
          ))
        )}

        {logs.length > 5 && (
          <p style={styles.limitNote}>
            Showing 5 most recent activities. Download CSV for full audit
            history.
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: "100px",
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 15px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    marginBottom: "15px",
    border: "1px solid #e2e8f0",
  },
  select: {
    padding: "5px 8px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "12px",
    backgroundColor: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  downloadBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#198104",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  errorBox: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    padding: "10px",
    borderRadius: "8px",
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "15px",
    fontSize: "13px",
  },
  card: {
    padding: "12px",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    transition: "all 0.2s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  admin: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#166534",
    display: "flex",
    alignItems: "center",
  },
  time: {
    fontSize: "11px",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  action: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },
  target: {
    fontSize: "13px",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    fontWeight: "500",
  },
  footer: {
    fontSize: "12px",
    color: "#475569",
    display: "flex",
    alignItems: "flex-start",
    padding: "8px",
    backgroundColor: "#f1f5f9",
    borderRadius: "4px",
    borderLeft: "3px solid #cbd5e1",
  },
  limitNote: {
    textAlign: "center",
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "5px",
    fontStyle: "italic",
  },
};

export default RecentActivity;
