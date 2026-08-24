"use client";
import {
  createContext, useContext, useState, useCallback,
  ReactNode, ElementType,
} from "react";

export interface BottomTab {
  id: string;
  label: string;
  icon?: ElementType;
  content: ReactNode;
}

interface BottomPanelContextValue {
  tabs: BottomTab[];
  /** Pages call this (usually inside useEffect) to register their bottom tabs.
   *  Always return a cleanup: `return () => setTabs([])` */
  setTabs: (tabs: BottomTab[]) => void;
  activeTab: string;
  setActiveTab: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  height: number;       // px height of the bottom panel (content + tab bar)
  setHeight: (h: number) => void;
}

const BottomPanelContext = createContext<BottomPanelContextValue>({
  tabs: [], setTabs: () => {},
  activeTab: "", setActiveTab: () => {},
  collapsed: false, setCollapsed: () => {},
  height: 260, setHeight: () => {},
});

/** Separate context that only holds the stable setTabs function.
 *  Pages should use useSetBottomPanelTabs() so they don't re-render
 *  every time tab state changes (which would cause infinite useEffect loops). */
const BottomPanelSetterContext = createContext<(tabs: BottomTab[]) => void>(() => {});

export const DEFAULT_BOTTOM_HEIGHT = 260;
export const MIN_BOTTOM_HEIGHT     = 120;
export const MAX_BOTTOM_HEIGHT     = 520;

export function BottomPanelProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabsRaw]   = useState<BottomTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight]   = useState(DEFAULT_BOTTOM_HEIGHT);

  const setTabs = useCallback((next: BottomTab[]) => {
    setTabsRaw(next);
    setActiveTab(prev => {
      const ids = next.map(t => t.id);
      return ids.includes(prev) ? prev : (ids[0] ?? "");
    });
  }, []);

  return (
    <BottomPanelSetterContext.Provider value={setTabs}>
      <BottomPanelContext.Provider
        value={{ tabs, setTabs, activeTab, setActiveTab, collapsed, setCollapsed, height, setHeight }}
      >
        {children}
      </BottomPanelContext.Provider>
    </BottomPanelSetterContext.Provider>
  );
}

/** Full context — used by BottomPanel.tsx to read all display state. */
export function useBottomPanel() {
  return useContext(BottomPanelContext);
}

/** Lightweight hook for pages — returns only the stable setTabs function.
 *  Pages that use this will NOT re-render when tab state changes,
 *  preventing infinite useEffect → setTabs → re-render loops. */
export function useSetBottomPanelTabs() {
  return useContext(BottomPanelSetterContext);
}
