"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { invoicesApi, cashApi, customersApi, productsApi, warehousesApi } from "@/lib/api";
import {
  Invoice, DailyCash, Customer, Product, Warehouse, InvoiceRequest,
} from "@/types";
import {
  Plus, RefreshCw, ReceiptText, DollarSign, XCircle, Eye,
  TrendingUp, CreditCard,
} from "lucide-react";

interface LineItem { productId: number; quantity: number; name?: string; price?: number; }

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [todayCash, setTodayCash] = useState<DailyCash | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState<Invoice | null>(null);
  const [cashModal, setCashModal] = useState(false);

  const [form, setForm] = useState<{
    customerId: string; warehouseId: string;
    paymentMethod: string; taxRate: number; notes: string;
    items: LineItem[];
  }>({
    customerId: "", warehouseId: "", paymentMethod: "CASH", taxRate: 0, notes: "", items: [],
  });
  const [saving, setSaving] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [cashAction, setCashAction] = useState<"open" | "close">("open");

  const load = async () => {
    setLoading(true);
    const [ir, cr] = await Promise.allSettled([
      invoicesApi.list(),
      cashApi.today().catch(() => ({ success: false, data: null })),
    ]);
    if (ir.status === "fulfilled" && ir.value.success) setInvoices(ir.value.data);
    if (cr.status === "fulfilled" && cr.value.success) setTodayCash(cr.value.data as DailyCash);
    setLoading(false);
  };

  useEffect(() => {
    load();
    customersApi.list().then(r => { if (r.success) setCustomers(r.data); });
    productsApi.list().then(r => { if (r.success) setProducts(r.data); });
    warehousesApi.list().then(r => { if (r.success) setWarehouses(r.data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSales = invoices
    .filter(i => i.status === "INVOICE_PAID" || i.status === "PAID")
    .reduce((s, i) => s + i.total, 0);

  const addItem = () => setForm(f => ({
    ...f,
    items: [...f.items, { productId: 0, quantity: 1 }],
  }));

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

  const removeItem = (idx: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const createInvoice = async () => {
    if (!form.customerId || !form.warehouseId || form.items.length === 0) return;
    setSaving(true);
    const body: InvoiceRequest = {
      customerId: Number(form.customerId),
      warehouseId: Number(form.warehouseId),
      paymentMethod: form.paymentMethod,
      taxRate: form.taxRate,
      notes: form.notes,
      items: form.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    };
    await invoicesApi.create(body);
    setCreateModal(false);
    setForm({ customerId: "", warehouseId: "", paymentMethod: "CASH", taxRate: 0, notes: "", items: [] });
    load();
    setSaving(false);
  };

  const cancelInvoice = async (id: number) => {
    if (!confirm("¿Anular esta factura?")) return;
    await invoicesApi.cancel(id);
    load();
  };

  const handleCashAction = async () => {
    if (cashAction === "open") await cashApi.open(openingBalance);
    else await cashApi.close();
    setCashModal(false);
    load();
  };

  const columns: Column<Invoice>[] = [
    { key: "invoiceNumber", label: "Factura", render: i => (
      <span className="font-mono text-blue-400">{i.invoiceNumber}</span>
    )},
    { key: "customer", label: "Cliente", render: i => (
      <span>{i.customer.firstName} {i.customer.lastName}</span>
    )},
    { key: "total", label: "Total", render: i => (
      <span className="text-emerald-400 font-semibold">${i.total.toFixed(2)}</span>
    )},
    { key: "paymentMethod", label: "Pago", render: i => (
      <Badge label={i.paymentMethod} variant="info" />
    )},
    { key: "status", label: "Estado", render: i => (
      <Badge label={i.status} variant={statusVariant(i.status)} />
    )},
    { key: "createdAt", label: "Fecha", render: i => (
      <span className="text-slate-400 text-xs">{new Date(i.createdAt).toLocaleDateString("es")}</span>
    )},
    { key: "actions", label: "", render: i => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => setDetailModal(i)} className="btn-secondary px-2 py-1.5 text-xs">
          <Eye className="w-3 h-3" />
        </button>
        {i.status !== "INVOICE_CANCELLED" && i.status !== "CANCELLED" && (
          <button onClick={() => cancelInvoice(i.id)} className="btn-danger px-2 py-1.5 text-xs">
            <XCircle className="w-3 h-3" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Ventas" subtitle="Facturas y caja diaria" />
      <div className="flex-1 p-6 space-y-4 overflow-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total facturado" value={`$${totalSales.toLocaleString("es", { maximumFractionDigits: 0 })}`} icon={DollarSign} color="emerald" />
          <StatCard title="Facturas" value={invoices.length} icon={ReceiptText} color="blue" />
          <StatCard title="Pendientes" value={invoices.filter(i => i.status === "PENDING" || i.status === "INVOICE_PENDING").length} icon={TrendingUp} color="amber" />
          <StatCard
            title="Caja"
            value={todayCash ? (todayCash.status === "DAILY_CASH_OPEN" ? "Abierta" : "Cerrada") : "Sin abrir"}
            icon={CreditCard}
            color={todayCash?.status === "DAILY_CASH_OPEN" ? "emerald" : "rose"}
          />
        </div>

        {/* Toolbar */}
        <GlassCard padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={load} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCashAction(todayCash?.status === "DAILY_CASH_OPEN" ? "close" : "open");
                setCashModal(true);
              }}
              className="btn-secondary"
            >
              <CreditCard className="w-4 h-4" />
              {todayCash?.status === "DAILY_CASH_OPEN" ? "Cerrar caja" : "Abrir caja"}
            </button>
            <button onClick={() => setCreateModal(true)} className="btn-primary ml-auto">
              <Plus className="w-4 h-4" /> Nueva factura
            </button>
          </div>
        </GlassCard>

        {/* Table */}
        <DataTable
          columns={columns} data={invoices} loading={loading}
          keyExtractor={i => i.id}
          emptyText="Sin facturas registradas"
        />
      </div>

      {/* Create Invoice Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nueva factura" size="xl">
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
            <label className="label">Bodega *</label>
            <select className="input" value={form.warehouseId}
              onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
              <option value="">Seleccionar bodega...</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select className="input" value={form.paymentMethod}
              onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </div>
          <div>
            <label className="label">Impuesto (%)</label>
            <input type="number" className="input" value={form.taxRate}
              onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))} />
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
          <button onClick={createInvoice} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear factura
          </button>
        </div>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`Factura ${detailModal?.invoiceNumber}`} size="lg">
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Cliente", `${detailModal.customer.firstName} ${detailModal.customer.lastName}`],
                ["Pago", detailModal.paymentMethod],
                ["Subtotal", `$${detailModal.subtotal.toFixed(2)}`],
                ["Impuesto", `$${detailModal.tax.toFixed(2)}`],
                ["Total", `$${detailModal.total.toFixed(2)}`],
                ["Estado", detailModal.status],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between bg-white/5 rounded-xl px-3 py-2">
                  <span className="text-slate-400">{l}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">Productos</p>
              {detailModal.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-slate-300">{item.product.name} × {item.quantity}</span>
                  <span className="text-white">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Cash Modal */}
      <Modal open={cashModal} onClose={() => setCashModal(false)}
        title={cashAction === "open" ? "Abrir caja" : "Cerrar caja"} size="sm">
        {cashAction === "open" ? (
          <div>
            <label className="label">Balance de apertura</label>
            <input type="number" className="input" value={openingBalance}
              onChange={e => setOpeningBalance(Number(e.target.value))} />
          </div>
        ) : (
          <p className="text-slate-300 text-sm">
            ¿Confirmar cierre de caja? El balance final será calculado automáticamente.
          </p>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setCashModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleCashAction} className="btn-primary">Confirmar</button>
        </div>
      </Modal>
    </div>
  );
}
