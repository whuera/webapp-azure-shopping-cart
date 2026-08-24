"use client";
import Header from "@/components/layout/Header";
import { useTheme, Theme } from "@/context/ThemeContext";
import { Check, Moon, Sun } from "lucide-react";

/* ─── Theme option card ────────────────────────────────────── */
interface ThemeCardProps {
  value: Theme;
  label: string;
  description: string;
  icon: React.ElementType;
  preview: React.ReactNode;
  current: Theme;
  onSelect: (t: Theme) => void;
}

function ThemeCard({ value, label, description, icon: Icon, preview, current, onSelect }: ThemeCardProps) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={[
        "relative flex flex-col rounded-2xl border-2 overflow-hidden text-left",
        "transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]",
        active
          ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.20)]"
          : "border-white/10 hover:border-white/25",
      ].join(" ")}
    >
      {/* Preview thumbnail */}
      <div className="w-full h-40 overflow-hidden shrink-0">
        {preview}
      </div>

      {/* Label row */}
      <div
        className={[
          "flex items-center gap-3 px-4 py-3",
          active ? "bg-blue-600/15" : "bg-white/5",
        ].join(" ")}
      >
        <Icon className={active ? "w-5 h-5 text-blue-400" : "w-5 h-5 text-slate-400"} />
        <div className="flex-1 min-w-0">
          <p className={active ? "text-sm font-semibold text-blue-300" : "text-sm font-semibold text-slate-200"}>
            {label}
          </p>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
        {active && (
          <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Dark theme mini-preview ──────────────────────────────── */
function DarkPreview() {
  return (
    <div className="w-full h-full bg-[#080d20] flex">
      {/* sidebar */}
      <div className="w-12 h-full bg-black/40 border-r border-white/10 flex flex-col gap-2 p-2">
        <div className="w-full h-7 rounded-lg bg-blue-600/25 mb-1" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`w-full h-5 rounded-lg ${i===1 ? "bg-blue-600/20" : "bg-white/5"}`} />
        ))}
      </div>
      {/* main */}
      <div className="flex-1 flex flex-col p-3 gap-2">
        <div className="h-6 bg-black/20 border-b border-white/10 -mx-3 -mt-3 px-3 flex items-center mb-2">
          <div className="w-20 h-3 rounded bg-white/20" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-white/5 border border-white/10" />
          ))}
        </div>
        <div className="flex-1 rounded-xl bg-white/5 border border-white/10 mt-1" />
      </div>
      {/* right panel */}
      <div className="w-12 h-full bg-black/30 border-l border-white/10" />
    </div>
  );
}

/* ─── Light theme mini-preview ─────────────────────────────── */
function LightPreview() {
  return (
    <div className="w-full h-full bg-[#f0f4f9] flex">
      {/* sidebar (stays dark) */}
      <div className="w-12 h-full bg-[#1a1d2e] border-r border-black/10 flex flex-col gap-2 p-2">
        <div className="w-full h-7 rounded-lg bg-blue-600/30 mb-1" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`w-full h-5 rounded-lg ${i===1 ? "bg-blue-600/20" : "bg-white/10"}`} />
        ))}
      </div>
      {/* main */}
      <div className="flex-1 flex flex-col p-3 gap-2">
        <div className="h-6 bg-white/80 border-b border-black/8 -mx-3 -mt-3 px-3 flex items-center mb-2">
          <div className="w-20 h-3 rounded bg-gray-300" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-white border border-black/8 shadow-sm" />
          ))}
        </div>
        <div className="flex-1 rounded-xl bg-white border border-black/8 shadow-sm mt-1" />
      </div>
      {/* right panel (stays dark) */}
      <div className="w-12 h-full bg-[#1a1d2e] border-l border-black/10" />
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme();

  const themes: Omit<ThemeCardProps, "current" | "onSelect">[] = [
    {
      value: "dark",
      label: "Oscuro",
      description: "Interfaz oscura — ideal para ambientes con poca luz",
      icon: Moon,
      preview: <DarkPreview />,
    },
    {
      value: "light",
      label: "Claro",
      description: "Interfaz clara — estilo moderno y de alta legibilidad",
      icon: Sun,
      preview: <LightPreview />,
    },
  ];

  return (
    <>
      <Header title="Configuración" subtitle="Ajustes del Portal Controller" />

      <div className="flex-1 p-6 space-y-8 max-w-3xl">

        {/* ── Apariencia ── */}
        <section>
          <div className="mb-5">
            <h2 className="section-title">Apariencia</h2>
            <p className="text-sm text-slate-500 mt-1">
              Elige el aspecto visual del portal. El cambio se aplica de forma inmediata.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {themes.map((t) => (
              <ThemeCard
                key={t.value}
                {...t}
                current={theme}
                onSelect={setTheme}
              />
            ))}
          </div>

          {/* Active badge */}
          <p className="mt-4 text-xs text-slate-500">
            Tema activo:{" "}
            <span className="font-semibold text-blue-400">
              {theme === "dark" ? "Oscuro" : "Claro"}
            </span>
          </p>
        </section>

        {/* ── Próximamente ── */}
        <section>
          <div className="mb-4">
            <h2 className="section-title">Más opciones</h2>
            <p className="text-sm text-slate-500 mt-1">
              Próximamente disponibles en futuras versiones.
            </p>
          </div>

          <div className="glass p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Color de acento",    desc: "Personaliza el color principal del portal" },
              { label: "Tamaño de fuente",   desc: "Ajusta la escala tipográfica de la interfaz" },
              { label: "Densidad de tabla",  desc: "Compacta o cómoda para las listas de datos" },
              { label: "Idioma",             desc: "Español (ES) — más idiomas próximamente" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3 opacity-50 cursor-not-allowed">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">{label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
