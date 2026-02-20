import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { FaFileAlt, FaArrowLeft, FaPaperclip, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import { useUnsavedChanges } from "../../../contexts/UnsavedChangesContext";
import { showAlert } from "../../../services/notificationService";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

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

const TravelOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setBlocking } = useUnsavedChanges();
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
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const initialFormDataRef = useRef(null);

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
        },
      );
      const data = await response.json();
      if (!response.ok) throw data?.message || "Failed to load travel order";
      const order = data?.data ?? data;
      if (order.status !== "draft") {
        toast.error("Only draft travel orders can be edited.");
        navigate("/travel-orders");
        return;
      }
      const loaded = {
        travel_purpose: order.travel_purpose ?? "",
        destination: order.destination ?? "",
        official_station: order.official_station ?? "",
        start_date: order.start_date ? order.start_date.slice(0, 10) : "",
        end_date: order.end_date ? order.end_date.slice(0, 10) : "",
        objectives: order.objectives ?? "",
        per_diems_expenses:
          order.per_diems_expenses != null
            ? String(order.per_diems_expenses)
            : "",
        per_diems_note: order.per_diems_note ?? "",
        assistant_or_laborers_allowed:
          order.assistant_or_laborers_allowed ?? "",
        appropriation: order.appropriation ?? "",
        remarks: order.remarks ?? "",
      };
      initialFormDataRef.current = loaded;
      setFormData(loaded);
      setExistingAttachments(order.attachments ?? []);
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to load",
      );
      navigate("/travel-orders");
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    if (isEdit) fetchOrder();
  }, [isEdit, fetchOrder]);

  useEffect(() => {
    if (!isEdit) initialFormDataRef.current = { ...DEFAULT_FORM };
  }, [isEdit]);

  const formDataEquals = (a, b) => {
    if (!a || !b) return false;
    const keys = [
      "travel_purpose",
      "destination",
      "official_station",
      "start_date",
      "end_date",
      "objectives",
      "per_diems_expenses",
      "per_diems_note",
      "assistant_or_laborers_allowed",
      "appropriation",
      "remarks",
    ];
    return keys.every((k) => (a[k] ?? "") === (b[k] ?? ""));
  };

  const initial = isEdit ? initialFormDataRef.current : { ...DEFAULT_FORM };
  const isDirty =
    Boolean(initial) &&
    (!formDataEquals(formData, initial) ||
      newFiles.length > 0 ||
      (isEdit && deleteAttachmentIds.length > 0));

  useEffect(() => {
    setBlocking(location.pathname, isDirty);
    return () => setBlocking(null);
  }, [location.pathname, isDirty, setBlocking]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleLeaveClick = (e) => {
    if (!isDirty) return;
    e.preventDefault();
    showAlert
      .confirm(
        "Unsaved progress",
        "You have unsaved changes to this travel order. If you leave now, your progress will not be saved. Do you want to leave anyway?",
        "Leave",
        "Stay",
      )
      .then((result) => {
        if (result.isConfirmed) navigate("/travel-orders");
      });
  };

  const computeErrors = (data) => {
    const e = {};
    if (!data.travel_purpose?.trim())
      e.travel_purpose = "Travel purpose is required.";
    if (!data.destination?.trim()) e.destination = "Destination is required.";
    if (!data.start_date) e.start_date = "Start date is required.";
    if (!data.end_date) e.end_date = "End date is required.";
    // End date must be strictly after start date (not the same day)
    if (data.start_date && data.end_date && data.end_date <= data.start_date) {
      e.end_date = "End date must be after start date.";
    }
    // All fields required except remarks and attachments
    if (!data.objectives?.trim()) e.objectives = "Objectives are required.";
    if (data.per_diems_expenses === "") {
      e.per_diems_expenses = "Per diems / expenses amount is required.";
    } else if (
      isNaN(parseFloat(data.per_diems_expenses)) ||
      parseFloat(data.per_diems_expenses) < 0
    ) {
      e.per_diems_expenses = "Enter a valid amount for per diems / expenses.";
    }
    if (!data.appropriation?.trim())
      e.appropriation = "Appropriation is required.";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };
    setFormData(next);
    // Mark field as touched
    const nextTouched = { ...touched, [name]: true };
    setTouched(nextTouched);
    // Real-time validation: only show errors for touched fields (or all if submitted)
    const allErrors = computeErrors(next);
    const visibleErrors = submitted
      ? allErrors
      : Object.keys(allErrors).reduce((acc, key) => {
          // Show error if field is touched, or if it's a date-related error (start_date/end_date dependency)
          if (
            nextTouched[key] ||
            (key === "end_date" &&
              (nextTouched.start_date || nextTouched.end_date))
          ) {
            acc[key] = allErrors[key];
          }
          return acc;
        }, {});
    setErrors(visibleErrors);
  };

  const validate = () => {
    const e = computeErrors(formData);
    setSubmitted(true); // Mark form as submitted to show all errors
    setErrors(e);
    return { isValid: Object.keys(e).length === 0, errors: e };
  };

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 20 * 1024 * 1024; // 20 MB
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const withType = files
      .map((file) => {
        if (file.size > maxSize) {
          toast.warning(
            `File "${file.name}" is too large (max 20 MB). Skipped.`,
          );
          return null;
        }
        return { file, type: "other" };
      })
      .filter(Boolean);
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
        { headers: { Authorization: `Bearer ${token}` } },
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
    if (formData.official_station)
      payload.append("official_station", formData.official_station.trim());
    payload.append("start_date", formData.start_date);
    payload.append("end_date", formData.end_date);
    if (formData.objectives) payload.append("objectives", formData.objectives);
    if (formData.per_diems_expenses !== "")
      payload.append("per_diems_expenses", formData.per_diems_expenses);
    if (formData.per_diems_note)
      payload.append("per_diems_note", formData.per_diems_note.trim());
    if (formData.assistant_or_laborers_allowed)
      payload.append(
        "assistant_or_laborers_allowed",
        formData.assistant_or_laborers_allowed.trim(),
      );
    if (formData.appropriation)
      payload.append("appropriation", formData.appropriation);
    if (formData.remarks) payload.append("remarks", formData.remarks);

    if (isEdit) {
      payload.append("_method", "PUT");
      deleteAttachmentIds.forEach((aid) =>
        payload.append("delete_attachment_ids[]", aid),
      );
    }

    newFiles.forEach((item, index) => {
      payload.append("attachments[]", item.file);
      payload.append("attachment_types[]", item.type);
    });

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    if (!validation.isValid) {
      // Show modal with simple, readable validation messages
      const errorMessages = Object.values(validation.errors).filter(Boolean);
      if (errorMessages.length > 0) {
        const errorList = errorMessages.map((msg) => `• ${msg}`).join("\n");
        await showAlert.error("Cannot save draft", errorList);
      }
      return;
    }
    setSaving(true);
    // Global loading modal while saving draft
    showAlert.loadingWithOverlay(
      isEdit ? "Updating travel order..." : "Saving travel order...",
    );
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
      const msg =
        typeof err === "string" ? err : err?.message || "Failed to save";
      toast.error(msg);
    } finally {
      showAlert.close();
      setSaving(false);
    }
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
    color: "#fff",
  };
  const btnOutline = {
    ...btnBase,
    border: "2px solid var(--primary-color)",
    color: "var(--primary-color)",
    backgroundColor: "transparent",
  };

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
        /* Smooth hover for buttons in this form */
        .travel-order-form-container .btn,
        .travel-order-back-btn,
        .travel-order-cancel-btn {
          transition: all 0.2s ease-in-out;
        }
        .travel-order-form-container .btn:hover:not(:disabled),
        .travel-order-back-btn:hover,
        .travel-order-cancel-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        /* Primary outline buttons inside the form (e.g. main outline actions) */
        .travel-order-form-container
          .btn-outline-hover:hover:not(:disabled):not(.travel-order-cancel-btn) {
          background-color: var(--primary-color);
          color: #ffffff !important;
        }
        /* Header \"Back to list\" button: keep primary text on light hover background for better contrast */
        .travel-order-back-btn {
          color: var(--primary-color);
          border-color: var(--primary-color);
          background-color: transparent;
        }
        .travel-order-back-btn:hover {
          background-color: rgba(13, 122, 58, 0.06);
          color: var(--primary-color) !important;
        }
        /* Footer Cancel button: subtle hover (same style as back button) */
        .travel-order-cancel-btn {
          color: var(--primary-color);
          border-color: var(--primary-color);
          background-color: transparent;
        }
        .travel-order-cancel-btn:hover {
          background-color: rgba(13, 122, 58, 0.06);
          color: var(--primary-color) !important;
        }
        /* New Travel Order layout */
        .travel-order-shell {
          animation: pageEnter 0.35s ease-out;
        }
        .travel-order-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          margin-bottom: 1rem;
        }
        .travel-order-header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .travel-order-header-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          color: var(--primary-color);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .travel-order-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-color);
          background-color: rgba(13,122,58,0.08);
        }
        @media (max-width: 575.98px) {
          .travel-order-header {
            padding: 0.85rem 0.9rem;
          }
        }
      `}</style>

      <div className="row justify-content-center travel-order-shell">
        <div className="col-12">
          {/* Page header / hero */}
          <div className="travel-order-header mb-3 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
            <div>
              <div className="travel-order-header-title mb-1">
                <div className="travel-order-header-icon">
                  <FaFileAlt />
                </div>
                <div>
                  <h1
                    className="h5 mb-0 fw-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isEdit ? "Edit Travel Order" : "New Travel Order"}
                  </h1>
                  <p
                    className="mb-0 small"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {isEdit
                      ? "Review and polish your travel order before submission."
                      : "Create a draft travel order. You can submit it for approval later."}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <span className="travel-order-chip me-2">Draft only</span>
                <span className="small text-muted">
                  Step 1 of 2 &mdash; Travel details
                </span>
              </div>
            </div>
            <div className="d-flex align-items-center mt-2 mt-md-0">
              <Link
                to="/travel-orders"
                className="btn btn-sm btn-outline-hover travel-order-back-btn"
                style={btnOutline}
                onClick={handleLeaveClick}
              >
                <FaArrowLeft className="me-1" /> Back to list
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="travel-order-form-container">
            <div
              className="card shadow-sm mb-3"
              style={{ borderRadius: "0.375rem" }}
            >
              <div
                className="card-header py-2 d-flex flex-wrap align-items-center justify-content-between gap-1"
                style={{
                  backgroundColor: "var(--background-light)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                <span>Travel details</span>
                <span className="small text-muted">
                  Required fields are marked with{" "}
                  <span className="text-danger">*</span>
                </span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Travel purpose <span className="text-danger">*</span>
                    </label>
                    <textarea
                      name="travel_purpose"
                      className={`form-control form-control-sm ${errors.travel_purpose ? "is-invalid" : ""}`}
                      placeholder="Describe the official purpose of this travel, including meetings, trainings, or activities to be attended."
                      value={formData.travel_purpose}
                      onChange={handleChange}
                      maxLength={500}
                      rows={4}
                      style={{ borderRadius: "4px", resize: "vertical" }}
                    />
                    {errors.travel_purpose && (
                      <div className="invalid-feedback d-block">
                        {errors.travel_purpose}
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-6">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Destination <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="destination"
                      className={`form-control form-control-sm ${errors.destination ? "is-invalid" : ""}`}
                      placeholder="City / municipality and province (e.g., Lakewood, Zamboanga del Sur)"
                      value={formData.destination}
                      onChange={handleChange}
                      maxLength={255}
                      style={{ borderRadius: "4px" }}
                    />
                    {errors.destination && (
                      <div className="invalid-feedback d-block">
                        {errors.destination}
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-6">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Official station
                    </label>
                    <input
                      type="text"
                      name="official_station"
                      className="form-control form-control-sm"
                      placeholder="Office or station (e.g., IPIL, Zamboanga Sibugay)"
                      value={formData.official_station}
                      onChange={handleChange}
                      maxLength={255}
                      style={{ borderRadius: "4px" }}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Start date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      className={`form-control form-control-sm ${errors.start_date ? "is-invalid" : ""}`}
                      value={formData.start_date}
                      onChange={handleChange}
                      style={{ borderRadius: "4px" }}
                    />
                    {errors.start_date && (
                      <div className="invalid-feedback d-block">
                        {errors.start_date}
                      </div>
                    )}
                  </div>
                  <div className="col-6 col-md-3">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      End date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      className={`form-control form-control-sm ${errors.end_date ? "is-invalid" : ""}`}
                      value={formData.end_date}
                      onChange={handleChange}
                      min={formData.start_date || undefined}
                      style={{ borderRadius: "4px" }}
                    />
                    {errors.end_date && (
                      <div className="invalid-feedback d-block">
                        {errors.end_date}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Objectives <span className="text-danger">*</span>
                    </label>
                    <textarea
                      name="objectives"
                      className={`form-control form-control-sm ${errors.objectives ? "is-invalid" : ""}`}
                      rows={3}
                      placeholder="List the specific objectives or expected outputs of the travel."
                      value={formData.objectives}
                      onChange={handleChange}
                      style={{ borderRadius: "4px" }}
                    />
                    {errors.objectives && (
                      <div className="invalid-feedback d-block">
                        {errors.objectives}
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-4">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Per diems / expenses allowed{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      name="per_diems_expenses"
                      className={`form-control form-control-sm ${errors.per_diems_expenses ? "is-invalid" : ""}`}
                      placeholder="Total amount to be charged (e.g., 800.00)"
                      min={0}
                      step={0.01}
                      value={formData.per_diems_expenses}
                      onChange={handleChange}
                      style={{ borderRadius: "4px" }}
                    />
                    {errors.per_diems_expenses && (
                      <div className="invalid-feedback d-block">
                        {errors.per_diems_expenses}
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-4">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Per diems note (format)
                    </label>
                    <input
                      type="text"
                      name="per_diems_note"
                      className="form-control form-control-sm"
                      placeholder="Format or basis (e.g., 800.00 per day)"
                      value={formData.per_diems_note}
                      onChange={handleChange}
                      maxLength={255}
                      style={{ borderRadius: "4px" }}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Appropriation <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="appropriation"
                      className={`form-control form-control-sm ${errors.appropriation ? "is-invalid" : ""}`}
                      placeholder="Funding source / chargeable account (e.g., DA-MIADP)"
                      value={formData.appropriation}
                      onChange={handleChange}
                      maxLength={255}
                      style={{ borderRadius: "4px" }}
                    />
                    {errors.appropriation && (
                      <div className="invalid-feedback d-block">
                        {errors.appropriation}
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-4">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Assistant or laborers allowed
                    </label>
                    <input
                      type="text"
                      name="assistant_or_laborers_allowed"
                      className="form-control form-control-sm"
                      placeholder='Indicate personnel allowed to assist, or "None" if not applicable.'
                      value={formData.assistant_or_laborers_allowed}
                      onChange={handleChange}
                      maxLength={255}
                      style={{ borderRadius: "4px" }}
                    />
                  </div>
                  <div className="col-12">
                    <label
                      className="form-label small fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Remarks / special instructions
                    </label>
                    <textarea
                      name="remarks"
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Additional instructions or important notes, if any."
                      value={formData.remarks}
                      onChange={handleChange}
                      style={{ borderRadius: "4px" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visual divider between main form and attachments */}
            <div
              className="my-3"
              style={{
                borderTop: "1px dashed var(--border-color)",
                opacity: 0.7,
              }}
            ></div>

            {/* Attachments */}
            <div
              className="card shadow-sm mb-3"
              style={{ borderRadius: "0.375rem" }}
            >
              <div
                className="card-header py-2"
                style={{
                  backgroundColor: "var(--background-light)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-1">
                  <div>
                    <span>
                      <FaPaperclip className="me-2" /> Attachments
                    </span>
                    <div className="small text-muted">
                      Upload supporting documents for this travel order.
                    </div>
                  </div>
                  <div className="text-md-end">
                    <div className="small fw-normal text-muted text-wrap">
                      PDF, DOC, images; max 20 MB each
                    </div>
                    <span className="badge rounded-pill bg-light text-muted mt-1">
                      Step 2 of 2 &mdash; Attachments
                    </span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {existingAttachments.length > 0 && (
                  <div className="mb-3">
                    <div
                      className="small fw-semibold mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Current attachments
                    </div>
                    <ul className="list-group list-group-flush">
                      {existingAttachments.map((att) => {
                        const marked = deleteAttachmentIds.includes(att.id);
                        return (
                          <li
                            key={att.id}
                            className="list-group-item d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-md-between gap-2 py-2 px-0 border-0"
                          >
                            <button
                              type="button"
                              className={`btn btn-link btn-sm p-0 text-start w-100 w-md-auto ${marked ? "text-decoration-line-through text-muted" : ""}`}
                              onClick={() =>
                                downloadAttachment(att.id, att.file_name)
                              }
                              disabled={marked}
                            >
                              {att.file_name}
                            </button>
                            <div className="d-flex justify-content-start justify-content-md-end">
                              {!marked ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                                  onClick={() => markAttachmentForDelete(att)}
                                  style={{
                                    borderRadius: "0.375rem",
                                    boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                                    transition:
                                      "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                                  }}
                                >
                                  <FaTrash />
                                  <span>Remove</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() =>
                                    unmarkAttachmentForDelete(att.id)
                                  }
                                  style={{
                                    borderRadius: "0.375rem",
                                    boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                                    transition:
                                      "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                                  }}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div>
                  <div
                    className="small fw-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Add files
                  </div>
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
                        <li
                          key={index}
                          className="list-group-item d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-md-between gap-2 py-2 px-0 border-0"
                        >
                          <span
                            className="small text-truncate w-100 w-md-auto me-md-2"
                            style={{ maxWidth: "260px" }}
                            title={item.file.name}
                          >
                            {item.file.name}
                          </span>
                          <div className="d-flex flex-row justify-content-start justify-content-md-end align-items-center gap-2 mt-1 mt-md-0">
                            <select
                              className="form-select form-select-sm"
                              value={item.type}
                              onChange={(e) =>
                                setNewFileType(index, e.target.value)
                              }
                              style={{ width: "auto", borderRadius: "4px" }}
                            >
                              {ATTACHMENT_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                              onClick={() => removeNewFile(index)}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
                                transition:
                                  "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                              }}
                            >
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
              <Link
                to="/travel-orders"
                className="btn btn-sm btn-outline-hover travel-order-cancel-btn"
                style={btnOutline}
                onClick={handleLeaveClick}
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-sm text-white"
                style={btnPrimary}
                disabled={saving}
              >
                {saving ? (
                  <span className="spinner-border spinner-border-sm me-1" />
                ) : null}
                {isEdit ? "Update draft" : "Save as draft"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TravelOrderForm;
