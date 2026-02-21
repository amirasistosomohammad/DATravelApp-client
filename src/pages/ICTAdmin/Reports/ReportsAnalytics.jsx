import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaChartLine,
  FaChartPie,
  FaUsers,
  FaFileAlt,
  FaSyncAlt,
  FaCalendarAlt,
  FaEraser,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const COLORS = {
  draft: "#6c757d",
  pending: "#ffb300",
  approved: "#28a745",
  rejected: "#dc3545",
};

const CHART_COLORS = ["#0d7a3a", "#28a745", "#ffb300", "#dc3545", "#6c757d", "#17a2b8"];

const ReportsAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [numberModal, setNumberModal] = useState({
    show: false,
    title: "",
    value: "",
  });

  useEffect(() => {
    if (user && user.role !== "ict_admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token missing. Please login again.");
      return;
    }

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const response = await fetch(
        `${API_BASE_URL}/ict-admin/reports/analytics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to load analytics data";
      }

      setAnalyticsData(data?.data || null);
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || "Failed to load analytics data";
      toast.error(msg);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (user?.role === "ict_admin") {
      fetchAnalytics();
    }
  }, [user?.role, fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
    toast.success("Analytics refreshed");
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    toast.success("Filters cleared");
  };

  const handleNumberClick = (title, value) => {
    setNumberModal({
      show: true,
      title,
      value: typeof value === "number" ? value.toLocaleString() : value,
    });
  };

  const formatFullNumber = (amount) =>
    Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  if (loading) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container">
        <LoadingSpinner text="Loading analytics..." />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container-fluid py-2 admin-dashboard-container">
        <div className="alert alert-danger">
          <h5 className="mb-2">Unable to load analytics data</h5>
          <button className="btn btn-primary" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    user_stats,
    travel_order_stats,
    monthly_data,
    weekly_data,
    status_distribution,
    approval_stats,
    top_personnel,
  } = analyticsData;

  return (
    <div className="container-fluid py-2 admin-dashboard-container page-enter px-1">
      <style>{`
        .reports-shell {
          animation: pageEnter 0.35s ease-out;
        }
        .reports-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
        }
        .reports-header > div {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .reports-title-section {
          flex: 0 1 auto;
        }
        .reports-actions {
          flex: 0 0 auto;
          flex-shrink: 0;
        }
        @media (min-width: 992px) {
          .reports-header {
            padding: 1rem 1.5rem;
          }
          .reports-header > div {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
          }
          .reports-title-section {
            flex: 0 1 auto;
            max-width: 45%;
          }
          .reports-actions {
            flex: 0 0 auto;
            flex-shrink: 0;
            margin-left: auto;
          }
        }
        @media (min-width: 1200px) {
          .reports-header {
            padding: 1.15rem 1.75rem;
          }
          .reports-header > div {
            gap: 3rem;
          }
          .reports-title-section {
            max-width: 40%;
          }
        }
        @media (min-width: 1400px) {
          .reports-header > div {
            gap: 4rem;
          }
        }
        .reports-header-icon {
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
        .reports-header-icon svg {
          width: 1rem;
          height: 1rem;
        }
        .reports-date-filters-container {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgba(13, 122, 58, 0.15);
        }
        .reports-date-filters {
          display: flex;
          align-items: center;
        }
        .reports-date-icon {
          color: var(--primary-color);
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .reports-date-input {
          border-radius: 0.375rem;
          border-color: rgba(0, 0, 0, 0.15);
          font-size: 0.85rem;
          padding: 0.35rem 0.5rem;
          width: 140px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .reports-date-input:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 0.2rem rgba(13, 122, 58, 0.15);
          outline: none;
        }
        .reports-date-separator {
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 500;
          padding: 0 0.25rem;
          flex-shrink: 0;
        }
        .reports-date-clear {
          border-radius: 0.375rem;
          padding: 0.35rem 0.5rem;
          border-color: rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }
        .reports-date-clear:hover {
          background-color: rgba(13, 122, 58, 0.08);
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .btn-refresh {
          border-radius: 0;
          border: 1px solid var(--primary-color);
          color: #ffffff;
          background-color: var(--primary-color);
          padding-inline: 0.9rem;
          box-shadow: 0 1px 2px rgba(15,23,42,0.06);
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }
        .btn-refresh:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(15,23,42,0.18);
          background-color: #0a6b2d;
        }
        .btn-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 991.98px) {
          .reports-date-filters-container {
            width: 100%;
          }
          .reports-date-filters > div {
            width: 100%;
            flex-wrap: wrap;
          }
          .reports-date-input {
            flex: 1;
            min-width: 120px;
          }
        }
        @media (max-width: 575.98px) {
          .reports-header {
            padding: 0.85rem 0.9rem;
          }
          .reports-date-filters > div {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }
          .reports-date-input {
            width: 100%;
          }
          .reports-date-separator {
            display: none;
          }
        }
        .reports-stat-card {
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .reports-stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .reports-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .reports-stat-value:hover {
          opacity: 0.85;
          color: var(--primary-color) !important;
        }
        .reports-stat-icon {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15,23,42,0.04);
          color: var(--primary-color);
        }
        .reports-chart-card {
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .reports-chart-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem 0.75rem 0 0;
        }
        .reports-actions .btn {
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease;
        }
        .reports-actions .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(15,23,42,0.18);
          background-color: var(--primary-color);
          color: #ffffff;
        }
      `}</style>

      <div className="reports-shell">
        {/* Page Header */}
        <div className="reports-header mb-3">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
            <div className="reports-title-section">
              <h1
                className="h4 mb-1 fw-bold d-flex align-items-center"
                style={{ color: "var(--text-primary)" }}
              >
                <div className="reports-header-icon me-2">
                  <FaChartBar />
                </div>
                Reports & Analytics
              </h1>
              <p className="mb-0 small ms-2" style={{ color: "var(--text-muted)" }}>
                Comprehensive insights and statistics for system management
              </p>
            </div>
            <div className="reports-actions d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-center">
              <div className="reports-date-filters-container">
                <div className="reports-date-filters">
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarAlt className="reports-date-icon" />
                    <input
                      type="date"
                      className="form-control form-control-sm reports-date-input"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="From"
                      title="Filter from date"
                    />
                    <span className="reports-date-separator">to</span>
                    <input
                      type="date"
                      className="form-control form-control-sm reports-date-input"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                      placeholder="To"
                      title="Filter to date"
                    />
                    {(dateFrom || dateTo) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary reports-date-clear"
                        onClick={handleClearFilters}
                        title="Clear date filters"
                      >
                        <FaEraser style={{ fontSize: "0.75rem" }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm btn-refresh d-flex align-items-center"
                onClick={handleRefresh}
                disabled={refreshing}
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
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card reports-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="reports-stat-label">Total Users</div>
                  <div
                    className="reports-stat-value my-1"
                    onClick={() => handleNumberClick("Total Users", user_stats.total_users)}
                  >
                    {user_stats.total_users}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    {user_stats.total_personnel} personnel, {user_stats.total_directors} directors
                  </small>
                </div>
                <div className="reports-stat-icon">
                  <FaUsers size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card reports-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="reports-stat-label">Total Travel Orders</div>
                  <div
                    className="reports-stat-value my-1"
                    onClick={() => handleNumberClick("Total Travel Orders", travel_order_stats.total)}
                  >
                    {travel_order_stats.total}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    {travel_order_stats.approved} approved
                  </small>
                </div>
                <div className="reports-stat-icon">
                  <FaFileAlt size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card reports-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="reports-stat-label">Pending Orders</div>
                  <div
                    className="reports-stat-value my-1"
                    onClick={() => handleNumberClick("Pending Orders", travel_order_stats.pending)}
                    style={{ color: COLORS.pending }}
                  >
                    {travel_order_stats.pending}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Awaiting approval
                  </small>
                </div>
                <div className="reports-stat-icon" style={{ backgroundColor: `${COLORS.pending}15`, color: COLORS.pending }}>
                  <FaFileAlt size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card reports-stat-card">
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="reports-stat-label">Approval Actions</div>
                  <div
                    className="reports-stat-value my-1"
                    onClick={() => handleNumberClick("Total Approval Actions", approval_stats.total_approvals)}
                  >
                    {approval_stats.total_approvals}
                  </div>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    {approval_stats.approved} approved, {approval_stats.rejected} rejected
                  </small>
                </div>
                <div className="reports-stat-icon">
                  <FaChartBar size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="row g-3 mb-4">
          <div className="col-xl-8">
            <div className="card reports-chart-card">
              <div className="card-header d-flex align-items-center gap-2">
                <FaChartLine className="me-2" style={{ color: "var(--primary-color)" }} />
                Travel Orders Trend (Last 12 Months)
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="month_short"
                      stroke="#666"
                      style={{ fontSize: "0.75rem" }}
                    />
                    <YAxis stroke="#666" style={{ fontSize: "0.75rem" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e0e0e0",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      name="Total"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="approved"
                      stroke={CHART_COLORS[1]}
                      strokeWidth={2}
                      name="Approved"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke={CHART_COLORS[2]}
                      strokeWidth={2}
                      name="Pending"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card reports-chart-card">
              <div className="card-header d-flex align-items-center gap-2">
                <FaChartPie className="me-2" style={{ color: "var(--primary-color)" }} />
                Status Distribution
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={status_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {status_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="row g-3 mb-4">
          <div className="col-xl-6">
            <div className="card reports-chart-card">
              <div className="card-header d-flex align-items-center gap-2">
                <FaChartBar className="me-2" style={{ color: "var(--primary-color)" }} />
                Monthly Travel Orders Breakdown
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="month_short"
                      stroke="#666"
                      style={{ fontSize: "0.75rem" }}
                    />
                    <YAxis stroke="#666" style={{ fontSize: "0.75rem" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e0e0e0",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="draft" stackId="a" fill={COLORS.draft} name="Draft" />
                    <Bar dataKey="pending" stackId="a" fill={COLORS.pending} name="Pending" />
                    <Bar dataKey="approved" stackId="a" fill={COLORS.approved} name="Approved" />
                    <Bar dataKey="rejected" stackId="a" fill={COLORS.rejected} name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-xl-6">
            <div className="card reports-chart-card">
              <div className="card-header d-flex align-items-center gap-2">
                <FaChartLine className="me-2" style={{ color: "var(--primary-color)" }} />
                Weekly Activity (Last 8 Weeks)
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weekly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="week"
                      stroke="#666"
                      style={{ fontSize: "0.75rem" }}
                    />
                    <YAxis stroke="#666" style={{ fontSize: "0.75rem" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e0e0e0",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill={CHART_COLORS[0]} name="Total Orders" />
                    <Bar dataKey="approved" fill={CHART_COLORS[1]} name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Top Personnel Table */}
        <div className="card reports-chart-card mb-4">
          <div className="card-header d-flex align-items-center gap-2">
            <FaUsers className="me-2" style={{ color: "var(--primary-color)" }} />
            Top Personnel by Travel Orders
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>
                      Rank
                    </th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>
                      Name
                    </th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>
                      Department
                    </th>
                    <th className="border-0 py-2 px-3 small fw-semibold text-end" style={{ color: "var(--text-primary)" }}>
                      Travel Orders
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top_personnel.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    top_personnel.map((personnel, index) => (
                      <tr key={personnel.id}>
                        <td className="py-2 px-3 small" style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                          #{index + 1}
                        </td>
                        <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>
                          {personnel.name}
                        </td>
                        <td className="py-2 px-3 small" style={{ color: "var(--text-muted)" }}>
                          {personnel.department}
                        </td>
                        <td className="py-2 px-3 text-end">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: `${CHART_COLORS[0]}15`,
                              color: CHART_COLORS[0],
                              fontSize: "0.85rem",
                              padding: "0.35rem 0.65rem",
                            }}
                          >
                            {personnel.count}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Number Modal */}
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

export default ReportsAnalytics;
