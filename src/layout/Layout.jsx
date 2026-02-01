// layout/Layout.jsx - USING CSS PSEUDO-ELEMENT
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { refetchBranding } = useBranding();
  const navigate = useNavigate();
  const [sidebarToggled, setSidebarToggled] = useState(false);

  // Refetch branding when Layout (topbar) mounts so topbar shows skeleton then DB branding
  useEffect(() => {
    refetchBranding();
  }, [refetchBranding]);

  const toggleSidebar = () => {
    setSidebarToggled(!sidebarToggled);
  };

  const closeSidebar = () => {
    setSidebarToggled(false);
  };

  // Close sidebar when clicking on main content
  const handleMainClick = () => {
    if (window.innerWidth < 768 && sidebarToggled) {
      closeSidebar();
    }
  };

  // Apply CSS class to body for sidebar state
  useEffect(() => {
    const body = document.body;

    if (sidebarToggled) {
      body.classList.add("sb-sidenav-toggled");
    } else {
      body.classList.remove("sb-sidenav-toggled");
    }

    return () => {
      body.classList.remove("sb-sidenav-toggled");
    };
  }, [sidebarToggled]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="sb-nav-fixed">
      <Topbar onToggleSidebar={toggleSidebar} />

      <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
          <Sidebar onCloseSidebar={closeSidebar} />
        </div>

        <div id="layoutSidenav_content" onClick={handleMainClick}>
          <main>
            <div className="container-fluid">
              <Outlet />
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;
