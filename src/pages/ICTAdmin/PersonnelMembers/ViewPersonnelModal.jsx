import React, { useMemo, useState, useRef, useEffect } from "react";
import Portal from "../../../components/Portal";
import { motion } from "framer-motion";

const ViewPersonnelModal = ({ personnel, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  const getFullName = (person) => {
    if (person?.first_name && person?.last_name) {
      const parts = [person.first_name];
      if (person.middle_name) {
        parts.push(person.middle_name);
      }
      parts.push(person.last_name);
      return parts.join(" ");
    }
    return person?.name || "N/A";
  };

  const getPersonnelAvatarUrl = (person) => {
    if (!person) return null;
    if (person.avatar_path) {
      if (person.avatar_path.startsWith("http://") || person.avatar_path.startsWith("https://")) {
        return person.avatar_path;
      }
      const apiBase =
        (
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        ).replace(/\/api\/?$/, "") + "/api";
      let cleanFilename = person.avatar_path;
      if (person.avatar_path.includes("personnel-avatars/")) {
        cleanFilename = person.avatar_path.replace("personnel-avatars/", "");
      } else if (person.avatar_path.includes("avatars/")) {
        cleanFilename = person.avatar_path.replace("avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${apiBase}/personnel-avatar/${cleanFilename}`;
    }
    return null;
  };

  const getInitials = (person) => {
    if (person?.first_name && person?.last_name) {
      return (
        person.first_name.charAt(0) + person.last_name.charAt(0)
      ).toUpperCase();
    }
    if (person?.name) {
      const parts = person.name.split(" ");
      if (parts.length >= 2) {
        return (
          parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
        ).toUpperCase();
      }
      return person.name.charAt(0).toUpperCase() || "P";
    }
    return "P";
  };

  const avatarUrl = useMemo(
    () => getPersonnelAvatarUrl(personnel),
    [personnel]
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "N/A", time: "" };
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  if (!personnel) return null;

  const dateInfo = formatDate(personnel.created_at);

  return (
    <Portal>
      <div
        ref={modalRef}
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        onClick={handleBackdropClick}
        tabIndex="-1"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
        }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          style={{ zIndex: 10000 }}
        >
          <motion.div
            ref={contentRef}
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              zIndex: 10001,
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-user-circle me-2"></i>
                Personnel Information
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>

            {/* Modal Body */}
            <div
              className="modal-body bg-light"
              style={{ maxHeight: "75vh", overflowY: "auto" }}
            >
              <div className="container-fluid px-3">
                {/* Avatar and Name Section */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center p-4">
                        <div className="d-flex flex-column align-items-center">
                          {/* Avatar */}
                          <div
                            className="d-flex align-items-center justify-content-center mb-3"
                            style={{
                              width: 140,
                              height: 140,
                              borderRadius: "50%",
                              border: `4px solid var(--border-color)`,
                              backgroundColor: "var(--background-light)",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={`${getFullName(personnel)}'s avatar`}
                                className="w-100 h-100"
                                style={{
                                  objectFit: "cover",
                                  borderRadius: "50%",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  const parent = e.target.parentElement;
                                  parent.innerHTML = `
                                    <div class="d-flex align-items-center justify-content-center w-100 h-100 text-white fw-bold" style="font-size: 3rem; background-color: var(--primary-color);">
                                      ${getInitials(personnel)}
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div
                                className="d-flex align-items-center justify-content-center w-100 h-100 text-white fw-bold"
                                style={{
                                  fontSize: "3rem",
                                  backgroundColor: "var(--primary-color)",
                                }}
                              >
                                {getInitials(personnel)}
                              </div>
                            )}
                          </div>

                          {/* Name and Username */}
                          <h4
                            className="mb-1 fw-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {getFullName(personnel)}
                          </h4>
                          <p
                            className="mb-0 small"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <i className="fas fa-at me-1"></i>
                            {personnel.username}
                          </p>

                          {/* Status Badge */}
                          <div className="mt-2">
                            <span
                              className={`badge ${
                                personnel.is_active !== false
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                              style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                            >
                              <i
                                className={`fas me-1 ${
                                  personnel.is_active !== false
                                    ? "fa-check-circle"
                                    : "fa-times-circle"
                                }`}
                              ></i>
                              {personnel.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information Sections */}
                <div className="row g-3">
                  {/* Personal Information Card */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm bg-white">
                      <div className="card-header bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                          <i
                            className="fas fa-id-card me-2"
                            style={{ color: "var(--primary-color)" }}
                          ></i>
                          Personal Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                First Name
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {personnel.first_name || (
                                  <span className="text-muted">Not provided</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Middle Name
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {personnel.middle_name || (
                                  <span className="text-muted">Not provided</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Last Name
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {personnel.last_name || (
                                  <span className="text-muted">Not provided</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <i className="fas fa-user me-1"></i>
                                Username
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                @{personnel.username || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <i className="fas fa-phone me-1"></i>
                                Contact Number
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {personnel.phone || (
                                  <span className="text-muted">Not provided</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employment Information Card */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm bg-white">
                      <div className="card-header bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                          <i
                            className="fas fa-briefcase me-2"
                            style={{ color: "var(--primary-color)" }}
                          ></i>
                          Employment Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <i className="fas fa-building me-1"></i>
                                Department
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {personnel.department || (
                                  <span className="text-muted">Not specified</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <i className="fas fa-user-tie me-1"></i>
                                Position
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {personnel.position || (
                                  <span className="text-muted">Not specified</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Status Card */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm bg-white">
                      <div className="card-header bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                          <i
                            className="fas fa-info-circle me-2"
                            style={{ color: "var(--primary-color)" }}
                          ></i>
                          Account Status & Details
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Account Status
                              </label>
                              <div>
                                <span
                                  className={`badge ${
                                    personnel.is_active !== false
                                      ? "bg-success"
                                      : "bg-secondary"
                                  }`}
                                  style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}
                                >
                                  <i
                                    className={`fas me-1 ${
                                      personnel.is_active !== false
                                        ? "fa-check-circle"
                                        : "fa-ban"
                                    }`}
                                  ></i>
                                  {personnel.is_active !== false ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <i className="fas fa-calendar-alt me-1"></i>
                                Date Registered
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {dateInfo.date}
                              </p>
                              {dateInfo.time && (
                                <small className="text-muted">{dateInfo.time}</small>
                              )}
                            </div>
                          </div>

                          {/* Reason for Deactivation */}
                          {personnel.is_active === false &&
                            personnel.reason_for_deactivation && (
                              <div className="col-12">
                                <div className="mb-0">
                                  <label
                                    className="small fw-semibold mb-2 d-block"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                    Reason for Deactivation
                                  </label>
                                  <div
                                    className="alert mb-0"
                                    style={{
                                      backgroundColor: "rgba(255, 193, 7, 0.1)",
                                      border: "1px solid var(--accent-color)",
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    <div className="d-flex align-items-start">
                                      <i
                                        className="fas fa-info-circle me-2 mt-1"
                                        style={{ color: "var(--accent-color)" }}
                                      ></i>
                                      <div className="flex-grow-1">
                                        <p className="mb-0">{personnel.reason_for_deactivation}</p>
                                        <small className="text-muted d-block mt-1">
                                          This reason will be displayed to the personnel when they
                                          attempt to login.
                                        </small>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                style={{
                  backgroundColor: "#6c757d",
                  borderColor: "#6c757d",
                  color: "white",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#5a6268";
                  e.target.style.borderColor = "#5a6268";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#6c757d";
                  e.target.style.borderColor = "#6c757d";
                }}
              >
                <i className="fas fa-times me-2"></i>
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </Portal>
  );
};

export default ViewPersonnelModal;
