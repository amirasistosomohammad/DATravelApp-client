import React, { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFileAlt,
  FaClipboardCheck,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const DirectDashboard = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Dummy data
  const stats = {
    pending: 8,
    approved: 24,
    rejected: 3,
    total: 35,
  };

  const pendingReviews = [
    {
      id: 1,
      personnel: "John Doe",
      travelPurpose: "Attend Training Workshop",
      destination: "Manila",
      startDate: "2026-02-15",
      endDate: "2026-02-18",
      submittedAt: "2026-01-20",
      daysPending: 2,
    },
    {
      id: 2,
      personnel: "Jane Smith",
      travelPurpose: "Regional Meeting",
      destination: "Cebu",
      startDate: "2026-02-10",
      endDate: "2026-02-12",
      submittedAt: "2026-01-19",
      daysPending: 3,
    },
    {
      id: 3,
      personnel: "Michael Johnson",
      travelPurpose: "Field Inspection",
      destination: "Zamboanga City",
      startDate: "2026-02-05",
      endDate: "2026-02-07",
      submittedAt: "2026-01-18",
      daysPending: 4,
    },
  ];

  const theme = {
    primary: "#0C8A3B",
    primaryDark: "#0A6B2E",
    primaryLight: "#0EA045",
    accent: "#F8C202",
  };

  if (loading) {
    return <LoadingSpinner text="Loading director dashboard..." />;
  }

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: "#1a1a1a" }}>
          <FaClipboardCheck className="me-2" />
          Director Dashboard
        </h4>
        <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
          Review and manage travel order approvals.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-sm-6">
          <div
            className="card h-100 shadow-sm"
            style={{
              border: "none",
              borderRadius: "12px",
              borderLeft: "4px solid #ffc107",
            }}
          >
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#fff3cd",
                  }}
                >
                  <FaClock size={24} style={{ color: "#856404" }} />
                </div>
                <div>
                  <div className="text-muted small mb-1">Pending Reviews</div>
                  <div className="h4 mb-0 fw-bold" style={{ color: "#856404" }}>
                    {stats.pending}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div
            className="card h-100 shadow-sm"
            style={{
              border: "none",
              borderRadius: "12px",
              borderLeft: "4px solid #198754",
            }}
          >
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#d4edda",
                  }}
                >
                  <FaCheckCircle size={24} style={{ color: "#155724" }} />
                </div>
                <div>
                  <div className="text-muted small mb-1">Approved</div>
                  <div className="h4 mb-0 fw-bold" style={{ color: "#155724" }}>
                    {stats.approved}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div
            className="card h-100 shadow-sm"
            style={{
              border: "none",
              borderRadius: "12px",
              borderLeft: "4px solid #dc3545",
            }}
          >
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#f8d7da",
                  }}
                >
                  <FaTimesCircle size={24} style={{ color: "#721c24" }} />
                </div>
                <div>
                  <div className="text-muted small mb-1">Rejected</div>
                  <div className="h4 mb-0 fw-bold" style={{ color: "#721c24" }}>
                    {stats.rejected}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div
            className="card h-100 shadow-sm"
            style={{
              border: "none",
              borderRadius: "12px",
              borderLeft: `4px solid ${theme.primary}`,
            }}
          >
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: `${theme.primary}20`,
                  }}
                >
                  <FaFileAlt size={24} style={{ color: theme.primary }} />
                </div>
                <div>
                  <div className="text-muted small mb-1">Total Reviewed</div>
                  <div
                    className="h4 mb-0 fw-bold"
                    style={{ color: theme.primary }}
                  >
                    {stats.total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Reviews */}
      <div
        className="card shadow-sm"
        style={{ border: "none", borderRadius: "12px" }}
      >
        <div
          className="card-header bg-white d-flex justify-content-between align-items-center"
          style={{
            borderBottom: "1px solid #e5e7eb",
            borderRadius: "12px 12px 0 0",
            padding: "1.25rem 1.5rem",
          }}
        >
          <h5 className="mb-0 fw-bold" style={{ color: "#1a1a1a" }}>
            Pending Reviews
          </h5>
          <Link
            to="/pending-reviews"
            className="btn btn-sm"
            style={{
              backgroundColor: theme.primary,
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            View All
          </Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#4a5c4a",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Personnel
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#4a5c4a",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Travel Purpose
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#4a5c4a",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Destination
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#4a5c4a",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Travel Dates
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#4a5c4a",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Days Pending
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#4a5c4a",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.map((review) => (
                  <tr
                    key={review.id}
                    style={{
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(12, 138, 59, 0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                      {review.personnel}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                      {review.travelPurpose}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                      {review.destination}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                      {new Date(review.startDate).toLocaleDateString()} -{" "}
                      {new Date(review.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "#fff3cd",
                          color: "#856404",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                        }}
                      >
                        {review.daysPending} days
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <Link
                        to={`/pending-reviews/${review.id}`}
                        className="btn btn-sm"
                        style={{
                          backgroundColor: theme.primary,
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.375rem 0.75rem",
                          fontSize: "0.8rem",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = theme.primaryDark;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = theme.primary;
                        }}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectDashboard;
