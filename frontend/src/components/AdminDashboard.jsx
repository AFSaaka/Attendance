import React, { useState, useEffect, useCallback } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Navbar from "./navbar";
import Footer from "./footer";
import AdminHeader from "./AdminHeader";
import useAdminStats from "../hooks/useAdminStats";
import StudentModal from "./StudentModal";
import CommunityModal from "./CommunityModal";
import AdminModal from "./AdminModal";
import AttendanceExportModal from "./AttendanceExportModal";
import AttendanceMonitor from "./AttendanceMonitor";
import StudentList from "./StudentList";
import CommunityList from "./CommunityList";
import AdminList from "./AdminList";
import RecentActivity from "./RecentActivity";
import SessionManager from "./SessionManager";

import {
  Users,
  MapPin,
  Activity,
  LayoutDashboard,
  GraduationCap,
  Map,
  Lock,
  Archive,
  CalendarDays,
  ClipboardList,
  Loader2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

/* ─── Google Fonts injection ──────────────────────────────────────── */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --green:        #198104;
      --green-dark:   #0f5c02;
      --green-light:  #e8f5e0;
      --green-mid:    #2da00a;
      --slate:        #1e293b;
      --slate-mid:    #475569;
      --slate-light:  #94a3b8;
      --border:       #e4e9f0;
      --surface:      #ffffff;
      --bg:           #f4f7f3;
      --radius-sm:    8px;
      --radius-md:    14px;
      --radius-lg:    20px;
      --shadow-sm:    0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
      --shadow-md:    0 4px 16px rgba(0,0,0,.08);
      --shadow-lg:    0 8px 32px rgba(0,0,0,.12);
      --font-ui:      'DM Sans', sans-serif;
      --font-display: 'Playfair Display', serif;
    }

    /* ── Page shell ── */
    .adm-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      font-family: var(--font-ui);
      color: var(--slate);
    }

    /* ── Main content ── */
    .adm-main {
      flex: 1;
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px 16px 100px; /* bottom padding for mobile nav */
    }
    @media (min-width: 768px) {
      .adm-main { padding: 32px 32px 40px; }
    }
    @media (min-width: 1024px) {
      .adm-main { padding: 40px 48px 48px; }
    }

    /* ── Top bar ── */
    .adm-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 12px;
    }
    .adm-topbar-title {
      font-family: var(--font-display);
      font-size: clamp(1.2rem, 3vw, 1.6rem);
      font-weight: 700;
      color: var(--slate);
      margin: 0;
      line-height: 1.2;
    }
    .adm-topbar-title span {
      color: var(--green);
    }
    .adm-btn-group {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .adm-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 14px;
      border-radius: var(--radius-sm);
      border: none;
      font-family: var(--font-ui);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .18s ease;
      white-space: nowrap;
    }
    .adm-btn-primary {
      background: var(--green);
      color: #fff;
    }
    .adm-btn-primary:hover { background: var(--green-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(25,129,4,.3); }
    .adm-btn-dark {
      background: var(--slate);
      color: #fff;
    }
    .adm-btn-dark:hover { background: #0f172a; transform: translateY(-1px); }
    /* hide text on small screens, show icon only */
    .adm-btn .btn-label { display: none; }
    @media (min-width: 480px) { .adm-btn .btn-label { display: inline; } }

    /* ── Stat cards ── */
    .adm-stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 640px) {
      .adm-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
    }
    @media (min-width: 1024px) {
      .adm-stat-grid { grid-template-columns: repeat(4, 1fr); }
    }
    .adm-stat-card {
      background: var(--surface);
      border-radius: var(--radius-md);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
      overflow: hidden;
      transition: box-shadow .2s, transform .2s;
    }
    .adm-stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .adm-stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--accent, var(--green));
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    .adm-stat-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--green-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--green);
    }
    .adm-stat-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: var(--slate-light);
      margin: 0;
    }
    .adm-stat-value {
      font-size: clamp(1.3rem, 3.5vw, 1.8rem);
      font-weight: 700;
      color: var(--slate);
      margin: 0;
      line-height: 1;
    }
    .adm-stat-sub {
      font-size: 11px;
      color: var(--slate-light);
      margin: 2px 0 0;
    }
    .adm-stat-err {
      font-size: 11px;
      color: #dc2626;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    /* ── DESKTOP tab bar ── */
    .adm-tabs {
      display: none;
    }
    @media (min-width: 768px) {
      .adm-tabs {
        display: flex;
        gap: 2px;
        margin-bottom: 24px;
        background: var(--surface);
        border-radius: var(--radius-md);
        padding: 6px;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        overflow-x: auto;
        scrollbar-width: none;
      }
      .adm-tabs::-webkit-scrollbar { display: none; }
    }
    .adm-tab {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 14px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--slate-mid);
      white-space: nowrap;
      transition: all .15s ease;
      flex-shrink: 0;
    }
    .adm-tab:hover { background: var(--green-light); color: var(--green); }
    .adm-tab-active {
      background: var(--green);
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(25,129,4,.3);
    }
    .adm-tab-active:hover { background: var(--green-dark); }

    /* ── MOBILE bottom nav ── */
    .adm-mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: var(--surface);
      border-top: 1px solid var(--border);
      z-index: 900;
      padding: 8px 4px max(8px, env(safe-area-inset-bottom));
      box-shadow: 0 -4px 20px rgba(0,0,0,.08);
    }
    @media (min-width: 768px) {
      .adm-mobile-nav { display: none; }
    }
    .adm-mobile-nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      text-decoration: none;
      font-size: 10px;
      font-weight: 600;
      color: var(--slate-light);
      padding: 4px 2px;
      border-radius: var(--radius-sm);
      transition: color .15s;
    }
    .adm-mobile-nav-item.active { color: var(--green); }
    .adm-mobile-nav-item .nav-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s;
    }
    .adm-mobile-nav-item.active .nav-icon-wrap {
      background: var(--green-light);
    }

    /* ── Content card ── */
    .adm-content-card {
      background: var(--surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .adm-content-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
    }
    .adm-content-card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--slate);
      margin: 0;
    }
    .adm-content-card-body { padding: 20px; }

    /* ── Refresh toast ── */
    .adm-refresh-toast {
      position: fixed;
      top: 16px;
      right: 16px;
      background: var(--green);
      color: #fff;
      padding: 10px 16px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: slideIn .2s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* ── Restricted notice ── */
    .adm-restricted {
      text-align: center;
      padding: 48px 24px;
      color: var(--slate-light);
    }
    .adm-restricted svg { margin-bottom: 12px; opacity: .4; }
    .adm-restricted p { margin: 0; font-size: 14px; }

    /* ── animate-spin ── */
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ─── Stat Card ─────────────────────────────────────────────────── */
const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = "var(--green)",
  error,
}) => (
  <div className="adm-stat-card" style={{ "--accent": accent }}>
    <div
      className="adm-stat-icon"
      style={{ background: accent + "18", color: accent }}
    >
      <Icon size={18} />
    </div>
    <div>
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value">{value}</p>
      {sub && <p className="adm-stat-sub">{sub}</p>}
      {error && (
        <p className="adm-stat-err">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  </div>
);

/* ─── Overview ───────────────────────────────────────────────────── */
const OverviewContent = ({ stats, error, user }) => (
  <>
    <div className="adm-stat-grid">
      <StatCard
        icon={GraduationCap}
        label="Registered Students"
        value={`${stats.registered_students}/${stats.total_students}`}
        sub="Claimed / Enrolled"
        error={error}
      />
      <StatCard
        icon={MapPin}
        label="Communities"
        value={stats.total_communities}
        sub="Active placements"
        accent="#0ea5e9"
      />
      <StatCard
        icon={TrendingUp}
        label="Attendance Rate"
        value="—"
        sub="View Attendance tab"
        accent="#f59e0b"
      />
      <StatCard
        icon={Users}
        label="Session"
        value="Active"
        sub="Current academic period"
        accent="#8b5cf6"
      />
    </div>

    <div className="adm-content-card">
      <div className="adm-content-card-header">
        <Activity size={18} color="var(--green)" />
        <h3 className="adm-content-card-title">Recent System Activity</h3>
      </div>
      <div className="adm-content-card-body">
        {user?.admin_level === "super_admin" ? (
          <RecentActivity />
        ) : (
          <div className="adm-restricted">
            <Lock size={32} />
            <p>Activity logs are restricted to Super Administrators.</p>
          </div>
        )}
      </div>
    </div>
  </>
);

/* ─── Nav items config ───────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "overview", to: "/admin", icon: LayoutDashboard, label: "Overview" },
  {
    key: "attendance",
    to: "/admin/attendance",
    icon: ClipboardList,
    label: "Attendance",
  },
  {
    key: "students",
    to: "/admin/students",
    icon: GraduationCap,
    label: "Students",
  },
  {
    key: "communities",
    to: "/admin/communities",
    icon: Map,
    label: "Communities",
  },
];
const SUPER_ITEMS = [
  {
    key: "sessions",
    to: "/admin/sessions",
    icon: CalendarDays,
    label: "Sessions",
  },
  { key: "admins", to: "/admin/admins", icon: Lock, label: "Admins" },
];

/* ─── Admin Dashboard ────────────────────────────────────────────── */
const AdminDashboard = ({ user, onLogout, onOpenModal, onOpenExport }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, isRefreshing, error } = useAdminStats();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes("/attendance")) return "attendance";
    if (p.includes("/students")) return "students";
    if (p.includes("/communities")) return "communities";
    if (p.includes("/admins")) return "admins";
    if (p.includes("/sessions")) return "sessions";
    return "overview";
  };

  useEffect(() => {
    document.title = "TTFPP | Admin Dashboard";
  }, []);

  const activeTab = getActiveTab();
  const isSuperAdmin = user?.admin_level === "super_admin";
  const allNavItems = isSuperAdmin ? [...NAV_ITEMS, ...SUPER_ITEMS] : NAV_ITEMS;

  return (
    <div className="adm-shell">
      <FontLoader />
      <Navbar onLogout={onLogout} userEmail={user?.email} userRole="admin" />

      {isRefreshing && (
        <div className="adm-refresh-toast">
          <Loader2 size={15} className="spin" /> Updating…
        </div>
      )}

      <main className="adm-main">
        {/* Top bar */}
        <div className="adm-topbar">
          <h1 className="adm-topbar-title">
            {isSuperAdmin ? "Super " : ""}
            <span>Admin</span> Panel
          </h1>
          <div className="adm-btn-group">
            {isSuperAdmin && (
              <button
                className="adm-btn adm-btn-primary"
                onClick={() => navigate("/admin/sessions")}
              >
                <CalendarDays size={16} />
                <span className="btn-label">Session</span>
              </button>
            )}
            <button className="adm-btn adm-btn-dark" onClick={onOpenExport}>
              <Archive size={16} />
              <span className="btn-label">Export</span>
            </button>
          </div>
        </div>

        {/* Admin identity + quick actions */}
        <AdminHeader user={user} onAction={onOpenModal} />

        {/* Desktop tab bar */}
        <nav className="adm-tabs">
          {allNavItems.map(({ key, to, icon: Icon, label }) => (
            <Link
              key={key}
              to={to}
              className={`adm-tab ${activeTab === key ? "adm-tab-active" : ""}`}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>

        {/* Route content */}
        <Routes>
          <Route
            index
            element={
              <OverviewContent stats={stats} error={error} user={user} />
            }
          />
          <Route path="attendance" element={<AttendanceMonitor />} />
          <Route path="students" element={<StudentList />} />
          <Route path="communities" element={<CommunityList />} />
          {isSuperAdmin && (
            <>
              <Route path="admins" element={<AdminList />} />
              <Route path="sessions" element={<SessionManager />} />
            </>
          )}
        </Routes>
      </main>

      <Footer />

      {/* Mobile bottom nav */}
      <nav className="adm-mobile-nav">
        {allNavItems.map(({ key, to, icon: Icon, label }) => (
          <Link
            key={key}
            to={to}
            className={`adm-mobile-nav-item ${activeTab === key ? "active" : ""}`}
          >
            <span className="nav-icon-wrap">
              <Icon size={18} />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

/* ─── Admin Shell (modal orchestrator — unchanged logic) ─────────── */
const AdminShell = ({ user, onLogout }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const openExport = useCallback(() => setExportOpen(true), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const openModal = useCallback((type) => setActiveModal(type), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <>
      <AdminDashboard
        user={user}
        onLogout={onLogout}
        onOpenModal={openModal}
        onOpenExport={openExport}
      />

      {activeModal === "student" && (
        <StudentModal isOpen onClose={closeModal} />
      )}
      {activeModal === "community" && (
        <CommunityModal isOpen onClose={closeModal} />
      )}
      {activeModal === "admin" && <AdminModal isOpen onClose={closeModal} />}
      {exportOpen && <AttendanceExportModal isOpen onClose={closeExport} />}
    </>
  );
};

export default AdminShell;
