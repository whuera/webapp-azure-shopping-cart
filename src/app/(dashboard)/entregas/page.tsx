"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { comerciosApi, entregasApi, getErrorMessage } from "@/lib/api";
import { Comercio, Entrega, EntregaEstado, Product } from "@/types";
import { useSetBottomPanelTabs } from "@/context/BottomPanelContext";
import {
  Truck, Clock, CheckCircle2, AlertTriangle, RefreshCw, Search, Store, Upload, Trash2, Loader2,
} from "lucide-react";

const ESTADO: Record<EntregaEstado, { label: string; variant: "warning" | "info" | "success" | "default" }> = {
  recibido: { label: "Por publicar", variant: "warning" },
  "publicada-parcial": { label: "Publicada en parte", variant: "info" },
  publicada: { label: "Publicada", variant: "success" },
  descartada: { label: "Descartada", variant: "default" },
};

type Filtro = "todas" | "sin-tienda" | "pendientes";

const fmtMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency", currency,
    minimumFractionDigits: currency === "CLP" ? 0 : 2, maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(value);

const fmtFecha = (iso: string) => new Date(iso).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });

const pendiente = (e: Entrega) => e.estado === "recibido" || e.estado === "publicada-parcial";

/**
 * Entregas de cosecha que Orbix registra en el portal (backend issue #51).
 * El personal del CRM ve todas, asigna tienda a las que llegaron con la clave
 * global de Orbix y puede publicarlas en nombre de la tienda: cada línea suma
 * sus cajas al inventario de un producto de esa tienda.
 */
