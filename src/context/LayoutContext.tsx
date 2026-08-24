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

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <LayoutContext.Provider
      value={{
        leftCollapsed,
        rightCollapsed,
        toggleLeft: () => setLeftCollapsed((v) => !v),
        toggleRight: () => setRightCollapsed((v) => !v),
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
