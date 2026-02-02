import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaFileAlt, FaArrowLeft, FaPaperclip, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_FORM = {
  travel_purpose: "",
  destination: "",
  start_date: "",
  end_date: "",
  objectives: "",
  per_diems_expenses: "",
  appropriation: "",
  remarks: "",
};

const ATTACHMENT_TYPES = [
  { value: "itinerary", label: "Proposed Itinerary" },
  { value: "memorandum", label: "Memorandum" },
  { value: "invitation", label: "Invitation / Notice of Meeting" },
  { value: "other", label: "Other" },
];

const TravelOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const isEdit = Boolean(id);

  useEffect(() => {
    if (user && user.role !== "personnel") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deleteAttachmentIds, setDeleteAttachmentIds] = useState([]);
  const [newFiles, setNewFiles] = useState([]); // { file, type }[]
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchOrder = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${id}`,
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
        navigate("/travel-orders");
        return;
      }
      setFormData({
        travel_purpose: order.travel_purpose ?? "",
        destination: order.destination ?? "",
        start_date: order.start_date ? order.start_date.slice(0, 10) : "",
        end_date: order.end_date ? order.end_date.slice(0, 10) : "",
        objectives: order.objectives ?? "",
        per_diems_expenses: order.per_diems_expenses != null ? String(order.per_diems_expenses) : "",
        appropriation: order.appropriation ?? "",
        remarks: order.remarks ?? "",
      });
      setExistingAttachments(order.attachments ?? []);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to load");
      navigate("/travel-orders");
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    if (isEdit) fetchOrder();
  }, [isEdit, fetchOrder]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.travel_purpose?.trim()) e.travel_purpose = "Travel purpose is required.";
    if (!formData.destination?.trim()) e.destination = "Destination is required.";
    if (!formData.start_date) e.start_date = "Start date is required.";
    if (!formData.end_date) e.end_date = "End date is required.";
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      e.end_date = "End date must be on or after start date.";
    }
    if (formData.per_diems_expenses !== "" && (isNaN(parseFloat(formData.per_diems_expenses)) || parseFloat(formData.per_diems_expenses) < 0)) {
      e.per_diems_expenses = "Enter a valid amount.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/gif", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const withType = files.map((file) => {
      if (file.size > maxSize) {
        toast.warning(`File "${file.name}" is too large (max 10 MB). Skipped.`);
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
    payload.append("start_date", formData.start_date);
    payload.append("end_date", formData.end_date);
    if (formData.objectives) payload.append("objectives", formData.objectives);
    if (formData.per_diems_expenses !== "") payload.append("per_diems_expenses", formData.per_diems_expenses);
    if (formData.appropriation) payload.append("appropriation", formData.appropriation);
    if (formData.remarks) payload.append("remarks", formData.remarks);

    if (isEdit) {
      payload.append("_method", "PUT");
      deleteAttachmentIds.forEach((aid) => payload.append("delete_attachment_ids[]", aid));
    }

    newFiles.forEach((item, index) => {
      payload.append("attachments[]", item.file);
      payload.append("attachment_types[]", item.type);
    });

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const url = isEdit
        ? `${API_BASE_URL}/personnel/travel-orders/${id}`
        : `${API_BASE_URL}/personnel/travel-orders`;
      const method = isEdit ? "POST" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: buildPayload(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || data?.errors || "Failed to save travel order";
      }
      toast.success(isEdit ? "Travel order updated." : "Travel order created.");
      navigate("/travel-orders");
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const btnBase = { transition: "all 0.2s ease-in-out", borderWidth: "2px", borderRadius: "4px" };
  const btnPrimary = { ...btnBase, backgroundColor: "var(--primary-color)", borderColor: "var(--primary-color)", color: "#fff" };
  const btnOutline = { ...btnBase, border: "2px solid var(--primary-color)", color: "var(--primary-color)", backgroundColor: "transparent" };

  if (loading && isEdit) {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading travel order..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 page-enter">
      <style>{`
        .travel-order-form-container .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .travel-order-form-container .btn-outline-hover:hover:not(:disabled) {
          background-color: var(--primary-color);
          color: white !important;
        }
      `}</style>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaFileAlt className="me-2" />
            {isEdit ? "Edit Travel Order" : "New Travel Order"}
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {isEdit ? "Update your draft travel order." : "Create a new travel order (draft)."}
          </p>
        </div>
        <Link
          to="/travel-orders"
          className="btn btn-sm btn-outline-hover"
          style={btnOutline}
        >
          <FaArrowLeft className="me-1" /> Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="travel-order-form-container">
        <div className="card shadow-sm mb-3" style={{ borderRadius: "0.375rem" }}>
          <div className="card-header py-2" style={{ backgroundColor: "var(--background-light)", color: "var(--text-primary)", fontWeight: 600 }}>
            Travel details
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Travel purpose <span className="text-danger">*</span></label>
                <input
                  type="text"
                  name="travel_purpose"
                  className={`form-control form-control-sm ${errors.travel_purpose ? "is-invalid" : ""}`}
                  placeholder="e.g. To attend Validation for the proposed Improvement..."
                  value={formData.travel_purpose}
                  onChange={handleChange}
                  maxLength={500}
                  style={{ borderRadius: "4px" }}
                />
                {errors.travel_purpose && <div className="invalid-feedback d-block">{errors.travel_purpose}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Destination <span className="text-danger">*</span></label>
                <input
                  type="text"
                  name="destination"
                  className={`form-control form-control-sm ${errors.destination ? "is-invalid" : ""}`}
                  placeholder="e.g. Lakewood, Zamboanga del Sur"
                  value={formData.destination}
                  onChange={handleChange}
                  maxLength={255}
                  style={{ borderRadius: "4px" }}
                />
                {errors.destination && <div className="invalid-feedback d-block">{errors.destination}</div>}
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Start date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  name="start_date"
                  className={`form-control form-control-sm ${errors.start_date ? "is-invalid" : ""}`}
                  value={formData.start_date}
                  onChange={handleChange}
                  style={{ borderRadius: "4px" }}
                />
                {errors.start_date && <div className="invalid-feedback d-block">{errors.start_date}</div>}
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>End date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  name="end_date"
                  className={`form-control form-control-sm ${errors.end_date ? "is-invalid" : ""}`}
                  value={formData.end_date}
                  onChange={handleChange}
                  style={{ borderRadius: "4px" }}
                />
                {errors.end_date && <div className="invalid-feedback d-block">{errors.end_date}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Objectives</label>
                <textarea
                  name="objectives"
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="To accomplish the objectives of the above-mentioned purpose."
                  value={formData.objectives}
                  onChange={handleChange}
                  style={{ borderRadius: "4px" }}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Per diems / expenses allowed</label>
                <input
                  type="number"
                  name="per_diems_expenses"
                  className={`form-control form-control-sm ${errors.per_diems_expenses ? "is-invalid" : ""}`}
                  placeholder="e.g. 800"
                  min={0}
                  step={0.01}
                  value={formData.per_diems_expenses}
                  onChange={handleChange}
                  style={{ borderRadius: "4px" }}
                />
                {errors.per_diems_expenses && <div className="invalid-feedback d-block">{errors.per_diems_expenses}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Appropriation</label>
                <input
                  type="text"
                  name="appropriation"
                  className="form-control form-control-sm"
                  placeholder="e.g. DA-MIADP"
                  value={formData.appropriation}
                  onChange={handleChange}
                  maxLength={255}
                  style={{ borderRadius: "4px" }}
                />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>Remarks / special instructions</label>
                <textarea
                  name="remarks"
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Optional"
                  value={formData.remarks}
                  onChange={handleChange}
                  style={{ borderRadius: "4px" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="card shadow-sm mb-3" style={{ borderRadius: "0.375rem" }}>
          <div className="card-header py-2 d-flex align-items-center justify-content-between" style={{ backgroundColor: "var(--background-light)", color: "var(--text-primary)", fontWeight: 600 }}>
            <span><FaPaperclip className="me-2" /> Attachments</span>
            <span className="small fw-normal text-muted">PDF, DOC, images; max 10 MB each</span>
          </div>
          <div className="card-body">
            {existingAttachments.length > 0 && (
              <div className="mb-3">
                <div className="small fw-semibold mb-2" style={{ color: "var(--text-primary)" }}>Current attachments</div>
                <ul className="list-group list-group-flush">
                  {existingAttachments.map((att) => {
                    const marked = deleteAttachmentIds.includes(att.id);
                    return (
                      <li key={att.id} className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0">
                        <button
                          type="button"
                          className={`btn btn-link btn-sm p-0 text-start ${marked ? "text-decoration-line-through text-muted" : ""}`}
                          onClick={() => downloadAttachment(att.id, att.file_name)}
                          disabled={marked}
                        >
                          {att.file_name}
                        </button>
                        {!marked ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => markAttachmentForDelete(att)}
                          >
                            <FaTrash /> Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => unmarkAttachmentForDelete(att.id)}
                          >
                            Undo
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div>
              <div className="small fw-semibold mb-2" style={{ color: "var(--text-primary)" }}>Add files</div>
              <input
                type="file"
                className="form-control form-control-sm mb-2"
                accept=".pdf,.doc,.docx,image/*"
                multiple
                onChange={handleAddFiles}
                style={{ borderRadius: "4px" }}
              />
              {newFiles.length > 0 && (
                <ul className="list-group list-group-flush">
                  {newFiles.map((item, index) => (
                    <li key={index} className="list-group-item d-flex align-items-center justify-content-between py-2 px-0 border-0">
                      <span className="small text-truncate me-2" style={{ maxWidth: "200px" }} title={item.file.name}>{item.file.name}</span>
                      <div className="d-flex align-items-center gap-2">
                        <select
                          className="form-select form-select-sm"
                          value={item.type}
                          onChange={(e) => setNewFileType(index, e.target.value)}
                          style={{ width: "auto", borderRadius: "4px" }}
                        >
                          {ATTACHMENT_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeNewFile(index)}>
                          <FaTrash />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 justify-content-end">
          <Link to="/travel-orders" className="btn btn-sm btn-outline-hover" style={btnOutline}>
            Cancel
          </Link>
          <button type="submit" className="btn btn-sm text-white" style={btnPrimary} disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
            {isEdit ? "Update draft" : "Save as draft"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TravelOrderForm;
