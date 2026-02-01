import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../contexts/AuthContext";
import { useBranding } from "../../../contexts/BrandingContext";
import { toast } from "react-toastify";
import { showAlert } from "../../../services/notificationService";
import {
  FaKey,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCog,
  FaImage,
  FaShieldAlt,
  FaWrench,
  FaArrowRight,
} from "react-icons/fa";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const SystemSettings = () => {
  const navigate = useNavigate();
  const { user, token, checkAuth } = useAuth();
  const { refetchBranding } = useBranding();

  useEffect(() => {
    if (user && user.role !== "ict_admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);
  const [activeTab, setActiveTab] = useState("password");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingData, setBrandingData] = useState(null);
  const [brandingText, setBrandingText] = useState("DATravelApp");
  const [brandingLogoFile, setBrandingLogoFile] = useState(null);
  const [brandingLogoPreview, setBrandingLogoPreview] = useState(null);
  const brandingLoadedRef = useRef(false);

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[a-zA-Z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    };
    setPasswordValidation(validation);
    return validation.minLength && validation.hasLetter && validation.hasNumber;
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "new_password") {
      validatePassword(value);
    }
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (name === "new_password_confirmation" && formErrors.new_password_confirmation) {
      setFormErrors((prev) => ({ ...prev, new_password_confirmation: [] }));
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.current_password) {
      errors.current_password = ["Current password is required."];
    }
    if (!passwordForm.new_password) {
      errors.new_password = ["New password is required."];
    } else if (
      !passwordValidation.minLength ||
      !passwordValidation.hasLetter ||
      !passwordValidation.hasNumber
    ) {
      errors.new_password = ["Please meet all password requirements above."];
    }
    if (!passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = ["Please confirm your new password."];
    } else if (
      passwordForm.new_password !== passwordForm.new_password_confirmation
    ) {
      errors.new_password_confirmation = ["Passwords do not match."];
    }
    return errors;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please check the form for errors.");
      return;
    }

    const result = await showAlert.confirm(
      "Change Password",
      "Are you sure you want to change your password?",
      "Yes, Change Password",
      "Cancel"
    );
    if (!result.isConfirmed) return;

    showAlert.loadingWithOverlay("Changing Password...");
    setIsPasswordLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ict-admin/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
          new_password_confirmation: passwordForm.new_password_confirmation,
        }),
      });

      const data = await response.json().catch(() => ({}));
      showAlert.close();

      if (response.ok) {
        toast.success("Password changed successfully!");
        setPasswordForm({
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        });
        setFormErrors({});
        setPasswordValidation({ minLength: false, hasLetter: false, hasNumber: false });
        await checkAuth();
      } else {
        if (data?.errors) {
          setFormErrors(data.errors);
          const msg = Object.values(data.errors).flat().join("\n");
          toast.error(msg);
        } else {
          toast.error(data?.message || "An error occurred.");
        }
      }
    } catch (error) {
      showAlert.close();
      toast.error("Unable to connect to server. Please try again.");
      console.error("Password change error:", error);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormErrors({});
  };

  const fetchBranding = async () => {
    if (!token) return;
    setBrandingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ict-admin/branding`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.branding) {
        setBrandingData(data.branding);
        setBrandingText(data.branding.logo_text || "DATravelApp");
        setBrandingLogoPreview(data.branding.logo_url || null);
      } else {
        toast.error(data?.message || "Failed to load branding settings.");
      }
    } catch (e) {
      console.error("Branding fetch error:", e);
      toast.error("Network error while loading branding settings.");
    } finally {
      setBrandingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "branding") return;
    if (brandingLoadedRef.current) return;
    brandingLoadedRef.current = true;
    fetchBranding();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (
        brandingLogoPreview &&
        typeof brandingLogoPreview === "string" &&
        brandingLogoPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(brandingLogoPreview);
      }
    };
  }, [brandingLogoPreview]);

  if (user && user.role !== "ict_admin") {
    return null;
  }

  return (
    <div className="container-fluid admin-dashboard-container system-settings-container page-enter" style={{ padding: "1rem 0.4rem 3rem 0.4rem" }}>
      <style>{`
        .system-settings-container .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .system-settings-container.page-enter {
          animation: pageEnter 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .system-settings-container .fadeIn {
          animation: contentFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .system-settings-container .tab-transition-enter {
          animation: tabEnter 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes tabEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .system-settings-container .settings-card-left {
          animation: contentFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.08s forwards;
          opacity: 0;
        }
        .system-settings-container .settings-card-right {
          animation: contentFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.12s forwards;
          opacity: 0;
        }
        .system-settings-container .settings-content-body {
          min-height: 420px;
        }
        .system-settings-container .settings-menu-title { font-size: 0.9375rem; color: var(--text-primary); }
        .system-settings-container .settings-nav-btn {
          text-align: left; padding: 0.5rem 0.75rem; border-radius: 8px; transition: all 0.3s ease;
          border: 1px solid #dee2e6; background: #f8f9fa; color: #495057; font-weight: 500;
        }
        .system-settings-container .settings-nav-btn:hover {
          background: #e9ecef; color: #495057; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .system-settings-container .settings-nav-btn.active {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
          border: none; color: #fff; font-weight: 600;
        }
        .system-settings-container .settings-nav-btn.active:hover {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
          color: #fff; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .system-settings-container .settings-nav-icon { font-size: 1rem; flex-shrink: 0; }
        .system-settings-container .settings-nav-label { font-size: 0.9375rem; font-weight: 600; }
        .system-settings-container .settings-nav-btn:not(.active) .settings-nav-label { font-weight: 500; }
        .system-settings-container .settings-nav-desc { font-size: 0.8125rem; opacity: 0.75; margin-top: 0.125rem; }
        .system-settings-container .settings-card-title { font-size: 1rem; color: var(--text-primary); }
        .system-settings-container .settings-card-desc { font-size: 0.875rem; color: var(--text-muted); }
        .system-settings-container .input-group-text.bg-light { background: var(--background-light) !important; border-color: var(--input-border); }
        .system-settings-container .settings-header-gear { color: #ffffff !important; }
        .system-settings-container .settings-header-gear svg { fill: currentColor !important; stroke: none !important; }
        .system-settings-container .settings-password-validation-wrap {
          min-height: 5.5rem;
        }
        .system-settings-container .settings-confirm-error-wrap {
          min-height: 1.5rem;
        }
      `}</style>

      {/* Page Header - centered, matching reference (gear in circle + two subtitle lines) */}
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center gap-3 flex-wrap justify-content-center">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
              border: "2px solid var(--primary-color)",
              color: "#ffffff",
            }}
          >
            <FaCog className="settings-header-gear" size={26} />
          </div>
          <div className="text-center">
            <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
              Administrator Settings
            </h1>
            <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
              {user?.name || user?.username || "System Administrator"} • ICT Administrator
            </p>
            <p className="mb-0 small mt-0" style={{ color: "var(--text-muted)" }}>
              System maintenance and security settings
            </p>
          </div>
        </div>
      </div>

      {/* Two distinct white cards side-by-side - exact reference layout */}
      <div className="row g-3">
        {/* Left card - Settings Menu */}
        <div className="col-12 col-md-4 col-lg-3">
          <div
            className="card h-100 settings-card-left"
            style={{
              border: "1px solid var(--border-color)",
              boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
              borderRadius: "12px",
            }}
          >
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-semibold settings-menu-title">Settings Menu</h5>
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className={`btn w-100 settings-nav-btn d-flex align-items-center gap-2 ${activeTab === "password" ? "active" : ""}`}
                  onClick={() => handleTabChange("password")}
                >
                  <FaKey className="settings-nav-icon" />
                  <div className="settings-nav-text text-start">
                    <div className="settings-nav-label">Change Password</div>
                    <div className="settings-nav-desc">Update administrator password</div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`btn w-100 settings-nav-btn d-flex align-items-center gap-2 ${activeTab === "branding" ? "active" : ""}`}
                  onClick={() => handleTabChange("branding")}
                >
                  <FaImage className="settings-nav-icon" />
                  <div className="settings-nav-text text-start">
                    <div className="settings-nav-label">Branding</div>
                    <div className="settings-nav-desc">Update logo and brand name</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right card - Main content */}
        <div className="col-12 col-md-8 col-lg-9 text-start">
          <div
            className="card settings-card-right"
            style={{
              border: "1px solid var(--border-color)",
              boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
              borderRadius: "12px",
            }}
          >
            <div className="card-body p-4 settings-content-body">
              {activeTab === "password" && (
                <div className="tab-transition-enter">
                  <h5 className="mb-3 fw-semibold settings-card-title d-flex align-items-center gap-2">
                    <FaShieldAlt style={{ color: "var(--primary-color)" }} />
                    Change Administrator Password
                  </h5>
                  {/* Administrator Note - yellow banner like reference */}
                  <div
                    className="rounded p-3 mb-4"
                    style={{ background: "#fff3cd", border: "1px solid #ffecb5" }}
                  >
                    <span className="fw-bold">Administrator Note:</span> As a system administrator, you can only change your password. Personal information modifications are restricted for security reasons.
                  </div>
                  <form onSubmit={handlePasswordChange} className="text-start">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                        Current Password <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <FaLock style={{ color: "var(--text-muted)" }} />
                        </span>
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="current_password"
                          className="form-control border-start-0"
                          placeholder="Enter current password"
                          value={passwordForm.current_password}
                          onChange={handlePasswordInputChange}
                          disabled={isPasswordLoading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          disabled={isPasswordLoading}
                        >
                          {showCurrentPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                      {formErrors.current_password && (
                        <div className="text-danger small mt-1">{formErrors.current_password[0]}</div>
                      )}
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                          New Password <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative settings-password-validation-wrap">
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                              <FaLock style={{ color: "var(--text-muted)" }} />
                            </span>
                            <input
                              type={showNewPassword ? "text" : "password"}
                              name="new_password"
                              className={`form-control border-start-0 ${
                                passwordForm.new_password &&
                                passwordValidation.minLength &&
                                passwordValidation.hasLetter &&
                                passwordValidation.hasNumber
                                  ? "is-valid"
                                  : passwordForm.new_password &&
                                    !(
                                      passwordValidation.minLength &&
                                      passwordValidation.hasLetter &&
                                      passwordValidation.hasNumber
                                    )
                                  ? "is-invalid"
                                  : ""
                              }`}
                              placeholder="Enter new password"
                              value={passwordForm.new_password}
                              onChange={handlePasswordInputChange}
                              disabled={isPasswordLoading}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              disabled={isPasswordLoading}
                            >
                              {showNewPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                            </button>
                          </div>
                          <AnimatePresence>
                            {passwordForm.new_password && (
                              <motion.div
                                key="new-password-validation"
                                initial={{ opacity: 0, y: -10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -10, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                style={{ marginTop: "0.5rem", fontSize: "0.85rem", overflow: "hidden" }}
                              >
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
                                  style={{
                                    color: passwordValidation.minLength ? "#28a745" : "#dc3545",
                                    marginBottom: "0.25rem",
                                    transition: "color 0.3s ease",
                                  }}
                                >
                                  8 characters minimum
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
                                  style={{
                                    color: passwordValidation.hasLetter ? "#28a745" : "#dc3545",
                                    marginBottom: "0.25rem",
                                    transition: "color 0.3s ease",
                                  }}
                                >
                                  At least one letter
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.25, delay: 0.15, ease: "easeOut" }}
                                  style={{
                                    color: passwordValidation.hasNumber ? "#28a745" : "#dc3545",
                                    transition: "color 0.3s ease",
                                  }}
                                >
                                  At least one number
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {formErrors.new_password && (
                            <div className="text-danger small mt-1">{formErrors.new_password[0]}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                          Confirm New Password <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span
                            className={`input-group-text bg-light border-end-0 ${
                              passwordForm.new_password_confirmation &&
                              passwordForm.new_password !== passwordForm.new_password_confirmation
                                ? "border-danger"
                                : ""
                            }`}
                          >
                            <FaLock style={{ color: "var(--text-muted)" }} />
                          </span>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="new_password_confirmation"
                            className={`form-control border-start-0 ${
                              passwordForm.new_password_confirmation &&
                              passwordForm.new_password === passwordForm.new_password_confirmation
                                ? "is-valid"
                                : passwordForm.new_password_confirmation &&
                                  passwordForm.new_password !== passwordForm.new_password_confirmation
                                ? "is-invalid"
                                : ""
                            }`}
                            placeholder="Confirm new password"
                            value={passwordForm.new_password_confirmation}
                            onChange={handlePasswordInputChange}
                            disabled={isPasswordLoading}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isPasswordLoading}
                          >
                            {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                          </button>
                        </div>
                        <div className="settings-confirm-error-wrap">
                          {(formErrors.new_password_confirmation?.[0] ||
                            (passwordForm.new_password_confirmation &&
                              passwordForm.new_password !== passwordForm.new_password_confirmation)) && (
                            <div className="text-danger small mt-1">
                              {formErrors.new_password_confirmation?.[0] || "Passwords do not match."}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-1">
                      <button
                        type="submit"
                        className="btn text-white d-flex align-items-center gap-2"
                        disabled={isPasswordLoading}
                        style={{
                          background: "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.5rem 1.25rem",
                        }}
                      onMouseEnter={(e) => {
                        if (!isPasswordLoading) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {isPasswordLoading ? (
                        <><FaSpinner className="spinner" /> Changing Password...</>
                      ) : (
                        <><FaWrench className="me-1" /> Change Administrator Password <FaArrowRight /></>
                      )}
                    </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "branding" && (
                <div className="tab-transition-enter">
                  <h5 className="mb-3 fw-semibold settings-card-title">Branding Settings</h5>
                  <p className="small text-muted mb-3 settings-card-desc">
                    Update the system name and logo shown in the application header.
                  </p>
                {brandingLoading ? (
                  <div className="text-center py-5">
                    <FaSpinner className="spinner" style={{ fontSize: "2rem" }} />
                    <p className="mt-2 mb-0 small text-muted">Loading branding…</p>
                  </div>
                ) : (
                  <form
                    className="text-start"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token) { toast.error("You are not authenticated."); return; }
                      const result = await showAlert.confirm("Update Branding", "Save these branding changes?", "Yes, Save", "Cancel");
                      if (!result.isConfirmed) return;
                      setBrandingSaving(true);
                      showAlert.loadingWithOverlay("Saving Branding…");
                      try {
                        const fd = new FormData();
                        fd.append("logo_text", brandingText);
                        if (brandingLogoFile) fd.append("logo", brandingLogoFile);
                        const res = await fetch(`${API_BASE_URL}/ict-admin/branding`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                          body: fd,
                        });
                        const data = await res.json().catch(() => null);
                        showAlert.close();
                        if (res.ok && data?.success && data?.branding) {
                          setBrandingData(data.branding);
                          setBrandingText(data.branding.logo_text || "DATravelApp");
                          setBrandingLogoFile(null);
                          setBrandingLogoPreview(data.branding.logo_url || null);
                          refetchBranding();
                          toast.success("Branding updated.");
                        } else if (res.status === 422) {
                          toast.error("Validation error. Please check your logo file and text.");
                        } else {
                          toast.error(data?.message || "Failed to update branding.");
                        }
                      } catch (err) {
                        showAlert.close();
                        console.error("Branding update error:", err);
                        toast.error("Network error while saving branding.");
                      } finally {
                        setBrandingSaving(false);
                      }
                    }}
                  >
                    <div className="mb-3">
                      <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                        Logo Text (System Name)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={brandingText}
                        onChange={(e) => setBrandingText(e.target.value)}
                        placeholder="DATravelApp"
                      />
                      <div className="form-text small">Shown next to the logo in the navbar.</div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                        Logo Image
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setBrandingLogoFile(file);
                          if (file) setBrandingLogoPreview(URL.createObjectURL(file));
                          else setBrandingLogoPreview(brandingData?.logo_url || null);
                        }}
                      />
                      <div className="form-text small">PNG, JPG, WEBP up to 2MB.</div>
                    </div>
                    <div className="mb-4 p-3 rounded border" style={{ background: "var(--background-light)" }}>
                      <div className="small fw-semibold mb-2" style={{ color: "var(--text-muted)" }}>Preview</div>
                      <div className="d-flex align-items-center gap-3">
                        {brandingLogoPreview ? (
                          <img src={brandingLogoPreview} alt="Logo preview" style={{ maxHeight: "48px", maxWidth: "120px", objectFit: "contain" }} />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center rounded bg-white border" style={{ width: "80px", height: "48px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            No logo
                          </div>
                        )}
                        <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>{brandingText || brandingData?.logo_text || "DATravelApp"}</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn text-white d-flex align-items-center gap-2"
                      disabled={brandingSaving}
                      style={{
                        background: "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.5rem 1.25rem",
                      }}
                      onMouseEnter={(e) => {
                        if (!brandingSaving) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {brandingSaving ? <><FaSpinner className="spinner" /> Saving…</> : <>Save Branding</>}
                    </button>
                  </form>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
