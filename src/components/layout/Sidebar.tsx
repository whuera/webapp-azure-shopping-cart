"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import {
  LayoutDashboard, Package, Warehouse, ReceiptText,
  BookOpen, Users2, Users, ShoppingCart, LogOut, ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/inventory", label: "Inventario", icon: Warehouse },
  { href: "/sales", label: "Ventas", icon: ReceiptText },
  { href: "/accounting", label: "Contabilidad", icon: BookOpen },
  { href: "/crm", label: "CRM", icon: Users2 },
  { href: "/users", label: "Usuarios", icon: Users },
];

interface Props { collapsed?: boolean; onToggle?: () => void; }

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className={clsx(
        "flex flex-col h-full bg-black/30 backdrop-blur-xl border-r border-white/10 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-5 h-5 text-blue-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">ShoppingCart</p>
            <p className="text-slate-500 text-xs">Dashboard</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronRight className={clsx("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-xl bg-white/5 mb-2">
            <p className="text-white text-xs font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400
                     hover:bg-red-600/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
