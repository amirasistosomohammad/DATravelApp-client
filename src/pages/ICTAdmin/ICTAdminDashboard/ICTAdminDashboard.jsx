import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaThLarge,
  FaUsers,
  FaUserCheck,
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
} from "react-icons/fa";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";

const abbreviateNumber = (amount) => {
  if (amount === null || amount === undefined || amount === 0) return "0";
  const num = Math.abs(amount);
  let abbreviated = "";
  let suffix = "";

  if (num >= 1_000_000_000) {
    abbreviated = (num / 1_000_000_000).toFixed(1);
    suffix = "B";
  } else if (num >= 1_000_000) {
    abbreviated = (num / 1_000_000).toFixed(1);
    suffix = "M";
  } else if (num >= 1_000) {
    abbreviated = (num / 1_000).toFixed(1);
    suffix = "K";
  } else {
    abbreviated = num.toFixed(0);
  }

  abbreviated = parseFloat(abbreviated).toString();
  const sign = amount < 0 ? "-" : "";
  return `${sign}${abbreviated}${suffix}`;
};

const formatFullNumber = (amount) =>
  Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
const RECENT_ORDERS_LIMIT = 5;

const ICTAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [personnelStats, setPersonnelStats] = useState(null);
  const [directorStats, setDirectorStats] = useState(null);
  const [travelOrders, setTravelOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [numberModal, setNumberModal] = useState({
    show: false,
    title: "",
    value: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const fetchDashboardData = React.useCallback(async () => {
    if (user?.role !== "ict_admin") {
      setOrdersLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setOrdersLoading(false);
      return;
    }
    setOrdersLoading(true);
    try {
      // Fetch personnel stats
      const personnelResponse = await fetch(
        `${API_BASE_URL}/ict-admin/personnel?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const personnelData = await personnelResponse.json();
      if (personnelResponse.ok && personnelData?.data?.stats) {
        setPersonnelStats(personnelData.data.stats);
      }

      // Fetch director stats
      const directorResponse = await fetch(
        `${API_BASE_URL}/ict-admin/directors?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const directorData = await directorResponse.json();
      if (directorResponse.ok && directorData?.data?.stats) {
        setDirectorStats(directorData.data.stats);
      }

      // Fetch recent travel orders (from personnel endpoint - admin can view all)
      // Note: We'll need to fetch from a general endpoint or calculate from stats
      // For now, we'll use empty array and calculate stats from counts
      setTravelOrders([]);
    } catch (err) {
      toast.error("Failed to load dashboard data");
      setPersonnelStats(null);
      setDirectorStats(null);
      setTravelOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = React.useMemo(
    () => ({
      totalPersonnel: personnelStats?.total || 0,
      activePersonnel: personnelStats?.active || 0,
      inactivePersonnel: personnelStats?.inactive || 0,
      totalDirectors: directorStats?.total || 0,
      activeDirectors: directorStats?.active || 0,
      inactiveDirectors: directorStats?.inactive || 0,
      totalUsers: (personnelStats?.total || 0) + (directorStats?.total || 0),
      activeUsers: (personnelStats?.active || 0) + (directorStats?.active || 0),
    }),
    [personnelStats, directorStats]
  );

  const recentTravelOrders = React.useMemo(
    () => travelOrders.slice(0, RECENT_ORDERS_LIMIT),
    [travelOrders]
  );

  const quickActions = useMemo(
    () => [
      {
        label: "Personnel Management",
        icon: FaUsers,
        route: "/users/personnel",
        variant: "primary",
        color: "#ffffff",
        background:
          "linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%)",
      },
      {
        label: "Director Management",
        icon: FaUserCheck,
        route: "/users/directors",
        variant: "outline",
        color: "var(--primary-color)",
      },
      {
        label: "Time Logging",
        icon: FaClock,
        route: "/users/time-logging",
        variant: "outline",
        color: "var(--primary-color)",
      },
    ],
    []
  );

  const getQuickActionStyle = (action) => ({
    borderRadius: "0",
    border: "1px solid var(--primary-color)",
    background: action.background || action.color || "var(--primary-color)",
    color: "#fff",
    paddingInline: "0.9rem",
    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
  });

  const handleNumberClick = (title, value) => {
    setNumberModal({
      show: true,
      title,
      value: formatFullNumber(value),
    });
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: {
        backgroundColor: "rgba(108, 117, 125, 0.15)",
        color: "#495057",
        border: "1px solid rgba(108, 117, 125, 0.35)",
      },
      pending: {
        backgroundColor: "rgba(255, 179, 0, 0.15)",
        color: "#856404",
        border: "1px solid rgba(255, 179, 0, 0.35)",
      },
      approved: {
        backgroundColor: "rgba(40, 167, 69, 0.15)",
        color: "#155724",
        border: "1px solid rgba(40, 167, 69, 0.35)",
      },
      rejected: {
        backgroundColor: "rgba(220, 53, 69, 0.15)",
        color: "#721c24",
        border: "1px solid rgba(220, 53, 69, 0.35)",
      },
    };

    return (
      <span
        className="badge px-3 py-2 fw-semibold"
        style={{
          ...(styles[status] || styles.pending),
          fontSize: "0.75rem",
          borderRadius: "6px",
        }}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
      </span>
    );
  };

  const getPersonnelName = (p) => {
    if (!p) return "—";
    if (p.first_name && p.last_name) {
      const parts = [p.first_name];
      if (p.middle_name) parts.push(p.middle_name);
      parts.push(p.last_name);
      return parts.join(" ");
    }
    return p.name || p.username || "—";
  };

  if (loading) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="container-fluid py-2 admin-dashboard-container page-enter px-1">
      <style>{`
        .admin-dash-shell {
          animation: pageEnter 0.35s ease-out;
        }
        .admin-dash-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          margin-bottom: 1rem;
        }
        .admin-dash-header-icon {
          width: 2.5rem;
          height: 2.5rem;
          min-width: 2.5rem;
          min-height: 2.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.06);
          color: var(--primary-color);
          border: 1px solid rgba(13, 122, 58, 0.15);
        }
        .admin-dash-header-icon svg {
          width: 1rem;
          height: 1rem;
        }
        .admin-dash-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-color);
          background-color: rgba(13,122,58,0.08);
        }
        .admin-dash-stat-card {
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .admin-dash-stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .admin-dash-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .admin-dash-stat-icon {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15,23,42,0.04);
          color: var(--primary-color);
        }
        .admin-dash-actions .btn {
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease;
        }
        .admin-dash-actions .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(15,23,42,0.18);
          background-color: var(--primary-color);
          color: #ffffff;
        }
        .admin-dash-recent-card {
          border-radius: 0.5rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 2px 8px rgba(15,23,42,0.06);
        }
        .admin-dash-recent-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .admin-dash-recent-card .gov-list-table thead th {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }
        .admin-dash-recent-card .table tbody tr:hover {
          background-color: rgba(13,122,58,0.04);
        }
        .admin-dash-recent-card .table td {
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .admin-dash-recent-btn {
          border-radius: 0;
          border: 1px solid var(--primary-color);
          background: var(--primary-color);
          color: #fff;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .admin-dash-recent-btn:hover {
          background: #0a6b2d;
          color: #fff;
          box-shadow: 0 2px 6px rgba(13,122,58,0.25);
        }
        @media (max-width: 767.98px) {
          .admin-dash-recent-card .admin-dash-recent-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .admin-dash-recent-card .admin-dash-recent-table {
            min-width: 520px;
          }
          .admin-dash-recent-card .admin-dash-recent-table thead th,
          .admin-dash-recent-card .admin-dash-recent-table tbody td {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            vertical-align: middle;
          }
          .admin-dash-recent-card .admin-dash-recent-table td.admin-dash-recent-cell-purpose {
            max-width: 180px;
          }
          .admin-dash-recent-card .admin-dash-recent-table tbody td[colspan] {
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
          }
        }
        @media (max-width: 575.98px) {
          .admin-dash-header {
            padding: 0.85rem 0.9rem;
          }
        }
      `}</style>

      <div className="admin-dash-shell">
        {/* Page Header */}
        <div className="admin-dash-header d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-3 mb-1">
              <div className="admin-dash-header-icon">
                <FaThLarge />
              </div>
              <div>
                <h1
                  className="h5 mb-0 fw-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Overview
                </h1>
                <p
                  className="mb-0 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {user?.name
                    ? `Welcome back, ${user.name.split(" ")[0]}.`
                    : "Welcome back."}{" "}
                  Monitor and manage system users and activities in one place.
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span className="admin-dash-chip me-2">
                <FaUsers className="me-1" />
                System administration overview
              </span>
            </div>
          </div>

          <div className="admin-dash-actions d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
            <button
              className="btn btn-sm d-flex align-items-center"
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                borderRadius: "0",
                border: "1px solid var(--primary-color)",
                color: "#ffffff",
                backgroundColor: "var(--primary-color)",
                paddingInline: "0.9rem",
                boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
              }}
            >
              {refreshing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Refreshing
                </>
              ) : (
                <>
                  <FaSyncAlt className="me-2" />
                  Refresh
                </>
              )}
            </button>
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="btn btn-sm d-flex align-items-center"
                style={getQuickActionStyle(action)}
                onClick={() => navigate(action.route)}
              >
                <action.icon className="me-2" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats Overview */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card admin-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="admin-dash-stat-label">Total users</div>
                  <div
                    className="admin-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Total users", stats.totalUsers)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.totalUsers)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Click the number to view full value.
                  </small>
                </div>
                <div className="admin-dash-stat-icon">
                  <FaUsers size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card admin-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="admin-dash-stat-label">Personnel</div>
                  <div
                    className="admin-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Total personnel", stats.totalPersonnel)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.totalPersonnel)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    {stats.activePersonnel} active, {stats.inactivePersonnel} inactive
                  </small>
                </div>
                <div className="admin-dash-stat-icon">
                  <FaUsers size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card admin-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="admin-dash-stat-label">Directors</div>
                  <div
                    className="admin-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Total directors", stats.totalDirectors)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.totalDirectors)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    {stats.activeDirectors} active, {stats.inactiveDirectors} inactive
                  </small>
                </div>
                <div className="admin-dash-stat-icon">
                  <FaUserCheck size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card admin-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="admin-dash-stat-label">Active users</div>
                  <div
                    className="admin-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Active users", stats.activeUsers)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.activeUsers)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Currently active accounts.
                  </small>
                </div>
                <div className="admin-dash-stat-icon">
                  <FaCheckCircle size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities / System Overview */}
        <div className="card admin-dash-recent-card mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 d-flex align-items-center">
              <FaFileAlt className="me-2" style={{ color: "var(--primary-color)" }} />
              System Overview
            </h5>
            <Link to="/users/personnel" className="btn btn-sm admin-dash-recent-btn">
              Manage users
            </Link>
          </div>
          <div className="card-body p-0">
            {ordersLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 mb-0 small text-muted">Loading system data...</p>
              </div>
            ) : (
              <div className="table-responsive gov-list-table-wrap travel-orders-table-wrap admin-dash-recent-table-wrap">
                <table className="table table-hover mb-0 gov-list-table travel-orders-table admin-dash-recent-table">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Category
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Total
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Active
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Inactive
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-end" style={{ color: "var(--text-primary)" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-middle">
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>
                        <FaUsers className="me-2" style={{ color: "var(--primary-color)" }} />
                        Personnel
                      </td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>
                        {abbreviateNumber(stats.totalPersonnel)}
                      </td>
                      <td className="py-2 px-3 small">
                        <span className="badge bg-success-subtle text-success-emphasis">
                          {abbreviateNumber(stats.activePersonnel)}
                        </span>
                      </td>
                      <td className="py-2 px-3 small">
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {abbreviateNumber(stats.inactivePersonnel)}
                        </span>
                      </td>
                      <td className="py-2 px-3 small text-end">
                        <Link
                          to="/users/personnel"
                          className="btn btn-sm admin-dash-recent-btn"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                    <tr className="align-middle">
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>
                        <FaUserCheck className="me-2" style={{ color: "var(--primary-color)" }} />
                        Directors
                      </td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>
                        {abbreviateNumber(stats.totalDirectors)}
                      </td>
                      <td className="py-2 px-3 small">
                        <span className="badge bg-success-subtle text-success-emphasis">
                          {abbreviateNumber(stats.activeDirectors)}
                        </span>
                      </td>
                      <td className="py-2 px-3 small">
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {abbreviateNumber(stats.inactiveDirectors)}
                        </span>
                      </td>
                      <td className="py-2 px-3 small text-end">
                        <Link
                          to="/users/directors"
                          className="btn btn-sm admin-dash-recent-btn"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                    <tr className="align-middle">
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>
                        <FaFileAlt className="me-2" style={{ color: "var(--primary-color)" }} />
                        Total Users
                      </td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>
                        {abbreviateNumber(stats.totalUsers)}
                      </td>
                      <td className="py-2 px-3 small">
                        <span className="badge bg-success-subtle text-success-emphasis">
                          {abbreviateNumber(stats.activeUsers)}
                        </span>
                      </td>
                      <td className="py-2 px-3 small">
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {abbreviateNumber((stats.totalPersonnel - stats.activePersonnel) + (stats.totalDirectors - stats.activeDirectors))}
                        </span>
                      </td>
                      <td className="py-2 px-3 small text-end">
                        <Link
                          to="/users/personnel"
                          className="btn btn-sm admin-dash-recent-btn"
                        >
                          View all
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Full Number Value Modal */}
        {numberModal.show && (
          <NumberViewModal
            title={numberModal.title}
            value={numberModal.value}
            onClose={() => setNumberModal({ show: false, title: "", value: "" })}
          />
        )}
      </div>
    </div>
  );
};

export default ICTAdminDashboard;
