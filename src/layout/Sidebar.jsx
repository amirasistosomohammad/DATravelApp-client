// src/layout/Sidebar.jsx
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUnsavedChanges } from "../contexts/UnsavedChangesContext";
import { showAlert } from "../services/notificationService";
import { useLocation, Link, useNavigate } from "react-router-dom";

const Sidebar = ({ onCloseSidebar }) => {
  const { user, isAdmin, isPersonnel, isDirector } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { blocking } = useUnsavedChanges();

  const isActiveLink = (href) => {
    // Normalize to avoid trailing slash mismatches
    const normalize = (p) => p.replace(/\/+$/, "");
    const current = normalize(location.pathname);
    const target = normalize(href);
    return current === target;
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768 && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const normalizePath = (p) => (p || "").replace(/\/+$/, "");

  const handleLinkClick = (e, itemHref) => {
    const current = normalizePath(location.pathname);
    const target = normalizePath(itemHref);
    const hasUnsavedBlock = blocking?.isDirty && current === normalizePath(blocking.path);
    if (hasUnsavedBlock && target !== current) {
      e.preventDefault();
      showAlert
        .confirm(
          "Unsaved progress",
          "You have unsaved changes to this travel order. If you leave now, your progress will not be saved. Do you want to leave anyway?",
          "Leave",
          "Stay"
        )
        .then((result) => {
          if (result.isConfirmed) {
            navigate(itemHref);
            closeSidebarOnMobile();
          }
        });
      return;
    }
    closeSidebarOnMobile();
  };

  const ictAdminMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/dashboard",
        },
      ],
    },
    {
      heading: "User Management",
      items: [
        {
          icon: "fas fa-users",
          label: "Personnel Members",
          href: "/users/personnel",
        },
        {
          icon: "fas fa-user-tie",
          label: "Director Members",
          href: "/users/directors",
        },
        {
          icon: "fas fa-clock",
          label: "Time Logging",
          href: "/users/time-logging",
        },
      ],
    },
    {
      heading: "Travel Orders",
      items: [
        {
          icon: "fas fa-file-alt",
          label: "All Travel Orders",
          href: "/travel-orders",
        },
      ],
    },
    {
      heading: "Reports",
      items: [
        {
          icon: "fas fa-chart-bar",
          label: "Reports & Analytics",
          href: "/reports",
        },
      ],
    },
    {
      heading: "Settings",
      items: [
        {
          icon: "fas fa-cog",
          label: "System Settings",
          href: "/settings",
        },
      ],
    },
  ];

  const directorMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/dashboard",
        },
      ],
    },
    {
      heading: "Reviews",
      items: [
        {
          icon: "fas fa-check-circle",
          label: "Pending Reviews",
          href: "/pending-reviews",
        },
        {
          icon: "fas fa-check-circle",
          label: "Approved",
          href: "/approved",
        },
        {
          icon: "fas fa-times-circle",
          label: "Rejected",
          href: "/rejected",
        },
      ],
    },
    {
      heading: "History",
      items: [
        {
          icon: "fas fa-history",
          label: "History",
          href: "/history",
        },
      ],
    },
    {
      heading: "Profile",
      items: [
        {
          icon: "fas fa-pen-nib",
          label: "Digital signature",
          href: "/director/signature",
        },
      ],
    },
  ];

  const personnelMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/dashboard",
        },
      ],
    },
    {
      heading: "Travel Orders",
      items: [
        {
          icon: "fas fa-file-alt",
          label: "Travel Orders",
          href: "/travel-orders",
        },
        {
          icon: "fas fa-plus-circle",
          label: "New Travel Order",
          href: "/travel-orders/create",
        },
        {
          icon: "fas fa-history",
          label: "History",
          href: "/travel-orders/history",
        },
      ],
    },
  ];

  // Menu selection logic
  let menuItems = [];

  if (isAdmin()) {
    menuItems = ictAdminMenuItems;
  } else if (isDirector()) {
    menuItems = directorMenuItems;
  } else if (isPersonnel()) {
    menuItems = personnelMenuItems;
  } else {
    // Fallback
    menuItems = personnelMenuItems;
  }

  const renderMenuSection = (section, index) => (
    <React.Fragment key={index}>
      <div className="sb-sidenav-menu-heading">{section.heading}</div>
      {section.items.map((item, itemIndex) => {
        const isActive = isActiveLink(item.href);
        return (
          <Link
            key={itemIndex}
            className={`nav-link ${isActive ? "active" : ""}`}
            to={item.href}
            onClick={(e) => handleLinkClick(e, item.href)}
          >
            <div className="sb-nav-link-icon">
              <i className={item.icon}></i>
            </div>
            <span className="sb-nav-link-label">{item.label}</span>
            {isActive && (
              <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                <i className="fas fa-chevron-right small"></i>
              </span>
            )}
          </Link>
        );
      })}
    </React.Fragment>
  );

  return (
    <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
      <div className="sb-sidenav-menu">
        <div className="nav">{menuItems.map(renderMenuSection)}</div>
      </div>

      <div className="sb-sidenav-footer">
        <div className="small">Logged in as:</div>
        <span className="user-name">
          {user?.name || user?.username || "User"}
        </span>
        <div className="small text-muted">
          {isAdmin()
            ? "ICT Admin"
            : isDirector()
            ? user?.position || "Director"
            : isPersonnel()
            ? user?.position || "Personnel"
            : "User"}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
