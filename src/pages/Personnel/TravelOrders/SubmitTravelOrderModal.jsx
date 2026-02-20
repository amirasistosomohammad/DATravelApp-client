import React, { useState, useEffect, useCallback } from "react";
import { FaPaperPlane, FaSitemap } from "react-icons/fa";
import Portal from "../../../components/Portal";
import { showAlert } from "../../../services/notificationService";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const SubmitTravelOrderModal = ({ order, onClose, onSuccess, token }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [directors, setDirectors] = useState([]);
  const [loadingDirectors, setLoadingDirectors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recommendingDirectorId, setRecommendingDirectorId] = useState("");
  const [approvingDirectorId, setApprovingDirectorId] = useState("");
  const [error, setError] = useState("");

  const closeImmediately = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose?.(), 200);
  }, [onClose]);

  const isDirty =
    Boolean(recommendingDirectorId) || Boolean(approvingDirectorId);

  const handleClose = useCallback(() => {
    if (!isDirty) {
      closeImmediately();
      return;
    }
    showAlert
      .confirm(
        "Unsaved progress",
        "You have selected directors for this submission. If you close now, your selections will be cleared. Do you want to discard your changes?",
        "Discard changes",
        "Continue editing"
      )
      .then((result) => {
        if (result.isConfirmed) {
          closeImmediately();
        }
      });
  }, [isDirty, closeImmediately]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  useEffect(() => {
    if (!order || !token) return;
    setLoadingDirectors(true);
    fetch(`${API_BASE_URL}/personnel/directors`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data?.directors) {
          setDirectors(data.data.directors);
        }
      })
      .catch(() => setDirectors([]))
      .finally(() => setLoadingDirectors(false));
  }, [order, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!recommendingDirectorId) {
      setError("Please select a recommending director.");
      return;
    }
    if (!approvingDirectorId) {
      setError("Please select an approving director.");
      return;
    }
    setSubmitting(true);
    showAlert.loadingWithOverlay("Submitting travel order...");
    try {
      const body = {
        recommending_director_id: Number(recommendingDirectorId),
        approving_director_id: Number(approvingDirectorId),
      };
      const response = await fetch(
        `${API_BASE_URL}/personnel/travel-orders/${order.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || data?.errors || "Failed to submit";
      }
      onSuccess?.(data);
      closeImmediately();
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Failed to submit");
    } finally {
      showAlert.close();
      setSubmitting(false);
    }
  };

  const getDirectorName = (d) => {
    if (d.first_name && d.last_name) {
      const parts = [d.first_name];
      if (d.middle_name) parts.push(d.middle_name);
      parts.push(d.last_name);
      return parts.join(" ");
    }
    return d.name || d.username || `Director #${d.id}`;
  };

  if (!order) return null;

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        tabIndex={-1}
        style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2060 }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div
          className={`submit-travel-order-modal modal-content shadow modal-content-animation ${isClosing ? "exit" : ""}`}
          style={{ borderRadius: "0.375rem" }}
        >
          <div className="modal-header py-2" style={{ backgroundColor: "var(--background-light)", borderBottom: "1px solid var(--input-border)" }}>
            <h5 className="modal-title fw-bold" style={{ color: "var(--text-primary)" }}>
              <FaPaperPlane className="me-2" />
              Submit Travel Order
            </h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p className="small mb-3" style={{ color: "var(--text-muted)" }}>
                Submit &quot;{order.travel_purpose}&quot; for routing through your directors.
              </p>
              <div
                className="alert alert-info mb-3"
                role="note"
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(13,122,58,0.2)",
                  background:
                    "linear-gradient(135deg, rgba(13,122,58,0.04), rgba(13,122,58,0.09))",
                }}
              >
                <div className="d-flex">
                  <div
                    className="flex-shrink-0 me-2 d-flex align-items-start justify-content-center"
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "999px",
                      backgroundColor: "rgba(13,122,58,0.12)",
                      color: "var(--primary-color)",
                      marginTop: "2px",
                    }}
                  >
                    <FaSitemap style={{ fontSize: "0.9rem", marginTop: "0.25rem" }} />
                  </div>
                  <div className="small">
                    <div
                      className="text-uppercase fw-semibold mb-1"
                      style={{ letterSpacing: "0.06em", color: "var(--text-primary)" }}
                    >
                      Approval flow
                    </div>
                    <p className="mb-1" style={{ color: "var(--text-muted)" }}>
                      This travel order follows a two‑step electronic review.
                    </p>
                    <ol className="mb-0 ps-3">
                      <li>
                        <span className="fw-semibold">Step 1 – Recommending director</span>{" "}
                        reviews the request and may return it with comments.
                      </li>
                      <li>
                        <span className="fw-semibold">Step 2 – Approving director</span>{" "}
                        receives the travel order only after it has been recommended.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
              {loadingDirectors ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                  <span className="ms-2 small">Loading directors...</span>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>
                      Recommending director <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={recommendingDirectorId}
                      onChange={(e) => setRecommendingDirectorId(e.target.value)}
                      required
                      style={{ borderRadius: "4px" }}
                    >
                      <option value="">— Select —</option>
                      {directors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {getDirectorName(d)} {d.position ? `(${d.position})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" style={{ color: "var(--text-primary)" }}>
                      Approving director <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={approvingDirectorId}
                      onChange={(e) => setApprovingDirectorId(e.target.value)}
                      required
                      style={{ borderRadius: "4px" }}
                    >
                      <option value="">— Select —</option>
                      {directors.map((d) => (
                        <option key={d.id} value={d.id} disabled={recommendingDirectorId === String(d.id)}>
                          {getDirectorName(d)} {d.position ? `(${d.position})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {error && (
                    <div className="alert alert-danger py-2 small mb-0" role="alert">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer py-2" style={{ borderTop: "1px solid var(--input-border)" }}>
              <button type="button" className="btn btn-sm submit-modal-btn submit-modal-btn-cancel" style={{ border: "2px solid var(--primary-color)", color: "var(--primary-color)", backgroundColor: "transparent", borderRadius: "4px" }} onClick={handleClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm submit-modal-btn submit-modal-btn-submit text-white"
                style={{ backgroundColor: "var(--primary-color)", borderColor: "var(--primary-color)", borderRadius: "4px" }}
                disabled={submitting || loadingDirectors || directors.length === 0}
              >
                {submitting ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                Submit for approval
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default SubmitTravelOrderModal;
