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
import { UnsavedChangesProvider } from "./contexts/UnsavedChangesContext";
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
import TravelOrdersList from "./pages/Personnel/TravelOrders/TravelOrdersList";
import TravelOrderForm from "./pages/Personnel/TravelOrders/TravelOrderForm";
import PersonnelHistory from "./pages/Personnel/TravelOrders/PersonnelHistory";
import PersonnelProfile from "./pages/Personnel/PersonnelProfile/PersonnelProfile";
import PersonnelCalendar from "./pages/Personnel/PersonnelCalendar/PersonnelCalendar";
import PendingReviews from "./pages/HeadDirector/PendingReviews/PendingReviews";
import ReviewTravelOrder from "./pages/HeadDirector/ReviewTravelOrder/ReviewTravelOrder";
import DirectorHistory from "./pages/HeadDirector/DirectorHistory/DirectorHistory";
import DirectorProfile from "./pages/HeadDirector/Profile/DirectorProfile";
import SignatureSettings from "./pages/HeadDirector/Profile/SignatureSettings";

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

        {/* Personnel: Travel Orders (Phase 4) */}
        <Route path="travel-orders" element={<TravelOrdersList />} />
        <Route path="travel-orders/create" element={<TravelOrderForm />} />
        <Route path="travel-orders/:id/edit" element={<TravelOrderForm />} />
        <Route path="travel-orders/history" element={<PersonnelHistory />} />
        <Route path="calendar" element={<PersonnelCalendar />} />
        <Route path="profile" element={<PersonnelProfile />} />
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

        {/* Director: Travel order reviews (Phase 5) */}
        <Route path="pending-reviews" element={<PendingReviews />} />
        <Route path="pending-reviews/:id" element={<ReviewTravelOrder />} />
        <Route path="recommended" element={<DirectorHistory key="recommended" filterStatus="recommended" />} />
        <Route path="approved" element={<DirectorHistory key="approved" filterStatus="approved" />} />
        <Route path="rejected" element={<DirectorHistory key="rejected" filterStatus="rejected" />} />
        <Route path="history" element={<DirectorHistory key="all" filterStatus="all" />} />

        {/* Director: profile / signature */}
        <Route path="director/profile" element={<DirectorProfile />} />
        <Route path="director/signature" element={<SignatureSettings />} />
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
          <UnsavedChangesProvider>
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
          </UnsavedChangesProvider>
        </AuthProvider>
      </BrandingProvider>
    </Router>
  );
};

export default App;
