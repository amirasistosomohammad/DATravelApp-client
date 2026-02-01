import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import Preloader from "./components/Preloader";
import Login from "./pages/public/Login";
import Layout from "./layout/Layout";
import PersonnelDashboard from "./pages/Personnel/PersonnelDashboard/PersonnelDashboard";
import DirectDashboard from "./pages/HeadDirector/DirectorDashboard/DirectDashboard";
import ICTAdminDashboard from "./pages/ICTAdmin/ICTAdminDashboard/ICTAdminDashboard";
import PersonnelMembers from "./pages/ICTAdmin/PersonnelMembers/PersonnelMembers";
import TimeLogging from "./pages/ICTAdmin/TimeLogging/TimeLogging";
import DirectorMembers from "./pages/ICTAdmin/DirectorMembers/DirectorMembers";
import SystemSettings from "./pages/ICTAdmin/Settings/SystemSettings";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Preloader />;
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, authTransitioning } = useAuth();

  if (loading) {
    return <Preloader />;
  }

  // IMPORTANT: keep Login visible during the login flow so SweetAlert loader doesn't sit on a blank route
  if (authTransitioning) return children;

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Role-based dashboard component
const DashboardComponent = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  if (user.role === "ict_admin") {
    return <ICTAdminDashboard />;
  } else if (user.role === "director") {
    return <DirectDashboard />;
  } else {
    return <PersonnelDashboard />;
  }
};

// Temporary "in development" placeholder
const InDevelopment = ({ label }) => (
  <div className="container py-5">
    <div className="row justify-content-center">
      <div className="col-lg-8 col-md-10">
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <h5 className="mb-3 fw-bold">In Development</h5>
            <p className="text-muted mb-0">
              {label || "This module is currently in development."}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Default route - Login page */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Dashboard route - Protected with role-based routing */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardComponent />} />

        {/* User Management placeholders */}
        <Route path="users/personnel" element={<PersonnelMembers />} />
        <Route path="users/directors" element={<DirectorMembers />} />
        <Route
          path="users/time-logging"
          element={<TimeLogging />}
        />

        {/* ICT Admin placeholders */}
        <Route
          path="travel-orders"
          element={
            <InDevelopment label="Travel Orders module is in development." />
          }
        />
        <Route
          path="travel-orders/history"
          element={
            <InDevelopment label="Travel Orders history is in development." />
          }
        />
        <Route
          path="reports"
          element={
            <InDevelopment label="Reports & analytics are in development." />
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* Director placeholders */}
        <Route
          path="pending-reviews"
          element={
            <InDevelopment label="Pending reviews are in development." />
          }
        />
        <Route
          path="approved"
          element={
            <InDevelopment label="Approved travel orders are in development." />
          }
        />
        <Route
          path="rejected"
          element={
            <InDevelopment label="Rejected travel orders are in development." />
          }
        />
        <Route
          path="history"
          element={<InDevelopment label="History module is in development." />}
        />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <BrandingProvider>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ zIndex: 99999 }}
        />
        </AuthProvider>
      </BrandingProvider>
    </Router>
  );
};

export default App;
