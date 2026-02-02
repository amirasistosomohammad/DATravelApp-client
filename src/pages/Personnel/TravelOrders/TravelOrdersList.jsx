import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaFileAlt, FaPlus, FaSyncAlt, FaEdit, FaTrash, FaPaperPlane } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import { showAlert } from "../../../services/notificationService";
import SubmitTravelOrderModal from "./SubmitTravelOrderModal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_PAGE_SIZE = 10;

const TravelOrdersList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (user && user.role !== "personnel") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
    per_page: DEFAULT_PAGE_SIZE,
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [submitModalOrder, setSubmitModalOrder] = useState(null);

  const fetchOrders = useCallback(
    async (page = 1) => {
      if (!token) {
        toast.error("Authentication token missing. Please login again.");
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("per_page", DEFAULT_PAGE_SIZE);
        params.set("page", String(page));
        if (filterStatus && filterStatus !== "all") {
          params.set("status", filterStatus);
        }
        const response = await fetch(
          `${API_BASE_URL}/personnel/travel-orders?${params.toString()}`,
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
        const pag = data?.data?.pagination ?? {};
        setOrders(items);
        setPagination({
          current_page: pag.current_page ?? 1,
          last_page: pag.last_page ?? 1,
          total: pag.total ?? 0,
          from: pag.from ?? 0,
          to: pag.to ?? 0,
          per_page: pag.per_page ?? DEFAULT_PAGE_SIZE,
        });
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
    },
    [token, filterStatus]
  );

  useEffect(() => {
    if (user?.role === "personnel") {
      fetchOrders(1);
    }
  }, [filterStatus, user?.role, fetchOrders]);

  const handleRefresh = () => {
    fetchOrders(pagination.current_page);
    toast.success("List refreshed");
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchOrders(page);
  };

  const handleSubmitSuccess = () => {
    toast.success("Travel order submitted for approval.");
    fetchOrders(pagination.current_page);
    setSubmitModalOrder(null);
  };

  const handleDelete = async (order) => {
    if (order.status !== "draft") {
      toast.error("Only draft travel orders can be deleted.");
      return;
    }
    const result = await showAlert({
      title: "Delete Travel Order?",
      text: `This will permanently delete the travel order for "${order.travel_purpose}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#dc3545",
    });
    if (!result?.isConfirmed) return;

    setActionLoading(order.id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${order.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to delete";
      }
      toast.success("Travel order deleted.");
      fetchOrders(pagination.current_page);
    } catch (err) {
      toast.error(err?.message || "Failed to delete travel order");
    } finally {
      setActionLoading(null);
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

  const filteredOrders = searchTerm.trim()
    ? orders.filter((o) => {
        const term = searchTerm.toLowerCase();
        return (
          (o.travel_purpose || "").toLowerCase().includes(term) ||
          (o.destination || "").toLowerCase().includes(term)
        );
      })
    : orders;

  const stats = {
    total: pagination.total,
    draft: orders.filter((o) => o.status === "draft").length,
    pending: orders.filter((o) => o.status === "pending").length,
    approved: orders.filter((o) => o.status === "approved").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
  };

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
      `}</style>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaFileAlt className="me-2" />
            My Travel Orders
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Create and manage your travel order drafts
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Link
            to="/travel-orders/create"
            className="btn btn-sm text-white"
            style={btnPrimary}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <FaPlus className="me-1" />
            New Travel Order
          </Link>
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
      <div className="row g-3 mb-4">
        <div className="col-6 col-md">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="text-xs fw-semibold text-uppercase mb-1" style={{ color: "var(--primary-color)" }}>
                Total
              </div>
              <div className="mb-0 fw-bold" style={{ color: "var(--text-primary)" }}>
                {pagination.total}
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
          <div className="card stats-card h-100 shadow-sm" style={{ border: "1px solid rgba(0, 0, 0, 0.125)", borderRadius: "0.375rem" }}>
            <div className="card-body p-2 p-md-3">
              <div className="text-xs fw-semibold text-uppercase mb-1" style={{ color: "var(--primary-color)" }}>Drafts</div>
              <div className="mb-0 fw-bold" style={{ color: "var(--text-primary)" }}>{stats.draft}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-3" style={{ borderRadius: "0.375rem" }}>
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search purpose or destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: "4px" }}
              />
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ borderRadius: "4px" }}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card shadow-sm" style={{ borderRadius: "0.375rem" }}>
        <div className="card-body p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <FaFileAlt className="mb-2" style={{ fontSize: "2rem" }} />
              <p className="mb-2">No travel orders found.</p>
              <Link to="/travel-orders/create" className="btn btn-sm" style={btnPrimary}>
                <FaPlus className="me-1" /> Create your first travel order
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Purpose</th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Destination</th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Dates</th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Status</th>
                    <th className="border-0 py-2 px-3 small fw-semibold text-end" style={{ color: "var(--text-primary)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)", maxWidth: "200px" }} title={order.travel_purpose}>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: "200px" }}>{order.travel_purpose}</span>
                      </td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>{order.destination || "—"}</td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-muted)" }}>
                        {formatDate(order.start_date)} – {formatDate(order.end_date)}
                      </td>
                      <td className="py-2 px-3">{getStatusBadge(order.status)}</td>
                      <td className="py-2 px-3 text-end">
                        {order.status === "draft" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm me-1"
                              style={{ backgroundColor: "var(--primary-color)", borderColor: "var(--primary-color)", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                              title="Submit"
                              onClick={() => setSubmitModalOrder(order)}
                              disabled={actionLoading === order.id}
                            >
                              <FaPaperPlane style={{ fontSize: "0.75rem" }} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm me-1"
                              style={{ backgroundColor: "#d97706", borderColor: "#d97706", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                              title="Edit"
                              onClick={() => navigate(`/travel-orders/${order.id}/edit`)}
                              disabled={actionLoading === order.id}
                            >
                              {actionLoading === order.id ? <span className="spinner-border spinner-border-sm" /> : <FaEdit />}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ backgroundColor: "#dc3545", borderColor: "#dc3545", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                              title="Delete"
                              onClick={() => handleDelete(order)}
                              disabled={actionLoading === order.id}
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                        {order.status !== "draft" && (
                          <span className="small text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.last_page > 1 && (
            <div className="card-footer bg-white border-top px-3 py-2 d-flex justify-content-between align-items-center">
              <small style={{ color: "var(--text-muted)" }}>
                Showing {pagination.from}-{pagination.to} of {pagination.total}
              </small>
              <div className="d-flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm"
                  style={btnOutline}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={btnOutline}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {submitModalOrder && (
        <SubmitTravelOrderModal
          order={submitModalOrder}
          token={token}
          onClose={() => setSubmitModalOrder(null)}
          onSuccess={handleSubmitSuccess}
        />
      )}
    </div>
  );
};

export default TravelOrdersList;
