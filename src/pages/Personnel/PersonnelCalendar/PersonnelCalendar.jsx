import React, { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  startOfMonth,
  endOfMonth,
  isSameDay,
  setMonth,
  setYear,
  getMonth,
  getYear,
  addMonths,
  subMonths,
} from "date-fns";
import { enUS } from "date-fns/locale";
import {
  FaCalendarAlt,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import ViewTravelOrderModal from "../TravelOrders/ViewTravelOrderModal";
import "react-big-calendar/lib/css/react-big-calendar.css";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const statusColors = {
  draft: { bg: "rgba(148, 163, 184, 0.2)", border: "rgba(148, 163, 184, 0.5)" },
  pending: { bg: "rgba(255, 179, 0, 0.2)", border: "rgba(255, 179, 0, 0.5)" },
  approved: { bg: "rgba(34, 197, 94, 0.2)", border: "rgba(34, 197, 94, 0.5)" },
  rejected: { bg: "rgba(248, 113, 113, 0.2)", border: "rgba(248, 113, 113, 0.5)" },
};

const PersonnelCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [range, setRange] = useState(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  });
  const [viewModalOrderId, setViewModalOrderId] = useState(null);
  const token = localStorage.getItem("token");

  const fetchCalendar = useCallback(
    async (start, end) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(end, "yyyy-MM-dd");
        const url = `${API_BASE_URL}/personnel/travel-orders/calendar?start=${startStr}&end=${endStr}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const data = await response.json();
        if (!response.ok) throw data?.message || "Failed to load calendar";
        const items = data?.data?.items ?? [];
        const mapped = items.map((order) => {
          // Create new Date objects to avoid mutating
          const startDateRaw = order.start_date ? new Date(order.start_date) : new Date();
          const endDateRaw = order.end_date ? new Date(order.end_date) : new Date(startDateRaw);
          
          // Set start to beginning of day (00:00:00)
          const startDate = new Date(startDateRaw);
          startDate.setHours(0, 0, 0, 0);
          
          // For all-day events in react-big-calendar, end should be exclusive
          // If travel is Feb 19-27, end should be Feb 28 00:00 (exclusive, so Feb 28 won't be shaded)
          // We add 1 day to the end_date and set to midnight
          const endExclusive = new Date(endDateRaw);
          endExclusive.setDate(endExclusive.getDate() + 1);
          endExclusive.setHours(0, 0, 0, 0);
          
          // Use original dates for display (before modification)
          const destination = order.destination || order.travel_purpose || "No destination";
          const startStr = format(startDateRaw, "MMM d");
          const endStr = format(endDateRaw, "MMM d");
          const dateRange = isSameDay(startDateRaw, endDateRaw) 
            ? startStr 
            : `${startStr} - ${endStr}`;
          const title = `${destination} (${dateRange})`;
          return {
            id: order.id,
            title: title,
            start: startDate,
            end: endExclusive,
            allDay: true,
            resource: order,
          };
        });
        setEvents(mapped);
      } catch (err) {
        toast.error(
          typeof err === "string" ? err : err?.message || "Failed to load calendar"
        );
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user?.role === "personnel" && range.start && range.end) {
      fetchCalendar(range.start, range.end);
    } else if (user?.role !== "personnel") {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, range.start, range.end]);

  const handleRangeChange = useCallback((newRange) => {
    if (newRange && typeof newRange === "object" && !Array.isArray(newRange) && newRange.start && newRange.end) {
      setRange({ start: newRange.start, end: newRange.end });
      setCurrentDate(newRange.start);
    }
    if (Array.isArray(newRange) && newRange.length > 0) {
      const start = newRange[0];
      const end = newRange[newRange.length - 1];
      if (start && end) {
        setRange({ start, end });
        setCurrentDate(start);
      }
    }
  }, []);

  const handleNavigate = useCallback((direction) => {
    const newDate = direction === "prev" 
      ? subMonths(currentDate, 1)
      : addMonths(currentDate, 1);
    setCurrentDate(newDate);
    const newRange = {
      start: startOfMonth(newDate),
      end: endOfMonth(newDate),
    };
    setRange(newRange);
  }, [currentDate]);

  const handleMonthChange = useCallback((e) => {
    const month = parseInt(e.target.value);
    const newDate = setMonth(currentDate, month);
    setCurrentDate(newDate);
    const newRange = {
      start: startOfMonth(newDate),
      end: endOfMonth(newDate),
    };
    setRange(newRange);
  }, [currentDate]);

  const handleYearChange = useCallback((e) => {
    const year = parseInt(e.target.value);
    const newDate = setYear(currentDate, year);
    setCurrentDate(newDate);
    const newRange = {
      start: startOfMonth(newDate),
      end: endOfMonth(newDate),
    };
    setRange(newRange);
  }, [currentDate]);

  const handleToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    const newRange = {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
    setRange(newRange);
  }, []);

  const handleSelectEvent = useCallback(
    (event) => {
      const orderId = event?.id;
      if (!orderId) return;
      setViewModalOrderId(orderId);
    },
    [setViewModalOrderId]
  );

  const handleRefresh = useCallback(() => {
    if (range.start && range.end) {
      fetchCalendar(range.start, range.end);
    }
  }, [fetchCalendar, range.start, range.end]);

  const eventStyleGetter = useCallback((event) => {
    const status = event.resource?.status || "draft";
    const colors = statusColors[status] || statusColors.draft;
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        borderRadius: "4px",
        color: "var(--text-primary)",
      },
    };
  }, []);

  if (loading && events.length === 0 && user?.role === "personnel") {
    return (
      <div className="container-fluid py-2">
        <LoadingSpinner text="Loading calendar..." />
      </div>
    );
  }

  return (
    <div className="container-fluid px-1 py-2 page-enter">
      <style>{`
        .personnel-calendar-shell {
          animation: pageEnter 0.35s ease-out;
        }
        .personnel-calendar-header {
          background: linear-gradient(135deg, rgba(13,122,58,0.05), rgba(13,122,58,0.12));
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          margin-bottom: 1rem;
        }
        .personnel-calendar-header > div {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .personnel-calendar-title-section {
          flex: 0 1 auto;
        }
        .personnel-calendar-actions {
          flex: 0 0 auto;
          flex-shrink: 0;
        }
        @media (min-width: 992px) {
          .personnel-calendar-header {
            padding: 1rem 1.5rem;
          }
          .personnel-calendar-header > div {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
          }
          .personnel-calendar-title-section {
            flex: 0 1 auto;
            max-width: 45%;
          }
          .personnel-calendar-actions {
            flex: 0 0 auto;
            flex-shrink: 0;
            margin-left: auto;
          }
        }
        @media (min-width: 1200px) {
          .personnel-calendar-header {
            padding: 1.15rem 1.75rem;
          }
          .personnel-calendar-header > div {
            gap: 3rem;
          }
          .personnel-calendar-title-section {
            max-width: 40%;
          }
        }
        @media (min-width: 1400px) {
          .personnel-calendar-header > div {
            gap: 4rem;
          }
        }
        .personnel-calendar-header-icon {
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
        .personnel-calendar-header-icon svg {
          width: 1rem;
          height: 1rem;
        }
        .personnel-calendar-card {
          border-radius: 0.5rem;
          border: 1px solid rgba(13,122,58,0.12);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }
        .personnel-calendar-tabs {
          display: flex;
          border-bottom: 1px solid rgba(13,122,58,0.15);
          background: rgba(13,122,58,0.03);
          padding: 0;
          margin: 0;
        }
        .personnel-calendar-tab {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          position: relative;
        }
        .personnel-calendar-tab:hover:not(.active) {
          background: rgba(13,122,58,0.05);
          color: var(--primary-color);
        }
        .personnel-calendar-tab.active {
          color: var(--primary-color);
          background: #fff;
          border-bottom-color: var(--primary-color);
          font-weight: 600;
        }
        .personnel-calendar-tab:focus {
          outline: none;
          box-shadow: inset 0 0 0 2px rgba(13,122,58,0.2);
        }
        .personnel-calendar-card .card-body {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .personnel-calendar-card .rbc-calendar {
          font-family: inherit;
        }
        .personnel-calendar-card .rbc-header {
          padding: 0.5rem 0.25rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-primary);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          font-weight: 600;
        }
        .personnel-calendar-card .rbc-day-bg {
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .personnel-calendar-card .rbc-day-bg:hover {
          background-color: rgba(13, 122, 58, 0.08);
          box-shadow: inset 0 0 0 1px rgba(13, 122, 58, 0.15);
        }
        .personnel-calendar-card .rbc-today {
          background: rgba(13, 122, 58, 0.06);
          font-weight: 600;
        }
        .personnel-calendar-card .rbc-today:hover {
          background: rgba(13, 122, 58, 0.12);
          box-shadow: inset 0 0 0 2px rgba(13, 122, 58, 0.25);
        }
        .personnel-calendar-card .rbc-off-range-bg {
          background: rgba(0,0,0,0.02);
        }
        .personnel-calendar-card .rbc-off-range-bg:hover {
          background: rgba(0,0,0,0.04);
        }
        .personnel-calendar-card .rbc-date-cell {
          transition: all 0.2s ease;
        }
        .personnel-calendar-card .rbc-date-cell:hover {
          background-color: rgba(13, 122, 58, 0.05);
        }
        .personnel-calendar-card .rbc-date-cell.rbc-now {
          font-weight: 700;
          color: var(--primary-color);
        }
        .personnel-calendar-card .rbc-event {
          padding: 4px 8px;
          font-size: 0.8rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all 0.2s ease;
          cursor: pointer;
          border-radius: 3px;
        }
        .personnel-calendar-card .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0,0,0,0.15);
          z-index: 10;
          position: relative;
        }
        .personnel-calendar-card .rbc-event-content {
          font-weight: 500;
          transition: font-weight 0.2s ease;
        }
        .personnel-calendar-card .rbc-event:hover .rbc-event-content {
          font-weight: 600;
        }
        /* Show all events - remove truncation */
        .personnel-calendar-card .rbc-month-view .rbc-day-bg {
          overflow: visible;
        }
        .personnel-calendar-card .rbc-month-row {
          overflow: visible;
        }
        .personnel-calendar-card .rbc-row-content {
          overflow: visible;
        }
        .personnel-calendar-card .rbc-row-segment {
          overflow: visible;
        }
        .personnel-calendar-card .rbc-show-more {
          display: none !important;
        }
        .personnel-calendar-card .rbc-event {
          display: block !important;
          overflow: visible;
        }
        .personnel-calendar-card .rbc-time-slot {
          transition: background-color 0.15s ease;
        }
        .personnel-calendar-card .rbc-time-slot:hover {
          background-color: rgba(13, 122, 58, 0.03);
        }
        .personnel-calendar-card .rbc-time-content {
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .personnel-calendar-card .rbc-time-header-content {
          border-left: 1px solid rgba(0,0,0,0.06);
        }
        .personnel-calendar-card .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid rgba(0,0,0,0.04);
        }
        .personnel-calendar-card .rbc-day-slot .rbc-time-slot:hover {
          background-color: rgba(13, 122, 58, 0.05);
        }
        .personnel-calendar-card .rbc-agenda-view table tbody > tr {
          transition: background-color 0.15s ease;
        }
        .personnel-calendar-card .rbc-agenda-view table tbody > tr:hover {
          background-color: rgba(13, 122, 58, 0.06);
        }
        .personnel-calendar-card .rbc-agenda-view table tbody > tr > td {
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .personnel-calendar-card .rbc-toolbar button {
          border-radius: 0;
          border: 1px solid rgba(13,122,58,0.2);
          color: var(--primary-color);
          background: #fff;
          padding: 0.35rem 0.75rem;
          font-size: 0.85rem;
        }
        .personnel-calendar-card .rbc-toolbar button:hover,
        .personnel-calendar-card .rbc-toolbar button.rbc-active {
          background: var(--primary-color);
          color: #fff;
          border-color: var(--primary-color);
        }
        .personnel-calendar-card .rbc-toolbar-label {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .personnel-calendar-card .rbc-toolbar {
          display: none;
        }
        .personnel-calendar-nav-container {
          background: #fff;
          border: 1px solid rgba(13,122,58,0.15);
          border-radius: 0.375rem;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          box-shadow: 0 1px 3px rgba(15,23,42,0.08);
        }
        .personnel-calendar-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .personnel-calendar-nav-divider {
          width: 1px;
          height: 1.75rem;
          background: rgba(13,122,58,0.2);
          margin: 0 0.25rem;
        }
        .personnel-calendar-nav button {
          min-height: 2rem;
          white-space: nowrap;
          flex-shrink: 0;
          border-radius: 0;
          border: 1px solid rgba(13,122,58,0.25);
          background: #fff;
          color: var(--primary-color);
          font-weight: 500;
          font-size: 0.8rem;
          padding: 0.4rem 0.75rem;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .personnel-calendar-nav button:hover:not(:disabled) {
          background: var(--primary-color);
          color: #fff;
          border-color: var(--primary-color);
          box-shadow: 0 2px 4px rgba(13,122,58,0.2);
        }
        .personnel-calendar-nav button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .personnel-calendar-nav select {
          cursor: pointer;
          min-height: 2rem;
          min-width: 120px;
          padding: 0.4rem 0.75rem;
          line-height: 1.2;
          border-radius: 0;
          border: 1px solid rgba(13,122,58,0.25);
          background: #fff;
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.85rem;
          transition: all 0.15s ease;
        }
        .personnel-calendar-nav select:hover:not(:disabled) {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(13,122,58,0.1);
        }
        .personnel-calendar-nav select:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(13,122,58,0.15);
        }
        .personnel-calendar-nav select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: rgba(0,0,0,0.02);
        }
        .personnel-calendar-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .personnel-calendar-actions button {
          border-radius: 0;
          border: 1px solid var(--primary-color);
          font-weight: 500;
          font-size: 0.8rem;
          padding: 0.4rem 0.75rem;
          transition: all 0.15s ease;
        }
        .personnel-calendar-actions .btn-refresh {
          background: var(--primary-color);
          color: #fff;
        }
        .personnel-calendar-actions .btn-refresh:hover:not(:disabled) {
          background: #0a6b2d;
          box-shadow: 0 2px 6px rgba(13,122,58,0.25);
        }
        @media (max-width: 991.98px) {
          .personnel-calendar-header {
            padding: 0.85rem 0.9rem;
          }
          .personnel-calendar-nav-container {
            padding: 0.65rem 0.85rem;
            gap: 0.6rem;
          }
          .personnel-calendar-nav select {
            min-width: 110px;
            font-size: 0.8rem;
          }
        }
        @media (max-width: 767.98px) {
          .personnel-calendar-header {
            padding: 0.75rem 0.85rem;
          }
          .personnel-calendar-nav-container {
            flex-direction: column;
            align-items: stretch;
            padding: 0.75rem;
            gap: 0.75rem;
          }
          .personnel-calendar-nav {
            width: 100%;
            justify-content: center;
          }
          .personnel-calendar-nav-divider {
            display: none;
          }
          .personnel-calendar-nav select {
            flex: 1 1 auto;
            min-width: 0;
            font-size: 0.8rem;
          }
          .personnel-calendar-nav button {
            font-size: 0.8rem;
          }
          .personnel-calendar-actions {
            width: 100%;
            justify-content: stretch;
          }
          .personnel-calendar-actions button {
            flex: 1 1 auto;
          }
          .personnel-calendar-tabs {
            flex-wrap: wrap;
          }
          .personnel-calendar-tab {
            flex: 1 1 auto;
            min-width: 80px;
            font-size: 0.75rem;
            padding: 0.6rem 0.75rem;
          }
          .personnel-calendar-card .rbc-toolbar { flex-wrap: wrap; gap: 0.5rem; }
          .personnel-calendar-card .rbc-toolbar-label { width: 100%; text-align: center; order: -1; }
        }
        @media (max-width: 575.98px) {
          .personnel-calendar-nav-container {
            padding: 0.65rem;
            gap: 0.6rem;
          }
          .personnel-calendar-nav {
            gap: 0.4rem;
          }
          .personnel-calendar-nav button {
            min-width: 2.5rem;
            padding: 0.35rem 0.5rem;
            font-size: 0.75rem;
          }
          .personnel-calendar-nav select {
            font-size: 0.75rem;
            padding: 0.35rem 0.6rem;
          }
          .personnel-calendar-card .card-body {
            padding: 0.75rem !important;
          }
          .personnel-calendar-card .rbc-calendar {
            font-size: 0.85rem;
          }
          .personnel-calendar-card .rbc-header {
            font-size: 0.7rem;
            padding: 0.4rem 0.15rem;
          }
          .personnel-calendar-card .rbc-event {
            font-size: 0.7rem;
            padding: 2px 4px;
          }
        }
        @media (max-width: 375px) {
          .personnel-calendar-nav-container {
            padding: 0.5rem;
          }
          .personnel-calendar-nav {
            gap: 0.3rem;
          }
          .personnel-calendar-nav button {
            padding: 0.3rem 0.4rem;
            font-size: 0.7rem;
          }
          .personnel-calendar-nav select {
            font-size: 0.7rem;
            padding: 0.3rem 0.5rem;
          }
        }
      `}</style>

      <div className="personnel-calendar-shell">
        <div className="personnel-calendar-header mb-3">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
            <div className="personnel-calendar-title-section">
              <h1
                className="h4 mb-1 fw-bold d-flex align-items-center"
                style={{ color: "var(--text-primary)" }}
              >
                <div className="personnel-calendar-header-icon me-2">
                  <FaCalendarAlt />
                </div>
                Calendar
              </h1>
              <p className="mb-0 small ms-2" style={{ color: "var(--text-muted)" }}>
                Your travel orders by date. Navigate to any month/year to view orders. Click an event to view or edit.
              </p>
            </div>
            <div className="personnel-calendar-actions d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-center">
              <div className="personnel-calendar-nav-container">
                <div className="personnel-calendar-nav">
                  <button
                    type="button"
                    onClick={handleToday}
                    disabled={loading}
                  >
                    Today
                  </button>
                  <div className="personnel-calendar-nav-divider"></div>
                  <button
                    type="button"
                    onClick={() => handleNavigate("prev")}
                    disabled={loading}
                    aria-label="Previous month"
                  >
                    <FaChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("next")}
                    disabled={loading}
                    aria-label="Next month"
                  >
                    <FaChevronRight />
                  </button>
                  <div className="personnel-calendar-nav-divider"></div>
                  <select
                    value={getMonth(currentDate)}
                    onChange={handleMonthChange}
                    disabled={loading}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {format(new Date(2024, i, 1), "MMMM")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={getYear(currentDate)}
                    onChange={handleYearChange}
                    disabled={loading}
                  >
                    {Array.from({ length: 20 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-refresh"
                onClick={handleRefresh}
                disabled={loading}
              >
                <FaSyncAlt className="me-1" /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="card personnel-calendar-card shadow-sm">
          {/* View Tabs */}
          <div className="personnel-calendar-tabs">
            <button
              type="button"
              className={`personnel-calendar-tab ${currentView === "month" ? "active" : ""}`}
              onClick={() => setCurrentView("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`personnel-calendar-tab ${currentView === "week" ? "active" : ""}`}
              onClick={() => setCurrentView("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`personnel-calendar-tab ${currentView === "day" ? "active" : ""}`}
              onClick={() => setCurrentView("day")}
            >
              Day
            </button>
            <button
              type="button"
              className={`personnel-calendar-tab ${currentView === "agenda" ? "active" : ""}`}
              onClick={() => setCurrentView("agenda")}
            >
              Agenda
            </button>
          </div>
          <div className="card-body p-3">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              date={currentDate}
              view={currentView}
              onView={setCurrentView}
              onNavigate={setCurrentDate}
              onRangeChange={handleRangeChange}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={["month", "week", "day", "agenda"]}
              popup
              popupOffset={{ x: 10, y: 10 }}
              style={{ 
                height: "calc(100vh - 280px)", 
                minHeight: 400,
                maxHeight: "calc(100vh - 310px)",
              }}
              components={{
                toolbar: () => null, // Hide default toolbar
              }}
            />
          </div>
        </div>

        {viewModalOrderId && (
          <ViewTravelOrderModal
            orderId={viewModalOrderId}
            token={token}
            onClose={() => setViewModalOrderId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default PersonnelCalendar;
