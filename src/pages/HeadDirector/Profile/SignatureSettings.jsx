import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import { showAlert } from "../../../services/notificationService";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const SignatureSettings = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [file, setFile] = useState(null);

  const fetchSignature = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/directors/profile/signature`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to load signature";
      }
      setSignatureUrl(data?.data?.signature_url || null);
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to load signature"
      );
      setSignatureUrl(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === "director") {
      fetchSignature();
    } else {
      setLoading(false);
    }
  }, [user?.role, fetchSignature]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      toast.warning("Signature file is too large (max 2 MB).");
      return;
    }
    setFile(selected);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.warning("Please choose a signature image first.");
      return;
    }
    if (!token) return;
    setSaving(true);
    showAlert.loadingWithOverlay("Uploading signature...");
    try {
      const form = new FormData();
      form.append("signature", file);
      const response = await fetch(
        `${API_BASE_URL}/directors/profile/signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to upload signature";
      }
      setSignatureUrl(data?.data?.signature_url || null);
      setFile(null);
      toast.success("Signature updated.");
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to upload signature"
      );
    } finally {
      showAlert.close();
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!token) return;
    const result = await showAlert.confirm(
      "Remove signature",
      "Are you sure you want to remove your saved signature?",
      "Yes, remove",
      "Cancel"
    );
    if (!result?.isConfirmed) return;

    setRemoving(true);
    showAlert.loadingWithOverlay("Removing signature...");
    try {
      const form = new FormData();
      form.append("remove_signature", "1");
      const response = await fetch(
        `${API_BASE_URL}/directors/profile/signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw data?.message || "Failed to remove signature";
      }
      setSignatureUrl(null);
      setFile(null);
      toast.success("Signature removed.");
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to remove signature"
      );
    } finally {
      showAlert.close();
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-3">
        <LoadingSpinner text="Loading signature settings..." />
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="fw-bold mb-2">Digital signature</h5>
              <p className="text-muted small mb-3">
                Upload your handwritten signature image. It will appear in the
                RECOMMENDING / APPROVED boxes when you act on travel orders.
                For best results, use a transparent PNG on a white background.
              </p>

              <div className="mb-4">
                <h6 className="small text-uppercase text-muted fw-semibold mb-2">
                  Current signature
                </h6>
                <div
                  className="border rounded d-flex align-items-center justify-content-center bg-light"
                  style={{ minHeight: "100px" }}
                >
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Current signature"
                      style={{ maxHeight: "80px", maxWidth: "260px" }}
                    />
                  ) : (
                    <span className="text-muted small">
                      No signature uploaded.
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    Upload new signature
                  </label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <div className="form-text small">
                    PNG or JPG, max 2 MB. Transparent background recommended.
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 justify-content-between">
                  <div>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={saving || !file}
                    >
                      {saving ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : null}
                      Save signature
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={removing || !signatureUrl}
                    >
                      {removing ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : null}
                      <span onClick={handleRemove}>Remove signature</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureSettings;

