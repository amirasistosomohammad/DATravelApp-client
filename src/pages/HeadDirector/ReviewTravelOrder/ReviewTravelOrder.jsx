import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaPaperclip, FaCheck, FaTimes, FaThumbsUp, FaDownload } from "react-icons/fa";
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

  const getAttachmentTypeLabel = (type) => {
    const map = {
      itinerary: "Proposed Itinerary",
      memorandum: "Memorandum",
      invitation: "Invitation / Notice of Meeting",
      other: "Other",
    };
    return map[type] || "Other";
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

  const statusLabel =
    order.status === "pending"
      ? "Pending"
      : order.status === "recommended"
      ? "Recommended"
      : order.status === "approved"
      ? "Approved"
      : order.status === "rejected"
      ? "Rejected"
      : "Draft";

  const currentStepLabel = isRecommendStep
    ? "Recommending director step"
    : isApproveStep
    ? "Approving director step"
    : "Director review";

  return (
    <div className="container-fluid px-1 py-2 page-enter review-travel-order-container">
      <style>{`
        .review-travel-order-container .rt-header-card {
          background: linear-gradient(135deg, rgba(13,122,58,0.06), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 0.9rem 1.2rem;
          border: 1px solid rgba(13,122,58,0.16);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          margin-bottom: 1rem;
        }
        .review-travel-order-container .rt-header-icon {
          width: 2.3rem;
          height: 2.3rem;
          border-radius: 999px;
          background: rgba(15,23,42,0.08);
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.6rem;
        }
        .review-travel-order-container .rt-status-pill {
          border-radius: 999px;
          padding: 0.15rem 0.65rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .review-travel-order-container .rt-status-pill.pending {
          background-color: rgba(250, 204, 21, 0.18);
          color: #92400e;
        }
        .review-travel-order-container .rt-status-pill.recommended {
          background-color: rgba(59, 130, 246, 0.18);
          color: #1d4ed8;
        }
        .review-travel-order-container .rt-status-pill.approved {
          background-color: rgba(34, 197, 94, 0.18);
          color: #14532d;
        }
        .review-travel-order-container .rt-status-pill.rejected {
          background-color: rgba(248, 113, 113, 0.18);
          color: #7f1d1d;
        }
        .review-travel-order-container .rt-card {
          border-radius: 0.5rem;
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 2px 8px rgba(15,23,42,0.06);
        }
        .review-travel-order-container .rt-card-header {
          background: var(--background-light, #f8fafc);
          border-bottom: 1px solid rgba(15,23,42,0.08);
          padding: 0.5rem 0.9rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .review-travel-order-container .rt-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 0.1rem;
        }
        .review-travel-order-container .rt-value {
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        .review-travel-order-container .rt-muted {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .review-travel-order-container .rt-attachments-list .list-group-item {
          padding-left: 0;
          padding-right: 0;
          border: 0;
          border-bottom: 1px solid rgba(15,23,42,0.06);
        }
        .review-travel-order-container .rt-attachments-list .list-group-item:last-child {
          border-bottom: 0;
        }
        .review-travel-order-container .rt-back-btn {
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.16);
          font-size: 0.8rem;
          padding: 0.35rem 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: #ffffff;
          color: var(--text-primary);
        }
        .review-travel-order-container .rt-back-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
          box-shadow: 0 2px 6px rgba(15,23,42,0.16);
        }
        .review-travel-order-container .rt-actions button {
          border-radius: 999px;
          font-size: 0.8rem;
          padding-inline: 1rem;
        }
        .review-travel-order-container .rt-actions button .spinner-border {
          width: 0.8rem;
          height: 0.8rem;
        }
        @media (max-width: 767.98px) {
          .review-travel-order-container .rt-header-card {
            padding: 0.8rem 0.9rem;
          }
          .review-travel-order-container .rt-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .review-travel-order-container .rt-actions button {
            width: 100%;
          }
        }
      `}</style>

      <div className="rt-header-card d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div className="d-flex align-items-start flex-grow-1">
          <div className="rt-header-icon">
            <FaThumbsUp />
          </div>
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h1
                className="h5 mb-0 fw-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Review travel order
              </h1>
              <span
                className={`rt-status-pill ${
                  order.status ? order.status.toLowerCase() : "pending"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="mb-1 rt-muted">
              {currentStepLabel} • TO #{order.id}
            </p>
            <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
              {order.travel_purpose}
            </p>
          </div>
        </div>
        <div className="d-flex flex-column align-items-stretch align-items-md-end gap-2">
          <Link to="/pending-reviews" className="rt-back-btn">
            <FaArrowLeft /> Back to pending reviews
          </Link>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card rt-card mb-3">
            <div className="rt-card-header">Travel details</div>
            <div className="card-body py-3">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="rt-label">Personnel</div>
                  <div className="rt-value">
                    {getPersonnelName(order.personnel)}
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="rt-label">Official station</div>
                  <div className="rt-value">
                    {order.official_station || "—"}
                  </div>
                </div>
                <div className="col-12">
                  <div className="rt-label">Purpose</div>
                  <div
                    className="rt-value"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {order.travel_purpose}
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="rt-label">Destination</div>
                  <div className="rt-value">
                    {order.destination || "—"}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="rt-label">Start date</div>
                  <div className="rt-value">
                    {formatDate(order.start_date)}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="rt-label">End date</div>
                  <div className="rt-value">
                    {formatDate(order.end_date)}
                  </div>
                </div>
                {order.objectives && (
                  <div className="col-12">
                    <div className="rt-label">Objectives</div>
                    <div className="rt-value">
                      {order.objectives}
                    </div>
                  </div>
                )}
                {(order.per_diems_expenses != null &&
                  order.per_diems_expenses !== "") && (
                  <div className="col-12 col-md-4">
                    <div className="rt-label">Per diems / expenses</div>
                    <div className="rt-value">
                      {order.per_diems_expenses}
                    </div>
                  </div>
                )}
                {order.appropriation && (
                  <div className="col-12 col-md-4">
                    <div className="rt-label">Appropriation</div>
                    <div className="rt-value">
                      {order.appropriation}
                    </div>
                  </div>
                )}
                {order.remarks && (
                  <div className="col-12">
                    <div className="rt-label">Personnel remarks</div>
                    <div className="rt-value">
                      {order.remarks}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {order.attachments && order.attachments.length > 0 && (
            <div className="card rt-card mb-3">
              <div className="rt-card-header d-flex align-items-center">
                <FaPaperclip className="me-2" /> Attachments
              </div>
              <div className="card-body py-2">
                <ul className="list-group list-group-flush rt-attachments-list">
                  {order.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="list-group-item d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2 py-2 px-0"
                    >
                      <div className="d-flex align-items-center flex-wrap gap-2 flex-grow-1 me-2">
                        <span
                          className="rt-muted text-truncate"
                          style={{ maxWidth: "520px" }}
                          title={att.file_name}
                        >
                          {att.file_name}
                        </span>
                        <span
                          className="badge bg-light text-dark border"
                          style={{
                            fontWeight: 600,
                            borderRadius: "999px",
                            fontSize: "0.7rem",
                          }}
                        >
                          {getAttachmentTypeLabel(att.type || "other")}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                        onClick={() =>
                          downloadAttachment(att.id, att.file_name)
                        }
                        title="Download attachment"
                        style={{
                          borderRadius: "0.375rem",
                          boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                          paddingInline: "0.85rem",
                          transition:
                            "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                        }}
                      >
                        <FaDownload />
                        <span>Download</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-4">
          <div className="card rt-card mb-3">
            <div className="rt-card-header">Approval summary</div>
            <div className="card-body py-3">
              <div className="mb-2">
                <div className="rt-label">Current step</div>
                <div className="rt-value">{currentStepLabel}</div>
              </div>
              {currentApproval?.director && (
                <div className="mb-2">
                  <div className="rt-label">You are reviewing as</div>
                  <div className="rt-value">
                    {getPersonnelName(currentApproval.director)}
                  </div>
                </div>
              )}
              {order.approvals && order.approvals.length > 0 && (
                <div className="mt-3">
                  <div className="rt-label mb-1">Approval chain</div>
                  <ul className="list-unstyled mb-0 rt-muted">
                    {order.approvals.map((approval) => (
                      <li key={approval.id} className="mb-1">
                        <span className="fw-semibold">
                          {approval.step_order === 1
                            ? "Recommending"
                            : "Approving"}
                          :
                        </span>{" "}
                        {getPersonnelName(approval.director)}{" "}
                        {approval.status && (
                          <span className="text-capitalize">
                            • {approval.status}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="card rt-card mb-3">
            <div className="rt-card-header">Your decision</div>
            <div className="card-body py-3">
              <div className="mb-3">
                <label className="form-label rt-label mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="Add remarks or reason for your decision..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ borderRadius: "0.5rem" }}
                />
                <div className="form-text rt-muted mt-1">
                  These remarks will be visible to the personnel and other
                  directors in the approval chain.
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 rt-actions">
                {isRecommendStep && (
                  <button
                    type="button"
                    className="btn btn-sm text-white"
                    style={{
                      backgroundColor: "var(--primary-color)",
                      borderColor: "var(--primary-color)",
                    }}
                    onClick={() => handleAction("recommend")}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "recommend" ? (
                      <span className="spinner-border spinner-border-sm me-1" />
                    ) : (
                      <FaThumbsUp className="me-1" />
                    )}
                    Recommend
                  </button>
                )}
                {isApproveStep && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={() => handleAction("approve")}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "approve" ? (
                      <span className="spinner-border spinner-border-sm me-1" />
                    ) : (
                      <FaCheck className="me-1" />
                    )}
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => handleAction("reject")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "reject" ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : (
                    <FaTimes className="me-1" />
                  )}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewTravelOrder;
