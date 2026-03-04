"use client";
import { useAuth } from "@/context/AuthContext";
import { Bell, Search } from "lucide-react";

interface Props { title: string; subtitle?: string; }

export default function Header({ title, subtitle }: Props) {
  const { user } = useAuth();
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/10 backdrop-blur-sm">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="input pl-9 w-56 py-2 text-xs"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}
