import React, { useState, useEffect } from "react";
import { Search, Trash2, Mail, Shield, Calendar, Loader2 } from "lucide-react";
import axios from "../api/axios";

const AdminList = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/get-admins");
      setAdmins(res.data);
    } catch (err) {
      console.error("Error fetching admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter(
    (a) =>
      a.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "40px" }}
      >
        <Loader2 className="spin-animate" size={32} color="#198104" />
      </div>
    );

  return (
    <div>
      <div style={listStyles.headerRow}>
        <div style={listStyles.searchContainer}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name or email..."
            style={listStyles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={listStyles.countBadge}>
          {filteredAdmins.length} Total Admins
        </div>
      </div>

      <div style={listStyles.tableWrapper}>
        <table style={listStyles.table}>
          <thead>
            <tr style={listStyles.theadRow}>
              <th style={listStyles.th}>Admin Name</th>
              <th style={listStyles.th}>Level</th>
              <th style={listStyles.th}>Joined Date</th>
              <th style={listStyles.th}>Status</th>
              <th style={listStyles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins.map((admin) => (
              <tr key={admin.id} style={listStyles.tr}>
                <td style={listStyles.td}>
                  <div style={{ fontWeight: "600", color: "#1e293b" }}>
                    {admin.user_name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Mail size={12} /> {admin.email}
                  </div>
                </td>
                <td style={listStyles.td}>
                  <span
                    style={
                      admin.admin_level === "super_admin"
                        ? listStyles.badgeSuper
                        : listStyles.badgeAdmin
                    }
                  >
                    <Shield size={12} /> {admin.admin_level}
                  </span>
                </td>
                <td style={listStyles.td}>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    {new Date(admin.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td style={listStyles.td}>
                  <span
                    style={
                      admin.is_active
                        ? listStyles.statusActive
                        : listStyles.statusInactive
                    }
                  >
                    {admin.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={listStyles.td}>
                  <button
                    style={listStyles.deleteBtn}
                    onClick={() => {
                      /* Add Delete Logic */
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const listStyles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
    alignItems: "center",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8fafc",
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    width: "300px",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "14px",
    width: "100%",
  },
  countBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#198104",
    background: "#f0fdf4",
    padding: "4px 12px",
    borderRadius: "20px",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { borderBottom: "2px solid #f1f5f9" },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "16px" },
  badgeAdmin: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  badgeSuper: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    background: "#fef9c3",
    color: "#854d0e",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusActive: { color: "#16a34a", fontSize: "12px", fontWeight: "600" },
  statusInactive: { color: "#dc2626", fontSize: "12px", fontWeight: "600" },
  deleteBtn: {
    color: "#ef4444",
    border: "none",
    background: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "6px",
  },
};

export default AdminList;
