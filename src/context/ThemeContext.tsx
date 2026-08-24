"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

/** Applies data-theme on <html> and persists to localStorage */
function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("portal-theme", t);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Read persisted preference on mount
  useEffect(() => {
    const stored = localStorage.getItem("portal-theme") as Theme | null;
    const resolved: Theme = stored === "light" ? "light" : "dark";
    setThemeState(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