export default function EntregasPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [detail, setDetail] = useState<Entrega | null>(null);
  const setTabs = useSetBottomPanelTabs();

  const load = async () => {
    setLoading(true); setLoadError(null);
    try {
      setEntregas(await entregasApi.list());
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // Los nombres de tienda son un extra: si falla, se muestra el id.
    comerciosApi.list().then(res => res.success && setComercios(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const nombreTienda = (storeId: number | null) =>
    storeId == null ? null : comercios.find(c => c.id === storeId)?.name ?? `Tienda #${storeId}`;

  const applyUpdate = (updated: Entrega) => {
    setEntregas(es => es.map(e => e.id === updated.id ? updated : e));
    setDetail(updated);
  };

  const filtered = entregas.filter(e => {
    if (filtro === "sin-tienda" && e.storeId != null) return false;
    if (filtro === "pendientes" && !pendiente(e)) return false;
    return `${e.pedidoId} ${e.centroAcopio} ${nombreTienda(e.storeId) ?? ""} ${e.lineas.map(l => l.nombre).join(" ")}`
      .toLowerCase().includes(search.toLowerCase());
  });

  const sinTiendaCount = entregas.filter(e => e.storeId == null && e.estado !== "descartada").length;
  const pendientesCount = entregas.filter(pendiente).length;
  const publicadasCount = entregas.filter(e => e.estado === "publicada").length;

  const columns: Column<Entrega>[] = [
    { key: "pedidoId", label: "Entrega", sortAccessor: e => e.id, exportValue: e => e.pedidoId, render: e => (
      <div>
        <p className="text-white font-medium">{e.pedidoId}</p>
        <p className="text-slate-500 text-xs">{e.centroAcopio}</p>
      </div>
    )},
    { key: "tienda", label: "Tienda", sortAccessor: e => nombreTienda(e.storeId) ?? "", exportValue: e => nombreTienda(e.storeId) ?? "Sin tienda", render: e => (
      e.storeId == null
        ? <Badge label="Sin tienda" variant="orange" />
        : <span className="text-slate-300 text-sm">{nombreTienda(e.storeId)}</span>
    )},
    { key: "lineas", label: "Productos", exportValue: e => e.lineas.filter(l => l.cajas > 0).map(l => `${l.nombre} (${l.cajas})`).join(", "), render: e => (
      <span className="text-slate-300 text-xs">
        {e.lineas.filter(l => l.cajas > 0).map(l => `${l.nombre} (${l.cajas})`).join(", ") || "—"}
      </span>
    )},
    { key: "total", label: "Total", sortAccessor: e => e.total, exportValue: e => fmtMoney(e.total, e.moneda), render: e => (
      <div className="tabular-nums">
        <p className="text-white text-sm">{fmtMoney(e.total, e.moneda)}</p>
        <p className="text-slate-500 text-xs">{e.totalCajas} cajas</p>
      </div>
    )},
    { key: "estado", label: "Estado", sortAccessor: e => ESTADO[e.estado]?.label ?? e.estado, exportValue: e => ESTADO[e.estado]?.label ?? e.estado, render: e => (
      <Badge label={ESTADO[e.estado]?.label ?? e.estado} variant={ESTADO[e.estado]?.variant ?? "default"} />
    )},
    { key: "confirmadaEn", label: "Confirmada", sortAccessor: e => e.confirmadaEn, exportValue: e => fmtFecha(e.confirmadaEn), render: e => (
      <span className="text-slate-400 text-xs">{fmtFecha(e.confirmadaEn)}</span>
    )},
  ];

  useEffect(() => {
    setTabs([
      {
        id: "entregas",
        label: "Entregas Orbix",
        icon: Truck,
        content: (
          <DataTable
            columns={columns} data={filtered} loading={loading}
            keyExtractor={e => e.id}
            emptyText={loadError ? "No se pudo cargar el listado" : "No hay entregas"}
            onRowClick={async e => {
              setDetail(e);
              // El detalle trae las sugerencias de producto por línea.
              try { setDetail(await entregasApi.get(e.id)); } catch { /* se queda con la fila */ }
            }}
            showIndex
            showTotalCount
            pageSize={10}
            exportFileName="entregas-orbix"
            exportTitle="Entregas de Orbix"
          />
        ),
      },
    ]);
    return () => setTabs([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, loading, loadError, comercios, setTabs]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Entregas Orbix" subtitle="Cosecha confirmada en Orbix: asignar tienda y publicar como stock" />
      <div className="flex-1 p-6 space-y-4">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total entregas" value={entregas.length}  icon={Truck}        color="blue" />
          <StatCard title="Sin tienda"     value={sinTiendaCount}   icon={Store}        color="rose" />
          <StatCard title="Por publicar"   value={pendientesCount}  icon={Clock}        color="amber" />
          <StatCard title="Publicadas"     value={publicadasCount}  icon={CheckCircle2} color="emerald" />
        </div>

        <GlassCard padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por número, tienda, centro o producto..."
                className="input pl-9" />
            </div>
            <select value={filtro} onChange={e => setFiltro(e.target.value as Filtro)} className="input w-auto" aria-label="Filtrar entregas">
              <option value="todas">Todas</option>
              <option value="sin-tienda">Sin tienda</option>
              <option value="pendientes">Por publicar</option>
            </select>
            <button onClick={load} className="btn-secondary" aria-label="Recargar"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </GlassCard>

        {loadError && (
          <GlassCard padding="sm" className="border-amber-500/20">
            <p className="text-sm text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No se pudo cargar el listado de entregas ({loadError}).</span>
            </p>
          </GlassCard>
        )}

        <p className="text-xs text-slate-600 px-1">El listado de entregas está en el panel inferior ↓</p>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Entrega ${detail.pedidoId}` : "Entrega"} size="lg">
        {detail && (
          <DetalleEntrega
            key={detail.id}
            entrega={detail}
            comercios={comercios}
            nombreTienda={nombreTienda}
            onUpdated={applyUpdate}
          />
        )}
      </Modal>
    </div>
  );
}

function DetalleEntrega({
  entrega, comercios, nombreTienda, onUpdated,
}: {
  entrega: Entrega;
  comercios: Comercio[];
  nombreTienda: (storeId: number | null) => string | null;
  onUpdated: (e: Entrega) => void;
}) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [eleccion, setEleccion] = useState<Record<number, string>>({});
  const [tiendaNueva, setTiendaNueva] = useState("");
  const [busy, setBusy] = useState<"publicar" | "descartar" | "tienda" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const descartada = entrega.estado === "descartada";
  const algunaPublicada = entrega.lineas.some(l => l.productId != null);
  const pendientes = entrega.lineas.filter(l => l.productId == null && l.cajas > 0);

  // Productos de la tienda de la entrega, en su moneda (el backend rechaza mezclar CLP y USD).
  useEffect(() => {
    setProductos([]);
    if (entrega.storeId == null) return;
    entregasApi.productosDeTienda(entrega.storeId)
      .then(res => res.success && setProductos(res.data.filter(p => p.status !== "DELETE_PRODUCT")))
      .catch(() => setError("No se pudieron cargar los productos de la tienda."));
  }, [entrega.storeId]);

  // Preselección: lo que ya eligió el usuario, o la sugerencia del backend.
  useEffect(() => {
    setEleccion(prev => {
      const next = { ...prev };
      for (const l of entrega.lineas) {
        if (next[l.id] === undefined && l.productoSugeridoId) next[l.id] = String(l.productoSugeridoId);
      }
      return next;
    });
  }, [entrega]);

  const elegibles = useMemo(
    () => productos.filter(p => (p.currency ?? "USD").toUpperCase() === entrega.moneda),
    [productos, entrega.moneda],
  );
  const nombreProducto = (pid: number | null) => productos.find(p => p.id === pid)?.name ?? `Producto #${pid}`;
  const listas = pendientes
    .filter(l => eleccion[l.id] && elegibles.some(p => String(p.id) === eleccion[l.id]))
    .map(l => ({ lineaId: l.id, productId: Number(eleccion[l.id]) }));

  const run = async (accion: "publicar" | "descartar" | "tienda", fn: () => Promise<Entrega>) => {
    setBusy(accion); setError(null);
    try {
      onUpdated(await fn());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge label={ESTADO[entrega.estado]?.label ?? entrega.estado} variant={ESTADO[entrega.estado]?.variant ?? "default"} />
        {entrega.storeId == null && <Badge label="Sin tienda" variant="orange" />}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="label">Confirmada en Orbix</p><p className="text-white">{fmtFecha(entrega.confirmadaEn)}</p></div>
        <div><p className="label">Recibida</p><p className="text-white">{fmtFecha(entrega.recibidoEn)}</p></div>
        <div><p className="label">Centro de acopio</p><p className="text-white">{entrega.centroAcopio}</p></div>
        <div><p className="label">Escenario</p><p className="text-white">{entrega.escenario}</p></div>
        <div><p className="label">Total</p><p className="text-white tabular-nums">{fmtMoney(entrega.total, entrega.moneda)} · {entrega.totalCajas} cajas</p></div>
        <div><p className="label">Tienda</p><p className="text-white">{nombreTienda(entrega.storeId) ?? "Sin asignar"}</p></div>
      </div>

      {/* Asignar tienda: solo mientras no haya nada publicado */}
      {!algunaPublicada && !descartada && (
        <div className="border-t border-white/10 pt-3">
          <p className="label mb-2">{entrega.storeId == null ? "Asignar tienda" : "Cambiar tienda"}</p>
          <div className="flex gap-2 flex-wrap">
            <select value={tiendaNueva} onChange={e => setTiendaNueva(e.target.value)} className="input flex-1 min-w-48" aria-label="Tienda">
              <option value="">Elige una tienda…</option>
              {comercios.filter(c => c.id !== entrega.storeId).map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.ownerName ? ` · ${c.ownerName}` : ""}</option>
              ))}
            </select>
            <button
              className="btn-secondary"
              disabled={!tiendaNueva || busy != null}
              onClick={() => run("tienda", async () => {
                // El detalle (GET) trae las sugerencias de producto de la tienda nueva; el PUT no.
                await entregasApi.asignarTienda(entrega.id, Number(tiendaNueva));
                setTiendaNueva("");
                return entregasApi.get(entrega.id);
              })}
            >
              {busy === "tienda" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
              <span className="ml-1.5">Asignar</span>
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="label">Líneas</p>
        {entrega.lineas.map(l => (
          <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{l.nombre}</p>
              <p className="text-slate-500 text-xs tabular-nums">
                {l.cajas} cajas × {fmtMoney(l.precioPorCaja, entrega.moneda)} = {fmtMoney(l.subtotal, entrega.moneda)}
              </p>
            </div>
            <div className="sm:w-64">
              {l.productId != null ? (
                <p className="text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Sumada a {nombreProducto(l.productId)}
                </p>
              ) : l.cajas <= 0 ? (
                <p className="text-slate-500 text-xs">Sin carga</p>
              ) : descartada || entrega.storeId == null ? (
                <p className="text-slate-500 text-xs">{descartada ? "No publicada" : "Asigna una tienda primero"}</p>
              ) : (
                <select
                  value={eleccion[l.id] ?? ""}
                  onChange={e => setEleccion(prev => ({ ...prev, [l.id]: e.target.value }))}
                  className="input text-xs"
                  aria-label={`Producto para ${l.nombre}`}
                >
                  <option value="">Elige un producto…</option>
                  {elegibles.map(p => <option key={p.id} value={p.id}>{p.name} · stock {p.stock ?? 0}</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
        {entrega.storeId != null && !descartada && pendientes.length > 0 && elegibles.length === 0 && (
          <p className="text-xs text-slate-500">
            La tienda no tiene productos en {entrega.moneda}. El vendedor puede crearlos desde su panel en mobilpymes.store.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </p>
      )}

      {!descartada && (pendientes.length > 0 || !algunaPublicada) && (
        <div className="flex flex-wrap gap-2 justify-between border-t border-white/10 pt-3">
          {!algunaPublicada ? (
            <button
              className="btn-secondary"
              disabled={busy != null}
              onClick={() => {
                if (window.confirm("La entrega queda descartada y no se podrá publicar. ¿Continuar?")) {
                  run("descartar", () => entregasApi.descartar(entrega.id));
                }
              }}
            >
              {busy === "descartar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-400" />}
              <span className="ml-1.5">Descartar</span>
            </button>
          ) : <span />}
          {entrega.storeId != null && pendientes.length > 0 && (
            <button
              className="btn-primary"
              disabled={listas.length === 0 || busy != null}
              onClick={() => run("publicar", () => entregasApi.publicar(entrega.id, listas))}
            >
              {busy === "publicar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="ml-1.5">
                {listas.length === 0 ? "Elige productos para publicar" : `Publicar ${listas.length} línea${listas.length !== 1 ? "s" : ""}`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
