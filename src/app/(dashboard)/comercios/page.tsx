"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { comerciosApi, getErrorMessage } from "@/lib/api";
import { Comercio } from "@/types";
import { useSetBottomPanelTabs } from "@/context/BottomPanelContext";
import {
  Store, ShieldCheck, Clock, Ban, RefreshCw, Search, AlertTriangle,
  Globe, Mail, Phone, MessageCircle, MapPin, CheckCircle2, BadgeCheck, RotateCcw, Loader2,
} from "lucide-react";

function comercioStatusVariant(status?: string): "success" | "info" | "danger" | "default" {
  switch (status) {
    case "ACTIVE": return "success";
    case "PENDING_REVIEW": return "info";
    case "SUSPENDED": return "danger";
    default: return "default";
  }
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  PENDING_REVIEW: "Pendiente de revisión",
  SUSPENDED: "Suspendido",
};

export default function ComerciosPage() {
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Comercio | null>(null);
  // id of the comercio currently being validated/suspended/certified, for a per-row spinner
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const setTabs = useSetBottomPanelTabs();

  const load = async () => {
    setLoading(true); setLoadError(null);
    try {
      const res = await comerciosApi.list();
      if (res.success) setComercios(res.data);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyUpdate = (updated: Comercio) => {
    setComercios(cs => cs.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setDetail(d => d && d.id === updated.id ? { ...d, ...updated } : d);
  };

  const changeStatus = async (c: Comercio, status: string) => {
    setActingId(c.id); setActionError(null);
    try {
      const res = await comerciosApi.updateStatus(c.id, status);
      if (res.success) applyUpdate(res.data);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const toggleOfficial = async (c: Comercio) => {
    setActingId(c.id); setActionError(null);
    try {
      const res = await comerciosApi.setOfficial(c.id, !c.isOfficial);
      if (res.success) applyUpdate(res.data);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const filtered = comercios.filter(c =>
    `${c.name} ${c.ownerName ?? ""} ${c.ownerEmail ?? ""} ${c.legalName ?? ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const activeCount  = comercios.filter(c => c.status === "ACTIVE").length;
  const pendingCount = comercios.filter(c => c.status === "PENDING_REVIEW").length;
  const suspendedCount = comercios.filter(c => c.status === "SUSPENDED").length;

  // Shared action buttons — used in the table row and in the detail modal footer.
  const renderActions = (c: Comercio, size: "table" | "modal") => {
    const busy = actingId === c.id;
    const btnCls = size === "table" ? "btn-secondary px-2 py-1.5 text-xs" : "btn-secondary";
    return (
      <div className={size === "table" ? "flex gap-1" : "flex flex-wrap gap-2"} onClick={e => e.stopPropagation()}>
        {c.status === "PENDING_REVIEW" && (
          <button onClick={() => changeStatus(c, "ACTIVE")} disabled={busy} className={btnCls} title="Validar comercio">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {size === "modal" && <span className="ml-1.5">Validar</span>}
          </button>
        )}
        {c.status === "ACTIVE" && (
          <button onClick={() => changeStatus(c, "SUSPENDED")} disabled={busy} className={btnCls} title="Suspender comercio">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5 text-red-400" />}
            {size === "modal" && <span className="ml-1.5">Suspender</span>}
          </button>
        )}
        {c.status === "SUSPENDED" && (
          <button onClick={() => changeStatus(c, "ACTIVE")} disabled={busy} className={btnCls} title="Reactivar comercio">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-blue-400" />}
            {size === "modal" && <span className="ml-1.5">Reactivar</span>}
          </button>
        )}
        <button
          onClick={() => toggleOfficial(c)}
          disabled={busy}
          className={btnCls}
          title={c.isOfficial ? "Quitar certificación" : "Certificar comercio"}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className={`w-3.5 h-3.5 ${c.isOfficial ? "text-purple-400" : "text-slate-400"}`} />}
          {size === "modal" && <span className="ml-1.5">{c.isOfficial ? "Quitar certificación" : "Certificar"}</span>}
        </button>
      </div>
    );
  };

  const columns: Column<Comercio>[] = [
    { key: "name", label: "Comercio", render: c => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold overflow-hidden">
          {c.logoUrl
            ? <img src={c.logoUrl} alt="" className="w-full h-full object-cover" />
            : (c.name?.[0]?.toUpperCase() ?? "?")}
        </div>
        <div>
          <p className="text-white font-medium">{c.name}</p>
          {c.legalName && <p className="text-slate-500 text-xs">{c.legalName}</p>}
        </div>
      </div>
    )},
    { key: "owner", label: "Propietario", render: c => (
      <div>
        <p className="text-slate-300 text-sm">{c.ownerName ?? "—"}</p>
        {c.ownerEmail && <p className="text-slate-500 text-xs">{c.ownerEmail}</p>}
      </div>
    )},
    { key: "categorias", label: "Rubros", render: c => (
      <div className="flex gap-1 flex-wrap max-w-xs">
        {(c.sellingCategories ?? []).slice(0, 3).map(cat => (
          <span key={cat} className="text-xs px-1.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {cat}
          </span>
        ))}
        {!c.sellingCategories?.length && <span className="text-slate-600 text-xs">—</span>}
      </div>
    )},
    { key: "status", label: "Estado", render: c => (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge label={STATUS_LABEL[c.status ?? ""] ?? c.status ?? "—"} variant={comercioStatusVariant(c.status)} />
        {c.isOfficial && <Badge label="Certificado" variant="purple" />}
      </div>
    )},
    { key: "createdAt", label: "Registrado", render: c => (
      <span className="text-slate-400 text-xs">
        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-EC") : "—"}
      </span>
    )},
    { key: "actions", label: "", render: c => renderActions(c, "table") },
  ];

  // ── Bottom panel tabs ────────────────────────────────────────────────────
  useEffect(() => {
    setTabs([
      {
        id: "comercios",
        label: "Comercios",
        icon: Store,
        content: (
          <DataTable
            columns={columns} data={filtered} loading={loading}
            keyExtractor={c => c.id}
            emptyText={loadError ? "No se pudo cargar el listado" : "No se encontraron comercios"}
            onRowClick={setDetail}
          />
        ),
      },
    ]);
    return () => setTabs([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, loading, loadError, actingId, setTabs]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Comercios" subtitle="Tiendas registradas desde el portal mobilpymes.store" />
      <div className="flex-1 p-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total comercios" value={comercios.length}   icon={Store}       color="blue" />
          <StatCard title="Activos"         value={activeCount}        icon={ShieldCheck} color="emerald" />
          <StatCard title="Por revisar"     value={pendingCount}       icon={Clock}       color="amber" />
          <StatCard title="Suspendidos"     value={suspendedCount}     icon={Ban}         color="rose" />
        </div>

        {/* Toolbar */}
        <GlassCard padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, dueño o razón social..."
                className="input pl-9" />
            </div>
            <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </GlassCard>

        {loadError && (
          <GlassCard padding="sm" className="border-amber-500/20">
            <p className="text-sm text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No se pudo cargar el listado de comercios ({loadError}). El backend aún no
                expone un endpoint para listar todos los comercios — está solicitado al
                equipo de backend.
              </span>
            </p>
          </GlassCard>
        )}

        {actionError && (
          <GlassCard padding="sm" className="border-red-500/20">
            <p className="text-sm text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No se pudo actualizar el comercio ({actionError}).</span>
            </p>
          </GlassCard>
        )}

        <p className="text-xs text-slate-600 px-1">El listado de comercios está en el panel inferior ↓</p>
      </div>

      {/* Detail modal — permite validar / suspender / certificar el comercio */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? "Comercio"} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge label={STATUS_LABEL[detail.status ?? ""] ?? detail.status ?? "—"} variant={comercioStatusVariant(detail.status)} />
              {detail.isOfficial && <Badge label="Certificado" variant="purple" />}
            </div>
            {detail.description && <p className="text-slate-300 text-sm">{detail.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {detail.ownerName && <div><p className="label">Propietario</p><p className="text-white">{detail.ownerName}</p></div>}
              {detail.legalName && <div><p className="label">Razón social</p><p className="text-white">{detail.legalName}</p></div>}
              {detail.taxId && <div><p className="label">RUC / ID fiscal</p><p className="text-white">{detail.taxId}</p></div>}
              {detail.businessType && <div><p className="label">Tipo de negocio</p><p className="text-white">{detail.businessType}</p></div>}
              {detail.targetAudience && <div><p className="label">Vende a</p><p className="text-white">{detail.targetAudience}</p></div>}
              {detail.createdAt && <div><p className="label">Registrado</p><p className="text-white">{new Date(detail.createdAt).toLocaleDateString("es-EC")}</p></div>}
            </div>
            <div className="space-y-1.5 text-sm border-t border-white/10 pt-3">
              {detail.address && <p className="flex items-center gap-2 text-slate-300"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {detail.address}</p>}
              {detail.email && <p className="flex items-center gap-2 text-slate-300"><Mail className="w-3.5 h-3.5 text-slate-500" /> {detail.email}</p>}
              {detail.telefono && <p className="flex items-center gap-2 text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-500" /> {detail.telefono}</p>}
              {detail.whatsapp && <p className="flex items-center gap-2 text-slate-300"><MessageCircle className="w-3.5 h-3.5 text-slate-500" /> {detail.whatsapp}</p>}
              {detail.website && <p className="flex items-center gap-2 text-slate-300"><Globe className="w-3.5 h-3.5 text-slate-500" /> {detail.website}</p>}
            </div>
            <div className="border-t border-white/10 pt-3">
              <p className="label mb-2">Acciones</p>
              {renderActions(detail, "modal")}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
