import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaSyncAlt, FaEye, FaSearch, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

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
  const pages = new Set([
    1,
    lastPage,
    current,
    current - 1,
    current - 2,
    current + 1,
    current + 2,
  ]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= lastPage)
    .sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
};

const PendingReviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (user && user.role !== "director") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchPending = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", String(LOAD_ALL_PAGE_SIZE));
      params.set("page", "1");
      const response = await fetch(
        `${API_BASE_URL}/directors/travel-orders/pending?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to load pending orders";
      }
      const items = data?.data?.items ?? [];
      setOrders(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to load"
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === "director") {
      fetchPending();
    }
  }, [user?.role, fetchPending]);

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

  const btnOutline = {
    transition: "all 0.2s ease-in-out",
    border: "2px solid var(--primary-color)",
    color: "var(--primary-color)",
    backgroundColor: "transparent",
    borderRadius: "4px",
  };

  const getRowNumber = (index) =>
    (currentPage - 1) * pageSize + index + 1;

  const filteredBySearch = searchTerm.trim()
    ? orders.filter((o) => {
        const term = searchTerm.toLowerCase();
        return (
          (o.travel_purpose || "").toLowerCase().includes(term) ||
          (o.destination || "").toLowerCase().includes(term) ||
          getPersonnelName(o.personnel).toLowerCase().includes(term)
        );
      })
    : orders;

  const filteredOrders =
    filterDateFrom || filterDateTo
      ? filteredBySearch.filter((o) => {
          const start = (o.start_date || "").slice(0, 10);
          const end = (o.end_date || "").slice(0, 10);
          if (filterDateFrom && end < filterDateFrom) return false;
          if (filterDateTo && start > filterDateTo) return false;
          return true;
        })
      : filteredBySearch;

  const total = filteredOrders.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pageItems = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDateFrom, filterDateTo, pageSize]);

  useEffect(() => {
    if (currentPage > lastPage && lastPage >= 1) {
      setCurrentPage(lastPage);
    }
  }, [currentPage, lastPage]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

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

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  if (loading && orders.length === 0) {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading pending reviews..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 page-enter head-director-pending-reviews-container">
      <style>{`
        .head-director-pending-reviews-container .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .head-director-pending-reviews-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          position: relative;
          isolation: isolate;
        }
        .pending-reviews-filters-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.6rem 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .pending-reviews-filters-card .card-body {
          padding: 0.9rem 1rem 1rem;
        }
        .pending-reviews-search-wrap .form-control {
          border-radius: 0.375rem;
          border-color: rgba(0,0,0,0.15);
        }
        .pending-reviews-search-wrap .form-control:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 0.2rem rgba(13,122,58,0.15);
        }
        .pending-reviews-search-wrap .input-group-text {
          background: var(--background-light);
          border-color: rgba(0,0,0,0.15);
          border-radius: 0.375rem 0 0 0.375rem;
          color: var(--text-muted);
        }
        .pending-reviews-search-clear {
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
        .pending-reviews-search-clear:hover {
          color: var(--primary-color);
          background: rgba(13,122,58,0.08);
          transform: scale(1.05);
        }
        .head-director-pending-reviews-table {
          background: #fff;
          position: relative;
        }
        .head-director-pending-reviews-table thead th {
          white-space: nowrap;
          vertical-align: middle;
        }
        .head-director-pending-reviews-table tbody td {
          vertical-align: middle;
          max-height: 3.5rem;
          overflow: hidden;
          background: transparent;
        }
        .head-director-pending-reviews-table tbody tr {
          background: #fff;
          position: relative;
        }
        .head-director-pending-reviews-table tbody tr:hover {
          background: rgba(0,0,0,0.02);
        }
        .head-director-pending-reviews-table tbody td:not(.pending-reviews-col-no):not(.pending-reviews-col-actions) {
          background: transparent;
        }
        .head-director-pending-reviews-table .pending-reviews-col-no {
          width: 2.5rem;
          min-width: 2.5rem;
        }
        .head-director-pending-reviews-table .pending-reviews-col-actions {
          white-space: nowrap;
        }
        .head-director-pending-reviews-table .pending-reviews-col-purpose {
          max-width: 200px;
          min-width: 150px;
        }
        .head-director-pending-reviews-table .pending-reviews-col-personnel {
          max-width: 180px;
          min-width: 120px;
        }
        .head-director-pending-reviews-table .pending-reviews-col-destination {
          max-width: 160px;
          min-width: 100px;
        }
        .head-director-pending-reviews-table .pending-reviews-col-dates {
          max-width: 180px;
          min-width: 140px;
          white-space: nowrap;
        }
        .head-director-pending-reviews-table .pending-reviews-text-truncate {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .head-director-pending-reviews-table .pending-reviews-purpose-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        @media (max-width: 991.98px) {
          .head-director-pending-reviews-table .pending-reviews-col-purpose {
            max-width: 150px;
            min-width: 120px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-personnel {
            max-width: 140px;
            min-width: 100px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-destination {
            max-width: 120px;
            min-width: 80px;
          }
        }
        @media (max-width: 767.98px) {
          .head-director-pending-reviews-table tbody td:not(.pending-reviews-col-no):not(.pending-reviews-col-actions) {
            position: relative;
            z-index: 0;
          }
          .head-director-pending-reviews-table .pending-reviews-col-no {
            position: sticky !important;
            left: 0 !important;
            z-index: 100 !important;
            background: #fff !important;
            background-color: #fff !important;
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
            isolation: isolate;
          }
          .head-director-pending-reviews-table .pending-reviews-col-no::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            z-index: -1;
          }
          .head-director-pending-reviews-table thead .pending-reviews-col-no {
            background: #f8fafc !important;
            background-color: #f8fafc !important;
            z-index: 101 !important;
          }
          .head-director-pending-reviews-table thead .pending-reviews-col-no::before {
            background: #f8fafc;
          }
          .head-director-pending-reviews-table tbody tr:hover .pending-reviews-col-no {
            background: rgba(0,0,0,0.04) !important;
            background-color: rgba(0,0,0,0.04) !important;
          }
          .head-director-pending-reviews-table tbody tr:hover .pending-reviews-col-no::before {
            background: rgba(0,0,0,0.04);
          }
          .head-director-pending-reviews-table tbody tr .pending-reviews-col-no {
            background: #fff !important;
            background-color: #fff !important;
          }
          .head-director-pending-reviews-table .pending-reviews-col-actions {
            position: sticky !important;
            left: 2.5rem !important;
            z-index: 100 !important;
            background: #fff !important;
            background-color: #fff !important;
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
            isolation: isolate;
          }
          .head-director-pending-reviews-table .pending-reviews-col-actions::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            z-index: -1;
          }
          .head-director-pending-reviews-table thead .pending-reviews-col-actions {
            background: #f8fafc !important;
            background-color: #f8fafc !important;
            z-index: 101 !important;
          }
          .head-director-pending-reviews-table thead .pending-reviews-col-actions::before {
            background: #f8fafc;
          }
          .head-director-pending-reviews-table tbody tr:hover .pending-reviews-col-actions {
            background: rgba(0,0,0,0.04) !important;
            background-color: rgba(0,0,0,0.04) !important;
          }
          .head-director-pending-reviews-table tbody tr:hover .pending-reviews-col-actions::before {
            background: rgba(0,0,0,0.04);
          }
          .head-director-pending-reviews-table tbody tr .pending-reviews-col-actions {
            background: #fff !important;
            background-color: #fff !important;
          }
          .head-director-pending-reviews-table .pending-reviews-col-actions .btn,
          .head-director-pending-reviews-table .pending-reviews-col-actions a {
            background: var(--primary-color) !important;
            backgroundColor: var(--primary-color) !important;
            position: relative;
            z-index: 1;
            opacity: 1 !important;
          }
          .head-director-pending-reviews-table .pending-reviews-col-actions * {
            position: relative;
            z-index: 1;
          }
          .head-director-pending-reviews-table .pending-reviews-col-purpose {
            max-width: 120px;
            min-width: 100px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-personnel {
            max-width: 100px;
            min-width: 80px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-destination {
            max-width: 100px;
            min-width: 70px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-dates {
            max-width: 140px;
            min-width: 120px;
          }
          .head-director-pending-reviews-table tbody td {
            padding: 0.5rem 0.4rem;
            font-size: 0.75rem;
          }
          .head-director-pending-reviews-table thead th {
            padding: 0.5rem 0.4rem;
            font-size: 0.75rem;
          }
          .head-director-pending-reviews-table .btn-sm {
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
          }
        }
        @media (max-width: 575.98px) {
          .head-director-pending-reviews-table .pending-reviews-col-purpose {
            max-width: 100px;
            min-width: 80px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-personnel {
            max-width: 90px;
            min-width: 70px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-destination {
            max-width: 90px;
            min-width: 60px;
          }
          .head-director-pending-reviews-table .pending-reviews-col-dates {
            max-width: 120px;
            min-width: 100px;
          }
          .head-director-pending-reviews-table tbody td {
            padding: 0.4rem 0.3rem;
            font-size: 0.7rem;
          }
          .head-director-pending-reviews-table thead th {
            padding: 0.4rem 0.3rem;
            font-size: 0.7rem;
          }
          .head-director-pending-reviews-table .btn-sm {
            font-size: 0.65rem;
            padding: 0.2rem 0.4rem;
          }
          .head-director-pending-reviews-table .btn-sm .me-1 {
            margin-right: 0.15rem !important;
          }
        }
      `}</style>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
        <div className="flex-grow-1 mb-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaCheckCircle className="me-2" />
            Pending Reviews
          </h1>
          <p className="mb-0 small d-none d-sm-block" style={{ color: "var(--text-muted)" }}>
            Travel orders waiting for your recommendation or approval
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          style={btnOutline}
          onClick={fetchPending}
          disabled={loading}
        >
          <FaSyncAlt className="me-1" /> Refresh
        </button>
      </div>

      <div
        className="card pending-reviews-filters-card shadow-sm mb-3"
        style={{ borderRadius: "0.5rem", border: "1px solid rgba(13,122,58,0.12)" }}
      >
        <div className="card-header d-flex align-items-center gap-2 py-2 px-3">
          <FaCheckCircle
            style={{ fontSize: "0.9rem", color: "var(--primary-color)" }}
          />
          <span
            className="fw-semibold"
            style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}
          >
            Filters
          </span>
          {hasActiveFilters && (
            <span
              className="badge rounded-pill bg-primary opacity-75"
              style={{ fontSize: "0.65rem" }}
            >
              Active
            </span>
          )}
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-sm-6 col-lg-4">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Search
              </label>
              <div className="input-group input-group-sm pending-reviews-search-wrap">
                <span className="input-group-text">
                  <FaSearch style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Purpose, personnel, destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search purpose, personnel, or destination"
                />
                {searchTerm.length > 0 && (
                  <button
                    type="button"
                    className="pending-reviews-search-clear"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <FaTimes style={{ fontSize: "0.8rem" }} />
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Travel date from
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Travel date to
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                min={filterDateFrom || undefined}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm" style={{ borderRadius: "0.375rem" }}>
        <div className="card-body p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <FaCheckCircle className="mb-2" style={{ fontSize: "2rem" }} />
              {orders.length === 0 ? (
                <p className="mb-0">No pending travel orders.</p>
              ) : (
                <>
                  <p className="mb-1">No pending travel orders match your filters.</p>
                  <p className="mb-0 small">
                    Adjust or clear filters to see other travel orders.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="table-responsive head-director-pending-reviews-table-wrap">
              <table className="table table-hover mb-0 head-director-pending-reviews-table">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th
                      className="border-0 py-2 px-2 px-md-3 small fw-semibold text-center pending-reviews-col-no"
                      style={{ color: "var(--text-primary)", minWidth: "2.5rem" }}
                    >
                      #
                    </th>
                    <th
                      className="border-0 py-2 px-2 px-md-3 small fw-semibold text-center pending-reviews-col-actions"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Action
                    </th>
                    <th
                      className="border-0 py-2 px-2 px-md-3 small fw-semibold text-start pending-reviews-col-purpose"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Purpose
                    </th>
                    <th
                      className="border-0 py-2 px-2 px-md-3 small fw-semibold pending-reviews-col-personnel"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Personnel
                    </th>
                    <th
                      className="border-0 py-2 px-2 px-md-3 small fw-semibold pending-reviews-col-destination"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Destination
                    </th>
                    <th
                      className="border-0 py-2 px-2 px-md-3 small fw-semibold pending-reviews-col-dates"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Dates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((order, index) => {
                    const rowNum = getRowNumber(index);
                    return (
                      <tr key={order.id}>
                        <td
                          className="py-2 px-2 px-md-3 small text-center pending-reviews-col-no"
                          style={{ color: "var(--text-muted)", fontWeight: 800 }}
                        >
                          {rowNum}
                        </td>
                        <td className="py-2 px-2 px-md-3 text-center pending-reviews-col-actions">
                          <Link
                            to={`/pending-reviews/${order.id}`}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: "var(--primary-color)",
                              color: "#fff",
                              borderColor: "var(--primary-color)",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                            }}
                          >
                            <FaEye className="me-1" /> Review
                          </Link>
                        </td>
                        <td
                          className="py-2 px-2 px-md-3 small text-start pending-reviews-col-purpose"
                          style={{ color: "var(--text-primary)" }}
                          title={order.travel_purpose}
                        >
                          <span className="pending-reviews-purpose-text" title={order.travel_purpose}>
                            {order.travel_purpose}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2 px-md-3 small pending-reviews-col-personnel"
                          style={{ color: "var(--text-primary)" }}
                          title={getPersonnelName(order.personnel)}
                        >
                          <span className="pending-reviews-text-truncate" title={getPersonnelName(order.personnel)}>
                            {getPersonnelName(order.personnel)}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2 px-md-3 small pending-reviews-col-destination"
                          style={{ color: "var(--text-muted)" }}
                          title={order.destination || "—"}
                        >
                          <span className="pending-reviews-text-truncate" title={order.destination || "—"}>
                            {order.destination || "—"}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2 px-md-3 small pending-reviews-col-dates"
                          style={{ color: "var(--text-muted)" }}
                          title={`${formatDate(order.start_date)} – ${formatDate(order.end_date)}`}
                        >
                          <span className="pending-reviews-text-truncate">
                            {formatDate(order.start_date)} – {formatDate(order.end_date)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredOrders.length > 0 && (
            <div className="card-footer bg-white border-top px-2 px-md-3 py-2 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <small style={{ color: "var(--text-muted)" }}>
                  Showing <span className="fw-semibold">{from}</span>–
                  <span className="fw-semibold">{to}</span> of{" "}
                  <span className="fw-semibold">{total}</span>
                </small>
                <div className="d-flex align-items-center gap-1">
                  <label
                    htmlFor="pending-reviews-per-page"
                    className="small text-muted mb-0 me-1"
                  >
                    Per page
                  </label>
                  <select
                    id="pending-reviews-per-page"
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {lastPage > 1 && (
                <nav
                  className="d-flex align-items-center gap-1 flex-wrap justify-content-center"
                  aria-label="Pending reviews pagination"
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage <= 1}
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </button>
                  <div className="d-flex align-items-center gap-1 flex-wrap justify-content-center">
                    {getPageNumbers(currentPage, lastPage).map((item, idx) =>
                      item === "…" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 small text-muted"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`btn btn-sm btn-outline-secondary ${
                            currentPage === item ? "active" : ""
                          }`}
                          onClick={() => handlePageChange(item)}
                          disabled={currentPage === item}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= lastPage}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handlePageChange(lastPage)}
                    disabled={currentPage >= lastPage}
                  >
                    »
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingReviews;
