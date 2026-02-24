import React, { useState, useEffect, useCallback } from "react";
import { FaUsers, FaSyncAlt, FaEye, FaSearch, FaTimes, FaEraser, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import ViewTravelOrderModal from "./ViewTravelOrderModal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const LOAD_ALL_PAGE_SIZE = 500;

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

const getPersonnelName = (p) => {
  if (!p) return "—";
  if (p.first_name && p.last_name) {
    const parts = [p.first_name];
    if (p.middle_name) parts.push(p.middle_name);
    parts.push(p.last_name);
    return parts.join(" ");
  }
  return p?.name || p?.username || "—";
};

const PersonnelAllTravelOrders = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewModalOrderId, setViewModalOrderId] = useState(null);

  const fetchDepartments = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (response.ok && data?.data?.departments) {
        setDepartments(data.data.departments);
      }
    } catch {
      // Non-blocking
    }
  }, [token]);

  /** Load all data once on mount / refresh. Filtering is done client-side for instant UX. */
  const fetchOrders = useCallback(async () => {
    if (!token) {
      toast.error("Authentication token missing. Please login again.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("per_page", String(LOAD_ALL_PAGE_SIZE));
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/all?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to load travel orders";
      }
      const items = data?.data?.items ?? [];
      setOrders(Array.isArray(items) ? items : []);
      setCurrentPage(1);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to load");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === "personnel") {
      fetchDepartments();
    }
  }, [user?.role, fetchDepartments]);

  useEffect(() => {
    if (user?.role === "personnel") {
      fetchOrders();
    }
  }, [user?.role, fetchOrders]);

  const setFilterAndResetPage = (setter, value) => {
    setter(value);
    setCurrentPage(1);
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: {
        backgroundColor: "rgba(255, 179, 0, 0.15)",
        color: "#92400e",
        border: "1px solid rgba(255, 179, 0, 0.35)",
      },
      approved: {
        backgroundColor: "rgba(34, 197, 94, 0.18)",
        color: "#14532d",
        border: "1px solid rgba(34, 197, 94, 0.35)",
      },
      rejected: {
        backgroundColor: "rgba(248, 113, 113, 0.16)",
        color: "#7f1d1d",
        border: "1px solid rgba(248, 113, 113, 0.35)",
      },
      cancelled: {
        backgroundColor: "rgba(108, 117, 125, 0.18)",
        color: "#495057",
        border: "1px solid rgba(108, 117, 125, 0.35)",
      },
    };
    const s = styles[status] || styles.pending;
    return (
      <span
        className="badge px-2 py-1 fw-semibold"
        style={{ ...s, fontSize: "0.75rem", borderRadius: "6px" }}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
      </span>
    );
  };

  // Client-side filtering (no refetch – instant)
  const filteredByDepartment = filterDepartment
    ? orders.filter((o) => (o.personnel?.department || "") === filterDepartment)
    : orders;
  const filteredByStatus =
    filterStatus && filterStatus !== "all"
      ? filteredByDepartment.filter((o) => o.status === filterStatus)
      : filteredByDepartment;
  const filteredBySearch = searchTerm.trim()
    ? filteredByStatus.filter((o) => {
        const term = searchTerm.toLowerCase();
        const name = getPersonnelName(o.personnel).toLowerCase();
        const position = (o.personnel?.position || "").toLowerCase();
        const purpose = (o.travel_purpose || "").toLowerCase();
        const dest = (o.destination || "").toLowerCase();
        return (
          name.includes(term) ||
          position.includes(term) ||
          purpose.includes(term) ||
          dest.includes(term)
        );
      })
    : filteredByStatus;
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

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    filterDateFrom !== "" ||
    filterDateTo !== "" ||
    (filterStatus && filterStatus !== "all") ||
    (filterDepartment && filterDepartment !== "");

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterStatus("all");
    setFilterDepartment("");
    setCurrentPage(1);
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

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  useEffect(() => {
    if (currentPage > lastPage && lastPage >= 1) {
      setCurrentPage(lastPage);
    }
  }, [currentPage, lastPage]);

  if (loading && orders.length === 0) {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading travel orders..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 page-enter">
      <style>{`
        .personnel-all-to-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          position: relative;
          isolation: isolate;
        }
        .personnel-all-to-table {
          border-collapse: collapse;
          min-width: 100%;
        }
        .personnel-all-to-table thead th {
          white-space: nowrap;
          vertical-align: middle;
        }
        .personnel-all-to-table tbody td {
          vertical-align: middle;
          max-height: 3.25rem;
          overflow: hidden;
          line-height: 1.35;
        }
        .personnel-all-to-table tbody tr {
          height: 3.25rem;
        }
        .personnel-all-to-table .col-no {
          width: 2.5rem;
          min-width: 2.5rem;
          max-width: 2.5rem;
        }
        .personnel-all-to-table .col-actions {
          white-space: nowrap;
          width: 3rem;
          min-width: 3rem;
          max-width: 3rem;
        }
        .personnel-all-to-table .col-personnel { max-width: 140px; min-width: 90px; }
        .personnel-all-to-table .col-department { max-width: 120px; min-width: 80px; }
        .personnel-all-to-table .col-purpose { max-width: 220px; min-width: 120px; }
        .personnel-all-to-table .col-destination { max-width: 140px; min-width: 80px; }
        .personnel-all-to-table .col-dates { max-width: 11rem; min-width: 9rem; white-space: nowrap; }
        .personnel-all-to-table .col-status { max-width: 6rem; min-width: 5rem; }
        .personnel-all-to-table .cell-truncate {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        @media (max-width: 767.98px) {
          .personnel-all-to-table tbody td:not(.col-no):not(.col-actions) { position: relative; z-index: 0; }
          .personnel-all-to-table .col-no {
            position: sticky !important;
            left: 0 !important;
            z-index: 100 !important;
            background: #fff !important;
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
            isolation: isolate;
          }
          .personnel-all-to-table thead .col-no { background: var(--background-light, #f8fafc) !important; z-index: 101 !important; }
          .personnel-all-to-table tbody tr:hover .col-no { background: rgba(0,0,0,0.04) !important; }
          .personnel-all-to-table .col-actions {
            position: sticky !important;
            left: 2.5rem !important;
            z-index: 100 !important;
            background: #fff !important;
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
            isolation: isolate;
          }
          .personnel-all-to-table thead .col-actions { background: var(--background-light, #f8fafc) !important; z-index: 101 !important; }
          .personnel-all-to-table tbody tr:hover .col-actions { background: rgba(0,0,0,0.04) !important; }
        }
        .personnel-all-to-filters-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.6rem 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .personnel-all-to-filters-card .card-body { padding: 1rem; }
        .personnel-all-to-search-wrap .form-control { border-radius: 0.375rem; border-color: rgba(0,0,0,0.15); }
        .personnel-all-to-search-wrap .form-control:focus { border-color: var(--primary-color); box-shadow: 0 0 0 0.2rem rgba(13,122,58,0.15); }
      `}</style>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaUsers className="me-2" />
            Travel orders by department
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Browse and filter travel orders across personnel by department, name, or position.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          style={{
            transition: "all 0.2s ease",
            border: "2px solid var(--primary-color)",
            color: "var(--primary-color)",
            backgroundColor: "transparent",
            borderRadius: "4px",
          }}
          onClick={() => fetchOrders()}
          disabled={loading}
        >
          <FaSyncAlt className="me-1" /> Refresh
        </button>
      </div>

      <div
        className="card personnel-all-to-filters-card shadow-sm mb-3"
        style={{ borderRadius: "0.5rem", border: "1px solid rgba(13,122,58,0.12)" }}
      >
        <div className="card-header d-flex align-items-center gap-2 py-2 px-3">
          <FaSearch style={{ fontSize: "0.85rem", color: "var(--primary-color)" }} />
          <span className="fw-semibold" style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>
            Filters
          </span>
          {hasActiveFilters && (
            <span className="badge rounded-pill bg-primary opacity-75" style={{ fontSize: "0.65rem" }}>
              Active
            </span>
          )}
        </div>
        <div className="card-body pt-2 pb-3 px-3">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Department
              </label>
              <select
                className="form-select form-select-sm"
                value={filterDepartment}
                onChange={(e) => setFilterAndResetPage(setFilterDepartment, e.target.value)}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Filter by department"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Status
              </label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterAndResetPage(setFilterStatus, e.target.value)}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Filter by status"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                 <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Search (name, position, purpose, destination)
              </label>
              <div className="input-group input-group-sm personnel-all-to-search-wrap">
                <span className="input-group-text">
                  <FaSearch style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setFilterAndResetPage(setSearchTerm, e.target.value)}
                  aria-label="Search"
                />
                {searchTerm.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
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
                onChange={(e) => setFilterAndResetPage(setFilterDateFrom, e.target.value)}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Travel start date"
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
                onChange={(e) => setFilterAndResetPage(setFilterDateTo, e.target.value)}
                min={filterDateFrom || undefined}
                style={{ borderRadius: "0.375rem", borderColor: "rgba(0,0,0,0.15)" }}
                aria-label="Travel end date"
              />
            </div>
            <div className="col-12 col-lg-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                style={{ borderRadius: "0.375rem" }}
              >
                <FaEraser className="me-1" /> Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 overflow-hidden" style={{ borderRadius: "0.5rem" }}>
        <div className="personnel-all-to-table-wrap">
          <table className="table table-hover personnel-all-to-table mb-0">
            <thead style={{ backgroundColor: "var(--background-light, #f8fafc)" }}>
              <tr>
                <th className="col-no py-2 px-2 text-center">#</th>
                <th className="col-actions py-2 px-2 text-center">View</th>
                <th className="col-personnel py-2 px-2">Personnel</th>
                <th className="col-department py-2 px-2">Department</th>
                <th className="col-purpose py-2 px-2">Purpose</th>
                <th className="col-destination py-2 px-2">Destination</th>
                <th className="col-dates py-2 px-2">Dates</th>
                <th className="col-status py-2 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    {orders.length === 0
                      ? "No travel orders found. Try again later."
                      : "No results match your filters. Clear filters or adjust criteria."}
                  </td>
                </tr>
              ) : (
                pageItems.map((order, index) => (
                  <tr key={order.id}>
                    <td className="col-no py-2 px-2 text-center small text-muted fw-semibold">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="col-actions py-2 px-2 text-center">
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: "#1e3a5f",
                          borderColor: "#1e3a5f",
                          color: "#fff",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          padding: 0,
                        }}
                        title="View details"
                        onClick={() => setViewModalOrderId(order.id)}
                      >
                        <FaEye style={{ fontSize: "0.75rem" }} />
                      </button>
                    </td>
                    <td className="col-personnel py-2 px-2 small" title={getPersonnelName(order.personnel)}>
                      <span className="cell-truncate">{getPersonnelName(order.personnel)}</span>
                    </td>
                    <td className="col-department py-2 px-2 small" title={order.personnel?.department || ""}>
                      <span className="cell-truncate">{order.personnel?.department || "—"}</span>
                    </td>
                    <td className="col-purpose py-2 px-2 small" title={order.travel_purpose || ""}>
                      <span className="cell-truncate">{order.travel_purpose || "—"}</span>
                    </td>
                    <td className="col-destination py-2 px-2 small" title={order.destination || ""}>
                      <span className="cell-truncate">{order.destination || "—"}</span>
                    </td>
                    <td className="col-dates py-2 px-2 small text-nowrap">
                      {formatDate(order.start_date)} – {formatDate(order.end_date)}
                    </td>
                    <td className="col-status py-2 px-2 text-center">{getStatusBadge(order.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="card-footer bg-white border-top px-2 px-md-3 py-2 travel-orders-pagination-wrap">
            <div className="travel-orders-pagination d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3 order-2 order-md-1">
                <div className="travel-orders-pagination-info small text-muted">
                  Showing <span className="fw-semibold">{from}</span>–<span className="fw-semibold">{to}</span> of <span className="fw-semibold">{total}</span>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <label htmlFor="personnel-all-to-per-page" className="small text-muted mb-0 me-1">Per page</label>
                  <select
                    id="personnel-all-to-per-page"
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

      {viewModalOrderId && (
        <ViewTravelOrderModal
          orderId={viewModalOrderId}
          token={token}
          onClose={() => setViewModalOrderId(null)}
          peerViewBasePath="personnel/travel-orders/all"
        />
      )}
    </div>
  );
};

export default PersonnelAllTravelOrders;
