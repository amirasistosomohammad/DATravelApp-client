import React, { useState, useEffect, useCallback } from "react";
import { FaEye, FaPaperclip, FaDownload, FaUser, FaCalendarAlt, FaCheckCircle, FaFilePdf, FaFileExcel, FaUserPlus, FaTrash, FaEdit, FaTimes, FaBan } from "react-icons/fa";
import { toast } from "react-toastify";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import { showAlert } from "../../../services/notificationService";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const ViewTravelOrderModal = ({ orderId, token, onClose, apiPrefix = "personnel", peerViewBasePath, currentUserPersonnelId, onEditClick }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [order, setOrder] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalClosing, setInviteModalClosing] = useState(false);
  const [personnelForInvite, setPersonnelForInvite] = useState([]);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [loadingInviteList, setLoadingInviteList] = useState(false);
  const [invitingPersonnelId, setInvitingPersonnelId] = useState(null);
  const [removingEditorId, setRemovingEditorId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchUrl = peerViewBasePath
    ? `${API_BASE_URL}/${peerViewBasePath}/${orderId}`
    : `${API_BASE_URL}/${apiPrefix}/travel-orders/${orderId}`;

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
      const response = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) throw data?.message || "Failed to load travel order";
      setOrder(data?.data ?? data);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to load");
      handleClose();
    } finally {
      setLoading(false);
    }
  }, [orderId, token, fetchUrl, handleClose]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const downloadAttachment = useCallback(
    async (attachmentId, fileName) => {
      if (!token) return;
      const url = peerViewBasePath
        ? `${API_BASE_URL}/${peerViewBasePath}/attachments/${attachmentId}/download`
        : `${API_BASE_URL}/${apiPrefix}/travel-order-attachments/${attachmentId}/download`;
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName || "attachment";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        a.remove();
      } catch {
        toast.error("Failed to download file.");
      }
    },
    [token, apiPrefix, peerViewBasePath]
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
      case "cancelled":
        return "badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
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

  const isPersonnelOwnView = apiPrefix === "personnel" && !peerViewBasePath;
  const isCreator = order && currentUserPersonnelId != null && Number(order.personnel_id) === Number(currentUserPersonnelId);
  const canEdit = order && order.status === "draft" && currentUserPersonnelId != null && (
    Number(order.personnel_id) === Number(currentUserPersonnelId) ||
    (order.editors && order.editors.some((e) => Number(e.personnel_id) === Number(currentUserPersonnelId)))
  );
  const canCancel = order && ["pending", "recommended", "approved"].includes(order.status) && currentUserPersonnelId != null && (
    Number(order.personnel_id) === Number(currentUserPersonnelId) ||
    (order.editors && order.editors.some((e) => Number(e.personnel_id) === Number(currentUserPersonnelId)))
  );
  const canManageEditors = isPersonnelOwnView && isCreator;

  const handleCancel = useCallback(async () => {
    if (!orderId || !token || !cancelRemarks.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${orderId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ cancellation_remarks: cancelRemarks.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw data?.message || "Cancel failed";
      toast.success(data?.message || "Travel order cancelled.");
      setCancelModalOpen(false);
      setCancelRemarks("");
      fetchOrder(); // Refresh to show cancelled status
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }, [orderId, token, cancelRemarks, fetchOrder]);

  const openInviteModal = useCallback(async () => {
    if (!orderId || !token) return;
    setInviteModalClosing(false);
    setInviteSearchTerm("");
    setInviteModalOpen(true);
    setLoadingInviteList(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${orderId}/editors/list-personnel`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      const data = await res.json();
      if (!res.ok) throw data?.message || "Failed to load";
      setPersonnelForInvite(data?.data?.personnel ?? []);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to load personnel");
      setInviteModalOpen(false);
    } finally {
      setLoadingInviteList(false);
    }
  }, [orderId, token]);

  const closeInviteModal = useCallback(() => {
    setInviteModalClosing(true);
    setTimeout(() => {
      setInviteModalOpen(false);
      setInviteModalClosing(false);
      setInviteSearchTerm("");
    }, 220);
  }, []);

  const inviteFilteredList = (() => {
    if (!inviteSearchTerm.trim()) return personnelForInvite;
    const q = inviteSearchTerm.trim().toLowerCase();
    return personnelForInvite.filter((p) => {
      const name = getPersonnelName(p).toLowerCase();
      const position = (p.position || "").toLowerCase();
      const dept = (p.department || "").toLowerCase();
      return name.includes(q) || position.includes(q) || dept.includes(q);
    });
  })();

  const inviteEditor = useCallback(async (personnelId) => {
    if (!orderId || !token) return;
    setInvitingPersonnelId(personnelId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${orderId}/editors`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ personnel_id: personnelId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw data?.message || "Invite failed";
      toast.success(data?.message || "Editor invited.");
      closeInviteModal();
      setPersonnelForInvite((prev) => prev.filter((p) => p.id !== personnelId));
      setOrder((prev) => {
        if (!prev) return prev;
        const newEditor = data?.data;
        return { ...prev, editors: [...(prev.editors || []), newEditor] };
      });
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Invite failed");
    } finally {
      setInvitingPersonnelId(null);
    }
  }, [orderId, token, closeInviteModal]);

  const removeEditor = useCallback(async (editorPersonnelId) => {
    if (!orderId || !token) return;
    setRemovingEditorId(editorPersonnelId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${orderId}/editors/${editorPersonnelId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      const data = await res.json();
      if (!res.ok) throw data?.message || "Remove failed";
      toast.success(data?.message || "Editor removed.");
      setOrder((prev) => {
        if (!prev || !prev.editors) return prev;
        return { ...prev, editors: prev.editors.filter((e) => Number(e.personnel_id) !== Number(editorPersonnelId)) };
      });
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Remove failed");
    } finally {
      setRemovingEditorId(null);
    }
  }, [orderId, token]);

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
                        : order.status === "cancelled"
                        ? { backgroundColor: "rgba(108, 117, 125, 0.18)", color: "#495057" }
                        : { backgroundColor: "rgba(148, 163, 184, 0.16)", color: "#0f172a" }),
                    }}
                  >
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "Draft"}
                  </span>
                  <span className="small text-muted">
                    Travel order ID {order.id} • Created {formatDateTime(order.created_at)}
                  </span>
                </div>

                {/* Name on TO (person the TO is for) — from form */}
                <div className="view-modal-section">
                  <div className="view-modal-section-title d-flex align-items-center gap-2">
                    <FaUser className="opacity-75" />
                    Name on travel order
                  </div>
                  <div className="row g-2 small">
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Name</span>
                      <p className="mb-0 fw-medium">{order.to_name || getPersonnelName(order.personnel) || "—"}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Position / Designation</span>
                      <p className="mb-0 fw-medium">{order.to_position || order.personnel?.position || "—"}</p>
                    </div>
                  </div>
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

                {/* Submission info — who created the TO (for transparency) */}
                {(order.submitted_at || order.personnel) && (
                  <div className="view-modal-section">
                    <div className="view-modal-section-title d-flex align-items-center gap-2">
                      <FaUser className="opacity-75" />
                      Submission
                    </div>
                    <div className="row g-2 small">
                      <div className="col-12 col-md-6">
                        <span className="text-muted">Created by</span>
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

                {/* Cancellation details — when TO is cancelled */}
                {order.status === "cancelled" && (order.cancellation_remarks || order.cancelled_at) && (
                  <div className="view-modal-section">
                    <div className="view-modal-section-title d-flex align-items-center gap-2">
                      <FaBan className="opacity-75" />
                      Cancellation
                    </div>
                    <div className="row g-2 small">
                      {order.cancellation_remarks && (
                        <div className="col-12">
                          <span className="text-muted">Reason for cancellation</span>
                          <p className="mb-0 fw-medium" style={{ whiteSpace: "pre-wrap" }}>{order.cancellation_remarks}</p>
                        </div>
                      )}
                      {order.cancelled_at && (
                        <div className="col-12 col-md-6">
                          <span className="text-muted">Cancelled at</span>
                          <p className="mb-0 fw-medium d-flex align-items-center gap-1">
                            <FaCalendarAlt className="opacity-75" />
                            {formatDateTime(order.cancelled_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Editors — only for creator when viewing own TO via personnel API */}
                {canManageEditors && (
                  <div className="view-modal-section">
                    <div className="view-modal-section-title d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <span className="d-flex align-items-center gap-2">
                        <FaUserPlus className="opacity-75" />
                        Editors
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                        onClick={openInviteModal}
                        style={{ borderRadius: "0.375rem", paddingInline: "0.75rem" }}
                      >
                        <FaUserPlus />
                        Invite editor
                      </button>
                    </div>
                    <p className="small text-muted mb-2">
                      Invited editors can edit this travel order while it is still a draft.
                    </p>
                    {order.editors && order.editors.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {order.editors.map((e) => (
                          <li
                            key={e.id}
                            className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0"
                            style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
                          >
                            <div>
                              <span className="fw-medium">{getPersonnelName(e.personnel)}</span>
                              {e.personnel?.position && (
                                <span className="small text-muted ms-1">— {e.personnel.position}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger text-white"
                              onClick={() => removeEditor(e.personnel_id)}
                              disabled={removingEditorId !== null}
                              title="Remove editor"
                              style={{ borderRadius: "0.375rem", paddingLeft: "0.5rem", paddingRight: "0.5rem" }}
                            >
                              {removingEditorId === e.personnel_id ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : (
                                <FaTrash className="opacity-90" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-0 small text-muted">No editors invited yet.</p>
                    )}
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
                {canEdit && typeof onEditClick === "function" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                    onClick={() => { onEditClick(orderId); handleClose(); }}
                    style={{
                      borderRadius: "0.375rem",
                      paddingInline: "1.1rem",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                    }}
                    title="Edit travel order"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    className="btn btn-sm btn-warning d-flex align-items-center gap-2"
                    onClick={() => setCancelModalOpen(true)}
                    style={{
                      borderRadius: "0.375rem",
                      paddingInline: "1.1rem",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                    }}
                    title="Cancel travel order"
                  >
                    <FaBan />
                    <span>Cancel</span>
                  </button>
                )}
                {!peerViewBasePath && (
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
                )}
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

      {/* Invite editor modal – portal, constrained height, smooth animation */}
      {inviteModalOpen && (
        <Portal>
          <div
            className={`modal fade show d-block ${inviteModalClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
            tabIndex={-1}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              zIndex: 2070,
              paddingLeft: "1rem",
              paddingRight: "1rem",
              boxSizing: "border-box",
            }}
            onClick={closeInviteModal}
          >
            <div
              className="modal-dialog modal-dialog-centered invite-editor-modal-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "420px", margin: "1rem auto", width: "100%" }}
            >
              <div
                className={`modal-content shadow modal-content-animation ${inviteModalClosing ? "exit" : ""}`}
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(13,122,58,0.12)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className="modal-header py-2 px-3 px-md-3"
                  style={{
                    borderBottom: "1px solid rgba(13,122,58,0.12)",
                    background: "var(--background-light, #f8fafc)",
                    borderRadius: "0.75rem 0.75rem 0 0",
                    flexShrink: 0,
                  }}
                >
                  <h6 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0" style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{ width: "1.75rem", height: "1.75rem", backgroundColor: "rgba(13,122,58,0.12)", color: "var(--primary-color)" }}
                    >
                      <FaUserPlus />
                    </span>
                    Invite editor
                  </h6>
                  <button type="button" className="btn-close" onClick={closeInviteModal} aria-label="Close" />
                </div>
                <div
                  className="modal-body p-0 d-flex flex-column"
                  style={{ flex: "1 1 auto", minHeight: 0, height: "332px" }}
                >
                  {loadingInviteList ? (
                    <div className="d-flex align-items-center justify-content-center flex-grow-1">
                      <LoadingSpinner text="Loading personnel..." />
                    </div>
                  ) : personnelForInvite.length === 0 ? (
                    <div className="d-flex align-items-center justify-content-center flex-grow-1 px-4">
                      <p className="mb-0 small text-muted">No other personnel available to invite.</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-3 pt-3 pb-2" style={{ flexShrink: 0, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                        <div
                          className="input-group input-group-sm"
                          style={{
                            border: "1px solid var(--bs-border-color, rgba(0,0,0,0.2))",
                            borderRadius: "0.5rem",
                            overflow: "hidden",
                            backgroundColor: "var(--bs-body-bg, #fff)",
                          }}
                        >
                          <input
                            type="text"
                            className="form-control form-control-sm border-0"
                            placeholder="Search by name, position, or department"
                            value={inviteSearchTerm}
                            onChange={(e) => setInviteSearchTerm(e.target.value)}
                            style={{ fontSize: "0.8125rem" }}
                          />
                          {inviteSearchTerm.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-light border-0 border-start d-flex align-items-center justify-content-center"
                              onClick={() => setInviteSearchTerm("")}
                              aria-label="Clear search"
                              style={{
                                paddingLeft: "0.5rem",
                                paddingRight: "0.5rem",
                                borderLeft: "1px solid var(--bs-border-color, rgba(0,0,0,0.2)) !important",
                              }}
                            >
                              <FaTimes className="small text-muted" style={{ fontSize: "0.7rem" }} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-auto px-0" style={{ height: "280px", flexShrink: 0 }}>
                        {inviteFilteredList.length === 0 ? (
                          <p className="small text-muted px-3 py-3 mb-0">No matches.</p>
                        ) : (
                          <ul className="list-group list-group-flush">
                            {inviteFilteredList.map((p) => (
                              <li
                                key={p.id}
                                className="list-group-item d-flex align-items-center justify-content-between gap-2 py-2 px-3 border-0"
                                style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}
                              >
                                <div className="small text-truncate flex-grow-1 min-w-0">
                                  <span className="fw-medium d-block text-truncate">{getPersonnelName(p)}</span>
                                  {p.position && (
                                    <span className="text-muted d-block text-truncate" style={{ fontSize: "0.75rem" }}>{p.position}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary flex-shrink-0"
                                  onClick={() => inviteEditor(p.id)}
                                  disabled={invitingPersonnelId !== null}
                                  style={{
                                    borderRadius: "0.375rem",
                                    paddingLeft: "0.65rem",
                                    paddingRight: "0.65rem",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {invitingPersonnelId === p.id ? <span className="spinner-border spinner-border-sm" /> : "Invite"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Cancel travel order modal */}
      {cancelModalOpen && (
        <Portal>
          <div
            className="modal fade show d-block modal-backdrop-animation"
            tabIndex={-1}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              zIndex: 2070,
              paddingLeft: "1rem",
              paddingRight: "1rem",
              boxSizing: "border-box",
            }}
            onClick={() => setCancelModalOpen(false)}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "420px", margin: "1rem auto", width: "100%" }}
            >
              <div
                className="modal-content shadow modal-content-animation"
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(13,122,58,0.12)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  className="modal-header py-2 px-3 px-md-3"
                  style={{
                    borderBottom: "1px solid rgba(13,122,58,0.12)",
                    background: "var(--background-light, #f8fafc)",
                    borderRadius: "0.75rem 0.75rem 0 0",
                  }}
                >
                  <h6 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0" style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{ width: "1.75rem", height: "1.75rem", backgroundColor: "rgba(250, 204, 21, 0.18)", color: "#92400e" }}
                    >
                      <FaBan />
                    </span>
                    Cancel travel order
                  </h6>
                  <button type="button" className="btn-close" onClick={() => setCancelModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body py-3 px-3 px-md-3">
                  <p className="small text-muted mb-3">
                    This action will cancel the travel order. Please provide a reason for cancellation.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold mb-1">Reason for cancellation <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={4}
                      placeholder="Enter reason for cancellation..."
                      value={cancelRemarks}
                      onChange={(e) => setCancelRemarks(e.target.value)}
                      style={{ borderRadius: "0.5rem", fontSize: "0.8125rem" }}
                      maxLength={1000}
                    />
                    <div className="form-text small text-muted mt-1">
                      {cancelRemarks.length}/1000 characters
                    </div>
                  </div>
                </div>
                <div
                  className="modal-footer py-2 px-3 px-md-3"
                  style={{
                    borderTop: "1px solid rgba(13,122,58,0.12)",
                    background: "var(--background-light, #f8fafc)",
                    borderRadius: "0 0 0.75rem 0.75rem",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => { setCancelModalOpen(false); setCancelRemarks(""); }}
                    disabled={cancelling}
                    style={{ borderRadius: "0.375rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning text-white"
                    onClick={handleCancel}
                    disabled={cancelling || !cancelRemarks.trim()}
                    style={{ borderRadius: "0.375rem" }}
                  >
                    {cancelling ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <FaBan className="me-1" />
                        Confirm cancellation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Portal>
  );
};

export default ViewTravelOrderModal;
