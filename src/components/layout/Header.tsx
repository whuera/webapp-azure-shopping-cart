"use client";
import { useAuth } from "@/context/AuthContext";
import { useLayout } from "@/context/LayoutContext";
import { Bell, Search } from "lucide-react";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

interface Props { title: string; subtitle?: string; }

export default function Header({ title, subtitle }: Props) {
  const { user } = useAuth();
  const { rightCollapsed, toggleRight } = useLayout();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  return (
    /*
      .portal-header gives light/dark-responsive styles via globals.css.
      sticky top-0 z-10 keeps it pinned while content scrolls.
    */
    <header
      className="portal-header sticky top-0 z-10 flex items-center justify-between
                 px-6 py-3.5 border-b shrink-0
                 bg-black/30 backdrop-blur-xl border-white/[0.08]"
    >
      {/* Page identity */}
      <div className="min-w-0">
        <h1 className="hdr-title text-base font-semibold text-white leading-tight truncate tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="hdr-subtitle text-slate-500 text-xs mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="hdr-search input pl-8 w-48 py-1.5 text-xs h-8"
          />
        </div>

        {/* Notifications */}
        <button
          className="hdr-btn relative w-8 h-8 rounded-lg
                     bg-white/[0.05] border border-white/[0.08]
                     flex items-center justify-center text-slate-400
                     hover:text-slate-200 hover:bg-white/[0.10] transition-all"
          title="Notificaciones"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        {/* Toggle right panel */}
        <button
          onClick={toggleRight}
          title={rightCollapsed ? "Abrir configuración" : "Cerrar configuración"}
          className="hdr-btn w-8 h-8 rounded-lg
                     bg-white/[0.05] border border-white/[0.08]
                     flex items-center justify-center text-slate-400
                     hover:text-slate-200 hover:bg-white/[0.10] transition-all"
          data-active={!rightCollapsed}
        >
          {rightCollapsed
            ? <PanelRightOpen className="w-3.5 h-3.5" />
            : <PanelRightClose className="w-3.5 h-3.5" />}
        </button>

        {/* Avatar */}
        <div className="portal-panel-icon w-8 h-8 rounded-lg flex items-center justify-center
                        text-[10px] font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}
