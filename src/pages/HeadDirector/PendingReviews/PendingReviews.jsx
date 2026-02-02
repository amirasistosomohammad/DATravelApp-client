import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaSyncAlt, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_PAGE_SIZE = 10;

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
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
    per_page: DEFAULT_PAGE_SIZE,
  });

  const fetchPending = useCallback(
    async (page = 1) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("per_page", DEFAULT_PAGE_SIZE);
        params.set("page", String(page));
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
        toast.error(typeof err === "string" ? err : err?.message || "Failed to load");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (user?.role === "director") {
      fetchPending(1);
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

  if (loading && orders.length === 0) {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading pending reviews..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaCheckCircle className="me-2" />
            Pending Reviews
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Travel orders waiting for your recommendation or approval
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          style={btnOutline}
          onClick={() => fetchPending(pagination.current_page)}
          disabled={loading}
        >
          <FaSyncAlt className="me-1" /> Refresh
        </button>
      </div>

      <div className="card shadow-sm" style={{ borderRadius: "0.375rem" }}>
        <div className="card-body p-0">
          {orders.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <FaCheckCircle className="mb-2" style={{ fontSize: "2rem" }} />
              <p className="mb-0">No pending travel orders.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Purpose</th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Personnel</th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Destination</th>
                    <th className="border-0 py-2 px-3 small fw-semibold" style={{ color: "var(--text-primary)" }}>Dates</th>
                    <th className="border-0 py-2 px-3 small fw-semibold text-end" style={{ color: "var(--text-primary)" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)", maxWidth: "200px" }} title={order.travel_purpose}>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: "200px" }}>{order.travel_purpose}</span>
                      </td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-primary)" }}>{getPersonnelName(order.personnel)}</td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-muted)" }}>{order.destination || "—"}</td>
                      <td className="py-2 px-3 small" style={{ color: "var(--text-muted)" }}>
                        {formatDate(order.start_date)} – {formatDate(order.end_date)}
                      </td>
                      <td className="py-2 px-3 text-end">
                        <Link
                          to={`/pending-reviews/${order.id}`}
                          className="btn btn-sm"
                          style={{ backgroundColor: "var(--primary-color)", color: "#fff", borderColor: "var(--primary-color)", borderRadius: "6px", fontSize: "0.8rem" }}
                        >
                          <FaEye className="me-1" /> Review
                        </Link>
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
                  onClick={() => fetchPending(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={btnOutline}
                  onClick={() => fetchPending(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingReviews;
