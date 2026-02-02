import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaClock } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert } from "../../../services/notificationService";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";
import ViewTimeLogModal from "./ViewTimeLogModal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const TimeLogging = () => {
  const { user: currentUser } = useAuth();
  const [timeLogs, setTimeLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLog, setViewingLog] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("log_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [numberModal, setNumberModal] = useState({
    show: false,
    title: "",
    value: "",
  });

  const token = useMemo(() => localStorage.getItem("token"), []);

  const formatFullNumber = (value) => {
    if (value === null || value === undefined) return "0";
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || Number.isNaN(Number(trimmed))) return value;
      return Number(trimmed).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    if (Number.isNaN(Number(value))) return String(value);
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleNumberClick = (title, value) => {
    setNumberModal({
      show: true,
      title,
      value: formatFullNumber(value),
    });
  };

  const getLogRole = (log) => {
    if (log.director) return "Director";
    if (log.personnel) return "Personnel";
    return "Unknown";
  };

  const getLogUser = (log) => {
    return log.director || log.personnel || {};
  };

  const getUserName = (log) => {
    const person = getLogUser(log);
    if (person.first_name && person.last_name) {
      const parts = [person.first_name];
      if (person.middle_name) parts.push(person.middle_name);
      parts.push(person.last_name);
      return parts.join(" ");
    }
    return person.name || "N/A";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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

  const formatLocalDateTime = (dateString) => {
    if (!dateString) return { date: "N/A", time: "" };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: "Invalid Date", time: "" };
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch (error) {
      return { date: "Date Error", time: "" };
    }
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
    const totalMinutes = diff;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const filterAndSortLogs = useCallback(() => {
    let filtered = [...timeLogs];

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase();
      filtered = filtered.filter((log) => {
        const personName = getUserName(log).toLowerCase();
        const username = getLogUser(log).username?.toLowerCase() || "";
        const remarks = log.remarks?.toLowerCase() || "";
        const dateValue = log.log_date || "";
        const role = getLogRole(log).toLowerCase();
        return (
          personName.includes(lowered) ||
          username.includes(lowered) ||
          remarks.includes(lowered) ||
          dateValue.includes(lowered) ||
          role.includes(lowered)
        );
      });
    }

    if (filterStatus !== "all") {
      if (filterStatus === "open") {
        filtered = filtered.filter((log) => !log.time_out);
      } else if (filterStatus === "closed") {
        filtered = filtered.filter((log) => !!log.time_out);
      }
    }

    if (filterRole !== "all") {
      filtered = filtered.filter((log) =>
        filterRole === "personnel"
          ? !!log.personnel
          : filterRole === "director"
          ? !!log.director
          : true
      );
    }

    filtered.sort((a, b) => {
      if (sortField === "log_date") {
        const aDate = a.log_date ? new Date(a.log_date) : new Date(0);
        const bDate = b.log_date ? new Date(b.log_date) : new Date(0);
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
      if (sortField === "time_in") {
        const aValue = a.time_in || "";
        const bValue = b.time_in || "";
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (sortField === "time_out") {
        const aValue = a.time_out || "";
        const bValue = b.time_out || "";
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [timeLogs, searchTerm, filterStatus, filterRole, sortField, sortDirection]);

  useEffect(() => {
    fetchTimeLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortLogs();
  }, [filterAndSortLogs]);

  const fetchTimeLogs = async () => {
    if (!token) {
      toast.error("Authentication token missing. Please login again.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", 1000);
      params.set("sort", sortField);
      params.set("direction", sortDirection);

      const response = await fetch(
        `${API_BASE_URL}/ict-admin/time-logs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load time logs.");
      }

      setTimeLogs(data.data?.items || []);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      toast.error(
        error.message ||
          "An error occurred while loading time logs. Please try again."
      );
      setTimeLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      toast.warning("Please wait until current action completes");
      return;
    }
    await fetchTimeLogs();
    toast.info("Data refreshed successfully");
  };

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const isActionDisabled = () => {
    return actionLock;
  };

  const openView = (record) => {
    setViewingLog(record);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setTimeout(() => setViewingLog(null), 300);
  };

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const stats = useMemo(() => {
    return {
      total: timeLogs.length,
      open: timeLogs.filter((log) => !log.time_out).length,
      closed: timeLogs.filter((log) => !!log.time_out).length,
      filtered: filteredLogs.length,
    };
  }, [timeLogs, filteredLogs]);

  if (loading) {
    return (
      <div className="container-fluid py-2 time-logging-container">
        <LoadingSpinner text="Loading time logs..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 time-logging-container page-enter">
      <style>{`
        @media (min-width: 992px) {
          .time-logging-container .table th,
          .time-logging-container .table td {
            padding: 0.5rem 0.75rem !important;
          }
        }
        @media (min-width: 1200px) {
          .time-logging-container .table th,
          .time-logging-container .table td {
            padding: 0.5rem 0.5rem !important;
          }
        }
        @media (min-width: 1400px) {
          .time-logging-container .table th,
          .time-logging-container .table td {
            padding: 0.5rem 0.4rem !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaClock className="me-2" />
            Time Logging
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Monitor time logs for personnel and directors
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm"
            onClick={refreshAllData}
            disabled={loading || isActionDisabled()}
            style={{
              transition: "all 0.2s ease-in-out",
              border: "2px solid var(--primary-color)",
              color: "var(--primary-color)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                e.target.style.backgroundColor = "var(--primary-color)";
                e.target.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "var(--primary-color)";
            }}
          >
            <i className="fas fa-sync-alt me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card stats-card h-100 shadow-sm" style={{ border: "1px solid rgba(0, 0, 0, 0.125)", borderRadius: "0.375rem" }}>
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="text-xs fw-semibold text-uppercase mb-1" style={{ color: "var(--primary-color)" }}>
                    Total Logs
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() => handleNumberClick("Total Logs", stats.total)}
                    style={{
                      color: "var(--primary-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = "0.8";
                      e.target.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {stats.total}
                  </div>
                  <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i className="fas fa-calendar-check" style={{ color: "var(--primary-light)", opacity: 0.7, fontSize: "clamp(1rem, 3vw, 2rem)" }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card stats-card h-100 shadow-sm" style={{ border: "1px solid rgba(0, 0, 0, 0.125)", borderRadius: "0.375rem" }}>
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="text-xs fw-semibold text-uppercase mb-1" style={{ color: "var(--accent-color)" }}>
                    Open Logs
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() => handleNumberClick("Open Logs", stats.open)}
                    style={{
                      color: "var(--accent-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = "0.8";
                      e.target.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {stats.open}
                  </div>
                  <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i className="fas fa-door-open" style={{ color: "var(--accent-light)", opacity: 0.7, fontSize: "clamp(1rem, 3vw, 2rem)" }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card stats-card h-100 shadow-sm" style={{ border: "1px solid rgba(0, 0, 0, 0.125)", borderRadius: "0.375rem" }}>
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="text-xs fw-semibold text-uppercase mb-1" style={{ color: "var(--primary-dark)" }}>
                    Closed Logs
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() => handleNumberClick("Closed Logs", stats.closed)}
                    style={{
                      color: "var(--primary-dark)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = "0.8";
                      e.target.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {stats.closed}
                  </div>
                  <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i className="fas fa-door-closed" style={{ color: "var(--primary-color)", opacity: 0.7, fontSize: "clamp(1rem, 3vw, 2rem)" }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card stats-card h-100 shadow-sm" style={{ border: "1px solid rgba(0, 0, 0, 0.125)", borderRadius: "0.375rem" }}>
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="text-xs fw-semibold text-uppercase mb-1" style={{ color: "var(--primary-dark)" }}>
                    Current Page
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      handleNumberClick(
                        "Current Page",
                        `${currentPage} of ${totalPages || 1}`
                      )
                    }
                    style={{
                      color: "var(--primary-dark)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = "0.8";
                      e.target.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {currentPage}/{totalPages || 1}
                  </div>
                  <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i className="fas fa-file-alt" style={{ color: "var(--primary-color)", opacity: 0.7, fontSize: "clamp(1rem, 3vw, 2rem)" }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="card border-0 shadow-sm mb-3" style={{ backgroundColor: "var(--background-white)", borderRadius: "5px", border: "1px solid rgba(0,0,0,0.15)" }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Search Time Logs
              </label>
              <div className="input-group input-group-sm">
                <span
                  className="input-group-text"
                  style={{
                    backgroundColor: "var(--background-light)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, username, date, or remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isActionDisabled()}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
                {searchTerm && (
                  <button
                    className="btn btn-sm clear-search-btn"
                    type="button"
                    onClick={() => setSearchTerm("")}
                    disabled={isActionDisabled()}
                    style={{
                      color: "#6c757d",
                      backgroundColor: "transparent",
                      border: "1px solid rgba(0,0,0,0.15)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        if (icon) icon.style.color = "#ffffff";
                        e.target.style.color = "#ffffff";
                        e.target.style.backgroundColor = "#6c757d";
                        e.target.style.borderColor = "rgba(0,0,0,0.25)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        if (icon) icon.style.color = "#6c757d";
                        e.target.style.color = "#6c757d";
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      }
                    }}
                  >
                    <i className="fas fa-times" style={{ color: "inherit" }}></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Role
              </label>
              <select
                className="form-select form-select-sm"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                disabled={isActionDisabled()}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Roles</option>
                <option value="personnel">Personnel</option>
                <option value="director">Director</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Status
              </label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                disabled={isActionDisabled()}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Items per page
              </label>
              <select
                className="form-select form-select-sm"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                disabled={isActionDisabled()}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card border-0 shadow-sm" style={{ backgroundColor: "var(--background-white)", borderRadius: "5px", border: "1px solid rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="card-header border-bottom-0 py-2" style={{ background: "var(--topbar-bg)", color: "var(--topbar-text)" }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-clock me-2"></i>
              Time Logs
              <small className="opacity-75 ms-2 text-white">
                ({filteredLogs.length} found
                {searchTerm || filterStatus !== "all" ? " after filtering" : ""}
                )
              </small>
            </h5>
          </div>
        </div>

        <div className="card-body p-0">
          {currentLogs.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="fas fa-clock fa-3x" style={{ color: "var(--text-muted)", opacity: 0.5 }}></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {timeLogs.length === 0 ? "No Time Logs" : "No Matching Results"}
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                {timeLogs.length === 0
                  ? "No time logs have been recorded yet."
                  : "Try adjusting your search criteria."}
              </p>
              {searchTerm && (
                <button
                  className="btn btn-sm clear-search-main-btn"
                  onClick={() => setSearchTerm("")}
                  disabled={loading || isActionDisabled()}
                  style={{
                    color: "var(--primary-color)",
                    backgroundColor: "transparent",
                    border: "2px solid var(--primary-color)",
                    transition: "all 0.2s ease-in-out",
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = "var(--primary-color)";
                      e.target.style.color = "white";
                      const icon = e.target.querySelector("i");
                      if (icon) icon.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                      const icon = e.target.querySelector("i");
                      if (icon) icon.style.color = "var(--primary-color)";
                    }
                  }}
                >
                  <i className="fas fa-times me-1" style={{ color: "inherit" }}></i>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0" style={{ tableLayout: "auto" }}>
                  <thead style={{ background: "var(--topbar-bg)", color: "var(--topbar-text)" }}>
                    <tr>
                      <th style={{ width: "4%", minWidth: "40px" }} className="text-center small fw-semibold">#</th>
                      <th style={{ width: "8%", minWidth: "80px" }} className="text-center small fw-semibold">Action</th>
                      <th style={{ width: "20%", minWidth: "200px" }} className="small fw-semibold">
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("log_date")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          User
                          <i className={`ms-1 ${getSortIcon("log_date")}`} style={{ color: "var(--text-primary)" }}></i>
                        </button>
                      </th>
                      <th style={{ width: "8%", minWidth: "100px" }} className="small fw-semibold">
                        Role
                      </th>
                      <th style={{ width: "12%", minWidth: "120px" }} className="small fw-semibold">Date</th>
                      <th style={{ width: "10%", minWidth: "100px" }} className="small fw-semibold">
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("time_in")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Time In
                          <i className={`ms-1 ${getSortIcon("time_in")}`} style={{ color: "var(--text-primary)" }}></i>
                        </button>
                      </th>
                      <th style={{ width: "10%", minWidth: "100px" }} className="small fw-semibold">
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("time_out")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Time Out
                          <i className={`ms-1 ${getSortIcon("time_out")}`} style={{ color: "var(--text-primary)" }}></i>
                        </button>
                      </th>
                      <th style={{ width: "10%", minWidth: "110px" }} className="small fw-semibold">Duration</th>
                      <th style={{ width: "8%", minWidth: "80px" }} className="text-center small fw-semibold">Status</th>
                      <th style={{ width: "12%", minWidth: "140px" }} className="small fw-semibold">
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("created_at")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Logged
                          <i className={`ms-1 ${getSortIcon("created_at")}`} style={{ color: "var(--text-primary)" }}></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.map((log, index) => {
                      const createdInfo = formatLocalDateTime(log.created_at);
                      return (
                        <tr key={log.id} className="align-middle">
                          <td className="text-center fw-bold" style={{ color: "var(--text-primary)" }}>
                            {startIndex + index + 1}
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                              <button
                                className="btn btn-info btn-sm text-white"
                                onClick={() => openView(log)}
                                disabled={isActionDisabled()}
                                title="View details"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <i className="fas fa-eye" style={{ fontSize: "0.875rem" }}></i>
                              </button>
                            </div>
                          </td>
                          <td style={{ maxWidth: "280px", overflow: "hidden" }}>
                            <div className="fw-medium mb-1" style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getUserName(log)}>
                              {getUserName(log)}
                            </div>
                            <div className="small" style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`@${getLogUser(log).username || ""}`}>
                              @{getLogUser(log).username || "N/A"}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {getLogRole(log)}
                            </span>
                          </td>
                          <td>{formatDate(log.log_date)}</td>
                          <td>{formatTime(log.log_date, log.time_in)}</td>
                          <td>{formatTime(log.log_date, log.time_out)}</td>
                          <td>{computeDuration(log.log_date, log.time_in, log.time_out)}</td>
                          <td className="text-center">
                            <span className={`badge ${log.time_out ? "bg-success" : "bg-warning text-dark"}`}>
                              {log.time_out ? "Closed" : "Open"}
                            </span>
                          </td>
                          <td>
                            <small style={{ color: "var(--text-muted)", paddingRight: "1rem", display: "block", whiteSpace: "nowrap" }}>
                              {createdInfo.date} {createdInfo.time}
                            </small>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="card-footer bg-white border-top px-3 py-2">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <div className="text-center text-md-start">
                      <small style={{ color: "var(--text-muted)" }}>
                        Showing{" "}
                        <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                          {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)}
                        </span>{" "}
                        of{" "}
                        <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                          {filteredLogs.length}
                        </span>{" "}
                        logs
                      </small>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || isActionDisabled()}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.target.disabled) {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                            e.target.style.backgroundColor = "var(--primary-color)";
                            e.target.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "var(--primary-color)";
                        }}
                      >
                        <i className="fas fa-chevron-left me-1"></i>
                        Previous
                      </button>

                      <div className="d-none d-md-flex gap-1">
                        {(() => {
                          let pages = [];
                          const maxVisiblePages = 5;

                          if (totalPages <= maxVisiblePages) {
                            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                          } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);

                            if (currentPage <= 2) {
                              end = 4;
                            } else if (currentPage >= totalPages - 1) {
                              start = totalPages - 3;
                            }

                            if (start > 2) pages.push("...");
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (end < totalPages - 1) pages.push("...");
                            if (totalPages > 1) pages.push(totalPages);
                          }

                          return pages.map((page, index) => (
                            <button
                              key={index}
                              className="btn btn-sm"
                              onClick={() => page !== "..." && setCurrentPage(page)}
                              disabled={page === "..." || isActionDisabled()}
                              style={{
                                transition: "all 0.2s ease-in-out",
                                border: `2px solid ${
                                  currentPage === page
                                    ? "var(--primary-color)"
                                    : "var(--input-border)"
                                }`,
                                color: currentPage === page ? "white" : "var(--text-primary)",
                                backgroundColor:
                                  currentPage === page ? "var(--primary-color)" : "transparent",
                                minWidth: "40px",
                              }}
                            >
                              {page}
                            </button>
                          ));
                        })()}
                      </div>

                      <div className="d-md-none">
                        <small style={{ color: "var(--text-muted)" }}>
                          Page {currentPage} of {totalPages}
                        </small>
                      </div>

                      <button
                        className="btn btn-sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || isActionDisabled()}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.target.disabled) {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                            e.target.style.backgroundColor = "var(--primary-color)";
                            e.target.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "var(--primary-color)";
                        }}
                      >
                        Next
                        <i className="fas fa-chevron-right ms-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && viewingLog && (
        <ViewTimeLogModal timeLog={viewingLog} onClose={handleCloseViewModal} />
      )}

      {/* Number View Modal */}
      {numberModal.show && (
        <NumberViewModal
          title={numberModal.title}
          value={numberModal.value}
          onClose={() =>
            setNumberModal({
              show: false,
              title: "",
              value: "",
            })
          }
        />
      )}
    </div>
  );
};

export default TimeLogging;