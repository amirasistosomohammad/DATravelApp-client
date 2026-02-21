import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileAlt, FaSyncAlt, FaSearch, FaListOl, FaTimes, FaEraser, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaEye, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";
import ViewTravelOrderModal from "../../Personnel/TravelOrders/ViewTravelOrderModal";

const formatFullNumber = (num) =>
  Number(num ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_PAGE_SIZE = 10;
const LOAD_ALL_PAGE_SIZE = 500;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

/** Build page number list for pagination, e.g. [1, "...", 4, 5, 6, "...", 10] */
const getPageNumbers = (current, lastPage) => {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }
  const pages = new Set([1, lastPage, current, current - 1, current - 2, current + 1, current + 2]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= lastPage).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
};

const AdminTravelOrdersList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (user && user.role !== "ict_admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewModalOrderId, setViewModalOrderId] = useState(null);
  const [numberModal, setNumberModal] = useState({ show: false, title: "", value: "" });

  const fetchOrders = useCallback(async () => {
    if (!token) {
      toast.error("Authentication token missing. Please login again.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", String(LOAD_ALL_PAGE_SIZE));
      params.set("page", "1");
      if (filterStatus && filterStatus !== "all") {
        params.set("status", filterStatus);
      }
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }
      if (filterDateFrom) {
        params.set("date_from", filterDateFrom);
      }
      if (filterDateTo) {
        params.set("date_to", filterDateTo);
      }
      const response = await fetch(
        `${API_BASE_URL}/ict-admin/travel-orders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || data?.errors || "Failed to load travel orders";
      }
      const items = data?.data?.items ?? [];
      setOrders(Array.isArray(items) ? items : []);
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || "Failed to load travel orders";
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, searchTerm, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (user?.role === "ict_admin") {
      fetchOrders();
    }
  }, [user?.role, fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDateFrom, filterDateTo, filterStatus]);

  const handleRefresh = () => {
    fetchOrders();
    toast.success("List refreshed");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterStatus("all");
    setCurrentPage(1);
    toast.success("Filters cleared");
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > lastPage) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e) => {
    const value = Number(e.target.value);
    if (PAGE_SIZE_OPTIONS.includes(value)) {
      setPageSize(value);
      setCurrentPage(1);
    }
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
    const s = styles[status] || styles.draft;
    return (
      <span
        className="badge px-2 py-1 fw-semibold"
        style={{ ...s, fontSize: "0.75rem", borderRadius: "6px" }}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft"}
      </span>
    );
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const getPersonnelName = (personnel) => {
    if (!personnel) return "—";
    if (personnel.first_name && personnel.last_name) {
      const parts = [personnel.first_name];
      if (personnel.middle_name) parts.push(personnel.middle_name);
      parts.push(personnel.last_name);
      return parts.join(" ");
    }
    return personnel.name || personnel.username || "—";
  };

  // Client-side filtering for pagination
  const filteredOrders = orders;

  const total = filteredOrders.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pageItems = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > lastPage && lastPage >= 1) {
      setCurrentPage(lastPage);
    }
  }, [total, pageSize, currentPage, lastPage]);

  const handleNumberClick = (title, value) => {
    setNumberModal({ show: true, title, value: formatFullNumber(value) });
  };

  const stats = {
    total,
    draft: filteredOrders.filter((o) => o.status === "draft").length,
    pending: filteredOrders.filter((o) => o.status === "pending").length,
    approved: filteredOrders.filter((o) => o.status === "approved").length,
    rejected: filteredOrders.filter((o) => o.status === "rejected").length,
  };

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    filterDateFrom !== "" ||
    filterDateTo !== "" ||
    (filterStatus && filterStatus !== "all");

  const btnBase = {
    transition: "all 0.2s ease-in-out",
    borderWidth: "2px",
    borderRadius: "4px",
  };
  const btnPrimary = {
    ...btnBase,
    backgroundColor: "var(--primary-color)",
    borderColor: "var(--primary-color)",
    color: "#ffffff",
  };
  const btnOutline = {
    ...btnBase,
    border: "2px solid var(--primary-color)",
    color: "var(--primary-color)",
    backgroundColor: "transparent",
  };

  if (loading && orders.length === 0) {
    return (
      <div className="container-fluid py-2 travel-orders-list-container">
        <LoadingSpinner text="Loading travel orders..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 travel-orders-list-container page-enter">
      <style>{`
        .travel-orders-list-container .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .travel-orders-list-container .btn-outline-hover:hover:not(:disabled) {
          background-color: var(--primary-color);
          color: white !important;
        }
        .travel-orders-stats-card {
          background: linear-gradient(135deg, rgba(13,122,58,0.04), rgba(13,122,58,0.08));
          border: 1px solid rgba(13,122,58,0.15);
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(15,23,42,0.06);
          transition: box-shadow 0.2s ease;
        }
        .travel-orders-stats-card:hover {
          box-shadow: 0 4px 12px rgba(15,23,42,0.08);
        }
        .travel-orders-stat-item {
          padding: 0.85rem 1rem;
          border-right: 1px solid rgba(13,122,58,0.12);
        }
        .travel-orders-stat-item:last-child {
          border-right: none;
        }
        .travel-orders-stat-icon {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.5rem;
          background: rgba(13,122,58,0.12);
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }
        .travel-orders-filters-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.6rem 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .travel-orders-filters-card .card-body {
          padding: 1rem;
        }
        .travel-orders-clear-filters-btn:hover:not(:disabled) {
          background-color: rgba(13,122,58,0.08);
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .travel-orders-search-wrap .form-control {
          border-radius: 0.375rem;
          border-color: rgba(0,0,0,0.15);
        }
        .travel-orders-search-wrap .form-control:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 0.2rem rgba(13,122,58,0.15);
        }
        .travel-orders-search-wrap .input-group-text {
          background: var(--background-light);
          border-color: rgba(0,0,0,0.15);
          border-radius: 0.375rem 0 0 0.375rem;
          color: var(--text-muted);
        }
        .travel-orders-search-clear {
          background: var(--background-light);
          border: 1px solid rgba(0,0,0,0.15);
          border-left: 0;
          border-radius: 0 0.375rem 0.375rem 0;
          color: var(--text-muted);
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        .travel-orders-search-clear:hover {
          color: var(--primary-color);
          background: rgba(13,122,58,0.08);
          transform: scale(1.05);
        }
        .travel-orders-stat-number {
          cursor: pointer;
          transition: opacity 0.2s ease, color 0.2s ease;
        }
        .travel-orders-stat-number:hover {
          opacity: 0.85;
          color: var(--primary-color) !important;
        }
        @media (max-width: 767.98px) {
          .travel-orders-stat-item {
            border-right: none;
            border-bottom: 1px solid rgba(13,122,58,0.12);
          }
          .travel-orders-stat-item:last-child {
            border-bottom: none;
          }
        }
        .travel-orders-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .travel-orders-table {
          border-collapse: collapse;
        }
        .travel-orders-table thead th {
          white-space: nowrap;
          vertical-align: middle;
        }
        .travel-orders-table tbody td {
          vertical-align: middle;
        }
        .travel-orders-table .travel-orders-col-no {
          width: 2.5rem;
          min-width: 2.5rem;
        }
        .travel-orders-table .travel-orders-col-actions {
          white-space: nowrap;
        }
        .travel-orders-table .travel-orders-col-purpose {
          white-space: nowrap;
          max-width: 200px;
        }
        .travel-orders-table .travel-orders-col-purpose .travel-orders-purpose-text {
          max-width: 100%;
          display: inline-block;
          overflow: hidden;
          text-overflow: ellipsis;
          vertical-align: middle;
        }
        .travel-orders-table .travel-orders-col-destination {
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .travel-orders-table .travel-orders-col-dates {
          white-space: nowrap;
          min-width: 11rem;
        }
        .travel-orders-table .travel-orders-col-personnel {
          white-space: nowrap;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 767.98px) {
          .travel-orders-table .travel-orders-col-no {
            position: sticky;
            left: 0;
            z-index: 1;
            background: var(--bs-body-bg, #fff);
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
          }
          .travel-orders-table thead .travel-orders-col-no {
            background: var(--background-light) !important;
          }
          .travel-orders-table tbody tr:hover .travel-orders-col-no {
            background: rgba(0,0,0,0.04);
          }
          .travel-orders-table .travel-orders-col-actions {
            position: sticky;
            left: 2.5rem;
            z-index: 1;
            background: var(--bs-body-bg, #fff);
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
          }
          .travel-orders-table thead .travel-orders-col-actions {
            background: var(--background-light) !important;
          }
          .travel-orders-table tbody tr:hover .travel-orders-col-actions {
            background: rgba(0,0,0,0.04);
          }
        }
      `}</style>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaFileAlt className="me-2" />
            All Travel Orders
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            View and manage all travel orders in the system
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-hover"
            style={btnOutline}
            onClick={handleRefresh}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = "var(--primary-color)";
                e.currentTarget.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--primary-color)";
            }}
          >
            <FaSyncAlt className="me-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card gov-list-card travel-orders-stats-card mb-4">
        <div className="card-body p-0 d-flex flex-column flex-md-row">
          <div className="travel-orders-stat-item d-flex align-items-center gap-3 flex-grow-1">
            <div className="travel-orders-stat-icon flex-shrink-0">
              <FaListOl />
            </div>
            <div className="flex-grow-1">
              <div className="small text-uppercase fw-semibold mb-0" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                Total orders
              </div>
              <div
                className="fs-4 fw-bold mb-0 travel-orders-stat-number"
                style={{ color: "var(--text-primary)" }}
                onClick={() => handleNumberClick("Total orders", stats.total)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Total orders", stats.total)}
                aria-label="Click to view full number"
                title="Click to view full number"
              >
                {stats.total}
              </div>
              <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                Click to view full number
              </small>
            </div>
          </div>
          <div className="travel-orders-stat-item d-flex align-items-center gap-3 flex-grow-1">
            <div className="travel-orders-stat-icon flex-shrink-0">
              <FaFileAlt />
            </div>
            <div className="flex-grow-1">
              <div className="small text-uppercase fw-semibold mb-0" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                Drafts
              </div>
              <div
                className="fs-4 fw-bold mb-0 travel-orders-stat-number"
                style={{ color: "var(--text-primary)" }}
                onClick={() => handleNumberClick("Drafts", stats.draft)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Drafts", stats.draft)}
                aria-label="Click to view full number"
                title="Click to view full number"
              >
                {stats.draft}
              </div>
              <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                Click to view full number
              </small>
            </div>
          </div>
          <div className="travel-orders-stat-item d-flex align-items-center gap-3 flex-grow-1">
            <div className="travel-orders-stat-icon flex-shrink-0">
              <FaFileAlt />
            </div>
            <div className="flex-grow-1">
              <div className="small text-uppercase fw-semibold mb-0" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                Pending
              </div>
              <div
                className="fs-4 fw-bold mb-0 travel-orders-stat-number"
                style={{ color: "var(--text-primary)" }}
                onClick={() => handleNumberClick("Pending", stats.pending)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Pending", stats.pending)}
                aria-label="Click to view full number"
                title="Click to view full number"
              >
                {stats.pending}
              </div>
              <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                Click to view full number
              </small>
            </div>
          </div>
          <div className="travel-orders-stat-item d-flex align-items-center gap-3 flex-grow-1">
            <div className="travel-orders-stat-icon flex-shrink-0">
              <FaFileAlt />
            </div>
            <div className="flex-grow-1">
              <div className="small text-uppercase fw-semibold mb-0" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                Approved
              </div>
              <div
                className="fs-4 fw-bold mb-0 travel-orders-stat-number"
                style={{ color: "var(--text-primary)" }}
                onClick={() => handleNumberClick("Approved", stats.approved)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Approved", stats.approved)}
                aria-label="Click to view full number"
                title="Click to view full number"
              >
                {stats.approved}
              </div>
              <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                Click to view full number
              </small>
            </div>
          </div>
          <div className="travel-orders-stat-item d-flex align-items-center gap-3 flex-grow-1">
            <div className="travel-orders-stat-icon flex-shrink-0">
              <FaFileAlt />
            </div>
            <div className="flex-grow-1">
              <div className="small text-uppercase fw-semibold mb-0" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                Rejected
              </div>
              <div
                className="fs-4 fw-bold mb-0 travel-orders-stat-number"
                style={{ color: "var(--text-primary)" }}
                onClick={() => handleNumberClick("Rejected", stats.rejected)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Rejected", stats.rejected)}
                aria-label="Click to view full number"
                title="Click to view full number"
              >
                {stats.rejected}
              </div>
              <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                Click to view full number
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card gov-list-card travel-orders-filters-card shadow-sm mb-3" style={{ borderRadius: "0.5rem", border: "1px solid rgba(13,122,58,0.12)" }}>
        <div className="card-header d-flex align-items-center gap-2 py-2 px-3">
          <FaSearch style={{ fontSize: "0.85rem", color: "var(--primary-color)" }} />
          <span className="fw-semibold" style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>Filters</span>
          {hasActiveFilters && (
            <span className="badge rounded-pill bg-primary opacity-75" style={{ fontSize: "0.65rem" }}>Active</span>
          )}
        </div>
        <div className="card-body pt-2 pb-3 px-3">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Search
              </label>
              <div className="input-group input-group-sm travel-orders-search-wrap">
                <span className="input-group-text">
                  <FaSearch style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Purpose, destination, or personnel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search purpose, destination, or personnel"
                />
                {searchTerm.length > 0 && (
                  <button
                    type="button"
                    className="travel-orders-search-clear"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <FaTimes style={{ fontSize: "0.8rem" }} />
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Travel date from
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Filter by travel start date"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Travel date to
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                min={filterDateFrom || undefined}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Filter by travel end date"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Status
              </label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary travel-orders-clear-filters-btn w-100 d-flex align-items-center justify-content-center gap-1"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                title="Clear all filters"
                aria-label="Clear all filters"
                style={{
                  borderRadius: "0.375rem",
                  transition: "color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease",
                }}
              >
                <FaEraser style={{ fontSize: "0.75rem" }} />
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card gov-list-card shadow-sm" style={{ borderRadius: "0.375rem" }}>
        <div className="card-body p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <FaFileAlt className="mb-2" style={{ fontSize: "2rem" }} />
              {orders.length === 0 ? (
                <>
                  <p className="mb-2">No travel orders found.</p>
                </>
              ) : (
                <>
                  <p className="mb-2">No travel orders match your search or filters.</p>
                  <p className="small mb-3">Try clearing the search or adjusting filters to see orders.</p>
                  <button type="button" className="btn btn-sm" style={btnOutline} onClick={handleClearFilters}>
                    <FaEraser className="me-1" /> Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="table-responsive gov-list-table-wrap travel-orders-table-wrap">
              <table className="table table-hover mb-0 gov-list-table travel-orders-table">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-center travel-orders-col-no" style={{ color: "var(--text-primary)", minWidth: "2.5rem" }}>#</th>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-center travel-orders-col-actions" style={{ color: "var(--text-primary)" }}>Actions</th>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-start travel-orders-col-personnel" style={{ color: "var(--text-primary)" }}>Personnel</th>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-start travel-orders-col-purpose" style={{ color: "var(--text-primary)" }}>Purpose</th>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-start travel-orders-col-destination" style={{ color: "var(--text-primary)" }}>Destination</th>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-start travel-orders-col-dates" style={{ color: "var(--text-primary)" }}>Dates</th>
                    <th className="border-0 py-2 px-2 px-md-3 small fw-semibold text-center" style={{ color: "var(--text-primary)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((order, index) => {
                    const rowNum = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={order.id}>
                        <td className="py-2 px-2 px-md-3 small text-center travel-orders-col-no" style={{ color: "var(--text-muted)", fontWeight: 800 }}>{rowNum}</td>
                        <td className="py-2 px-2 px-md-3 text-center travel-orders-col-actions">
                          <button
                            type="button"
                            className="btn btn-sm travel-orders-action-btn"
                            style={{ backgroundColor: "#1e3a5f", borderColor: "#1e3a5f", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                            title="View details"
                            onClick={() => setViewModalOrderId(order.id)}
                          >
                            <FaEye style={{ fontSize: "0.75rem" }} />
                          </button>
                        </td>
                        <td className="py-2 px-2 px-md-3 small text-start travel-orders-col-personnel" style={{ color: "var(--text-primary)" }} title={getPersonnelName(order.personnel)}>
                          <FaUser className="me-1" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }} />
                          {getPersonnelName(order.personnel)}
                        </td>
                        <td className="py-2 px-2 px-md-3 small text-start travel-orders-col-purpose" style={{ color: "var(--text-primary)" }} title={order.travel_purpose}>
                          <span className="text-truncate d-inline-block travel-orders-purpose-text">{order.travel_purpose}</span>
                        </td>
                        <td className="py-2 px-2 px-md-3 small text-start travel-orders-col-destination" style={{ color: "var(--text-primary)" }} title={order.destination || ""}>{order.destination || "—"}</td>
                        <td className="py-2 px-2 px-md-3 small text-start travel-orders-col-dates" style={{ color: "var(--text-muted)" }}>
                          {formatDate(order.start_date)} – {formatDate(order.end_date)}
                        </td>
                        <td className="py-2 px-2 px-md-3 text-center">{getStatusBadge(order.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredOrders.length > 0 && (
            <div className="card-footer bg-white border-top px-2 px-md-3 py-2 travel-orders-pagination-wrap">
              <div className="travel-orders-pagination d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3 order-2 order-md-1">
                  <div className="travel-orders-pagination-info small text-muted">
                    Showing <span className="fw-semibold">{from}</span>–<span className="fw-semibold">{to}</span> of <span className="fw-semibold">{total}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <label htmlFor="travel-orders-per-page" className="small text-muted mb-0 me-1">Per page</label>
                    <select
                      id="travel-orders-per-page"
                      className="travel-orders-per-page-select form-select form-select-sm"
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      aria-label="Rows per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {lastPage > 1 && (
                  <nav className="d-flex align-items-center gap-1 flex-wrap justify-content-center order-1 order-md-2" aria-label="Table pagination">
                    <button
                      type="button"
                      className="travel-orders-pagination-btn"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage <= 1}
                      aria-label="First page"
                      title="First page"
                    >
                      <FaAngleDoubleLeft />
                    </button>
                    <button
                      type="button"
                      className="travel-orders-pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                      title="Previous"
                    >
                      <FaChevronLeft className="me-0 me-sm-1" />
                      <span className="d-none d-sm-inline">Prev</span>
                    </button>
                    <div className="d-flex align-items-center gap-1 flex-wrap justify-content-center">
                      {getPageNumbers(currentPage, lastPage).map((item, idx) =>
                        item === "…" ? (
                          <span key={`ellipsis-${idx}`} className="travel-orders-pagination-ellipsis px-1" aria-hidden="true">…</span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            className={`travel-orders-pagination-btn travel-orders-pagination-btn-num ${currentPage === item ? "active" : ""}`}
                            onClick={() => handlePageChange(item)}
                            disabled={currentPage === item}
                            aria-label={`Page ${item}`}
                            aria-current={currentPage === item ? "page" : undefined}
                          >
                            {item}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      type="button"
                      className="travel-orders-pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= lastPage}
                      aria-label="Next page"
                      title="Next"
                    >
                      <span className="d-none d-sm-inline">Next</span>
                      <FaChevronRight className="ms-0 ms-sm-1" />
                    </button>
                    <button
                      type="button"
                      className="travel-orders-pagination-btn"
                      onClick={() => handlePageChange(lastPage)}
                      disabled={currentPage >= lastPage}
                      aria-label="Last page"
                      title="Last page"
                    >
                      <FaAngleDoubleRight />
                    </button>
                  </nav>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {viewModalOrderId && (
        <ViewTravelOrderModal
          orderId={viewModalOrderId}
          token={token}
          onClose={() => setViewModalOrderId(null)}
          apiPrefix="ict-admin"
        />
      )}

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

export default AdminTravelOrdersList;
