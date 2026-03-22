import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  MapPin,
  Search,
  Loader2,
  Wifi,
  WifiOff,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import axios, { isCancel } from "../api/axios";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const rateColor = (rate) => {
  if (rate >= 80) return "text-green-600 bg-green-50";
  if (rate >= 50) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};

// ─── Screen 1: Daily Summary ─────────────────────────────────────────────────

const SummaryScreen = ({ onDrillDown }) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      const params = new URLSearchParams({ date });
      if (region) params.append("region", region);

      const res = await axios.get(`/admin/get-attendance-summary?${params}`, {
        signal: controller.signal,
      });
      setData(res.data);
      if (res.data.filters?.regions?.length && regions.length === 0) {
        setRegions(res.data.filters.regions);
      }
    } catch (err) {
      if (isCancel(err)) return;
      toast.error(res?.data?.message || "Failed to load attendance summary.");
    } finally {
      setLoading(false);
    }
  }, [date, region]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">
            Date
          </label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-w-40"
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Totals strip */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Students",
              value: totals.total_students,
              color: "text-slate-700",
              bg: "bg-white",
            },
            {
              label: "Present Today",
              value: totals.present,
              color: "text-green-700",
              bg: "bg-green-50",
            },
            {
              label: "Absent Today",
              value: totals.absent,
              color: "text-red-700",
              bg: "bg-red-50",
            },
            {
              label: "Suspicious",
              value: totals.suspicious,
              color: "text-yellow-700",
              bg: "bg-yellow-50",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.bg} rounded-xl border border-slate-200 p-4 text-center`}
            >
              <div className={`text-2xl font-extrabold ${s.color}`}>
                {s.value}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-semibold uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall rate */}
      {totals && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <span className="font-semibold text-slate-700">
            Overall Attendance Rate — {date}
          </span>
          <span
            className={`text-lg font-extrabold px-4 py-1 rounded-full ${rateColor(totals.attendance_rate)}`}
          >
            {totals.attendance_rate}%
          </span>
        </div>
      )}

      {/* Community table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MapPin size={18} className="text-green-600" /> Communities
          </h3>
          <span className="text-xs text-slate-400">
            Click a row to view students
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={22} className="animate-spin" /> Loading...
          </div>
        ) : !data?.communities?.length ? (
          <div className="py-16 text-center text-slate-400">
            No data found for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Community</th>
                  <th className="px-4 py-3 text-left">District</th>
                  <th className="px-4 py-3 text-left">Region</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Rate</th>
                  <th className="px-4 py-3 text-center">⚠</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.communities.map((c, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() =>
                      onDrillDown({
                        community: c.community,
                        district: c.district,
                        date,
                      })
                    }
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {c.community}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.district}</td>
                    <td className="px-4 py-3 text-slate-500">{c.region}</td>
                    <td className="px-4 py-3 text-center font-bold">
                      {c.total_students}
                    </td>
                    <td className="px-4 py-3 text-center text-green-700 font-bold">
                      {c.present_count}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600 font-bold">
                      {c.absent_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${rateColor(c.attendance_rate)}`}
                      >
                        {c.attendance_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.suspicious_count > 0 ? (
                        <span className="text-yellow-600 font-bold">
                          {c.suspicious_count}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen 2: Community Detail ───────────────────────────────────────────────

const DetailScreen = ({ community, district, date, onBack, onViewStudent }) => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchDetail = useCallback(async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      const params = new URLSearchParams({ date, community, district, page });
      if (statusFilter) params.append("status", statusFilter);

      const res = await axios.get(`/admin/get-attendance-detail?${params}`, {
        signal: controller.signal,
      });
      setStudents(res.data.students || []);
      setPagination(res.data.pagination);
    } catch (err) {
      if (isCancel(err)) return;
      toast.error("Failed to load community detail.");
    } finally {
      setLoading(false);
    }
  }, [community, district, date, statusFilter, page]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const filtered = students.filter(
    (s) =>
      !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.uin?.includes(search) ||
      s.index_number?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">{community}</h2>
          <p className="text-xs text-slate-400">
            {district} · {date}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-50">
          <Search size={16} className="text-slate-400" />
          <input
            placeholder="Search by name, UIN, index..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Students</option>
          <option value="present">Present Only</option>
          <option value="absent">Absent Only</option>
          <option value="suspicious">Suspicious Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={22} className="animate-spin" /> Loading...
          </div>
        ) : !filtered.length ? (
          <div className="py-16 text-center text-slate-400">
            No students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Time</th>
                  <th className="px-4 py-3 text-center">Mode</th>
                  <th className="px-4 py-3 text-center">Flag</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {s.full_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.uin} · {s.index_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {s.program}
                      <br />
                      Level {s.level}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.has_record ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-bold">
                          <CheckCircle size={12} /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-bold">
                          <XCircle size={12} /> Absent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs font-mono">
                      {fmt(s.captured_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.is_offline ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 text-xs">
                          <WifiOff size={12} /> Offline
                        </span>
                      ) : s.has_record ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                          <Wifi size={12} /> Online
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.is_suspicious ? (
                        <span
                          title={s.suspicious_reason}
                          className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-bold cursor-help"
                        >
                          <AlertTriangle size={12} /> Flagged
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onViewStudent(s.uin)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Eye size={14} /> History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {pagination.page} of {pagination.total_pages} ·{" "}
              {pagination.total} students
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen 3: Student History ────────────────────────────────────────────────

const StudentHistoryScreen = ({ uin, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `/admin/get-student-attendance-history?uin=${uin}`,
          {
            signal: controller.signal,
          },
        );
        setData(res.data);
      } catch (err) {
        if (isCancel(err)) return;
        toast.error("Failed to load student history.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
    return () => controller.abort();
  }, [uin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 size={22} className="animate-spin" /> Loading student
        history...
      </div>
    );
  }

  if (!data) return null;

  const { student, summary, records } = data;

  // Build a map of date → record for the calendar
  const recordMap = {};
  records.forEach((r) => {
    recordMap[r.attendance_date] = r;
  });

  // Group records by week
  const byWeek = records.reduce((acc, r) => {
    const w = r.week_number || 1;
    if (!acc[w]) acc[w] = [];
    acc[w].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">
            {student.full_name}
          </h2>
          <p className="text-xs text-slate-400">
            {student.uin} · {student.index_number} · {student.community},{" "}
            {student.district}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Days Present",
            value: summary.total_present,
            color: "text-green-700 bg-green-50",
          },
          {
            label: "Flagged Records",
            value: summary.total_suspicious,
            color: "text-yellow-700 bg-yellow-50",
          },
          {
            label: "Offline Syncs",
            value: summary.total_offline,
            color: "text-blue-700 bg-blue-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.color} rounded-xl border border-slate-200 p-4 text-center`}
          >
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="text-xs font-semibold uppercase mt-1 opacity-70">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Attendance Calendar</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Each row is a week. Days 1–7 shown per week.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {Object.entries(byWeek).map(([week, weekRecords]) => {
            // Build day map for this week
            const dayMap = {};
            weekRecords.forEach((r) => {
              dayMap[r.day_number] = r;
            });

            return (
              <div key={week} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-14 shrink-0">
                  Week {week}
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const rec = dayMap[day];
                    let bg = "bg-slate-100 text-slate-300";
                    let title = `Day ${day} — No record`;
                    if (rec?.status === "present" && !rec.is_suspicious) {
                      bg = "bg-green-500 text-white";
                      title = `Day ${day} — Present at ${fmt(rec.captured_at)}`;
                    } else if (rec?.is_suspicious) {
                      bg = "bg-yellow-400 text-white";
                      title = `Day ${day} — Suspicious: ${rec.suspicious_reason}`;
                    }
                    return (
                      <div
                        key={day}
                        title={title}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold cursor-help transition-transform hover:scale-110 ${bg}`}
                      >
                        D{day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {records.length === 0 && (
            <p className="text-slate-400 text-sm py-4 text-center">
              No attendance records found for this student in the current
              session.
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" />{" "}
            Present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-400 inline-block" />{" "}
            Suspicious
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 inline-block" /> No
            record
          </span>
        </div>
      </div>

      {/* Raw record table */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">All Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Week</th>
                  <th className="px-4 py-3 text-center">Day</th>
                  <th className="px-4 py-3 text-center">Time</th>
                  <th className="px-4 py-3 text-center">Mode</th>
                  <th className="px-4 py-3 text-center">Accuracy</th>
                  <th className="px-4 py-3 text-center">Flag</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {r.attendance_date}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {r.week_number}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {r.day_number}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">
                      {fmt(r.captured_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_offline ? (
                        <span className="text-blue-600 text-xs flex items-center justify-center gap-1">
                          <WifiOff size={11} /> Offline
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs flex items-center justify-center gap-1">
                          <Wifi size={11} /> Online
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {r.accuracy ? `${Math.round(r.accuracy)}m` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_suspicious ? (
                        <span
                          title={r.suspicious_reason}
                          className="text-yellow-600 text-xs flex items-center justify-center gap-1 cursor-help"
                        >
                          <AlertTriangle size={12} /> {r.suspicious_reason}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Container ───────────────────────────────────────────────────────────

const AttendanceMonitor = () => {
  // screen: "summary" | "detail" | "history"
  const [screen, setScreen] = useState("summary");
  const [drillDownParams, setDrillDownParams] = useState(null);
  const [selectedUin, setSelectedUin] = useState(null);

  const handleDrillDown = (params) => {
    setDrillDownParams(params);
    setScreen("detail");
  };

  const handleViewStudent = (uin) => {
    setSelectedUin(uin);
    setScreen("history");
  };

  const handleBackToSummary = () => {
    setDrillDownParams(null);
    setScreen("summary");
  };

  const handleBackToDetail = () => {
    setSelectedUin(null);
    setScreen("detail");
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
        <button
          onClick={handleBackToSummary}
          className={
            screen === "summary"
              ? "text-slate-800 font-bold"
              : "hover:text-slate-600 transition-colors"
          }
        >
          Daily Overview
        </button>
        {(screen === "detail" || screen === "history") && drillDownParams && (
          <>
            <ChevronRight size={12} />
            <button
              onClick={handleBackToDetail}
              className={
                screen === "detail"
                  ? "text-slate-800 font-bold"
                  : "hover:text-slate-600 transition-colors"
              }
            >
              {drillDownParams.community}
            </button>
          </>
        )}
        {screen === "history" && (
          <>
            <ChevronRight size={12} />
            <span className="text-slate-800 font-bold">Student History</span>
          </>
        )}
      </div>

      {screen === "summary" && <SummaryScreen onDrillDown={handleDrillDown} />}
      {screen === "detail" && drillDownParams && (
        <DetailScreen
          {...drillDownParams}
          onBack={handleBackToSummary}
          onViewStudent={handleViewStudent}
        />
      )}
      {screen === "history" && selectedUin && (
        <StudentHistoryScreen uin={selectedUin} onBack={handleBackToDetail} />
      )}
    </div>
  );
};

export default AttendanceMonitor;
