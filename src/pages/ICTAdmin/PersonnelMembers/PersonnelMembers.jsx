import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaUsers } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert } from "../../../services/notificationService";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";
import PersonnelFormModal from "./PersonnelFormModal";
import ViewPersonnelModal from "./ViewPersonnelModal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_PAGE_SIZE = 10;

// Global cache outside component to persist across re-renders
const loadedImagesCache = new Set();

// Personnel Avatar Component
const PersonnelAvatar = React.memo(
  ({ person, size = 44 }) => {
    const getPersonnelAvatarUrl = useCallback((person) => {
      if (!person) return null;
      if (person.avatar_path) {
        // Ensure API base URL ends with /api
        const apiBase =
          (
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          ).replace(/\/api\/?$/, "") + "/api";

        let cleanFilename = person.avatar_path;

        // Handle different path formats
        if (person.avatar_path.includes("personnel-avatars/")) {
          cleanFilename = person.avatar_path.replace("personnel-avatars/", "");
        } else if (person.avatar_path.includes("avatars/")) {
          cleanFilename = person.avatar_path.replace("avatars/", "");
        }

        // Get just the filename
        cleanFilename = cleanFilename.split("/").pop();

        return `${apiBase}/personnel-avatar/${cleanFilename}`;
      }
      return null;
    }, []);

    const avatarUrl = person?.avatar_path
      ? getPersonnelAvatarUrl(person)
      : null;
    const imgRef = React.useRef(null);
    const hasCheckedCacheRef = React.useRef(false);

    // Check cache synchronously - if already loaded, never show loading state
    const isInCache = avatarUrl ? loadedImagesCache.has(avatarUrl) : false;
    const [imageLoading, setImageLoading] = React.useState(() => {
      // If in cache, never show loading
      if (isInCache) {
        hasCheckedCacheRef.current = true;
        return false;
      }
      return true;
    });
    const [imageError, setImageError] = React.useState(false);

    const getFullName = (person) => {
      if (person?.first_name && person?.last_name) {
        const parts = [person.first_name];
        if (person.middle_name) {
          parts.push(person.middle_name);
        }
        parts.push(person.last_name);
        return parts.join(" ");
      }
      return person?.name || "";
    };

    const getInitials = (person) => {
      if (person?.first_name && person?.last_name) {
        return (
          person.first_name.charAt(0) + person.last_name.charAt(0)
        ).toUpperCase();
      }
      // Fallback for backward compatibility
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

    // Only run once per avatar URL - check cache and pre-load if needed
    React.useEffect(() => {
      if (!avatarUrl || hasCheckedCacheRef.current) return;

      // If already in cache, we're done
      if (loadedImagesCache.has(avatarUrl)) {
        setImageLoading(false);
        hasCheckedCacheRef.current = true;
        return;
      }

      // Pre-check browser cache using Image object
      const testImg = new Image();
      let isHandled = false;

      testImg.onload = () => {
        if (!isHandled) {
          isHandled = true;
          loadedImagesCache.add(avatarUrl);
          setImageLoading(false);
          setImageError(false);
          hasCheckedCacheRef.current = true;
        }
      };

      testImg.onerror = () => {
        if (!isHandled) {
          isHandled = true;
          setImageLoading(false);
          setImageError(true);
          hasCheckedCacheRef.current = true;
        }
      };

      // Set src - if cached, onload fires immediately
      testImg.src = avatarUrl;

      // Fallback timeout in case image never loads
      const timeout = setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          hasCheckedCacheRef.current = true;
        }
      }, 5000);

      return () => {
        clearTimeout(timeout);
      };
    }, [avatarUrl]);

    // Handle image load event - add to cache when loaded
    const handleImageLoad = React.useCallback(() => {
      if (avatarUrl) {
        loadedImagesCache.add(avatarUrl);
      }
      setImageLoading(false);
      hasCheckedCacheRef.current = true;
    }, [avatarUrl]);

    // Handle image error
    const handleImageError = React.useCallback((e) => {
      setImageLoading(false);
      setImageError(true);
      e.target.style.display = "none";
    }, []);

    if (person.avatar_path && !imageError && avatarUrl) {
      return (
        <div
          className="rounded-circle overflow-hidden border position-relative"
          style={{
            width: size,
            height: size,
            borderColor: "#e1e6ef",
            flexShrink: 0,
            backgroundColor: "#f4f6fb",
          }}
        >
          {/* Loading skeleton */}
          {imageLoading && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: "#e9ecef",
                zIndex: 1,
              }}
            >
              <div
                className="w-100 h-100 rounded-circle"
                style={{
                  background:
                    "linear-gradient(90deg, #e9ecef 0%, #f8f9fa 50%, #e9ecef 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
            </div>
          )}
          <img
            ref={imgRef}
            src={avatarUrl}
            alt={`${getFullName(person)}'s avatar`}
            className="rounded-circle border"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: imageLoading ? 0 : 1,
              transition: "opacity 0.3s ease-in-out",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    }

    return (
      <div
        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
        style={{
          width: size,
          height: size,
          backgroundColor: "#0E254B",
          flexShrink: 0,
        }}
      >
        {getInitials(person)}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if person data actually changed
    return (
      prevProps.person?.id === nextProps.person?.id &&
      prevProps.person?.avatar_path === nextProps.person?.avatar_path &&
      prevProps.size === nextProps.size
    );
  }
);

