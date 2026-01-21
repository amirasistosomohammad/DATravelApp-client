import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { showAlert } from "../../services/notificationService";
import { toast } from "react-toastify";
import LoginBackground from "../../assets/images/login_background.png";
import Logo from "../../assets/images/logo.png";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Theme colors
  const theme = {
    primary: "#0C8A3B",
    primaryDark: "#0A6B2E",
    primaryLight: "#0EA045",
    accent: "#F8C202",
    accentDark: "#E0B002",
    textPrimary: "#1a2a1a",
    textSecondary: "#4a5c4a",
    backgroundLight: "#f8faf8",
    backgroundWhite: "#ffffff",
    borderColor: "#e0e6e0",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      showAlert.error("Validation Error", "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      showAlert.loading("Signing you in...", "#login-page");
      const result = await login(form.username, form.password);
      showAlert.close();

      if (result.success) {
        toast.success(
          result.user?.name || result.user?.username
            ? `Welcome back, ${result.user.name || result.user.username}!`
            : "Login successful"
        );
        // Navigate immediately after closing loader to avoid showing the loader on a blank route
        navigate("/dashboard");
      } else {
        // If account is deactivated and a reason is provided, show SweetAlert with the reason
        if (result.reason_for_deactivation) {
          showAlert.error(
            "Account Deactivated",
            result.reason_for_deactivation
          );
          return;
        }

        // Handle error message - could be string or object
        const rawMessage =
          typeof result.error === "string"
            ? result.error
            : result.error?.message ||
              "Please check your credentials and try again.";
        const errorMessage =
          rawMessage === "Validation failed"
            ? "Invalid username or password. Please try again."
            : rawMessage;
        // Use react-toastify for error notification
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      showAlert.close();
      // Handle API error response - use react-toastify
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to connect to the server. Please check your internet connection and try again.";
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div
      id="login-page"
      className="min-vh-100 d-flex flex-column position-relative"
      style={{
        padding: "20px",
        paddingBottom: "0",
        zIndex: 1,
        position: "relative",
      }}
    >
      {/* Background Image */}
      <div
        className="position-fixed"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${LoginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: theme.backgroundLight,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Main Content - Centered */}
      <div
        className="flex-grow-1 d-flex align-items-center justify-content-center position-relative"
        style={{ zIndex: 2, paddingBottom: "60px", position: "relative" }}
      >
        {/* Form Content - Always Clear */}
        <div
          className="bg-white rounded-4 shadow-lg position-relative"
          style={{
            maxWidth: "420px",
            width: "100%",
            padding: windowWidth < 576 ? "30px 20px" : "40px",
            border: `1px solid ${theme.borderColor}`,
            animation: "fadeIn 0.6s ease-in-out",
            zIndex: 1,
          }}
        >
          {/* Logo Section */}
          <div className="text-center mb-4">
            <div
              className="d-flex align-items-center justify-content-center mx-auto"
              style={{
                width: "fit-content",
              }}
            >
              <img
                src={Logo}
                alt="DA TravelApp Logo"
                style={{
                  width: windowWidth < 576 ? "100px" : "120px",
                  height: windowWidth < 576 ? "100px" : "120px",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h5
            className="text-center fw-bolder"
            style={{
              marginTop: "2rem",
              marginBottom: "2rem",
              color: theme.primary,
              fontSize: windowWidth < 576 ? "20px" : "24px",
              whiteSpace: "nowrap",
              lineHeight: "1.2",
            }}
          >
            Log in to your account
          </h5>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <label
              htmlFor="username"
              className="mb-1 fw-semibold"
              style={{
                fontSize: windowWidth < 576 ? "0.85rem" : "0.9rem",
                color: theme.textSecondary,
              }}
            >
              Username
            </label>
            <div className="mb-3 position-relative">
              <FaUser
                className="position-absolute top-50 translate-middle-y text-muted"
                size={16}
                style={{ left: "15px", zIndex: 1 }}
              />
              <input
                type="text"
                name="username"
                className="form-control fw-semibold"
                placeholder="Username"
                value={form.username}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  paddingLeft: "45px",
                  backgroundColor: theme.backgroundWhite,
                  color: theme.textPrimary,
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: windowWidth < 576 ? "14px" : "16px",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.primary;
                  e.target.style.boxShadow =
                    "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
                id="username"
              />
            </div>

            {/* Password */}
            <label
              htmlFor="password"
              className="mb-1 fw-semibold"
              style={{
                fontSize: windowWidth < 576 ? "0.85rem" : "0.9rem",
                color: theme.textSecondary,
              }}
            >
              Password
            </label>
            <div className="mb-3 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted"
                size={16}
                style={{ left: "15px", zIndex: 1 }}
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-control fw-semibold"
                placeholder="Password"
                value={form.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  paddingLeft: "45px",
                  paddingRight: "45px",
                  backgroundColor: theme.backgroundWhite,
                  color: theme.textPrimary,
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: windowWidth < 576 ? "14px" : "16px",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.primary;
                  e.target.style.boxShadow =
                    "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
                id="password"
              />
              <span
                onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                className="position-absolute top-50 translate-middle-y text-muted"
                style={{
                  right: "15px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  zIndex: 1,
                }}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-100 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{
                backgroundColor: theme.primary,
                color: theme.backgroundWhite,
                border: "none",
                borderRadius: "8px",
                fontSize: windowWidth < 576 ? "15px" : "16px",
                transition: "all 0.3s ease-in-out",
                position: "relative",
                overflow: "hidden",
                marginTop: "10px",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = theme.primaryDark;
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(12, 138, 59, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = theme.primary;
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 2px 10px rgba(12, 138, 59, 0.3)";
                }
              }}
              onMouseDown={(e) => {
                if (!isSubmitting) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 2px 10px rgba(12, 138, 59, 0.3)";
                }
              }}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="position-fixed bottom-0 start-0 w-100"
        style={{
          zIndex: 1,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          // Softer separator than a hard border-top
          borderTop: "none",
          boxShadow: "0 -10px 25px rgba(0, 0, 0, 0.06)",
          backgroundImage:
            "linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.92))",
          padding: windowWidth < 576 ? "10px 15px" : "12px 20px",
        }}
      >
        <div className="text-center">
          <p
            className="mb-0 fw-semibold"
            style={{
              fontSize: windowWidth < 576 ? "11px" : "13px",
              color: theme.textSecondary,
            }}
          >
            © {new Date().getFullYear()} DATravelApp: AN OFFICIAL TRAVEL ORDER
            MANAGEMENT SYSTEM. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
