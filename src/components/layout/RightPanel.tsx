"use client";
import clsx from "clsx";
import {
  ChevronLeft, ChevronRight, Settings2, Bell, Keyboard,
  HelpCircle, SlidersHorizontal, Info, PanelRightOpen,
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";

interface QuickItem {
  label: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
}

const QUICK_ITEMS: QuickItem[] = [
  { label: "Notificaciones",    icon: Bell,              badge: "3", description: "Alertas del sistema" },
  { label: "Preferencias de UI",icon: SlidersHorizontal,             description: "Ajustes de interfaz"  },
  { label: "Atajos de teclado", icon: Keyboard,                      description: "Ver atajos disponibles" },
  { label: "Ayuda & soporte",   icon: HelpCircle,                    description: "Documentación y contacto" },
];

const INFO_ROWS = [
  { k: "Versión",       v: "1.0.0",      cls: "text-slate-300 dark-only" },
  { k: "Entorno",       v: "Producción", cls: "text-emerald-500" },
  { k: "Base de datos", v: "Azure SQL",  cls: "text-blue-500" },
];

export default function RightPanel() {
  const { rightCollapsed, toggleRight } = useLayout();

  return (
    <aside
      className={clsx(
        "portal-panel flex flex-col h-full border-l",
        "transition-[width] duration-300 ease-in-out shrink-0",
        rightCollapsed ? "w-14" : "w-72"
      )}
    >
      {/* ── COLLAPSED strip ─────────────────────────────── */}
      {rightCollapsed && (
        <>
          {/* Brand icon */}
          <div className="portal-divider flex justify-center border-b py-4">
            <div className="portal-panel-icon w-8 h-8 rounded-lg flex items-center justify-center">
              <Settings2 className="w-4 h-4" />
            </div>
          </div>

          {/* Expand button */}
          <div className="portal-divider flex justify-center py-2 border-b">
            <button
              onClick={toggleRight}
              title="Expandir panel"
              className="portal-toggle w-7 h-7 flex items-center justify-center"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Icon strip */}
          <nav className="flex flex-col items-center py-3 gap-1 px-1.5">
            {QUICK_ITEMS.map(({ label, icon: Icon, badge }) => (
              <button
                key={label}
                title={label}
                className="portal-quick-item relative justify-center py-2.5 px-0"
              >
                <Icon className="quick-icon w-5 h-5" />
                {badge && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </nav>
        </>
      )}

      {/* ── EXPANDED panel ──────────────────────────────── */}
      {!rightCollapsed && (
        <>
          {/* Panel header */}
          <div className="portal-divider flex items-center gap-3 px-4 py-4 border-b">
            <div className="portal-panel-icon w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="portal-brand-text font-semibold text-sm leading-tight truncate">
                Configuración
              </p>
              <p className="portal-brand-sub text-[11px] truncate">Panel de ajustes</p>
            </div>

            <button
              onClick={toggleRight}
              title="Colapsar panel"
              className="portal-toggle shrink-0 w-6 h-6 flex items-center justify-center"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

            {/* Acciones rápidas */}
            <section>
              <p className="portal-section-lbl text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
                Acciones rápidas
              </p>
              <div className="space-y-0.5">
                {QUICK_ITEMS.map(({ label, icon: Icon, badge, description }) => (
                  <button key={label} className="portal-quick-item gap-3 px-3 py-2.5">
                    <Icon className="quick-icon w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-medium">{label}</span>
                      <span className="block text-[10px] portal-quick-sub">{description}</span>
                    </div>
                    {badge && (
                      <span className="shrink-0 text-[10px] bg-blue-500/20 border border-blue-500/30
                                       text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <div className="portal-divider border-t" />

            {/* Visibilidad de paneles */}
            <section>
              <p className="portal-section-lbl text-[10px] font-semibold uppercase tracking-widest px-2 mb-3">
                Visibilidad de paneles
              </p>
              <div className="px-2 space-y-3">
                <PanelToggleRow label="Panel de navegación"    active />
                <PanelToggleRow label="Panel de configuración" active />
              </div>
            </section>

            <div className="portal-divider border-t" />

            {/* Información */}
            <section>
              <p className="portal-section-lbl text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
                Información
              </p>
              <div className="portal-info-box mx-1 rounded-xl overflow-hidden">
                {INFO_ROWS.map(({ k, v, cls }) => (
                  <div
                    key={k}
                    className="portal-divider flex justify-between items-center px-3 py-2 text-xs
                               border-b last:border-b-0"
                  >
                    <span className="portal-info-label flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      {k}
                    </span>
                    <span className={cls}>{v}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="portal-divider border-t px-4 py-3 shrink-0">
            <p className="portal-footer-txt text-[10px] text-center">
              Portal Controller &copy; {new Date().getFullYear()}
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

function PanelToggleRow({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="portal-info-label text-xs">{label}</span>
      <div className={clsx(
        "w-9 h-5 rounded-full relative transition-colors duration-200",
        active ? "bg-blue-500/50" : "bg-black/10"
      )}>
        <div className={clsx(
          "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
          active ? "right-0.5 bg-blue-500" : "left-0.5 bg-gray-400"
        )} />
      </div>
    </div>
  );
}
