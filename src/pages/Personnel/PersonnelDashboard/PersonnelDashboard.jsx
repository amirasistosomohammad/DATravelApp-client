import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaPlus,
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

const PersonnelDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchTravelOrders = React.useCallback(async () => {
    if (user?.role !== "personnel") {
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
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (response.ok && data?.data?.items) {
        setTravelOrders(data.data.items);
      } else {
        setTravelOrders([]);
      }
    } catch {
      setTravelOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchTravelOrders();
  }, [fetchTravelOrders]);

  const stats = React.useMemo(
    () => ({
      total: travelOrders.length,
      draft: travelOrders.filter((o) => o.status === "draft").length,
      pending: travelOrders.filter((o) => o.status === "pending").length,
      approved: travelOrders.filter((o) => o.status === "approved").length,
      rejected: travelOrders.filter((o) => o.status === "rejected").length,
    }),
    [travelOrders]
  );

  const recentTravelOrders = React.useMemo(
    () => travelOrders.slice(0, RECENT_ORDERS_LIMIT),
    [travelOrders]
  );

  const quickActions = useMemo(
    () => [
      {
        label: "New Travel Order",
        icon: FaPlus,
        route: "/travel-orders/create",
        variant: "primary",
        color: "#ffffff",
        background:
          "linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%)",
      },
      {
        label: "My Travel Orders",
        icon: FaFileAlt,
        route: "/travel-orders",
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
    borderRadius: "8px",
    border:
      action.variant === "primary"
        ? "none"
        : `2px solid ${action.color || "var(--primary-color)"}`,
    background:
      action.variant === "primary"
        ? action.background || action.color || "var(--primary-color)"
        : "transparent",
    color:
      action.variant === "primary"
        ? "#fff"
        : action.color || "var(--primary-color)",
    transition: "all 0.2s ease-in-out",
  });

  const handleQuickActionHover = (event, action, entering) => {
    const element = event.currentTarget;
    if (entering) {
      element.style.transform = "translateY(-1px)";
      element.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      element.style.background =
        action.background || action.color || "var(--primary-color)";
      element.style.color = "#fff";
    } else {
      element.style.transform = "translateY(0)";
      element.style.boxShadow = "none";
      element.style.background =
        action.variant === "primary"
          ? action.background || action.color || "var(--primary-color)"
          : "transparent";
      element.style.color =
        action.variant === "primary"
          ? "#fff"
          : action.color || "var(--primary-color)";
    }
  };

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
    await fetchTravelOrders();
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

  if (loading) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="container-fluid py-2 admin-dashboard-container page-enter px-1">
      {/* Page Header */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div className="text-start w-100">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaTachometerAlt className="me-2" />
            Personnel Dashboard
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}! ` : "Welcome back! "}
            Here&apos;s an overview of your travel orders.
          </p>
        </div>

        <div className="d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
          <button
            className="btn btn-sm d-flex align-items-center"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              transition: "all 0.2s ease-in-out",
              border: "2px solid var(--primary-color)",
              color: "var(--primary-color)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (refreshing) return;
              e.currentTarget.style.backgroundColor = "#f3f4f6";
              e.currentTarget.style.boxShadow = "0 3px 10px rgba(15, 23, 42, 0.12)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
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
              onMouseEnter={(e) => handleQuickActionHover(e, action, true)}
              onMouseLeave={(e) => handleQuickActionHover(e, action, false)}
            >
              <action.icon className="me-2" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Overview (same style behavior as ICT Admin) */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card bg-primary text-white mb-3" style={{ borderRadius: "10px" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Total Orders</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Total Orders", stats.total)}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {abbreviateNumber(stats.total)}
                  </div>
                  <small className="text-white-50 d-block mt-1" style={{ fontSize: "0.7rem" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div className="rounded-circle bg-white bg-opacity-25 p-3">
                  <FaFileAlt size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card bg-secondary text-white mb-3" style={{ borderRadius: "10px" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Drafts</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Draft Orders", stats.draft)}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {abbreviateNumber(stats.draft)}
                  </div>
                  <small className="text-white-50 d-block mt-1" style={{ fontSize: "0.7rem" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div className="rounded-circle bg-white bg-opacity-25 p-3">
                  <FaFileAlt size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card bg-warning text-white mb-3" style={{ borderRadius: "10px" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Pending</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Pending Orders", stats.pending)}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {abbreviateNumber(stats.pending)}
                  </div>
                  <small className="text-white-50 d-block mt-1" style={{ fontSize: "0.7rem" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div className="rounded-circle bg-white bg-opacity-25 p-3">
                  <FaClock size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card bg-success text-white mb-3" style={{ borderRadius: "10px" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Approved</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Approved Orders", stats.approved)}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {abbreviateNumber(stats.approved)}
                  </div>
                  <small className="text-white-50 d-block mt-1" style={{ fontSize: "0.7rem" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div className="rounded-circle bg-white bg-opacity-25 p-3">
                  <FaCheckCircle size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card bg-danger text-white mb-3" style={{ borderRadius: "10px" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Rejected</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Rejected Orders", stats.rejected)}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {abbreviateNumber(stats.rejected)}
                  </div>
                  <small className="text-white-50 d-block mt-1" style={{ fontSize: "0.7rem" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div className="rounded-circle bg-white bg-opacity-25 p-3">
                  <FaTimesCircle size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Travel Orders */}
      <div className="card mb-4" style={{ borderRadius: "10px" }}>
        <div className="card-header bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 text-dark d-flex align-items-center">
            <FaFileAlt className="me-2 text-primary" />
            Recent Travel Orders
          </h5>
          <Link
            to="/travel-orders"
            className="btn btn-sm btn-outline-primary"
            style={{ borderRadius: "6px" }}
          >
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
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead
                  style={{
                    background: "var(--topbar-bg)",
                    color: "var(--topbar-text)",
                  }}
                >
                  <tr>
                    <th className="small fw-semibold" style={{ paddingLeft: "1rem" }}>
                      Travel Purpose
                    </th>
                    <th className="small fw-semibold">Destination</th>
                    <th className="small fw-semibold">Dates</th>
                    <th className="small fw-semibold">Status</th>
                    <th className="small fw-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTravelOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No travel orders yet.{" "}
                        <Link to="/travel-orders/create">Create your first travel order</Link>
                      </td>
                    </tr>
                  ) : (
                    recentTravelOrders.map((order) => (
                      <tr key={order.id} className="align-middle">
                        <td style={{ paddingLeft: "1rem", maxWidth: 200 }} className="text-truncate" title={order.travel_purpose}>
                          {order.travel_purpose}
                        </td>
                        <td>{order.destination || "—"}</td>
                        <td>
                          {order.start_date && order.end_date
                            ? `${new Date(order.start_date).toLocaleDateString()} – ${new Date(order.end_date).toLocaleDateString()}`
                            : "—"}
                        </td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td>
                          {order.status === "draft" ? (
                            <Link
                              to={`/travel-orders/${order.id}/edit`}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: "#d97706",
                                color: "#fff",
                                border: "1px solid #d97706",
                                borderRadius: "6px",
                                padding: "0.375rem 0.75rem",
                                fontSize: "0.8rem",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#b45309";
                                e.currentTarget.style.borderColor = "#b45309";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#d97706";
                                e.currentTarget.style.borderColor = "#d97706";
                              }}
                            >
                              Edit
                            </Link>
                          ) : (
                            <Link
                              to="/travel-orders"
                              className="btn btn-sm btn-outline-primary"
                              style={{ borderRadius: "6px", fontSize: "0.8rem" }}
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
  );
};

export default PersonnelDashboard;
