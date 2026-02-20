import React, { useState, useEffect, useCallback } from "react";
import { FaUserCircle, FaSyncAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const DirectorProfile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/directors/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) throw data?.message || "Failed to load profile";
      setProfile(data?.data?.profile ?? null);
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to load profile"
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser?.role === "director") {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [authUser?.role, fetchProfile]);

  const displayProfile = profile || {
    name: authUser?.name ?? "—",
    username: authUser?.username ?? "—",
    position: authUser?.position ?? "—",
    department: authUser?.department ?? "—",
    phone: null,
    is_active: true,
    avatar: authUser?.avatar ?? null,
    first_name: null,
    middle_name: null,
    last_name: null,
    director_level: null,
    contact_information: null,
  };

  const btnOutline = {
    transition: "all 0.2s ease-in-out",
    border: "2px solid var(--primary-color)",
    color: "var(--primary-color)",
    backgroundColor: "transparent",
    borderRadius: "4px",
  };

  if (loading && !profile && !authUser) {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 page-enter">
      <style>{`
        .director-profile-shell {
          animation: pageEnter 0.35s ease-out;
        }
        .director-profile-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          margin-bottom: 1rem;
        }
        .director-profile-header-icon {
          width: 2.5rem;
          height: 2.5rem;
          min-width: 2.5rem;
          min-height: 2.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.06);
          color: var(--primary-color);
          border: 1px solid rgba(13, 122, 58, 0.15);
        }
        .director-profile-header-icon svg {
          width: 1rem;
          height: 1rem;
        }
        .director-profile-card {
          border-radius: 0.5rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
        }
        .director-profile-card .card-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.1));
          border-bottom: 1px solid rgba(13,122,58,0.12);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .director-profile-avatar {
          width: 4rem;
          height: 4rem;
          min-width: 4rem;
          min-height: 4rem;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(13,122,58,0.2);
        }
        .director-profile-row {
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 0.75rem 1rem;
        }
        .director-profile-row:last-child {
          border-bottom: 0;
        }
        .director-profile-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }
        .director-profile-value {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .director-profile-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-color);
          background-color: rgba(13,122,58,0.1);
          border: 1px solid rgba(13,122,58,0.2);
        }
        @media (max-width: 575.98px) {
          .director-profile-header {
            padding: 0.85rem 0.9rem;
          }
        }
      `}</style>

      <div className="director-profile-shell">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
          <div className="flex-grow-1 mb-2 mb-md-0">
            <h1
              className="h4 mb-1 fw-bold d-flex align-items-center"
              style={{ color: "var(--text-primary)" }}
            >
              <div className="director-profile-header-icon me-2">
                <FaUserCircle />
              </div>
              Profile
            </h1>
            <p className="mb-0 small ms-2" style={{ color: "var(--text-muted)" }}>
              Your account and employment details from the system.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={btnOutline}
            onClick={fetchProfile}
            disabled={loading}
          >
            <FaSyncAlt className="me-1" /> Refresh
          </button>
        </div>

        <div className="card director-profile-card shadow-sm">
          <div className="card-header">Personal information</div>
          <div className="card-body p-0">
            <div className="d-flex align-items-center gap-3 p-3 border-bottom" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              {displayProfile.avatar ? (
                <img
                  src={displayProfile.avatar}
                  alt=""
                  className="director-profile-avatar"
                />
              ) : (
                <div
                  className="director-profile-avatar d-flex align-items-center justify-content-center bg-light text-secondary"
                  style={{ fontSize: "1.5rem" }}
                >
                  <FaUserCircle />
                </div>
              )}
              <div>
                <div className="fw-bold" style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                  {displayProfile.name || "—"}
                </div>
                <span className="director-profile-chip mt-1">
                  {displayProfile.position || "Director"}
                </span>
              </div>
            </div>

            <div className="director-profile-row">
              <div className="director-profile-label">Username</div>
              <div className="director-profile-value">{displayProfile.username || "—"}</div>
            </div>
            <div className="director-profile-row">
              <div className="director-profile-label">Full name</div>
              <div className="director-profile-value">{displayProfile.name || "—"}</div>
            </div>
            {(displayProfile.first_name != null || displayProfile.last_name != null) && (
              <>
                <div className="director-profile-row">
                  <div className="director-profile-label">First name</div>
                  <div className="director-profile-value">{displayProfile.first_name ?? "—"}</div>
                </div>
                {displayProfile.middle_name != null && (
                  <div className="director-profile-row">
                    <div className="director-profile-label">Middle name</div>
                    <div className="director-profile-value">{displayProfile.middle_name}</div>
                  </div>
                )}
                <div className="director-profile-row">
                  <div className="director-profile-label">Last name</div>
                  <div className="director-profile-value">{displayProfile.last_name ?? "—"}</div>
                </div>
              </>
            )}
            <div className="director-profile-row">
              <div className="director-profile-label">Position</div>
              <div className="director-profile-value">{displayProfile.position || "—"}</div>
            </div>
            <div className="director-profile-row">
              <div className="director-profile-label">Department</div>
              <div className="director-profile-value">{displayProfile.department || "—"}</div>
            </div>
            {displayProfile.director_level && (
              <div className="director-profile-row">
                <div className="director-profile-label">Director Level</div>
                <div className="director-profile-value">{displayProfile.director_level}</div>
              </div>
            )}
            <div className="director-profile-row">
              <div className="director-profile-label">Phone</div>
              <div className="director-profile-value">{displayProfile.phone || "—"}</div>
            </div>
            {displayProfile.contact_information && (
              <div className="director-profile-row">
                <div className="director-profile-label">Contact Information</div>
                <div className="director-profile-value">{displayProfile.contact_information}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorProfile;
