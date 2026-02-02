import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaPaperclip, FaCheck, FaTimes, FaThumbsUp } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const ReviewTravelOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [currentApproval, setCurrentApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (user && user.role !== "director") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!id || !token) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/directors/travel-orders/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setOrder(data.data.travel_order);
          setCurrentApproval(data.data.current_approval);
        } else {
          toast.error(data?.message || "Travel order not found.");
          navigate("/pending-reviews");
        }
      })
      .catch(() => {
        toast.error("Failed to load travel order.");
        navigate("/pending-reviews");
      })
      .finally(() => setLoading(false));
  }, [id, token, user, navigate]);

  const handleAction = async (action) => {
    if (!order || !currentApproval) return;
    setActionLoading(action);
    try {
      const response = await fetch(
        `${API_BASE_URL}/directors/travel-orders/${order.id}/action`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ action, remarks: remarks.trim() || null }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Action failed";
      }
      toast.success(data?.message || "Done.");
      navigate("/pending-reviews");
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const downloadAttachment = async (attachmentId, fileName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/directors/travel-order-attachments/${attachmentId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "attachment";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      toast.error("Failed to download file.");
    }
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

  const isRecommendStep = currentApproval?.step_order === 1 && order?.approvals?.length > 1;
  const isApproveStep = currentApproval?.step_order === 2 || (order?.approvals?.length === 1);

  if (loading) {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading travel order..." />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="container-fluid px-1 py-2 page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            Review Travel Order
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {order.travel_purpose}
          </p>
        </div>
        <Link
          to="/pending-reviews"
          className="btn btn-sm"
          style={{ border: "2px solid var(--primary-color)", color: "var(--primary-color)", backgroundColor: "transparent", borderRadius: "4px" }}
        >
          <FaArrowLeft className="me-1" /> Back to pending
        </Link>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: "0.375rem" }}>
        <div className="card-header py-2" style={{ backgroundColor: "var(--background-light)", fontWeight: 600, color: "var(--text-primary)" }}>
          Travel details
        </div>
        <div className="card-body">
          <div className="row g-2 small">
            <div className="col-12">
              <strong>Personnel:</strong> {getPersonnelName(order.personnel)}
            </div>
            <div className="col-12">
              <strong>Purpose:</strong> {order.travel_purpose}
            </div>
            <div className="col-12 col-md-6">
              <strong>Destination:</strong> {order.destination || "—"}
            </div>
            <div className="col-12 col-md-6">
              <strong>Dates:</strong> {formatDate(order.start_date)} – {formatDate(order.end_date)}
            </div>
            {order.objectives && (
              <div className="col-12">
                <strong>Objectives:</strong> {order.objectives}
              </div>
            )}
            {(order.per_diems_expenses != null && order.per_diems_expenses !== "") && (
              <div className="col-12 col-md-4">
                <strong>Per diems / expenses:</strong> {order.per_diems_expenses}
              </div>
            )}
            {order.appropriation && (
              <div className="col-12 col-md-4">
                <strong>Appropriation:</strong> {order.appropriation}
              </div>
            )}
            {order.remarks && (
              <div className="col-12">
                <strong>Remarks:</strong> {order.remarks}
              </div>
            )}
          </div>
        </div>
      </div>

      {order.attachments && order.attachments.length > 0 && (
        <div className="card shadow-sm mb-3" style={{ borderRadius: "0.375rem" }}>
          <div className="card-header py-2 d-flex align-items-center" style={{ backgroundColor: "var(--background-light)", fontWeight: 600, color: "var(--text-primary)" }}>
            <FaPaperclip className="me-2" /> Attachments
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              {order.attachments.map((att) => (
                <li key={att.id} className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0">
                  <span className="small">{att.file_name}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => downloadAttachment(att.id, att.file_name)}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="card shadow-sm mb-3" style={{ borderRadius: "0.375rem" }}>
        <div className="card-header py-2" style={{ backgroundColor: "var(--background-light)", fontWeight: 600, color: "var(--text-primary)" }}>
          Your decision
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Remarks (optional)</label>
            <textarea
              className="form-control form-control-sm"
              rows={3}
              placeholder="Add remarks or reason for your decision..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ borderRadius: "4px" }}
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            {isRecommendStep && (
              <button
                type="button"
                className="btn btn-sm text-white"
                style={{ backgroundColor: "var(--primary-color)", borderColor: "var(--primary-color)", borderRadius: "6px" }}
                onClick={() => handleAction("recommend")}
                disabled={actionLoading}
              >
                {actionLoading === "recommend" ? <span className="spinner-border spinner-border-sm me-1" /> : <FaThumbsUp className="me-1" />}
                Recommend
              </button>
            )}
            {isApproveStep && (
              <button
                type="button"
                className="btn btn-sm btn-success"
                style={{ borderRadius: "6px" }}
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
              >
                {actionLoading === "approve" ? <span className="spinner-border spinner-border-sm me-1" /> : <FaCheck className="me-1" />}
                Approve
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{ borderRadius: "6px" }}
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
            >
              {actionLoading === "reject" ? <span className="spinner-border spinner-border-sm me-1" /> : <FaTimes className="me-1" />}
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewTravelOrder;
