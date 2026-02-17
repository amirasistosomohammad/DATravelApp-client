import React, { useState, useEffect, useCallback } from "react";
import { FaEdit, FaPaperclip, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import { showAlert } from "../../../services/notificationService";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_FORM = {
  travel_purpose: "",
  destination: "",
  official_station: "",
  start_date: "",
  end_date: "",
  objectives: "",
  per_diems_expenses: "",
  per_diems_note: "",
  assistant_or_laborers_allowed: "",
  appropriation: "",
  remarks: "",
};

const ATTACHMENT_TYPES = [
  { value: "itinerary", label: "Proposed Itinerary" },
  { value: "memorandum", label: "Memorandum" },
  { value: "invitation", label: "Invitation / Notice of Meeting" },
  { value: "other", label: "Other" },
];

const EditTravelOrderModal = ({ orderId, token, onClose, onSuccess }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deleteAttachmentIds, setDeleteAttachmentIds] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [errors, setErrors] = useState({});

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
      const order = data?.data ?? data;
      if (order.status !== "draft") {
        toast.error("Only draft travel orders can be edited.");
        handleClose();
        return;
      }
      setFormData({
        travel_purpose: order.travel_purpose ?? "",
        destination: order.destination ?? "",
        official_station: order.official_station ?? "",
        start_date: order.start_date ? order.start_date.slice(0, 10) : "",
        end_date: order.end_date ? order.end_date.slice(0, 10) : "",
        objectives: order.objectives ?? "",
        per_diems_expenses: order.per_diems_expenses != null ? String(order.per_diems_expenses) : "",
        per_diems_note: order.per_diems_note ?? "",
        assistant_or_laborers_allowed: order.assistant_or_laborers_allowed ?? "",
        appropriation: order.appropriation ?? "",
        remarks: order.remarks ?? "",
      });
      setExistingAttachments(order.attachments ?? []);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to load");
      handleClose();
    } finally {
      setLoading(false);
    }
  }, [orderId, token, onClose]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const computeErrors = (data) => {
    const e = {};
    if (!data.travel_purpose?.trim()) e.travel_purpose = "Travel purpose is required.";
    if (!data.destination?.trim()) e.destination = "Destination is required.";
    if (!data.start_date) e.start_date = "Start date is required.";
    if (!data.end_date) e.end_date = "End date is required.";
    if (data.start_date && data.end_date && data.end_date <= data.start_date) {
      e.end_date = "End date must be after start date.";
    }
    if (!data.objectives?.trim()) e.objectives = "Objectives are required.";
    if (data.per_diems_expenses === "") {
      e.per_diems_expenses = "Per diems / expenses amount is required.";
    } else if (
      isNaN(parseFloat(data.per_diems_expenses)) ||
      parseFloat(data.per_diems_expenses) < 0
    ) {
      e.per_diems_expenses = "Enter a valid amount for per diems / expenses.";
    }
    if (!data.appropriation?.trim()) e.appropriation = "Appropriation is required.";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const e = computeErrors(formData);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 20 * 1024 * 1024; // 20 MB
    const withType = files.map((file) => {
      if (file.size > maxSize) {
        toast.warning(`File "${file.name}" is too large (max 20 MB). Skipped.`);
        return null;
      }
      return { file, type: "other" };
    }).filter(Boolean);
    setNewFiles((prev) => [...prev, ...withType]);
    e.target.value = "";
  };

  const setNewFileType = (index, type) => {
    setNewFiles((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], type };
      return next;
    });
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const markAttachmentForDelete = (att) => {
    setDeleteAttachmentIds((prev) => [...prev, att.id]);
  };

  const unmarkAttachmentForDelete = (attId) => {
    setDeleteAttachmentIds((prev) => prev.filter((id) => id !== attId));
  };

  const downloadAttachment = async (attachmentId, fileName) => {
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
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append("travel_purpose", formData.travel_purpose.trim());
    payload.append("destination", formData.destination.trim());
    if (formData.official_station) payload.append("official_station", formData.official_station.trim());
    payload.append("start_date", formData.start_date);
    payload.append("end_date", formData.end_date);
    if (formData.objectives) payload.append("objectives", formData.objectives);
    if (formData.per_diems_expenses !== "") payload.append("per_diems_expenses", formData.per_diems_expenses);
    if (formData.per_diems_note) payload.append("per_diems_note", formData.per_diems_note.trim());
    if (formData.assistant_or_laborers_allowed) payload.append("assistant_or_laborers_allowed", formData.assistant_or_laborers_allowed.trim());
    if (formData.appropriation) payload.append("appropriation", formData.appropriation);
    if (formData.remarks) payload.append("remarks", formData.remarks);
    payload.append("_method", "PUT");
    deleteAttachmentIds.forEach((aid) => payload.append("delete_attachment_ids[]", aid));
    newFiles.forEach((item) => {
      payload.append("attachments[]", item.file);
      payload.append("attachment_types[]", item.type);
    });
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      const errorMessages = Object.values(errors).filter(Boolean);
      if (errorMessages.length > 0) {
        const errorList = errorMessages.map((msg) => `• ${msg}`).join("\n");
        await showAlert.error("Cannot save draft", errorList);
      }
      return;
    }
    setSaving(true);
    showAlert.loadingWithOverlay("Updating travel order...");
    try {
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${orderId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: buildPayload(),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || data?.errors || "Failed to save travel order";
      }
      toast.success("Travel order updated.");
      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to save";
      toast.error(msg);
    } finally {
      showAlert.close();
      setSaving(false);
    }
  };

  if (!orderId) return null;

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${
          isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"
        }`}
        tabIndex={-1}
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 2060,
        }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`edit-travel-order-modal modal-content shadow modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
          >
            <div className="modal-header">
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                <FaEdit />
                Edit Travel Order
              </h5>
              <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
            </div>

            {loading ? (
              <div className="modal-body py-5">
                <LoadingSpinner text="Loading travel order..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  {/* Trip details */}
                  <div className="form-section">
                    <div className="form-section-title">Trip details</div>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Travel purpose <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          name="travel_purpose"
                          className={`form-control ${errors.travel_purpose ? "is-invalid" : ""}`}
                          placeholder="e.g. To attend conference..."
                          value={formData.travel_purpose}
                          onChange={handleChange}
                          maxLength={500}
                        />
                        {errors.travel_purpose && <div className="invalid-feedback d-block">{errors.travel_purpose}</div>}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Destination <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          name="destination"
                          className={`form-control ${errors.destination ? "is-invalid" : ""}`}
                          placeholder="City or location"
                          value={formData.destination}
                          onChange={handleChange}
                          maxLength={255}
                        />
                        {errors.destination && <div className="invalid-feedback d-block">{errors.destination}</div>}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Official station</label>
                        <input
                          type="text"
                          name="official_station"
                          className="form-control"
                          placeholder="e.g. IPIL, ZAMBOANGA SIBUGAY"
                          value={formData.official_station}
                          onChange={handleChange}
                          maxLength={255}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Travel dates */}
                  <div className="form-section">
                    <div className="form-section-title">Travel dates</div>
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <label className="form-label">Start date <span className="text-danger">*</span></label>
                        <input
                          type="date"
                          name="start_date"
                          className={`form-control ${errors.start_date ? "is-invalid" : ""}`}
                          value={formData.start_date}
                          onChange={handleChange}
                        />
                        {errors.start_date && <div className="invalid-feedback d-block">{errors.start_date}</div>}
                      </div>
                      <div className="col-6 col-md-3">
                        <label className="form-label">End date <span className="text-danger">*</span></label>
                        <input
                          type="date"
                          name="end_date"
                          className={`form-control ${errors.end_date ? "is-invalid" : ""}`}
                          value={formData.end_date}
                          onChange={handleChange}
                          min={formData.start_date || undefined}
                        />
                        {errors.end_date && <div className="invalid-feedback d-block">{errors.end_date}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Objectives & budget */}
                  <div className="form-section">
                    <div className="form-section-title">Objectives & budget</div>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Objectives <span className="text-danger">*</span></label>
                        <textarea
                          name="objectives"
                          className={`form-control ${errors.objectives ? "is-invalid" : ""}`}
                          rows={2}
                          placeholder="Brief objectives for this travel"
                          value={formData.objectives}
                          onChange={handleChange}
                        />
                        {errors.objectives && <div className="invalid-feedback d-block">{errors.objectives}</div>}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Per diems / expenses <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          name="per_diems_expenses"
                          className={`form-control ${errors.per_diems_expenses ? "is-invalid" : ""}`}
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={formData.per_diems_expenses}
                          onChange={handleChange}
                        />
                        {errors.per_diems_expenses && <div className="invalid-feedback d-block">{errors.per_diems_expenses}</div>}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Per diems note (format)</label>
                        <input
                          type="text"
                          name="per_diems_note"
                          className="form-control"
                          placeholder="e.g. 800/diem"
                          value={formData.per_diems_note}
                          onChange={handleChange}
                          maxLength={255}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Appropriation <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          name="appropriation"
                          className={`form-control ${errors.appropriation ? "is-invalid" : ""}`}
                          placeholder="e.g. Budget code"
                          value={formData.appropriation}
                          onChange={handleChange}
                          maxLength={255}
                        />
                        {errors.appropriation && <div className="invalid-feedback d-block">{errors.appropriation}</div>}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Assistant or laborers allowed</label>
                        <input
                          type="text"
                          name="assistant_or_laborers_allowed"
                          className="form-control"
                          placeholder="e.g. N/A"
                          value={formData.assistant_or_laborers_allowed}
                          onChange={handleChange}
                          maxLength={255}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="form-section">
                    <div className="form-section-title">Remarks</div>
                    <textarea
                      name="remarks"
                      className="form-control"
                      rows={2}
                      placeholder="Optional notes"
                      value={formData.remarks}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Attachments */}
                  <div className="form-section">
                    <div className="form-section-title d-flex align-items-center gap-2">
                      <FaPaperclip className="opacity-75" />
                      Attachments
                    </div>
                    <div className="attachments-block">
                      {existingAttachments.length > 0 && (
                        <ul className="list-group list-group-flush small mb-3">
                          {existingAttachments.map((att) => {
                            const marked = deleteAttachmentIds.includes(att.id);
                            return (
                              <li key={att.id} className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0">
                                <button
                                  type="button"
                                  className={`btn btn-link btn-sm p-0 text-start text-decoration-none ${marked ? "text-decoration-line-through text-muted" : ""}`}
                                  onClick={() => downloadAttachment(att.id, att.file_name)}
                                  disabled={marked}
                                >
                                  {att.file_name}
                                </button>
                                {!marked ? (
                                  <button type="button" className="btn btn-sm btn-outline-danger rounded-pill py-0 px-2" onClick={() => markAttachmentForDelete(att)}>
                                    <FaTrash className="small" />
                                  </button>
                                ) : (
                                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2" onClick={() => unmarkAttachmentForDelete(att.id)}>
                                    Undo
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <input
                        type="file"
                        className="form-control"
                        accept=".pdf,.doc,.docx,image/*"
                        multiple
                        onChange={handleAddFiles}
                      />
                      {newFiles.length > 0 && (
                        <ul className="list-group list-group-flush small mt-3">
                          {newFiles.map((item, index) => (
                            <li key={index} className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0">
                              <span className="text-truncate" style={{ maxWidth: "180px" }} title={item.file.name}>{item.file.name}</span>
                              <div className="d-flex align-items-center gap-2">
                                <select
                                  className="form-select form-select-sm"
                                  value={item.type}
                                  onChange={(e) => setNewFileType(index, e.target.value)}
                                  style={{ width: "auto", minWidth: "120px" }}
                                >
                                  {ATTACHMENT_TYPES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                <button type="button" className="btn btn-sm btn-outline-danger rounded-pill py-0 px-2" onClick={() => removeNewFile(index)}>
                                  <FaTrash className="small" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary-submit"
                    disabled={saving}
                  >
                    {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    Update draft
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default EditTravelOrderModal;
