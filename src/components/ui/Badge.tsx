import clsx from "clsx";

type Variant =
  | "success" | "warning" | "danger" | "info"
  | "default" | "purple" | "orange";

const variants: Record<Variant, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  danger:  "bg-red-500/15 text-red-400 border-red-500/20",
  info:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  default: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  purple:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  orange:  "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

interface Props {
  label: string;
  variant?: Variant;
  className?: string;
}

export default function Badge({ label, variant = "default", className }: Props) {
  return (
    <span className={clsx("badge border", variants[variant], className)}>
      {label}
    </span>
  );
}

// Map status strings to variants
export function statusVariant(status: string): Variant {
  const s = status?.toUpperCase() ?? "";
  if (["ACTIVE", "PAID", "OPEN", "POSTED", "APPROVED", "WON", "DONE", "RESOLVED",
       "CREATE_PRODUCT", "CUSTOMER", "ASSET_ACTIVE"].some(v => s.includes(v))) return "success";
  if (["PENDING", "DRAFT", "IN_PROGRESS", "OPEN"].some(v => s.includes(v))) return "info";
  if (["CLOSED", "INACTIVE", "CANCELLED", "DISPOSED", "LOST", "CHURNED", "REJECTED",
       "DELETE", "LOCKED", "PERIOD_LOCKED"].some(v => s.includes(v))) return "danger";
  if (["WAITING", "SENT", "PERIOD_CLOSED"].some(v => s.includes(v))) return "warning";
  if (["LEAD", "PROSPECT"].some(v => s.includes(v))) return "purple";
  return "default";
}
