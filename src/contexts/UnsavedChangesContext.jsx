import React, { createContext, useContext, useState, useCallback } from "react";

const UnsavedChangesContext = createContext(null);

export const UnsavedChangesProvider = ({ children }) => {
  const [blocking, setBlockingState] = useState(null);

  const setBlocking = useCallback((path, isDirty) => {
    if (path == null || !isDirty) {
      setBlockingState(null);
    } else {
      setBlockingState({ path, isDirty: true });
    }
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ blocking, setBlocking }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    return { blocking: null, setBlocking: () => {} };
  }
  return ctx;
};
