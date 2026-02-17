import React, { useState, useEffect, useCallback } from "react";
import { FaEye, FaPaperclip, FaDownload, FaUser, FaCalendarAlt, FaCheckCircle, FaFilePdf } from "react-icons/fa";
import { toast } from "react-toastify";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import { showAlert } from "../../../services/notificationService";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const ViewTravelOrderModal = ({ orderId, token, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [order, setOrder] = useState(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose?.(), 200);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const fetchOrder = useCallback(async () => {
    if (!orderId || !token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw data?.message || "Failed to load travel order";
      setOrder(data?.data ?? data);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to load");
      handleClose();
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const downloadAttachment = useCallback(
    async (attachmentId, fileName) => {
      if (!token) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/personnel/travel-order-attachments/${attachmentId}/download`,
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
    },
    [token]
  );

  const downloadPdf = useCallback(
    async ({ includeCtt }) => {
      if (!orderId || !token) return;
      setExporting(true);
      showAlert.loadingWithOverlay(includeCtt ? "Generating TO + CTT PDF..." : "Generating TO PDF...");
      try {
        const url = `${API_BASE_URL}/personnel/travel-orders/${orderId}/export/pdf${includeCtt ? "?include_ctt=1" : ""}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/pdf",
          },
        });
        if (!response.ok) {
          let message = "Failed to generate PDF";
          try {
            const data = await response.json();
            message = data?.message || message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }
        const blob = await response.blob();
        const fileName = includeCtt ? `TRAVEL_ORDER_${orderId}_CTT.pdf` : `TRAVEL_ORDER_${orderId}.pdf`;
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        a.remove();
        toast.success("PDF downloaded.");
      } catch (err) {
        toast.error(err?.message || "Failed to generate PDF");
      } finally {
        showAlert.close();
        setExporting(false);
      }
    },
    [orderId, token]
  );

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

  const formatDateTime = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  const getPersonnelName = (p) => {
    if (!p) return "—";
    const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : p.name || "—";
  };

  const getDirectorName = (d) => {
    if (!d) return "—";
    const parts = [d.first_name, d.middle_name, d.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : d.name || "—";
  };

  const getApprovalRoleLabel = (stepOrder) => {
    return stepOrder === 1 ? "Recommending director" : "Approving director";
  };

  const getStatusLabel = (status) => {
    const map = { pending: "Pending", recommended: "Recommended", approved: "Approved", rejected: "Rejected" };
    return map[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "—");
  };

  const getApprovalStatusPillClass = (status) => {
    switch (status) {
      case "pending":
        return "badge bg-warning-subtle text-warning-emphasis border border-warning-subtle";
      case "recommended":
        return "badge bg-info-subtle text-info-emphasis border border-info-subtle";
      case "approved":
        return "badge bg-success-subtle text-success-emphasis border border-success-subtle";
      case "rejected":
        return "badge bg-danger-subtle text-danger-emphasis border border-danger-subtle";
      default:
        return "badge bg-light text-dark";
    }
  };

  if (!orderId) return null;

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        tabIndex={-1}
        style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2060 }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`view-travel-order-modal modal-content shadow modal-content-animation ${isClosing ? "exit" : ""}`}
          >
            <div className="modal-header">
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                <FaEye />
                Travel Order Details
              </h5>
              <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
            </div>

            {loading ? (
              <div className="modal-body py-5">
                <LoadingSpinner text="Loading travel order..." />
              </div>
            ) : order ? (
              <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                {/* Status badge */}
                <div className="view-modal-status mb-3">
                  <span
                    className="badge px-2 py-1 fw-semibold"
                    style={{
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      ...(order.status === "draft"
                        ? { backgroundColor: "rgba(108, 117, 125, 0.15)", color: "#495057" }
                        : order.status === "pending"
                        ? { backgroundColor: "rgba(255, 179, 0, 0.15)", color: "#856404" }
                        : order.status === "approved"
                        ? { backgroundColor: "rgba(40, 167, 69, 0.15)", color: "#155724" }
                        : order.status === "rejected"
                        ? { backgroundColor: "rgba(220, 53, 69, 0.15)", color: "#721c24" }
                        : { backgroundColor: "rgba(108, 117, 125, 0.15)", color: "#495057" }),
                    }}
                  >
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "Draft"}
                  </span>
                </div>

                {/* Trip details */}
                <div className="view-modal-section">
                  <div className="view-modal-section-title">Trip details</div>
                  <div className="row g-2 small">
                    <div className="col-12">
                      <span className="text-muted">Travel purpose</span>
                      <p className="mb-0 fw-medium">{order.travel_purpose || "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Destination</span>
                      <p className="mb-0 fw-medium">{order.destination || "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Official station</span>
                      <p className="mb-0 fw-medium">{order.official_station || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Travel dates */}
                <div className="view-modal-section">
                  <div className="view-modal-section-title">Travel dates</div>
                  <div className="row g-2 small">
                    <div className="col-6 col-md-3">
                      <span className="text-muted">Start date</span>
                      <p className="mb-0 fw-medium">{formatDate(order.start_date)}</p>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted">End date</span>
                      <p className="mb-0 fw-medium">{formatDate(order.end_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Objectives & budget */}
                <div className="view-modal-section">
                  <div className="view-modal-section-title">Objectives & budget</div>
                  <div className="row g-2 small">
                    <div className="col-12">
                      <span className="text-muted">Objectives</span>
                      <p className="mb-0 fw-medium" style={{ whiteSpace: "pre-wrap" }}>{order.objectives || "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Per diems / expenses</span>
                      <p className="mb-0 fw-medium">{order.per_diems_expenses != null ? Number(order.per_diems_expenses).toLocaleString() : "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Per diems note (format)</span>
                      <p className="mb-0 fw-medium">{order.per_diems_note || "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Appropriation</span>
                      <p className="mb-0 fw-medium">{order.appropriation || "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Assistant / laborers allowed</span>
                      <p className="mb-0 fw-medium">{order.assistant_or_laborers_allowed || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {order.remarks && (
                  <div className="view-modal-section">
                    <div className="view-modal-section-title">Remarks</div>
                    <p className="mb-0 small fw-medium" style={{ whiteSpace: "pre-wrap" }}>{order.remarks}</p>
                  </div>
                )}

                {/* Submission info */}
                {(order.submitted_at || order.personnel) && (
                  <div className="view-modal-section">
                    <div className="view-modal-section-title d-flex align-items-center gap-2">
                      <FaUser className="opacity-75" />
                      Submission
                    </div>
                    <div className="row g-2 small">
                      <div className="col-12 col-md-6">
                        <span className="text-muted">Submitted by</span>
                        <p className="mb-0 fw-medium">{getPersonnelName(order.personnel)}</p>
                      </div>
                      <div className="col-12 col-md-6">
                        <span className="text-muted">Submitted at</span>
                        <p className="mb-0 fw-medium d-flex align-items-center gap-1">
                          <FaCalendarAlt className="opacity-75" />
                          {formatDateTime(order.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval chain */}
                {order.approvals && order.approvals.length > 0 && (
                  <div className="view-modal-section">
                    <div className="view-modal-section-title d-flex align-items-center gap-2">
                      <FaCheckCircle className="opacity-75" />
                      Approval chain
                    </div>
                    {order.status === "pending" && (
                      <div className="small text-muted mb-2">
                        Step 1 (Recommending) must be completed before Step 2 (Approving) can proceed.
                      </div>
                    )}
                    <div className="view-modal-approvals">
                      {order.approvals.map((approval) => (
                        <div key={approval.id} className="view-modal-approval-item small">
                          <div className="fw-semibold text-primary">{getApprovalRoleLabel(approval.step_order)}</div>
                          <div className="fw-medium">{getDirectorName(approval.director)}</div>
                          <div className="d-flex flex-wrap gap-2 mt-1">
                            <span className={getApprovalStatusPillClass(approval.status)}>{getStatusLabel(approval.status)}</span>
                            {approval.acted_at && (
                              <span className="text-muted">{formatDateTime(approval.acted_at)}</span>
                            )}
                          </div>
                          {approval.remarks && (
                            <p className="mb-0 mt-1 text-muted" style={{ fontSize: "0.8rem" }}>{approval.remarks}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments – all downloadable */}
                <div className="view-modal-section">
                  <div className="view-modal-section-title d-flex align-items-center gap-2">
                    <FaPaperclip className="opacity-75" />
                    Attachments
                  </div>
                  {order.attachments && order.attachments.length > 0 ? (
                    <ul className="list-group list-group-flush view-modal-attachments">
                      {order.attachments.map((att) => (
                        <li key={att.id} className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                          <span className="text-truncate flex-grow-1 me-2" title={att.file_name}>{att.file_name}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                            onClick={() => downloadAttachment(att.id, att.file_name)}
                            title="Download"
                          >
                            <FaDownload />
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-0 small text-muted">No attachments.</p>
                  )}
                </div>

                {/* Last updated */}
                {order.updated_at && (
                  <div className="view-modal-section pt-0">
                    <p className="mb-0 small text-muted">
                      Last updated: {formatDateTime(order.updated_at)}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="modal-footer d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary view-modal-export-btn"
                  onClick={() => downloadPdf({ includeCtt: false })}
                  disabled={exporting || loading}
                  title="Generate Travel Order PDF"
                >
                  <FaFilePdf className="me-2" />
                  Generate TO PDF
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary view-modal-export-btn"
                  onClick={() => downloadPdf({ includeCtt: true })}
                  disabled={exporting || loading}
                  title="Generate Travel Order + Certification to Travel PDF"
                >
                  <FaFilePdf className="me-2" />
                  Generate TO + CTT PDF
                </button>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={exporting}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ViewTravelOrderModal;
