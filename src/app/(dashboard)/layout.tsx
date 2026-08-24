"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LayoutProvider } from "@/context/LayoutContext";
import Sidebar from "@/components/layout/Sidebar";
import RightPanel from "@/components/layout/RightPanel";

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      {/*
        Three-panel layout (inspired by Google AI Studio):
        ┌──────────────┬─────────────────────────────┬──────────────┐
        │   Sidebar    │   Top-bar + main content    │  Right panel │
        │  (nav left)  │       (scrollable)          │  (settings)  │
        └──────────────┴─────────────────────────────┴──────────────┘
        Both side panels collapse independently.
      */}
      <div className="flex h-screen overflow-hidden">
        {/* ── Left sidebar ──────────────────────────────── */}
        <Sidebar />

        {/* ── Center column ─────────────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          {/* Each page renders its own <Header> as first child.
              The Header component is sticky so it stays at the top
              while the page content scrolls underneath. */}
          {children}
        </main>

        {/* ── Right panel ───────────────────────────────── */}
        <RightPanel />
      </div>
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
