"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LayoutProvider } from "@/context/LayoutContext";
import { BottomPanelProvider } from "@/context/BottomPanelContext";
import Sidebar from "@/components/layout/Sidebar";
import RightPanel from "@/components/layout/RightPanel";
import BottomPanel from "@/components/layout/BottomPanel";

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <BottomPanelProvider>
        {/*
          Three-panel layout (inspired by Google AI Studio):
          ┌──────────────┬─────────────────────────────┬──────────────┐
          │   Sidebar    │   Header + upper content    │  Right panel │
          │  (nav left)  ├─────────────────────────────┤  (settings)  │
          │              │   Bottom panel (tabs)       │              │
          └──────────────┴─────────────────────────────┴──────────────┘
          Both side panels collapse independently.
          Main center column splits vertically:
            • Upper area — scrollable, renders the current page
            • Bottom panel — resizable/collapsible, dynamic tabs per page
        */}
        <div className="flex h-screen overflow-hidden">
          {/* ── Left sidebar ──────────────────────────────── */}
          <Sidebar />

          {/* ── Center column ─────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/*
              Upper scrollable area — each page renders its own <Header>
              as its first child (sticky top-0 z-10).
            */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>

            {/* Bottom panel — registered by each page via useBottomPanel().setTabs() */}
            <BottomPanel />
          </main>

          {/* ── Right panel ───────────────────────────────── */}
          <RightPanel />
        </div>
      </BottomPanelProvider>
    </LayoutProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) router.push("/login");
  }, [token, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!token) return null;

  return <DashboardShell>{children}</DashboardShell>;
}
