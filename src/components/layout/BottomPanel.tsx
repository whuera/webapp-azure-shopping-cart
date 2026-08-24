"use client";
import { useRef, useCallback, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useBottomPanel, MIN_BOTTOM_HEIGHT, MAX_BOTTOM_HEIGHT } from "@/context/BottomPanelContext";

export default function BottomPanel() {
  const { tabs, activeTab, setActiveTab, collapsed, setCollapsed, height, setHeight } = useBottomPanel();

  const isDragging = useRef(false);
  const startY     = useRef(0);
  const startH     = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = startY.current - e.clientY;            // drag up → positive → taller
    const next  = Math.max(MIN_BOTTOM_HEIGHT, Math.min(MAX_BOTTOM_HEIGHT, startH.current + delta));
    setHeight(next);
  }, [setHeight]);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
  };

  // Nothing to show when no tabs registered
  if (tabs.length === 0) return null;

  const TAB_BAR_H = 38; // px – matches the CSS height below

  return (
    <div
      className="bottom-panel shrink-0 flex flex-col border-t"
      style={{
        height: collapsed ? TAB_BAR_H : height,
        transition: "height 0.2s ease",
      }}
    >
      {/* ── Drag handle ───────────────────────────────────────────── */}
      {!collapsed && (
        <div
          onMouseDown={startDrag}
          className="bottom-panel-handle shrink-0 w-full flex items-center justify-center cursor-ns-resize select-none"
          title="Arrastrar para redimensionar"
        >
          <div className="w-8 h-1 rounded-full bottom-panel-handle-bar" />
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div
        className="bottom-panel-tabbar shrink-0 flex items-center gap-0.5 px-3 overflow-x-auto"
        style={{ height: TAB_BAR_H }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (collapsed) { setCollapsed(false); setActiveTab(tab.id); }
              else setActiveTab(tab.id);
            }}
            className={`bottom-panel-tab px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab.id && !collapsed ? "bottom-panel-tab--active" : ""
            }`}
          >
            {tab.icon && <tab.icon className="w-3 h-3" />}
            {tab.label}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse / expand toggle */}
        <button
          onClick={() => setCollapsed((v: boolean) => !v)}
          title={collapsed ? "Expandir panel" : "Colapsar panel"}
          className="bottom-panel-toggle ml-2 p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          {collapsed
            ? <ChevronUp   className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Content area ──────────────────────────────────────────── */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden relative">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className="absolute inset-0 overflow-y-auto"
              style={{ display: tab.id === activeTab ? "block" : "none" }}
            >
              {tab.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
