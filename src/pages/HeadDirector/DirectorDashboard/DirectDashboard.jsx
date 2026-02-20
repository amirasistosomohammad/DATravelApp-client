import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaThLarge,
  FaClipboardCheck,
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHistory,
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

const DirectDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
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
    if (user?.role !== "director") {
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
      // Fetch pending orders
      const pendingResponse = await fetch(
        `${API_BASE_URL}/directors/travel-orders/pending?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const pendingData = await pendingResponse.json();
      const pendingItems = pendingResponse.ok && pendingData?.data?.items ? pendingData.data.items : [];
      setPendingOrders(Array.isArray(pendingItems) ? pendingItems : []);

      // Fetch history (all) to get approved/rejected counts
      const historyResponse = await fetch(
        `${API_BASE_URL}/directors/travel-orders/history?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const historyData = await historyResponse.json();
      const historyItems = historyResponse.ok && historyData?.data?.items ? historyData.data.items : [];
      setHistoryOrders(Array.isArray(historyItems) ? historyItems : []);
    } catch (err) {
      toast.error("Failed to load dashboard data");
      setPendingOrders([]);
      setHistoryOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = React.useMemo(
    () => {
      // Get all unique travel orders the director has been involved with
      const allOrderIds = new Set();
      pendingOrders.forEach(o => allOrderIds.add(o.id));
      historyOrders.forEach(o => allOrderIds.add(o.id));
      
      // Count by status from history
      const approved = historyOrders.filter((o) => o.status === "approved").length;
      const rejected = historyOrders.filter((o) => o.status === "rejected").length;
      const recommended = historyOrders.filter((o) => {
        // Check if director's approval status is "recommended"
        return o.approvals?.some(approval => 
          approval.director_id === user?.id && approval.status === "recommended"
        );
      }).length;

      return {
        total: allOrderIds.size,
        pending: pendingOrders.length,
        approved,
        rejected,
        recommended,
      };
    },
    [pendingOrders, historyOrders, user?.id]
  );

  // Get recent orders (pending first, then recent history)
  const recentTravelOrders = React.useMemo(
    () => {
      const combined = [
        ...pendingOrders.slice(0, RECENT_ORDERS_LIMIT),
        ...historyOrders.filter(o => !pendingOrders.some(p => p.id === o.id)).slice(0, RECENT_ORDERS_LIMIT - pendingOrders.length)
      ];
      return combined.slice(0, RECENT_ORDERS_LIMIT);
    },
    [pendingOrders, historyOrders]
  );

  const quickActions = useMemo(
    () => [
      {
        label: "Pending Reviews",
        icon: FaClipboardCheck,
        route: "/pending-reviews",
        variant: "primary",
        color: "#ffffff",
        background:
          "linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%)",
      },
      {
        label: "Approved",
        icon: FaCheckCircle,
        route: "/approved",
        variant: "outline",
        color: "var(--primary-color)",
      },
      {
        label: "History",
        icon: FaHistory,
        route: "/history",
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
        .director-dash-shell {
          animation: pageEnter 0.35s ease-out;
        }
        .director-dash-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          margin-bottom: 1rem;
        }
        .director-dash-header-icon {
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
        .director-dash-header-icon svg {
          width: 1rem;
          height: 1rem;
        }
        .director-dash-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-color);
          background-color: rgba(13,122,58,0.08);
        }
        .director-dash-stat-card {
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .director-dash-stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .director-dash-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .director-dash-stat-icon {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15,23,42,0.04);
          color: var(--primary-color);
        }
        .director-dash-actions .btn {
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease;
        }
        .director-dash-actions .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(15,23,42,0.18);
          background-color: var(--primary-color);
          color: #ffffff;
        }
        .director-dash-recent-card {
          border-radius: 0.5rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 2px 8px rgba(15,23,42,0.06);
        }
        .director-dash-recent-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .director-dash-recent-card .gov-list-table thead th {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }
        .director-dash-recent-card .table tbody tr:hover {
          background-color: rgba(13,122,58,0.04);
        }
        .director-dash-recent-card .table td {
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .director-dash-recent-btn {
          border-radius: 0;
          border: 1px solid var(--primary-color);
          background: var(--primary-color);
          color: #fff;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .director-dash-recent-btn:hover {
          background: #0a6b2d;
          color: #fff;
          box-shadow: 0 2px 6px rgba(13,122,58,0.25);
        }
        .director-dash-recent-card .director-dash-recent-btn-view:hover {
          background: #0a6b2d !important;
          border-color: #0a6b2d !important;
          color: #fff;
          box-shadow: 0 2px 6px rgba(13,122,58,0.25);
        }
        @media (max-width: 767.98px) {
          .director-dash-recent-card .director-dash-recent-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .director-dash-recent-card .director-dash-recent-table {
            min-width: 520px;
          }
          .director-dash-recent-card .director-dash-recent-table thead th,
          .director-dash-recent-card .director-dash-recent-table tbody td {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            vertical-align: middle;
          }
          .director-dash-recent-card .director-dash-recent-table td.director-dash-recent-cell-purpose {
            max-width: 180px;
          }
          .director-dash-recent-card .director-dash-recent-table tbody td[colspan] {
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
          }
        }
        @media (max-width: 575.98px) {
          .director-dash-header {
            padding: 0.85rem 0.9rem;
          }
        }
      `}</style>

      <div className="director-dash-shell">
        {/* Page Header */}
        <div className="director-dash-header d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-3 mb-1">
              <div className="director-dash-header-icon">
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
                  Monitor and manage travel order reviews in one place.
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span className="director-dash-chip me-2">
                <FaClipboardCheck className="me-1" />
                Travel order reviews overview
              </span>
            </div>
          </div>

          <div className="director-dash-actions d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
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
            <div className="card director-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="director-dash-stat-label">Total reviews</div>
                  <div
                    className="director-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Total reviews", stats.total)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.total)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Click the number to view full value.
                  </small>
                </div>
                <div className="director-dash-stat-icon">
                  <FaFileAlt size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card director-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="director-dash-stat-label">Pending</div>
                  <div
                    className="director-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Pending reviews", stats.pending)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.pending)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Awaiting your action.
                  </small>
                </div>
                <div className="director-dash-stat-icon">
                  <FaClock size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card director-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="director-dash-stat-label">Approved</div>
                  <div
                    className="director-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Approved reviews", stats.approved)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.approved)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Fully approved travel orders.
                  </small>
                </div>
                <div className="director-dash-stat-icon">
                  <FaCheckCircle size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card director-dash-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="director-dash-stat-label">Rejected</div>
                  <div
                    className="director-dash-stat-value my-1"
                    onClick={() =>
                      handleNumberClick("Rejected reviews", stats.rejected)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {abbreviateNumber(stats.rejected)}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Rejected travel orders.
                  </small>
                </div>
                <div className="director-dash-stat-icon">
                  <FaTimesCircle size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Travel Orders */}
        <div className="card director-dash-recent-card mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 d-flex align-items-center">
              <FaFileAlt className="me-2" style={{ color: "var(--primary-color)" }} />
              Recent Travel Orders
            </h5>
            <Link to="/pending-reviews" className="btn btn-sm director-dash-recent-btn">
              View all
            </Link>
          </div>
          <div className="card-body p-0">
            {ordersLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 mb-0 small text-muted">Loading travel orders...</p>
              </div>
            ) : (
              <div className="table-responsive gov-list-table-wrap travel-orders-table-wrap director-dash-recent-table-wrap">
                <table className="table table-hover mb-0 gov-list-table travel-orders-table director-dash-recent-table">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Personnel
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Travel purpose
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Destination
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Dates
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-start" style={{ color: "var(--text-primary)" }}>
                        Status
                      </th>
                      <th className="border-0 py-2 px-3 small fw-semibold text-end" style={{ color: "var(--text-primary)" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTravelOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">
                          No travel orders to review yet.
                        </td>
                      </tr>
                    ) : (
                      recentTravelOrders.map((order) => (
                        <tr key={order.id} className="align-middle">
                          <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }} title={getPersonnelName(order.personnel)}>
                            {getPersonnelName(order.personnel)}
                          </td>
                          <td className="py-2 px-3 small director-dash-recent-cell-purpose" style={{ color: "var(--text-primary)" }} title={order.travel_purpose}>
                            {order.travel_purpose}
                          </td>
                          <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }} title={order.destination || ""}>
                            {order.destination || "—"}
                          </td>
                          <td className="py-2 px-3 small" style={{ color: "var(--text-muted)" }}>
                            {order.start_date && order.end_date
                              ? `${new Date(order.start_date).toLocaleDateString()} – ${new Date(order.end_date).toLocaleDateString()}`
                              : "—"}
                          </td>
                          <td className="py-2 px-3 small">{getStatusBadge(order.status)}</td>
                          <td className="py-2 px-3 small text-end">
                            {order.status === "pending" ? (
                              <Link
                                to={`/pending-reviews/${order.id}`}
                                className="btn btn-sm director-dash-recent-btn director-dash-recent-btn-view"
                              >
                                Review
                              </Link>
                            ) : (
                              <Link
                                to="/history"
                                className="btn btn-sm director-dash-recent-btn"
                              >
                                View
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
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

export default DirectDashboard;
