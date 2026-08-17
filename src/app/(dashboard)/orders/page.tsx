"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { ordersApi, customersApi, productsApi, warehousesApi } from "@/lib/api";
import {
  Order, OrderTracking, OrderStatus,
  Customer, Product, Warehouse, CreateOrderRequest, UpdateOrderStatusRequest,
} from "@/types";
import {
  Plus, RefreshCw, Eye, PackageSearch,
  ShoppingBag, Clock, Truck, CheckCircle2, XCircle,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Normalize ORDER_XXX → XXX (ecommerce channel uses prefix, CRM doesn't)
function normalizeStatus(s: OrderStatus): string {
  return s.startsWith("ORDER_") ? s.slice(6) : s;
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:    { label: "Recibido",       color: "bg-slate-500/20 text-slate-300 border-slate-500/30",    dot: "bg-slate-400" },
  CONFIRMED:  { label: "Confirmado",     color: "bg-blue-500/20 text-blue-300 border-blue-500/30",       dot: "bg-blue-400" },
  PREPARING:  { label: "En preparación", color: "bg-amber-500/20 text-amber-300 border-amber-500/30",    dot: "bg-amber-400" },
  DISPATCHED: { label: "Despachado",     color: "bg-orange-500/20 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  SHIPPED:    { label: "Enviado",        color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", dot: "bg-indigo-400" },
  IN_TRANSIT: { label: "En tránsito",    color: "bg-purple-500/20 text-purple-300 border-purple-500/30", dot: "bg-purple-400" },
  DELIVERED:  { label: "Entregado",      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  CANCELLED:  { label: "Cancelado",      color: "bg-red-500/20 text-red-300 border-red-500/30",          dot: "bg-red-400" },
  RETURNED:   { label: "Devuelto",       color: "bg-rose-500/20 text-rose-300 border-rose-500/30",       dot: "bg-rose-400" },
};

// Next transitions only apply to CRM-created orders (no prefix)
const NEXT_STATUSES: Partial<Record<string, OrderStatus[]>> = {
  PENDING:    ["CONFIRMED", "CANCELLED"],
  CONFIRMED:  ["PREPARING", "CANCELLED"],
  PREPARING:  ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["SHIPPED", "CANCELLED"],
  SHIPPED:    ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED", "RETURNED"],
  DELIVERED:  ["RETURNED"],
};

const TIMELINE_STEPS = ["PENDING","CONFIRMED","PREPARING","DISPATCHED","SHIPPED","IN_TRANSIT","DELIVERED"];

function StatusBadge({ status }: { status: OrderStatus }) {
  const key = normalizeStatus(status);
  const m = STATUS_META[key] ?? { label: key, color: "bg-slate-500/20 text-slate-300 border-slate-500/30", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ── Tracking Timeline ─────────────────────────────────────────────────────────

function TrackingTimeline({ tracking, currentStatus }: { tracking: OrderTracking[]; currentStatus: OrderStatus }) {
  const normCurrent = normalizeStatus(currentStatus);
  const isCancelled = normCurrent === "CANCELLED" || normCurrent === "RETURNED";
  const reachedIdx = isCancelled ? -1 : TIMELINE_STEPS.indexOf(normCurrent);

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, idx) => {
        const event = tracking.find(t => normalizeStatus(t.status) === step);
        const done = !isCancelled && idx <= reachedIdx;
        const current = !isCancelled && idx === reachedIdx;
        const meta = STATUS_META[step];

        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                current
                  ? `${meta.dot.replace("bg-", "border-")} ${meta.dot} shadow-lg`
                  : done
                  ? "border-emerald-500 bg-emerald-500/20"
                  : "border-white/10 bg-white/5"
              }`}>
                {done && !current && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {current && <span className={`w-2 h-2 rounded-full bg-white`} />}
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[2rem] my-1 ${done && idx < reachedIdx ? "bg-emerald-500/40" : "bg-white/10"}`} />
              )}
            </div>

            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold ${done ? "text-white" : "text-slate-500"}`}>
                  {meta.label}
                </p>
                {current && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                    ACTUAL
                  </span>
                )}
              </div>
              {event ? (
                <div className="mt-0.5">
                  {event.notes && <p className="text-xs text-slate-400 leading-relaxed">{event.notes}</p>}
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {new Date(event.createdAt).toLocaleString("es")}
                    {event.createdBy && ` · ${event.createdBy}`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 mt-0.5">Pendiente</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Cancelled / Returned */}
      {tracking.filter(t => ["CANCELLED","RETURNED","ORDER_CANCELLED","ORDER_RETURNED"].includes(t.status)).map(ev => (
        <div key={ev.id} className="flex gap-3 mt-1">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full border-2 border-red-500 bg-red-500/20 flex items-center justify-center shrink-0">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            </div>
          </div>
          <div className="pb-2 flex-1">
            <p className="text-sm font-semibold text-red-400">
              {STATUS_META[normalizeStatus(ev.status)]?.label ?? ev.status}
            </p>
            {ev.notes && <p className="text-xs text-slate-400 mt-0.5">{ev.notes}</p>}
            <p className="text-[10px] text-slate-600 mt-0.5">
              {new Date(ev.createdAt).toLocaleString("es")}
              {ev.createdBy && ` · ${ev.createdBy}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface LineItem { productId: number; quantity: number; name?: string; price?: number; }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail + tracking
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<OrderTracking[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState<{
    customerId: string; warehouseId: string;
    taxRate: number; shippingAddress: string;
    estimatedDelivery: string; notes: string;
    items: LineItem[];
  }>({ customerId: "", warehouseId: "", taxRate: 0, shippingAddress: "", estimatedDelivery: "", notes: "", items: [] });
  const [saving, setSaving] = useState(false);

  // Status update modal
  const [statusModal, setStatusModal] = useState<Order | null>(null);
  const [statusForm, setStatusForm] = useState<UpdateOrderStatusRequest>({ status: "CONFIRMED" });
  const [statusSaving, setStatusSaving] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const load = async () => {
    setLoading(true);
    // Fetch all and filter client-side to handle both ORDER_XXX and XXX status formats
    const r = await ordersApi.list();
    if (r.success) {
      const all = r.data;
      setOrders(filterStatus === "ALL"
        ? all
        : all.filter(o => normalizeStatus(o.status) === filterStatus)
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  useEffect(() => {
    customersApi.list().then(r => { if (r.success) setCustomers(r.data); });
    productsApi.list().then(r => { if (r.success) setProducts(r.data); });
    warehousesApi.list().then(r => { if (r.success) setWarehouses(r.data); });
  }, []);

  const openDetail = async (order: Order) => {
    setDetailOrder(order);
    setTrackingLoading(true);
    const r = await ordersApi.tracking(order.id);
    if (r.success) setTracking(r.data);
    setTrackingLoading(false);
  };

  // Create
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: 0, quantity: 1 }] }));
  const updateItem = (idx: number, key: keyof LineItem, val: string | number) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      if (key === "productId") {
        const p = products.find(p => p.id === Number(val));
        if (p) { items[idx].name = p.name; items[idx].price = p.price; }
      }
      return { ...f, items };
    });
  };
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const createOrder = async () => {
    if (!form.customerId || !form.warehouseId || form.items.length === 0) return;
    setSaving(true);
    const body: CreateOrderRequest = {
      customerId: Number(form.customerId),
      warehouseId: Number(form.warehouseId),
      taxRate: form.taxRate,
      shippingAddress: form.shippingAddress || undefined,
      estimatedDelivery: form.estimatedDelivery || undefined,
      notes: form.notes || undefined,
      items: form.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    };
    await ordersApi.create(body);
    setCreateModal(false);
    setForm({ customerId: "", warehouseId: "", taxRate: 0, shippingAddress: "", estimatedDelivery: "", notes: "", items: [] });
    load();
    setSaving(false);
  };

  // Status update — only available for orders without ORDER_ prefix (CRM-created)
  const openStatusModal = (order: Order) => {
    const normKey = normalizeStatus(order.status);
    const nexts = NEXT_STATUSES[normKey];
    if (!nexts || nexts.length === 0) return;
    setStatusModal(order);
    setStatusForm({ status: nexts[0], notes: "" });
  };

  const saveStatus = async () => {
    if (!statusModal) return;
    setStatusSaving(true);
    const r = await ordersApi.updateStatus(statusModal.id, statusForm);
    if (r.success) {
      load();
      if (detailOrder?.id === statusModal.id) openDetail(r.data);
    }
    setStatusModal(null);
    setStatusSaving(false);
  };

  // Stats — normalize status before comparing
  const ns = (o: Order) => normalizeStatus(o.status);
  const pending = orders.filter(o => ns(o) === "PENDING").length;
  const inTransit = orders.filter(o => ["CONFIRMED","PREPARING","DISPATCHED","SHIPPED","IN_TRANSIT"].includes(ns(o))).length;
  const delivered = orders.filter(o => ns(o) === "DELIVERED").length;
  const cancelled = orders.filter(o => ns(o) === "CANCELLED" || ns(o) === "RETURNED").length;

  const columns: Column<Order>[] = [
    { key: "orderNumber", label: "Pedido", render: o => (
      <span className="font-mono text-blue-400 text-sm">{o.orderNumber}</span>
    )},
    { key: "customer", label: "Cliente", render: o => (
      <span className="text-slate-200">{o.customer.firstName} {o.customer.lastName}</span>
    )},
    { key: "status", label: "Estado", render: o => <StatusBadge status={o.status} /> },
    { key: "total", label: "Total", render: o => (
      <span className="text-emerald-400 font-semibold">${o.total.toFixed(2)}</span>
    )},
    { key: "trackingCode", label: "Guía", render: o => (
      <span className="text-slate-500 text-xs font-mono">{o.trackingCode ?? "—"}</span>
    )},
    { key: "estimatedDelivery", label: "Entrega est.", render: o => (
      <span className="text-slate-400 text-xs">
        {o.estimatedDelivery ? new Date(o.estimatedDelivery).toLocaleDateString("es") : "—"}
      </span>
    )},
    { key: "createdAt", label: "Creado", render: o => (
      <span className="text-slate-500 text-xs">{new Date(o.createdAt).toLocaleDateString("es")}</span>
    )},
    { key: "actions", label: "", render: o => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => openDetail(o)} className="btn-secondary px-2 py-1.5 text-xs" title="Ver seguimiento">
          <Eye className="w-3 h-3" />
        </button>
        {NEXT_STATUSES[normalizeStatus(o.status)] && NEXT_STATUSES[normalizeStatus(o.status)]!.length > 0 && (
          <button onClick={() => openStatusModal(o)} className="btn-primary px-2 py-1.5 text-xs" title="Actualizar estado">
            <Truck className="w-3 h-3" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Pedidos" subtitle="Gestión y seguimiento de órdenes" />
      <div className="flex-1 p-6 space-y-4 overflow-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Nuevos pedidos" value={pending} icon={ShoppingBag} color="blue" />
          <StatCard title="En proceso" value={inTransit} icon={Truck} color="amber" />
          <StatCard title="Entregados" value={delivered} icon={CheckCircle2} color="emerald" />
          <StatCard title="Cancelados" value={cancelled} icon={XCircle} color="rose" />
        </div>

        {/* Toolbar */}
        <GlassCard padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={load} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {[
                { value: "ALL", label: "Todos" },
                { value: "PENDING", label: "Recibidos" },
                { value: "IN_TRANSIT", label: "En tránsito" },
                { value: "DELIVERED", label: "Entregados" },
                { value: "CANCELLED", label: "Cancelados" },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === f.value
                      ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button onClick={() => setCreateModal(true)} className="btn-primary ml-auto">
              <Plus className="w-4 h-4" /> Nuevo pedido
            </button>
          </div>
        </GlassCard>

        {/* Table */}
        <DataTable
          columns={columns} data={orders} loading={loading}
          keyExtractor={o => o.id}
          emptyText="Sin pedidos registrados"
        />
      </div>

      {/* ── Detail + Tracking Modal ───────────────────────────────────────── */}
      <Modal
        open={!!detailOrder}
        onClose={() => { setDetailOrder(null); setTracking([]); }}
        title={`Pedido ${detailOrder?.orderNumber ?? ""}`}
        size="xl"
      >
        {detailOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: info + items */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {([
                  ["Cliente", `${detailOrder.customer.firstName} ${detailOrder.customer.lastName}`],
                  ["Estado", null],
                  ["Total", `$${detailOrder.total.toFixed(2)}`],
                  ["Pago", detailOrder.paymentMethod ?? "—"],
                  ["Guía", detailOrder.trackingCode ?? "—"],
                  ["Transportista", detailOrder.carrier ?? "—"],
                  ["Entrega est.", detailOrder.estimatedDelivery
                    ? new Date(detailOrder.estimatedDelivery).toLocaleDateString("es") : "—"],
                  ["Factura", detailOrder.invoiceNumber ?? "—"],
                  ["Canal", detailOrder.canal ?? "—"],
                  ["Dirección", detailOrder.shippingAddress ?? "—"],
                ] as [string, string | null][]).map(([l, v]) => (
                  <div key={l} className="bg-white/5 rounded-xl px-3 py-2 flex justify-between items-center gap-2">
                    <span className="text-slate-400 text-xs shrink-0">{l}</span>
                    {v === null
                      ? <StatusBadge status={detailOrder.status} />
                      : <span className="text-white text-xs font-medium text-right">{v}</span>
                    }
                  </div>
                ))}
              </div>

              {detailOrder.notes && (
                <div className="bg-white/5 rounded-xl px-3 py-2">
                  <p className="text-slate-400 text-xs mb-1">Notas</p>
                  <p className="text-slate-300 text-sm">{detailOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-300 mb-2">Productos</p>
                <div className="space-y-1.5">
                  {detailOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-slate-200 text-sm">{item.product.name}</p>
                        <p className="text-slate-500 text-xs">{item.product.sku ?? ""} · ×{item.quantity} a ${item.unitPrice.toFixed(2)}</p>
                      </div>
                      <span className="text-white font-medium text-sm">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {NEXT_STATUSES[normalizeStatus(detailOrder.status)] && NEXT_STATUSES[normalizeStatus(detailOrder.status)]!.length > 0 && (
                <button
                  onClick={() => { openStatusModal(detailOrder); }}
                  className="btn-primary w-full"
                >
                  <Truck className="w-4 h-4" /> Actualizar estado
                </button>
              )}
            </div>

            {/* Right: tracking timeline */}
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-4">Seguimiento</p>
              {trackingLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                </div>
              ) : (
                <TrackingTimeline tracking={tracking} currentStatus={detailOrder.status} />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Order Modal ─────────────────────────────────────────────── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nuevo pedido" size="xl">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Cliente *</label>
            <select className="input" value={form.customerId}
              onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
              <option value="">Seleccionar cliente...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bodega de despacho *</label>
            <select className="input" value={form.warehouseId}
              onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
              <option value="">Seleccionar bodega...</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Impuesto (%)</label>
            <input type="number" className="input" value={form.taxRate}
              onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Fecha estimada de entrega</label>
            <input type="date" className="input" value={form.estimatedDelivery}
              onChange={e => setForm(f => ({ ...f, estimatedDelivery: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Dirección de envío</label>
            <input className="input" value={form.shippingAddress}
              onChange={e => setForm(f => ({ ...f, shippingAddress: e.target.value }))} />
          </div>
        </div>

        {/* Items */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-300">Líneas de producto</p>
            <button onClick={addItem} className="btn-secondary text-xs px-2 py-1">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {form.items.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Agrega al menos un producto</p>
          ) : (
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {idx === 0 && <label className="label">Producto</label>}
                    <select className="input" value={item.productId}
                      onChange={e => updateItem(idx, "productId", Number(e.target.value))}>
                      <option value={0}>Seleccionar...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    {idx === 0 && <label className="label">Cantidad</label>}
                    <input type="number" min={1} className="input" value={item.quantity}
                      onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                  </div>
                  <button onClick={() => removeItem(idx)} className="btn-danger px-2 py-2.5 text-xs mb-0.5">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input h-16 resize-none" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button onClick={() => setCreateModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={createOrder} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear pedido
          </button>
        </div>
      </Modal>

      {/* ── Status Update Modal ────────────────────────────────────────────── */}
      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Actualizar estado — ${statusModal?.orderNumber ?? ""}`}
        size="sm"
      >
        {statusModal && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-2">Estado actual</p>
              <StatusBadge status={statusModal.status} />
            </div>
            <div>
              <label className="label">Nuevo estado *</label>
              <select className="input" value={statusForm.status}
                onChange={e => setStatusForm(f => ({ ...f, status: e.target.value as OrderStatus }))}>
                {(NEXT_STATUSES[normalizeStatus(statusModal.status)] ?? []).map(s => (
                  <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
                ))}
              </select>
            </div>
            {(statusForm.status === "DISPATCHED" || statusForm.status === "SHIPPED") && (
              <>
                <div>
                  <label className="label">Código de guía / tracking</label>
                  <input className="input" value={statusForm.trackingCode ?? ""}
                    onChange={e => setStatusForm(f => ({ ...f, trackingCode: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Transportista</label>
                  <input className="input" value={statusForm.carrier ?? ""}
                    onChange={e => setStatusForm(f => ({ ...f, carrier: e.target.value }))} />
                </div>
              </>
            )}
            <div>
              <label className="label">Notas / observaciones</label>
              <textarea className="input h-20 resize-none" value={statusForm.notes ?? ""}
                onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setStatusModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={saveStatus} className="btn-primary" disabled={statusSaving}>
            {statusSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Confirmar
          </button>
        </div>
      </Modal>
    </div>
  );
}
