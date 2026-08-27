"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface LayoutContextValue {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  leftCollapsed: false,
  rightCollapsed: false,
  toggleLeft: () => {},
  toggleRight: () => {},
});

const STORAGE_KEYS = {
  left: "portal:leftCollapsed",
  right: "portal:rightCollapsed",
} as const;

// Reads a persisted collapsed flag. Safe to call eagerly here: this provider only ever mounts
// after the dashboard's auth gate resolves client-side (see DashboardLayout), never during SSR
// or the initial hydration pass, so there's no server/client markup mismatch to worry about.
function readStored(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false; // private browsing / storage disabled — fall back to "open"
  }
}

function writeStored(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore — nothing to persist to, panel still toggles for this session
  }
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftCollapsed, setLeftCollapsed] = useState(() => readStored(STORAGE_KEYS.left));
  const [rightCollapsed, setRightCollapsed] = useState(() => readStored(STORAGE_KEYS.right));

  const toggleLeft = () => setLeftCollapsed(v => {
    const next = !v;
    writeStored(STORAGE_KEYS.left, next);
    return next;
  });
  const toggleRight = () => setRightCollapsed(v => {
    const next = !v;
    writeStored(STORAGE_KEYS.right, next);
    return next;
  });

  return (
    <LayoutContext.Provider value={{ leftCollapsed, rightCollapsed, toggleLeft, toggleRight }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
