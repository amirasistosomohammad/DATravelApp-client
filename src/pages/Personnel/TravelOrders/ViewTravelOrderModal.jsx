import React, { useState, useEffect, useCallback } from "react";
import { FaEye, FaPaperclip, FaDownload, FaUser, FaCalendarAlt, FaCheckCircle, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { toast } from "react-toastify";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import { showAlert } from "../../../services/notificationService";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const ViewTravelOrderModal = ({ orderId, token, onClose, apiPrefix = "personnel" }) => {
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
        `${API_BASE_URL}/${apiPrefix}/travel-orders/${orderId}`,
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
  }, [orderId, token, apiPrefix, handleClose]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const downloadAttachment = useCallback(
    async (attachmentId, fileName) => {
      if (!token) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/${apiPrefix}/travel-order-attachments/${attachmentId}/download`,
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
    [token, apiPrefix]
  );

  const downloadPdf = useCallback(
    async ({ includeCtt }) => {
      if (!orderId || !token) return;
      setExporting(true);
      showAlert.loadingWithOverlay(includeCtt ? "Generating TO + CTT PDF..." : "Generating TO PDF...");
      try {
        const url = `${API_BASE_URL}/${apiPrefix}/travel-orders/${orderId}/export/pdf${includeCtt ? "?include_ctt=1" : ""}`;
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
    [orderId, token, apiPrefix]
  );

  const downloadExcel = useCallback(
    async () => {
      if (!orderId || !token) return;
      setExporting(true);
      showAlert.loadingWithOverlay("Generating Excel Travel Order...");
      try {
        const url = `${API_BASE_URL}/${apiPrefix}/travel-orders/${orderId}/export/excel`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        });
        if (!response.ok) {
          let message = "Failed to generate Excel file";
          try {
            const data = await response.json();
            message = data?.message || message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition");
        let fileName = `TRAVEL_ORDER_${orderId}.xlsx`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1].replace(/['"]/g, "");
          }
        }
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        a.remove();
        toast.success("Excel file downloaded.");
      } catch (err) {
        toast.error(err?.message || "Failed to generate Excel file");
      } finally {
        showAlert.close();
        setExporting(false);
      }
    },
    [orderId, token, apiPrefix]
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

  const getAttachmentTypeLabel = (type) => {
    const map = {
      itinerary: "Proposed Itinerary",
      memorandum: "Memorandum",
      invitation: "Invitation / Notice of Meeting",
      other: "Other",
    };
    return map[type] || "Other";
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
          className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "880px" }}
        >
          <div
            className={`view-travel-order-modal modal-content shadow modal-content-animation ${isClosing ? "exit" : ""}`}
            style={{ borderRadius: "0.75rem", border: "1px solid var(--input-border, rgba(15,23,42,0.08))" }}
          >
            <div
              className="modal-header py-2 px-3 px-md-4"
              style={{
                backgroundColor: "var(--background-light, #f8fafc)",
                borderBottom: "1px solid var(--input-border, rgba(15,23,42,0.08))",
              }}
            >
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "1.85rem",
                    height: "1.85rem",
                    backgroundColor: "rgba(13,122,58,0.12)",
                    color: "var(--primary-color)",
                    fontSize: "0.9rem",
                  }}
                >
                  <FaEye />
                </span>
                <span>Travel Order details</span>
              </h5>
              <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
            </div>

            {loading ? (
              <div className="modal-body py-5 px-3 px-md-4">
                <LoadingSpinner text="Loading travel order..." />
              </div>
            ) : order ? (
              <div className="modal-body px-3 px-md-4" style={{ backgroundColor: "var(--bs-body-bg, #fff)" }}>
                {/* Status badge */}
                <div className="view-modal-status mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span
                    className="badge px-3 py-1 fw-semibold text-uppercase"
                    style={{
                      fontSize: "0.7rem",
                      letterSpacing: "0.08em",
                      borderRadius: "999px",
                      ...(order.status === "draft"
                        ? { backgroundColor: "rgba(148, 163, 184, 0.16)", color: "#0f172a" }
                        : order.status === "pending"
                        ? { backgroundColor: "rgba(250, 204, 21, 0.16)", color: "#92400e" }
                        : order.status === "approved"
                        ? { backgroundColor: "rgba(34, 197, 94, 0.18)", color: "#14532d" }
                        : order.status === "rejected"
                        ? { backgroundColor: "rgba(248, 113, 113, 0.16)", color: "#7f1d1d" }
                        : { backgroundColor: "rgba(148, 163, 184, 0.16)", color: "#0f172a" }),
                    }}
                  >
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "Draft"}
                  </span>
                  <span className="small text-muted">
                    Travel order ID {order.id} • Created {formatDateTime(order.created_at)}
                  </span>
                </div>

                {/* Trip details */}
                <div className="view-modal-section">
                  <div className="view-modal-section-title">Trip details</div>
                  <div className="row g-2 small">
                    <div className="col-12">
                      <span className="text-muted">Travel purpose</span>
                      <p className="mb-0 fw-medium" style={{ whiteSpace: "pre-line" }}>{order.travel_purpose || "—"}</p>
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
                        <li key={att.id} className="list-group-item d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2 py-2 px-0 border-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                          <div className="d-flex align-items-center flex-wrap gap-2 flex-grow-1 me-2">
                            <span className="text-truncate" style={{ maxWidth: "520px" }} title={att.file_name}>{att.file_name}</span>
                            <span className="badge bg-light text-dark border" style={{ fontWeight: 600, borderRadius: "999px" }}>
                              {getAttachmentTypeLabel(att.type || "other")}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                            onClick={() => downloadAttachment(att.id, att.file_name)}
                            title="Download attachment"
                            style={{
                              borderRadius: "0.375rem",
                              boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                              paddingInline: "0.85rem",
                              transition: "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                            }}
                          >
                            <FaDownload />
                            <span>Download</span>
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

            <div
              className="modal-footer d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 px-md-4"
              style={{
                borderTop: "1px solid var(--input-border, rgba(15,23,42,0.08))",
                backgroundColor: "var(--background-light, #f8fafc)",
              }}
            >
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                  onClick={downloadExcel}
                  disabled={exporting || loading}
                  style={{
                    borderRadius: "0.375rem",
                    paddingInline: "1.1rem",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                    transition: "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                  }}
                  title="Export travel order to Excel"
                >
                  <FaFileExcel />
                  <span>Export travel order (Excel)</span>
                </button>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary d-flex align-items-center gap-2"
                onClick={handleClose}
                disabled={exporting}
                style={{
                  borderRadius: "0.375rem",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                  paddingInline: "1.1rem",
                  transition: "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                }}
              >
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
