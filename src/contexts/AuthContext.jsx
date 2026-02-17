import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

// API Base URL from environment variable
const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

// Derive the API origin (scheme + host + port) once so we can
// normalize avatar URLs that might still point at localhost in prod.
let API_ORIGIN = "";
try {
  const url = new URL(API_BASE_URL);
  API_ORIGIN = url.origin;
} catch {
  API_ORIGIN = "";
}

const normalizeAvatarUrl = (avatar) => {
  if (!avatar || !API_ORIGIN) return avatar;
  try {
    const srcUrl = new URL(avatar, API_ORIGIN);
    const isLocalhost =
      srcUrl.hostname === "localhost" || srcUrl.hostname === "127.0.0.1";
    // If backend returned a localhost/127.0.0.1 URL (common when APP_URL is misconfigured),
    // force the avatar to use the same origin as the API base URL instead.
    if (!isLocalhost) return avatar;
    return `${API_ORIGIN}${srcUrl.pathname}${srcUrl.search}${srcUrl.hash}`;
  } catch {
    return avatar;
  }
};

const normalizeUserFromApi = (userData) => {
  if (!userData) return userData;
  const normalized = { ...userData };
  if (normalized.avatar) {
    normalized.avatar = normalizeAvatarUrl(normalized.avatar);
  }
  return normalized;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // IMPORTANT:
  // `loading` should only represent the INITIAL auth bootstrap (refresh/token check),
  // not in-flight login requests. Otherwise PublicRoute will replace Login with a full-page spinner.
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Prevent PublicRoute from redirecting during login flow (keeps Login visible behind SweetAlert)
  const [authTransitioning, setAuthTransitioning] = useState(false);

  // Helper function to make API calls
  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle 401 Unauthorized (token expired or invalid)
      // Only clear token if it's an authentication error, not network errors
      if (
        response.status === 401 &&
        data.message &&
        (data.message.includes("Unauthenticated") ||
          data.message.includes("Invalid") ||
          data.message.includes("expired"))
      ) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("token_expires_at");
        setUser(null);
        setIsAuthenticated(false);

        // Redirect to login if not already there
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }

      if (!response.ok) {
        throw data;
      }

      return data;
    } catch (error) {
      // Only re-throw if it's not a network error
      // Network errors should not clear the token
      if (error.message && error.message.includes("fetch")) {
        // Network error - don't clear token, just throw
        throw { ...error, isNetworkError: true };
      }
      throw error;
    }
  };

  // Check if user is logged in on mount and validate token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          // Validate token with backend
          try {
            const response = await apiCall("/me", { method: "GET" });
            if (response.success && response.data?.user) {
              const userData = normalizeUserFromApi(response.data.user);
              setUser(userData);
              setIsAuthenticated(true);
              // Update stored user data
              localStorage.setItem("user", JSON.stringify(userData));
            } else {
              // Token invalid, clear storage
              throw new Error("Invalid token");
            }
          } catch (error) {
            // Only clear token if it's actually invalid/expired, not network errors
            if (error.isNetworkError) {
              // Network error - keep token and user, just set as not authenticated temporarily
              console.warn(
                "Network error during token validation, keeping token:",
                error
              );
              // Use stored user data temporarily
              try {
                const storedUserData = JSON.parse(storedUser);
                const normalized = normalizeUserFromApi(storedUserData);
                setUser(normalized);
                setIsAuthenticated(true);
              } catch (parseError) {
                // If stored user is invalid, clear everything
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.removeItem("token_expires_at");
                setUser(null);
                setIsAuthenticated(false);
              }
            } else if (
              error.response?.status === 401 ||
              error.message?.includes("Unauthenticated") ||
              error.message?.includes("Invalid")
            ) {
              // Token expired or invalid, clear storage
              console.error("Token validation failed:", error);
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              localStorage.removeItem("token_expires_at");
              setUser(null);
              setIsAuthenticated(false);
            } else {
              // Other errors - keep token, use stored user
              console.warn(
                "Token validation error (non-critical), using stored user:",
                error
              );
              try {
                const storedUserData = JSON.parse(storedUser);
                const normalized = normalizeUserFromApi(storedUserData);
                setUser(normalized);
                setIsAuthenticated(true);
              } catch (parseError) {
                setUser(null);
                setIsAuthenticated(false);
              }
            }
          }
        } else {
          // No token found
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("token_expires_at");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setAuthTransitioning(true);

      // Call API to login
      const response = await apiCall("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (response.success && response.data) {
        const { user: rawUser, token, expires_at } = response.data;
        const userData = normalizeUserFromApi(rawUser);

        // Store user and token
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", token);
        localStorage.setItem("token_expires_at", expires_at);

        setUser(userData);
        setIsAuthenticated(true);
        // Keep login page mounted briefly so the SweetAlert loader doesn't appear on a blank route
        setTimeout(() => setAuthTransitioning(false), 600);

        return { success: true, user: userData };
      } else {
        setAuthTransitioning(false);
        return {
          success: false,
          error: response.message || "Login failed. Please try again.",
          reason_for_deactivation: response.reason_for_deactivation,
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthTransitioning(false);
      return {
        success: false,
        error:
          error.message ||
          error.errors ||
          "An error occurred during login. Please try again.",
        reason_for_deactivation: error.reason_for_deactivation,
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call API to logout (revoke token)
      await apiCall("/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("token_expires_at");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Update user function
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Helper functions for role checking
  const isAdmin = () => {
    return user?.role === "ict_admin";
  };

  const isPersonnel = () => {
    return user?.role === "personnel";
  };

  const isDirector = () => {
    return user?.role === "director";
  };

  // Re-validate token and refresh user (e.g. after password change)
  const checkAuth = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) return;
    try {
      const response = await apiCall("/me", { method: "GET" });
      if (response.success && response.data?.user) {
        const userData = normalizeUserFromApi(response.data.user);
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (err) {
      console.warn("checkAuth failed:", err);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    authTransitioning,
    token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
    checkAuth,
    login,
    logout,
    updateUser,
    isAdmin,
    isPersonnel,
    isDirector,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
