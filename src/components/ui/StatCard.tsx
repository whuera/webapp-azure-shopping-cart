import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "blue" | "emerald" | "amber" | "purple" | "rose";
}

const colors = {
  blue:    { icon: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  amber:   { icon: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/20" },
  purple:  { icon: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/20" },
  rose:    { icon: "text-rose-400",   bg: "bg-rose-500/15 border-rose-500/20" },
};

export default function StatCard({
  title, value, subtitle, icon: Icon,
  trend, trendValue, color = "blue",
}: Props) {
  const c = colors[color];
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={clsx("w-10 h-10 rounded-xl border flex items-center justify-center", c.bg)}>
          <Icon className={clsx("w-5 h-5", c.icon)} />
        </div>
        {trend && trendValue && (
          <span
            className={clsx(
              "text-xs font-medium px-2 py-1 rounded-lg",
              trend === "up" ? "bg-emerald-500/15 text-emerald-400" :
              trend === "down" ? "bg-red-500/15 text-red-400" :
              "bg-slate-500/15 text-slate-400"
            )}
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
