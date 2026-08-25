"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLayout } from "@/context/LayoutContext";
import clsx from "clsx";
import {
  LayoutDashboard, Package, Warehouse, ReceiptText,
  BookOpen, Users2, Users, ShoppingCart, LogOut, ChevronRight, ClipboardList, Settings, Store,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType; divider?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/products",      label: "Productos",    icon: Package },
  { href: "/inventory",     label: "Inventario",   icon: Warehouse },
  { href: "/sales",         label: "Ventas",       icon: ReceiptText },
  { href: "/orders",        label: "Pedidos",      icon: ClipboardList },
  { href: "/accounting",    label: "Contabilidad", icon: BookOpen },
  { href: "/crm",           label: "CRM",          icon: Users2 },
  { href: "/comercios",     label: "Comercios",    icon: Store },
  { href: "/users",         label: "Usuarios",     icon: Users },
  { href: "/configuracion", label: "Configuración",icon: Settings, divider: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { leftCollapsed, toggleLeft } = useLayout();

  return (
    <aside
      className={clsx(
        "portal-panel flex flex-col h-full border-r",
        "transition-[width] duration-300 ease-in-out shrink-0",
        leftCollapsed ? "w-14" : "w-60"
      )}
    >
      {/* ── Brand header ──────────────────────────────────── */}
      <div
        className={clsx(
          "portal-divider flex items-center border-b",
          leftCollapsed ? "justify-center px-0 py-4" : "gap-3 px-4 py-4"
        )}
      >
        <div className="portal-panel-icon w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
          <ShoppingCart className="w-4 h-4" />
        </div>

        {!leftCollapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="portal-brand-text font-semibold text-sm leading-tight truncate">
              Portal Controller
            </p>
            <p className="portal-brand-sub text-[11px] truncate">v1.0</p>
          </div>
        )}

        {!leftCollapsed && (
          <button
            onClick={toggleLeft}
            title="Colapsar panel"
            className="portal-toggle shrink-0 w-6 h-6 flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}
      </div>

      {/* Expand button (collapsed state) */}
      {leftCollapsed && (
        <div className="portal-divider flex justify-center py-2 border-b">
          <button
            onClick={toggleLeft}
            title="Expandir panel"
            className="portal-toggle w-7 h-7 flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <nav
        className={clsx(
          "flex-1 py-3 overflow-y-auto space-y-0.5",
          leftCollapsed ? "px-1.5" : "px-2"
        )}
      >
        {!leftCollapsed && (
          <p className="portal-section-lbl text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
            Módulos
          </p>
        )}

        {NAV.map(({ href, label, icon: Icon, divider }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <div key={href}>
              {divider && (
                <div className={clsx("portal-divider border-t my-2", leftCollapsed ? "" : "mx-1")} />
              )}
              <Link
                href={href}
                title={leftCollapsed ? label : undefined}
                className={clsx(
                  "portal-nav-item gap-3",
                  leftCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                  active ? "nav-active" : ""
                )}
              >
                <Icon className={clsx("shrink-0", leftCollapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!leftCollapsed && <span className="flex-1 truncate">{label}</span>}
                {!leftCollapsed && active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── User & Logout ─────────────────────────────────── */}
      <div
        className={clsx(
          "portal-divider border-t py-3 space-y-1",
          leftCollapsed ? "px-1.5" : "px-2"
        )}
      >
        {!leftCollapsed && user && (
          <div className="portal-user-card px-3 py-2 rounded-xl mb-2">
            <p className="portal-user-text text-xs font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="portal-user-email text-[11px] truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          title={leftCollapsed ? "Cerrar sesión" : undefined}
          className={clsx(
            "portal-nav-item gap-3 text-red-400 hover:!bg-red-500/10 hover:!text-red-400",
            leftCollapsed ? "justify-center px-0 py-2.5 w-full" : "w-full px-3 py-2.5"
          )}
        >
          <LogOut className={clsx("shrink-0", leftCollapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!leftCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
