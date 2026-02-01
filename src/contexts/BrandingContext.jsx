import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const BrandingContext = createContext(null);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
};

const DEFAULT_LOGO_TEXT = "DATravelApp";

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    logoText: DEFAULT_LOGO_TEXT,
    logoUrl: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/branding`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.branding) {
        const b = data.branding;
        setBranding({
          logoText: b.logo_text || DEFAULT_LOGO_TEXT,
          logoUrl: b.logo_url || null,
        });
      }
    } catch (e) {
      console.warn("Branding fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const value = {
    logoText: branding.logoText,
    logoUrl: branding.logoUrl,
    loading,
    refetchBranding: fetchBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};
