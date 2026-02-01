import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaUsers } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert } from "../../../services/notificationService";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/NumberViewModal";
import DirectorFormModal from "./DirectorFormModal";
import ViewDirectorModal from "./ViewDirectorModal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DEFAULT_PAGE_SIZE = 10;

// Fixed dimensions for rectangle avatar and full-width card top (same as Personnel)
const AVATAR_RECTANGLE_WIDTH = 80;
const AVATAR_RECTANGLE_HEIGHT = 100;
const AVATAR_CARD_TOP_HEIGHT = 140;

// Global cache outside component to persist across re-renders
const loadedImagesCache = new Set();

// Director Avatar Component
const DirectorAvatar = React.memo(
  ({ person, size = 44, shape = "circle" }) => {
    const getDirectorAvatarUrl = useCallback((person) => {
      if (!person) return null;
      if (person.avatar_path) {
        // Ensure API base URL ends with /api
        const apiBase =
          (
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          ).replace(/\/api\/?$/, "") + "/api";

        let cleanFilename = person.avatar_path;

        // Handle different path formats
        if (person.avatar_path.includes("director-avatars/")) {
          cleanFilename = person.avatar_path.replace("director-avatars/", "");
        } else if (person.avatar_path.includes("avatars/")) {
          cleanFilename = person.avatar_path.replace("avatars/", "");
        }

        // Get just the filename
        cleanFilename = cleanFilename.split("/").pop();

        return `${apiBase}/director-avatar/${cleanFilename}`;
      }
      return null;
    }, []);

    const avatarUrl = person?.avatar_path
      ? getDirectorAvatarUrl(person)
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
        return person.name.charAt(0).toUpperCase() || "D";
      }
      return "D";
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

    const isCardTop = shape === "cardTop";
    const isRect = shape === "rectangle";
    const boxWidth = isCardTop ? "100%" : isRect ? AVATAR_RECTANGLE_WIDTH : size;
    const boxHeight = isCardTop ? "100%" : isRect ? AVATAR_RECTANGLE_HEIGHT : size;
    const boxRadius = isCardTop ? 0 : isRect ? "8px" : "50%";

    if (person.avatar_path && !imageError && avatarUrl) {
      return (
        <div
          className="overflow-hidden border position-relative"
          style={{
            width: boxWidth,
            height: boxHeight,
            borderRadius: boxRadius,
            borderColor: "#e1e6ef",
            flexShrink: 0,
            backgroundColor: "var(--background-light)",
          }}
        >
          {/* Loading state: shimmer skeleton while image fetches */}
          {imageLoading && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                backgroundColor: "var(--background-light)",
                zIndex: 2,
              }}
            >
              <div
                className="w-100 h-100"
                style={{
                  borderRadius: boxRadius,
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
            className="border-0"
            style={{
              width: "100%",
              height: "100%",
              objectFit: isRect || isCardTop ? "contain" : "cover",
              opacity: imageLoading ? 0 : 1,
              transition: "opacity 0.3s ease-in-out",
              borderRadius: boxRadius,
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    }

    return (
      <div
        className="d-flex align-items-center justify-content-center text-white fw-bold"
        style={{
          width: boxWidth,
          height: boxHeight,
          borderRadius: boxRadius,
          backgroundColor: "var(--primary-color)",
          flexShrink: 0,
        }}
      >
        {getInitials(person)}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.person?.id === nextProps.person?.id &&
      prevProps.person?.avatar_path === nextProps.person?.avatar_path &&
      prevProps.size === nextProps.size &&
      prevProps.shape === nextProps.shape
    );
  }
);

DirectorAvatar.displayName = "DirectorAvatar";

const DirectorMembers = () => {
  const { user: currentUser } = useAuth();
  const [director, setDirector] = useState([]);
  const [filteredDirector, setFilteredDirector] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingDirector, setEditingDirector] = useState(null);
  const [viewingDirector, setViewingDirector] = useState(null);

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

  const filterAndSortDirector = useCallback(() => {
    let filtered = [...director];

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
          person.contact_information || "",
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

    setFilteredDirector(filtered);
    setCurrentPage(1);
  }, [director, searchTerm, filterStatus, sortField, sortDirection]);

  useEffect(() => {
    fetchDirector();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortDirector();
  }, [filterAndSortDirector]);

  const fetchDirector = async () => {
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
        `${API_BASE_URL}/ict-admin/directors?${params.toString()}`,
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
          data.message || "Failed to load director records from server."
        );
      }

      const items = data.data?.items || [];
      setDirector(items);
    } catch (error) {
      console.error("Error fetching director:", error);
      toast.error(
        error.message ||
          "An error occurred while loading director members. Please try again."
      );
      setDirector([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      toast.warning("Please wait until current action completes");
      return;
    }
    await fetchDirector();
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

  const isActionDisabled = (directorId = null) => {
    return actionLock || (actionLoading && actionLoading !== directorId);
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
      "Delete Director",
      `Are you sure you want to delete ${getFullName(record)} (${record.username})? This action cannot be undone.`,
      "Delete",
      "Cancel"
    );

    if (!confirm.isConfirmed) return;

    try {
      setActionLock(true);
      setActionLoading(record.id);
      showAlert.loading("Deleting director...");

      const response = await fetch(
        `${API_BASE_URL}/ict-admin/directors/${record.id}`,
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
          data?.message || "Failed to delete director from server."
        );
      }

      showAlert.close();
      toast.success(`Director ${getFullName(record)} has been deleted.`);

      // Remove from list
      setDirector((prev) => prev.filter((p) => p.id !== record.id));
    } catch (error) {
      console.error("Error deleting director:", error);
      showAlert.close();
      toast.error(error.message || "Unable to delete director. Please try again.");
    } finally {
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const openCreate = () => {
    setEditingDirector(null);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingDirector(record);
    setShowModal(true);
  };

  const openView = (record) => {
    setViewingDirector(record);
    setShowViewModal(true);
  };

  const handleCloseModal = () => {
    if (!actionLock) {
      setShowModal(false);
      setTimeout(() => {
        setEditingDirector(null);
      }, 300); // Wait for animation to complete
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setTimeout(() => {
      setViewingDirector(null);
    }, 300);
  };

  // Pagination
  const totalPages = Math.ceil(filteredDirector.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDirector = filteredDirector.slice(startIndex, endIndex);

  // Stats
  const stats = useMemo(() => {
    return {
      total: director.length,
      active: director.filter((p) => p.is_active !== false).length,
      inactive: director.filter((p) => p.is_active === false).length,
      filtered: filteredDirector.length,
    };
  }, [director, filteredDirector]);

  if (loading) {
  return (
      <div className="container-fluid py-2 director-management-container">
        <LoadingSpinner text="Loading director members..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 director-management-container page-enter">
      <style>{`
        .director-management-container .director-card:hover .director-card-actions {
          opacity: 1 !important;
        }
        .director-management-container .director-card-edit-btn {
          background-color: #d97706 !important;
          border-color: #d97706 !important;
          color: #ffffff !important;
        }
        .director-management-container .director-card-edit-btn:hover:not(:disabled) {
          background-color: #b45309 !important;
          border-color: #b45309 !important;
          color: #ffffff !important;
        }
        .director-management-container .director-card-delete-btn:hover:not(:disabled) {
          background-color: #b02a37 !important;
          border-color: #b02a37 !important;
          color: #ffffff !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(220, 53, 69, 0.4);
        }
        @media (max-width: 767.98px) {
          .director-management-container .director-card .director-card-actions {
            opacity: 1 !important;
          }
        }
        @media (max-width: 767.98px) {
          .director-management-container .director-cards-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            margin-left: -0.25rem !important;
            margin-right: -0.25rem !important;
            padding: 0.5rem 0 !important;
            gap: 0 !important;
          }
          .director-management-container .director-cards-grid > [class*="col-"] {
            flex: 0 0 50% !important;
            max-width: 50% !important;
            width: 50% !important;
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
            padding-bottom: 0.5rem !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
          }
          .director-management-container .director-card-top-strip {
            height: 90px !important;
          }
          .director-management-container .director-card .card-body {
            padding: 0.5rem 0.6rem !important;
          }
          .director-management-container .director-card .fw-semibold {
            font-size: 0.8rem !important;
          }
          .director-management-container .director-card .director-card-actions .btn {
            width: 28px !important;
            height: 28px !important;
            font-size: 0.7rem !important;
          }
          .director-management-container .director-card .director-card-actions {
            padding: 0.25rem !important;
          }
          .director-management-container .director-card .small {
            font-size: 0.7rem !important;
          }
          .director-management-container .director-card .badge {
            font-size: 0.6rem !important;
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
            Director Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage director accounts and access permissions
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
            Add Director
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
                    Total Directors
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      handleNumberClick("Total Directors", stats.total)
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
                    Active Directors
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      handleNumberClick("Active Directors", stats.active)
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
                Search Director
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
                  placeholder="Search by name, username, department, position, or contact..."
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
              Director
              <small className="opacity-75 ms-2 text-white">
                ({filteredDirector.length} found
                {searchTerm || filterStatus !== "all" ? " after filtering" : ""}
                )
              </small>
            </h5>
          </div>
        </div>

        <div className="card-body p-0">
          {currentDirector.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-users fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {director.length === 0
                  ? "No Director"
                  : "No Matching Results"}
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                {director.length === 0
                  ? "No director have been registered yet."
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
              <div
                className="d-flex flex-wrap align-items-center gap-2 px-3 py-2 border-bottom"
                style={{
                  backgroundColor: "var(--background-light)",
                  borderColor: "var(--input-border)",
                }}
              >
                <span className="small text-muted">Sort:</span>
                <button
                  className="btn btn-sm btn-outline-secondary py-1"
                  onClick={() => handleSort("last_name")}
                  disabled={isActionDisabled()}
                >
                  Name <i className={`ms-1 ${getSortIcon("last_name")}`}></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary py-1"
                  onClick={() => handleSort("created_at")}
                  disabled={isActionDisabled()}
                >
                  Registered <i className={`ms-1 ${getSortIcon("created_at")}`}></i>
                </button>
              </div>

              <div
                className="row g-2 g-sm-3 p-2 p-sm-3 director-cards-grid"
                style={{ minHeight: "200px" }}
              >
                {currentDirector.map((person, index) => {
                  const createdInfo = formatLocalDateTime(person.created_at);
                  return (
                    <div
                      key={person.id}
                      className="col-6 col-md-4 col-lg-3"
                    >
                      <div
                        className="director-card h-100 position-relative rounded-3 border overflow-hidden"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          !isActionDisabled(person.id) && openView(person)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!isActionDisabled(person.id)) openView(person);
                          }
                        }}
                        style={{
                          backgroundColor: "var(--background-white)",
                          borderColor: "var(--input-border)",
                          cursor: isActionDisabled(person.id)
                            ? "not-allowed"
                            : "pointer",
                          transition:
                            "box-shadow 0.2s ease, transform 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActionDisabled(person.id)) {
                            e.currentTarget.style.boxShadow =
                              "0 8px 24px rgba(0,0,0,0.1)";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div
                          className="director-card-top-strip w-100 overflow-hidden position-relative"
                          style={{
                            height: AVATAR_CARD_TOP_HEIGHT,
                            flexShrink: 0,
                            backgroundColor: "var(--background-light)",
                          }}
                        >
                          <DirectorAvatar person={person} shape="cardTop" />
                        </div>

                        <div
                          className="director-card-actions position-absolute top-0 end-0 d-flex gap-1 p-2"
                          style={{
                            zIndex: 2,
                            opacity: 0,
                            transition: "opacity 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            const card =
                              e.currentTarget.closest(".director-card");
                            if (card) {
                              const actions = card.querySelector(
                                ".director-card-actions"
                              );
                              if (actions) actions.style.opacity = "1";
                            }
                          }}
                          onMouseLeave={(e) => {
                            const card =
                              e.currentTarget.closest(".director-card");
                            if (card) {
                              const actions = card.querySelector(
                                ".director-card-actions"
                              );
                              if (actions) actions.style.opacity = "0";
                            }
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm shadow-sm director-card-edit-btn"
                            title="Edit director"
                            disabled={isActionDisabled(person.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(person);
                            }}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: "#d97706",
                              color: "#ffffff",
                              border: "2px solid #d97706",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {actionLoading === person.id ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                              />
                            ) : (
                              <i
                                className="fas fa-edit"
                                style={{ fontSize: "0.8rem" }}
                              />
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm shadow-sm director-card-action-btn director-card-delete-btn"
                            title="Delete director"
                            disabled={isActionDisabled(person.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(person);
                            }}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "2px solid #dc3545",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <i
                              className="fas fa-trash"
                              style={{ fontSize: "0.8rem" }}
                            />
                          </button>
                        </div>

                        <div className="card-body p-3">
                          <div className="mb-2">
                            <div
                              className="fw-semibold mb-0"
                              style={{
                                color: "var(--text-primary)",
                                fontSize: "0.95rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={getFullName(person)}
                            >
                              {getFullName(person)}
                            </div>
                            <div
                              className="small text-muted mt-1"
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={`@${person.username}`}
                            >
                              @{person.username}
                            </div>
                          </div>
                          <div
                            className="mt-3 pt-3"
                            style={{
                              borderTop: "1px solid var(--input-border)",
                            }}
                          >
                            <div className="small d-flex justify-content-between align-items-center mb-1">
                              <span className="text-muted">Department</span>
                              <span
                                className="fw-medium text-truncate ms-2"
                                style={{
                                  color: "var(--text-primary)",
                                  maxWidth: "60%",
                                }}
                                title={person.department || "—"}
                              >
                                {person.department || "—"}
                              </span>
                            </div>
                            <div className="small d-flex justify-content-between align-items-center mb-1">
                              <span className="text-muted">Position</span>
                              <span
                                className="fw-medium text-truncate ms-2"
                                style={{
                                  color: "var(--text-primary)",
                                  maxWidth: "60%",
                                }}
                                title={person.position || "—"}
                              >
                                {person.position || "—"}
                              </span>
                            </div>
                            <div className="small d-flex justify-content-between align-items-center mb-1">
                              <span className="text-muted">Contact</span>
                              <span
                                className="fw-medium text-truncate ms-2"
                                style={{
                                  color: "var(--text-primary)",
                                  maxWidth: "60%",
                                }}
                                title={person.contact_information || "—"}
                              >
                                {person.contact_information || "—"}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-1">
                              <span
                                className={`badge ${
                                  person.is_active !== false
                                    ? "bg-success"
                                    : "bg-secondary"
                                }`}
                                style={{ fontSize: "0.7rem" }}
                              >
                                {person.is_active !== false
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                              <small
                                className="text-muted"
                                style={{ fontSize: "0.7rem" }}
                              >
                                {createdInfo.date}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                          {Math.min(endIndex, filteredDirector.length)}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredDirector.length}
                        </span>{" "}
                        director
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
        <DirectorFormModal
          editingDirector={editingDirector}
          existingDirector={director}
          onSubmit={async (savedData) => {
            await fetchDirector();
            handleCloseModal();
          }}
          onClose={handleCloseModal}
          actionLock={actionLock}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingDirector && (
        <ViewDirectorModal
          director={viewingDirector}
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

export default DirectorMembers;
