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
  FaClipboardCheck,
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

const DirectDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [numberModal, setNumberModal] = useState({
    show: false,
    title: "",
    value: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Dummy data
  const stats = {
    total: 35,
    pending: 8,
    approved: 24,
    rejected: 3,
  };

  const recentReviews = [
    {
      id: 1,
      personnel: "John Doe",
      travelPurpose: "Attend Training Workshop",
      destination: "Manila",
      startDate: "2026-02-15",
      endDate: "2026-02-18",
      status: "pending",
      submittedAt: "2026-01-20",
    },
    {
      id: 2,
      personnel: "Jane Smith",
      travelPurpose: "Regional Meeting",
      destination: "Cebu",
      startDate: "2026-02-10",
      endDate: "2026-02-12",
      status: "approved",
      submittedAt: "2026-01-19",
    },
    {
      id: 3,
      personnel: "Michael Johnson",
      travelPurpose: "Field Inspection",
      destination: "Zamboanga City",
      startDate: "2026-02-05",
      endDate: "2026-02-07",
      status: "rejected",
      submittedAt: "2026-01-18",
    },
    {
      id: 4,
      personnel: "Maria Santos",
      travelPurpose: "Regional Seminar",
      destination: "Davao",
      startDate: "2026-02-20",
      endDate: "2026-02-22",
      status: "pending",
      submittedAt: "2026-01-22",
    },
  ];

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
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Dashboard refreshed");
    }, 700);
  };

  const getStatusBadge = (status) => {
    const styles = {
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
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container">
        <LoadingSpinner text="Loading director dashboard..." />
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
            Director Dashboard
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}! ` : "Welcome back! "}
            Here&apos;s an overview of your approvals.
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
                  <div className="text-white-50 small">Total Reviews</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Total Reviews", stats.total)}
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
          <div className="card bg-warning text-white mb-3" style={{ borderRadius: "10px" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Pending Reviews</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease-in-out" }}
                    onClick={() => handleNumberClick("Pending Reviews", stats.pending)}
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
                    onClick={() => handleNumberClick("Approved Reviews", stats.approved)}
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
                    onClick={() => handleNumberClick("Rejected Reviews", stats.rejected)}
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

      {/* Recent Reviews */}
      <div className="card mb-4" style={{ borderRadius: "10px" }}>
        <div className="card-header bg-white border-bottom-0 py-3">
          <h5 className="card-title mb-0 text-dark d-flex align-items-center">
            <FaFileAlt className="me-2 text-primary" />
            Recent Travel Orders
          </h5>
        </div>
        <div className="card-body p-0">
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
                    Personnel
                  </th>
                  <th className="small fw-semibold">Travel Purpose</th>
                  <th className="small fw-semibold">Destination</th>
                  <th className="small fw-semibold">Dates</th>
                  <th className="small fw-semibold">Status</th>
                  <th className="small fw-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map((review) => (
                  <tr key={review.id} className="align-middle">
                    <td style={{ paddingLeft: "1rem" }}>{review.personnel}</td>
                    <td>{review.travelPurpose}</td>
                    <td>{review.destination}</td>
                    <td>
                      {new Date(review.startDate).toLocaleDateString()} -{" "}
                      {new Date(review.endDate).toLocaleDateString()}
                    </td>
                    <td>{getStatusBadge(review.status)}</td>
                    <td>
                      <Link
                        to={`/pending-reviews/${review.id}`}
                        className="btn btn-sm"
                        style={{
                          backgroundColor: "transparent",
                          color: "var(--primary-color)",
                          border: "1px solid var(--primary-color)",
                          borderRadius: "6px",
                          padding: "0.375rem 0.75rem",
                          fontSize: "0.8rem",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--primary-color)";
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--primary-color)";
                        }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export default DirectDashboard;
