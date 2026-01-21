import React, { useMemo, useState, useRef, useEffect } from "react";
import Portal from "../../../components/Portal";
import { motion } from "framer-motion";

const ViewTimeLogModal = ({ timeLog, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  const getLogUser = () => timeLog?.director || timeLog?.personnel || {};

  const getLogRole = () => {
    if (timeLog?.director) return "Director";
    if (timeLog?.personnel) return "Personnel";
    return "Unknown";
  };

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
      return person.name.charAt(0).toUpperCase() || "U";
    }
    return "U";
  };

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

  const getDatePart = (dateString) => {
    if (!dateString) return "1970-01-01";
    if (typeof dateString === "string") {
      if (dateString.includes("T")) return dateString.slice(0, 10);
      return dateString;
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "1970-01-01";
    return date.toISOString().slice(0, 10);
  };

  const formatTime = (dateString, timeString) => {
    if (!timeString) return "N/A";
    const normalized = timeString.length === 5 ? `${timeString}:00` : timeString;
    const baseDate = getDatePart(dateString);
    const date = new Date(`${baseDate}T${normalized}Z`);
    if (Number.isNaN(date.getTime())) return timeString;
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    }).format(date);
  };

  const computeDuration = (dateString, timeIn, timeOut) => {
    if (!timeIn || !timeOut) return "—";
    const toMinutes = (value) => {
      const parts = value.split(":");
      if (parts.length < 2) return null;
      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };
    const inMinutes = toMinutes(timeIn);
    const outMinutes = toMinutes(timeOut);
    if (inMinutes === null || outMinutes === null) return "—";
    const diff = outMinutes - inMinutes;
    if (diff < 0) return "—";
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
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

  if (!timeLog) return null;

  const user = getLogUser();
  const dateInfo = formatDate(timeLog.log_date);
  const statusLabel = timeLog.time_out ? "Closed" : "Open";

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
                <i className="fas fa-clock me-2"></i>
                Time Log Details
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
                            <div
                              className="d-flex align-items-center justify-content-center w-100 h-100 text-white fw-bold"
                              style={{
                                fontSize: "3rem",
                                backgroundColor: "var(--primary-color)",
                              }}
                            >
                              {getInitials(user)}
                            </div>
                          </div>

                          <h4
                            className="mb-1 fw-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {getFullName(user)}
                          </h4>
                          <p
                            className="mb-0 small"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <i className="fas fa-at me-1"></i>
                            {user.username || "N/A"}
                          </p>

                          <div className="mt-2 d-flex gap-2 flex-wrap justify-content-center">
                            <span
                              className="badge bg-secondary"
                              style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                            >
                              <i className="fas fa-user-tag me-1"></i>
                              {getLogRole()}
                            </span>
                            <span
                              className={`badge ${
                                timeLog.time_out ? "bg-success" : "bg-warning text-dark"
                              }`}
                              style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                            >
                              <i
                                className={`fas me-1 ${
                                  timeLog.time_out
                                    ? "fa-check-circle"
                                    : "fa-exclamation-circle"
                                }`}
                              ></i>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information Sections */}
                <div className="row g-3">
                  <div className="col-12">
                    <div className="card border-0 shadow-sm bg-white">
                      <div className="card-header bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                          <i
                            className="fas fa-id-card me-2"
                            style={{ color: "var(--primary-color)" }}
                          ></i>
                          User Information
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
                                {user.first_name || (
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
                                {user.middle_name || (
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
                                {user.last_name || (
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
                                @{user.username || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <i className="fas fa-user-tag me-1"></i>
                                Role
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {getLogRole()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="card border-0 shadow-sm bg-white">
                      <div className="card-header bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                          <i
                            className="fas fa-stopwatch me-2"
                            style={{ color: "var(--primary-color)" }}
                          ></i>
                          Time Details
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
                                Log Date
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {dateInfo.date}
                              </p>
                              {dateInfo.time && (
                                <small className="text-muted">{dateInfo.time}</small>
                              )}
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Time In
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {formatTime(timeLog.log_date, timeLog.time_in)}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Time Out
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {formatTime(timeLog.log_date, timeLog.time_out)}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label
                                className="small fw-semibold mb-1 d-block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Duration
                              </label>
                              <p className="mb-0 fw-medium" style={{ color: "var(--text-primary)" }}>
                                {computeDuration(
                                  timeLog.log_date,
                                  timeLog.time_in,
                                  timeLog.time_out
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
                                Status
                              </label>
                              <span
                                className={`badge ${
                                  timeLog.time_out
                                    ? "bg-success"
                                    : "bg-warning text-dark"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>
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

export default ViewTimeLogModal;
