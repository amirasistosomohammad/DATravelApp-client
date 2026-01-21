import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaFileInvoice,
  FaChartBar,
  FaMoneyCheckAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaUserCheck,
  FaHistory,
  FaDownload,
  FaCog,
  FaBell,
  FaChartLine,
  FaDatabase,
  FaSyncAlt,
} from "react-icons/fa";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-toastify";
import { showAlert } from "../../../services/notificationService";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";

const formatNumber = (value = 0) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatCurrency = (value = 0) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const abbreviateNumber = (amount, isCurrency = false) => {
  if (amount === null || amount === undefined || amount === 0) {
    return isCurrency ? "₱0.00" : "0";
  }

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
    abbreviated = num.toFixed(2);
  }

  abbreviated = parseFloat(abbreviated).toString();
  const sign = amount < 0 ? "-" : "";

  return isCurrency
    ? `${sign}₱${abbreviated}${suffix}`
    : `${sign}${abbreviated}${suffix}`;
};

const formatFullNumber = (amount, isCurrency = false) => {
  if (isCurrency) {
    return formatCurrency(amount);
  }
  return Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatRelativeTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const StatsCardSkeleton = () => (
  <div className="card stats-card h-100">
    <div className="card-body p-3">
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          <div className="placeholder-wave mb-2">
            <span className="placeholder col-8" style={{ height: "14px" }} />
          </div>
          <div className="placeholder-wave">
            <span className="placeholder col-6" style={{ height: "28px" }} />
          </div>
        </div>
        <div className="col-auto">
          <div className="placeholder-wave">
            <span
              className="placeholder rounded-circle"
              style={{ width: "48px", height: "48px" }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ActivitySkeleton = () => (
  <div className="list-group-item d-flex align-items-center border-bottom py-3 px-3">
    <div className="me-3">
      <div
        className="placeholder rounded-circle"
        style={{ width: "40px", height: "40px" }}
      />
    </div>
    <div className="flex-grow-1">
      <div className="placeholder-wave mb-2">
        <span className="placeholder col-10" style={{ height: "14px" }} />
      </div>
      <div className="placeholder-wave">
        <span className="placeholder col-6" style={{ height: "12px" }} />
      </div>
    </div>
    <div className="text-end">
      <div className="placeholder-wave mb-2">
        <span className="placeholder col-6" style={{ height: "12px" }} />
      </div>
      <div
        className="placeholder rounded-pill"
        style={{ width: "60px", height: "20px" }}
      />
    </div>
  </div>
);

const QuickActionSkeleton = () => (
  <div className="placeholder-wave mb-2">
    <span
      className="placeholder col-12"
      style={{ height: "40px", borderRadius: "8px" }}
    />
  </div>
);

const buildDummyDashboardData = () => {
  const stats = {
    totalCustomers: 2450,
    pendingApprovals: 7,
    totalRevenue: 185000,
    delinquentAccounts: 19,
    activeConnections: 2310,
    monthlyConsumption: 126540,
    staffMembers: 14,
    systemUptime: 99.6,
    pendingBills: 32,
  };

  const quickStats = [
    {
      label: "Collection Rate",
      value: "96.2%",
      trend: "+1.4% vs last month",
      positive: true,
    },
    {
      label: "Travel Orders",
      value: "312",
      trend: "+18 vs last month",
      positive: true,
    },
    {
      label: "Avg Processing Time",
      value: "2.4 hrs",
      trend: "-0.4 hrs improvement",
      positive: true,
    },
    {
      label: "Operational Efficiency",
      value: "97.8%",
      trend: "+2.8% vs target",
      positive: true,
    },
  ];

  const recentActivities = [
    {
      id: "to-1",
      action: "Travel order submitted",
      user: "Juan Dela Cruz",
      time: formatRelativeTime(new Date(Date.now() - 7 * 60000).toISOString()),
      badgeVariant: "warning",
      type: "travel",
    },
    {
      id: "user-1",
      action: "Personnel account created",
      user: "Maria Santos",
      time: formatRelativeTime(new Date(Date.now() - 52 * 60000).toISOString()),
      badgeVariant: "info",
      type: "user",
    },
    {
      id: "to-2",
      action: "Travel order approved",
      user: "Pedro Reyes",
      time: formatRelativeTime(
        new Date(Date.now() - 3 * 3600000).toISOString()
      ),
      badgeVariant: "success",
      type: "travel",
    },
    {
      id: "sys-1",
      action: "System settings updated",
      user: "ICT Administrator",
      time: formatRelativeTime(
        new Date(Date.now() - 26 * 3600000).toISOString()
      ),
      badgeVariant: "secondary",
      type: "system",
    },
  ];

  const priorityTasks = [
    { task: "Approve pending registrations", priority: "high", count: 7 },
    { task: "Review travel orders pending", priority: "high", count: 12 },
    { task: "Resolve overdue submissions", priority: "medium", count: 8 },
    { task: "Sync user directory", priority: "low", count: 1 },
  ];

  const systemAlerts = [
    {
      type: "warning",
      title: "Pending Approvals",
      message: "7 account(s) awaiting review.",
    },
    {
      type: "info",
      title: "Travel Orders",
      message: "12 travel order(s) awaiting processing.",
    },
    {
      type: "danger",
      title: "Delinquent Users",
      message: "19 account(s) flagged for follow-up.",
    },
  ];

  const systemStatus = {
    tone: "warning",
    message: "Active warnings require attention.",
  };

  return {
    stats,
    quickStats,
    recentActivities,
    priorityTasks,
    systemAlerts,
    systemStatus,
  };
};

export default function ICTAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [numberModal, setNumberModal] = useState({
    show: false,
    title: "",
    value: "",
  });

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
        label: "Travel Orders",
        icon: FaFileInvoice,
        route: "/travel-orders",
        variant: "outline",
        color: "var(--primary-color)",
      },
      {
        label: "Time Logging",
        icon: FaClock,
        route: "/users/time-logging",
        variant: "accent",
        color: "var(--accent-color)",
      },
      {
        label: "Reports & Analytics",
        icon: FaChartBar,
        route: "/reports",
        variant: "accent",
        color: "var(--text-primary)",
      },
    ],
    []
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      setDashboardData(buildDummyDashboardData());
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

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

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      setTimeout(() => {
        setDashboardData(buildDummyDashboardData());
        if (silent) setRefreshing(false);
        else setLoading(false);
        toast.success("Dashboard refreshed");
      }, 800);
    } catch (err) {
      setError("Failed to load dashboard data.");
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      showAlert.loading("Preparing Export...", "#layoutSidenav_content");
      setTimeout(() => {
        showAlert.close();
        toast.success("Report exported successfully");
        setExporting(false);
      }, 900);
    } catch {
      showAlert.close();
      showAlert.error("Export Failed", "Unable to export dashboard data.");
      setExporting(false);
    }
  };

  const handleNumberClick = (title, value, isCurrency = false) => {
    setNumberModal({
      show: true,
      title,
      value: formatFullNumber(value, isCurrency),
    });
  };

  const handleOpenSettings = () => navigate("/settings");

  if (loading) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container">
        <LoadingSpinner text="Loading system administration..." />
      </div>
    );
  }

  if (!dashboardData && error) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container page-enter">
        <div className="alert alert-danger">
          <h5 className="mb-2">Unable to load dashboard data</h5>
          <p className="mb-3">{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => fetchDashboardData()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const {
    stats,
    quickStats,
    recentActivities,
    priorityTasks,
    systemAlerts,
    systemStatus,
  } = dashboardData;

  const systemStatusClass =
    systemStatus.tone === "danger"
      ? "bg-danger text-white"
      : systemStatus.tone === "warning"
      ? "bg-warning text-white"
      : systemStatus.tone === "info"
      ? "bg-info text-white"
      : "bg-primary text-white";

  const SystemStatusIcon =
    systemStatus.tone === "danger" || systemStatus.tone === "warning"
      ? FaExclamationTriangle
      : FaCheckCircle;

  return (
    <div className="container-fluid py-2 admin-dashboard-container page-enter px-1">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div className="text-start w-100">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaDatabase className="me-2" />
            System Administration
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {user?.name
              ? `Welcome back, ${user.name.split(" ")[0]}! `
              : "Welcome back! "}
            Here&apos;s your live system overview.
          </p>
        </div>
        <div className="d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
          <button
            className="btn btn-sm d-flex align-items-center"
            onClick={() => fetchDashboardData({ silent: true })}
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
              e.currentTarget.style.boxShadow =
                "0 3px 10px rgba(15, 23, 42, 0.12)";
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
                Refresh Data
              </>
            )}
          </button>

          <button
            className="btn btn-sm btn-success text-white d-flex align-items-center"
            onClick={handleExportReport}
            disabled={exporting}
            style={{ transition: "all 0.2s ease-in-out", borderWidth: "2px" }}
            onMouseEnter={(e) => {
              if (exporting) return;
              e.currentTarget.style.backgroundColor = "#166534";
              e.currentTarget.style.boxShadow =
                "0 3px 10px rgba(22, 101, 52, 0.25)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#198754";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <FaDownload className="me-2" />
            {exporting ? "Exporting..." : "Export Report"}
          </button>

          <button
            className="btn btn-sm d-flex align-items-center"
            onClick={handleOpenSettings}
            style={{
              transition: "all 0.2s ease-in-out",
              border: "2px solid var(--input-border)",
              color: "var(--text-primary)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f3f4f6";
              e.currentTarget.style.boxShadow =
                "0 3px 10px rgba(15, 23, 42, 0.08)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <FaCog className="me-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Stats Overview */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-primary text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Total Users</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Total Users",
                        stats.totalCustomers,
                        false
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.totalCustomers, false)}
                  </div>
                  <div className="small d-flex align-items-center">
                    <FaChartLine className="me-1" />
                    +25 this month
                  </div>
                  <small
                    className="text-white-50 d-block mt-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaUsers size={20} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-warning text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Pending Approvals</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Pending Approvals",
                        stats.pendingApprovals,
                        false
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.pendingApprovals, false)}
                  </div>
                  <div className="small">
                    {stats.pendingApprovals > 0
                      ? "Requires attention"
                      : "Up to date"}
                  </div>
                  <small
                    className="text-white-50 d-block mt-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaUserCheck size={20} className="text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-success text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Monthly Budget</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Monthly Budget",
                        stats.totalRevenue,
                        true
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.totalRevenue, true)}
                  </div>
                  <div className="small d-flex align-items-center">
                    <FaChartLine className="me-1" />
                    {quickStats[0]?.trend}
                  </div>
                  <small
                    className="text-white-50 d-block mt-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaMoneyCheckAlt size={20} className="text-success" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-danger text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Flagged Accounts</div>
                  <div
                    className="h4 fw-bold my-1"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Flagged Accounts",
                        stats.delinquentAccounts,
                        false
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.delinquentAccounts, false)}
                  </div>
                  <div className="small">Requires follow-up</div>
                  <small
                    className="text-white-50 d-block mt-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click number to view full value
                  </small>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaExclamationTriangle size={20} className="text-danger" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary + System Status */}
      <div className="row g-3 mb-4">
        <div className="col-xl-8">
          <div className="row g-3">
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaDatabase className="text-primary mb-2" size={24} />
                  <div
                    className="fw-bold text-dark h5"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Active Sessions",
                        stats.activeConnections,
                        false
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.activeConnections, false)}
                  </div>
                  <div className="text-muted small">Active Sessions</div>
                  <small
                    className="text-muted d-block mt-1"
                    style={{ fontSize: "0.65rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaChartBar className="text-primary mb-2" size={24} />
                  <div
                    className="fw-bold text-dark h5"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Monthly Records",
                        stats.monthlyConsumption,
                        false
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.monthlyConsumption, false)}
                  </div>
                  <div className="text-muted small">Monthly Records</div>
                  <small
                    className="text-muted d-block mt-1"
                    style={{ fontSize: "0.65rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaUsers className="text-primary mb-2" size={24} />
                  <div
                    className="fw-bold text-dark h5"
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    title="Click to view full number"
                    onClick={() =>
                      handleNumberClick(
                        "Staff Members",
                        stats.staffMembers,
                        false
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {abbreviateNumber(stats.staffMembers, false)}
                  </div>
                  <div className="text-muted small">Staff Members</div>
                  <small
                    className="text-muted d-block mt-1"
                    style={{ fontSize: "0.65rem" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaChartLine className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {stats.systemUptime?.toFixed(1)}%
                  </div>
                  <div className="text-muted small">System Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div
            className={`card ${systemStatusClass} h-100`}
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body d-flex justify-content-between align-items-center p-3">
              <div>
                <div className="small opacity-85 text-uppercase">
                  System Status
                </div>
                <div className="h5 mb-0">{systemStatus.message}</div>
              </div>
              <SystemStatusIcon size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="row g-4">
        <div className="col-xl-8">
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                  <FaHistory className="me-2 text-primary" />
                  Recent Activities
                </h5>
                <span className="badge bg-primary">
                  {recentActivities.length}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="list-group-item d-flex align-items-center border-bottom py-3 px-3"
                  >
                    <div className="me-3">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center ${
                          activity.badgeVariant === "success"
                            ? "bg-success"
                            : activity.badgeVariant === "warning"
                            ? "bg-warning"
                            : "bg-primary"
                        }`}
                        style={{ width: "40px", height: "40px" }}
                      >
                        <FaCheckCircle size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold text-dark small">
                        {activity.action}
                      </div>
                      <div className="text-muted small">{activity.user}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-muted small">{activity.time}</div>
                      <span
                        className={`badge bg-${activity.badgeVariant} small`}
                      >
                        {activity.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-footer bg-light border-0 py-3">
              <button className="btn btn-outline-primary btn-sm">
                View All Activities
              </button>
            </div>
          </div>

          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaChartLine className="me-2 text-primary" />
                Performance Metrics
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickStats.map((stat, index) => (
                  <div key={index} className="col-md-3 col-6">
                    <div
                      className="text-center p-3 border rounded"
                      style={{ borderRadius: "8px" }}
                    >
                      <div className="h4 fw-bold text-dark mb-1">
                        {stat.value}
                      </div>
                      <div className="text-muted small mb-2">{stat.label}</div>
                      <span
                        className={`badge bg-${
                          stat.positive ? "success" : "danger"
                        } small`}
                      >
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaBell className="me-2 text-warning" />
                Priority Tasks
              </h5>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                {priorityTasks.map((task, index) => (
                  <div
                    key={index}
                    className="list-group-item px-0 border-0 py-2"
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark small">
                          {task.task}
                        </div>
                        <div className="text-muted small">
                          {task.count} items
                        </div>
                      </div>
                      <span
                        className={`badge bg-${
                          task.priority === "high"
                            ? "danger"
                            : task.priority === "medium"
                            ? "warning"
                            : "secondary"
                        } small`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="btn btn-sm text-start py-2 d-flex align-items-center"
                    style={getQuickActionStyle(action)}
                    onMouseEnter={(e) =>
                      handleQuickActionHover(e, action, true)
                    }
                    onMouseLeave={(e) =>
                      handleQuickActionHover(e, action, false)
                    }
                    onClick={() => navigate(action.route)}
                  >
                    <action.icon className="me-2" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-warning" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-warning text-dark py-3 d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              <h5 className="card-title mb-0">System Alerts</h5>
            </div>
            <div className="card-body py-3">
              <div className="row g-3">
                {systemAlerts.map((alert, index) => (
                  <div key={index} className="col-md-4">
                    <div className={`alert alert-${alert.type} mb-0 py-2`}>
                      <strong>{alert.title}</strong>
                      <div className="small">{alert.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {numberModal.show && (
        <NumberViewModal
          title={numberModal.title}
          value={numberModal.value}
          onClose={() =>
            setNumberModal({
              show: false,
              title: "",
              value: "",
            })
          }
        />
      )}
    </div>
  );
}