PersonnelAvatar.displayName = "PersonnelAvatar";

const PersonnelMembers = () => {
  const { user: currentUser } = useAuth();
  const [personnel, setPersonnel] = useState([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [viewingPersonnel, setViewingPersonnel] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [numberModal, setNumberModal] = useState({
    show: false,
    title: "",
    value: "",
  });

  const token = useMemo(() => localStorage.getItem("token"), []);

  // Helper functions for number formatting
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

  // Helper to get full name
  const getFullName = (person) => {
    if (person?.first_name && person?.last_name) {
      const parts = [person.first_name];
      if (person.middle_name) {
        parts.push(person.middle_name);
      }
      parts.push(person.last_name);
      return parts.join(" ");
    }
    // Fallback for backward compatibility
    return person?.name || "";
  };

  const filterAndSortPersonnel = useCallback(() => {
    let filtered = [...personnel];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((person) => {
        const fullName = getFullName(person);
        const username = person.username || "";
        const department = person.department || "";
        const position = person.position || "";
        const fieldsToSearch = [
          fullName,
          person.first_name || "",
          person.last_name || "",
          person.middle_name || "",
          username,
          department,
          position,
        ];
        return fieldsToSearch.some(
          (field) =>
            typeof field === "string" &&
            field.toLowerCase().includes(loweredSearch)
        );
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter((person) => person.is_active !== false);
      } else if (filterStatus === "inactive") {
        filtered = filtered.filter((person) => person.is_active === false);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "created_at" || sortField === "updated_at") {
        const aDate = a[sortField] ? new Date(a[sortField]) : new Date(0);
        const bDate = b[sortField] ? new Date(b[sortField]) : new Date(0);

        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "last_name" || sortField === "first_name") {
        const aValue = String(a[sortField] || "").toLowerCase();
        const bValue = String(b[sortField] || "").toLowerCase();
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        // If last names are equal and sorting by last_name, sort by first_name
        if (sortField === "last_name" && aValue === bValue) {
          const aFirst = String(a.first_name || "").toLowerCase();
          const bFirst = String(b.first_name || "").toLowerCase();
          if (aFirst < bFirst) return sortDirection === "asc" ? -1 : 1;
          if (aFirst > bFirst) return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      }

      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredPersonnel(filtered);
    setCurrentPage(1);
  }, [personnel, searchTerm, filterStatus, sortField, sortDirection]);

  useEffect(() => {
    fetchPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortPersonnel();
  }, [filterAndSortPersonnel]);

  const fetchPersonnel = async () => {
    if (!token) {
      toast.error("Authentication token missing. Please login again.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", 1000); // Get all for client-side filtering
      params.set("sort", sortField);
      params.set("direction", sortDirection);

      const response = await fetch(
        `${API_BASE_URL}/ict-admin/personnel?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load personnel records from server."
        );
      }

      const items = data.data?.items || [];
      setPersonnel(items);
    } catch (error) {
      console.error("Error fetching personnel:", error);
      toast.error(
        error.message ||
          "An error occurred while loading personnel members. Please try again."
      );
      setPersonnel([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      toast.warning("Please wait until current action completes");
      return;
    }
    await fetchPersonnel();
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

  const isActionDisabled = (personnelId = null) => {
    return actionLock || (actionLoading && actionLoading !== personnelId);
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

  const handleDelete = async (record) => {
    if (!token || actionLock) return;

    const confirm = await showAlert.confirm(
      "Delete Personnel",
      `Are you sure you want to delete ${getFullName(record)} (${record.username})? This action cannot be undone.`,
      "Delete",
      "Cancel"
    );

    if (!confirm.isConfirmed) return;

    try {
      setActionLock(true);
      setActionLoading(record.id);
      showAlert.loading("Deleting personnel...");

      const response = await fetch(
        `${API_BASE_URL}/ict-admin/personnel/${record.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Failed to delete personnel from server."
        );
      }

      showAlert.close();
      toast.success(`Personnel ${getFullName(record)} has been deleted.`);

      // Remove from list
      setPersonnel((prev) => prev.filter((p) => p.id !== record.id));
    } catch (error) {
      console.error("Error deleting personnel:", error);
      showAlert.close();
      toast.error(error.message || "Unable to delete personnel. Please try again.");
    } finally {
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const openCreate = () => {
    setEditingPersonnel(null);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingPersonnel(record);
    setShowModal(true);
  };

  const openView = (record) => {
    setViewingPersonnel(record);
    setShowViewModal(true);
  };

  const handleCloseModal = () => {
    if (!actionLock) {
      setShowModal(false);
      setTimeout(() => {
        setEditingPersonnel(null);
      }, 300); // Wait for animation to complete
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setTimeout(() => {
      setViewingPersonnel(null);
    }, 300);
  };

  // Pagination
  const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPersonnel = filteredPersonnel.slice(startIndex, endIndex);

  // Stats
  const stats = useMemo(() => {
    return {
      total: personnel.length,
      active: personnel.filter((p) => p.is_active !== false).length,
      inactive: personnel.filter((p) => p.is_active === false).length,
      filtered: filteredPersonnel.length,
    };
  }, [personnel, filteredPersonnel]);

  if (loading) {
    return (
      <div className="container-fluid py-2 personnel-management-container">
        <LoadingSpinner text="Loading personnel members..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 personnel-management-container page-enter">
      <style>{`
        @media (min-width: 992px) {
          .personnel-management-container .table th,
          .personnel-management-container .table td {
            padding: 0.5rem 0.75rem !important;
          }
        }
        @media (min-width: 1200px) {
          .personnel-management-container .table th,
          .personnel-management-container .table td {
            padding: 0.5rem 0.5rem !important;
          }
        }
        @media (min-width: 1400px) {
          .personnel-management-container .table th,
          .personnel-management-container .table td {
            padding: 0.5rem 0.4rem !important;
          }
        }
      `}</style>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaUsers className="me-2" />
            Personnel Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage personnel accounts and access permissions
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={openCreate}
            disabled={isActionDisabled()}
            style={{
              transition: "all 0.2s ease-in-out",
              borderWidth: "2px",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            <i className="fas fa-plus me-1"></i>
            Add Personnel
          </button>
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
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--primary-color)" }}
                  >
                    Total Personnel
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      handleNumberClick("Total Personnel", stats.total)
                    }
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
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-users"
                    style={{
                      color: "var(--primary-light)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--accent-color)" }}
                  >
                    Active Personnel
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      handleNumberClick("Active Personnel", stats.active)
                    }
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
                    {stats.active}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-user-check"
                    style={{
                      color: "var(--accent-light)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--primary-dark)" }}
                  >
                    Filtered Results
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      handleNumberClick("Filtered Results", stats.filtered)
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
                    {stats.filtered}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-filter"
                    style={{
                      color: "var(--primary-color)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--primary-dark)" }}
                  >
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
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-file-alt"
                    style={{
                      color: "var(--primary-color)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div
        className="card border-0 shadow-sm mb-3"
        style={{
          backgroundColor: "var(--background-white)",
          borderRadius: "5px",
          border: "1px solid rgba(0,0,0,0.15)",
        }}
      >
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Search Personnel
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
                  placeholder="Search by name, employee ID, email, position, or contact..."
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
                    <i
                      className="fas fa-times"
                      style={{ color: "inherit" }}
                    ></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-md-3">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
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
      <div
        className="card border-0 shadow-sm"
        style={{
          backgroundColor: "var(--background-white)",
          borderRadius: "5px",
          border: "1px solid rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          className="card-header border-bottom-0 py-2"
          style={{
            background: "var(--topbar-bg)",
            color: "var(--topbar-text)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-users-cog me-2"></i>
              Personnel
              <small className="opacity-75 ms-2 text-white">
                ({filteredPersonnel.length} found
                {searchTerm || filterStatus !== "all" ? " after filtering" : ""}
                )
              </small>
            </h5>
          </div>
        </div>

        <div className="card-body p-0">
          {currentPersonnel.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-users fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {personnel.length === 0
                  ? "No Personnel"
                  : "No Matching Results"}
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                {personnel.length === 0
                  ? "No personnel have been registered yet."
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
                      e.target.style.setProperty("color", "white", "important");
                      const icon = e.target.querySelector("i");
                      if (icon) {
                        icon.style.color = "white";
                        icon.style.setProperty("color", "white", "important");
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                      e.target.style.setProperty(
                        "color",
                        "var(--primary-color)",
                        "important"
                      );
                      const icon = e.target.querySelector("i");
                      if (icon) {
                        icon.style.color = "var(--primary-color)";
                        icon.style.setProperty(
                          "color",
                          "var(--primary-color)",
                          "important"
                        );
                      }
                    }
                  }}
                >
                  <i
                    className="fas fa-times me-1"
                    style={{ color: "inherit" }}
                  ></i>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table
                  className="table table-striped table-hover mb-0"
                  style={{ tableLayout: "auto" }}
                >
                  <thead
                    style={{
                      background: "var(--topbar-bg)",
                      color: "var(--topbar-text)",
                    }}
                  >
                    <tr>
                      <th
                        style={{ width: "4%", minWidth: "40px" }}
                        className="text-center small fw-semibold"
                      >
                        #
                      </th>
                      <th
                        style={{ width: "12%", minWidth: "120px" }}
                        className="text-center small fw-semibold"
                      >
                        Actions
                      </th>
                      <th
                        style={{
                          width: "25%",
                          minWidth: "200px",
                          maxWidth: "300px",
                        }}
                        className="small fw-semibold"
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("last_name")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Personnel
                          <i
                            className={`ms-1 ${getSortIcon("last_name")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        style={{ width: "15%", minWidth: "150px" }}
                        className="small fw-semibold"
                      >
                        Department
                      </th>
                      <th
                        style={{ width: "15%", minWidth: "150px" }}
                        className="small fw-semibold"
                      >
                        Position
                      </th>
                      <th
                        style={{ width: "8%", minWidth: "80px" }}
                        className="text-center small fw-semibold"
                      >
                        Status
                      </th>
                      <th
                        style={{ width: "12%", minWidth: "140px" }}
                        className="small fw-semibold"
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("created_at")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Registered
                          <i
                            className={`ms-1 ${getSortIcon("created_at")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPersonnel.map((person, index) => {
                      const createdInfo = formatLocalDateTime(
                        person.created_at
                      );
                      return (
                        <tr key={person.id} className="align-middle">
                          <td
                            className="text-center fw-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {startIndex + index + 1}
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                              {/* View button */}
                              <button
                                className="btn btn-info btn-sm text-white"
                                onClick={() => openView(person)}
                                disabled={isActionDisabled(person.id)}
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
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                <i
                                  className="fas fa-eye"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              </button>

                              {/* Edit button */}
                              <button
                                className="btn btn-success btn-sm text-white"
                                onClick={() => openEdit(person)}
                                disabled={isActionDisabled(person.id)}
                                title="Edit personnel"
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
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                {actionLoading === person.id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                  ></span>
                                ) : (
                                  <i
                                    className="fas fa-edit"
                                    style={{ fontSize: "0.875rem" }}
                                  ></i>
                                )}
                              </button>

                              {/* Delete button */}
                              <button
                                className="btn btn-danger btn-sm text-white"
                                onClick={() => handleDelete(person)}
                                disabled={isActionDisabled(person.id)}
                                title="Delete Personnel"
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
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                {actionLoading === person.id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                  ></span>
                                ) : (
                                  <i
                                    className="fas fa-trash"
                                    style={{ fontSize: "0.875rem" }}
                                  ></i>
                                )}
                              </button>
                            </div>
                          </td>
                          <td
                            style={{
                              maxWidth: "300px",
                              overflow: "hidden",
                            }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <PersonnelAvatar person={person} />
                              <div
                                className="flex-grow-1"
                                style={{ minWidth: 0, overflow: "hidden" }}
                              >
                                <div
                                  className="fw-medium mb-1"
                                  style={{
                                    color: "var(--text-primary)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={getFullName(person)}
                                >
                                  {getFullName(person)}
                                </div>
                                <div
                                  className="small"
                                  style={{
                                    color: "var(--text-muted)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`@${person.username}`}
                                >
                                  @{person.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={person.department || "Not specified"}
                            >
                              {person.department || "Not specified"}
                            </div>
                          </td>
                          <td
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={person.position || "Not specified"}
                            >
                              {person.position || "Not specified"}
                            </div>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${
                                person.is_active !== false
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {person.is_active !== false
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <small
                              style={{
                                color: "var(--text-muted)",
                                paddingRight: "1rem",
                                display: "block",
                                whiteSpace: "nowrap",
                              }}
                            >
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
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {startIndex + 1}-
                          {Math.min(endIndex, filteredPersonnel.length)}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredPersonnel.length}
                        </span>{" "}
                        personnel
                      </small>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
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
                            e.target.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.target.style.backgroundColor =
                              "var(--primary-color)";
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
                            pages = Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            );
                          } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);

                            if (currentPage <= 2) {
                              end = 4;
                            } else if (currentPage >= totalPages - 1) {
                              start = totalPages - 3;
                            }

                            if (start > 2) {
                              pages.push("...");
                            }

                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }

                            if (end < totalPages - 1) {
                              pages.push("...");
                            }

                            if (totalPages > 1) {
                              pages.push(totalPages);
                            }
                          }

                          return pages.map((page, index) => (
                            <button
                              key={index}
                              className="btn btn-sm"
                              onClick={() =>
                                page !== "..." && setCurrentPage(page)
                              }
                              disabled={page === "..." || isActionDisabled()}
                              style={{
                                transition: "all 0.2s ease-in-out",
                                border: `2px solid ${
                                  currentPage === page
                                    ? "var(--primary-color)"
                                    : "var(--input-border)"
                                }`,
                                color:
                                  currentPage === page
                                    ? "white"
                                    : "var(--text-primary)",
                                backgroundColor:
                                  currentPage === page
                                    ? "var(--primary-color)"
                                    : "transparent",
                                minWidth: "40px",
                              }}
                              onMouseEnter={(e) => {
                                if (
                                  !e.target.disabled &&
                                  currentPage !== page
                                ) {
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 2px 4px rgba(0,0,0,0.1)";
                                  e.target.style.backgroundColor =
                                    "var(--primary-color)";
                                  e.target.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (
                                  !e.target.disabled &&
                                  currentPage !== page
                                ) {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                  e.target.style.backgroundColor =
                                    "transparent";
                                  e.target.style.color = "var(--text-primary)";
                                }
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
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={
                          currentPage === totalPages || isActionDisabled()
                        }
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.target.disabled) {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.target.style.backgroundColor =
                              "var(--primary-color)";
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

      {/* Add/Edit Modal */}
      {showModal && (
        <PersonnelFormModal
          editingPersonnel={editingPersonnel}
          existingPersonnel={personnel}
          onSubmit={async (savedData) => {
            await fetchPersonnel();
            handleCloseModal();
          }}
          onClose={handleCloseModal}
          actionLock={actionLock}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingPersonnel && (
        <ViewPersonnelModal
          personnel={viewingPersonnel}
          onClose={handleCloseViewModal}
        />
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

export default PersonnelMembers;
