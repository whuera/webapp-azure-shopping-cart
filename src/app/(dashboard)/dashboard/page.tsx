"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import GlassCard from "@/components/ui/GlassCard";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { productsApi, invoicesApi, customersApi, inventoryApi, crmApi, cashApi } from "@/lib/api";
import { Product, Invoice, CrmOpportunity, DailyCash } from "@/types";
import {
  Package, Users, ReceiptText, Warehouse,
  TrendingUp, AlertTriangle, DollarSign, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<number>(0);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [todayCash, setTodayCash] = useState<DailyCash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      productsApi.list().then(r => { if (r.success) setProducts(r.data); }),
      invoicesApi.list().then(r => { if (r.success) setInvoices(r.data); }),
      customersApi.list().then(r => { if (r.success) setCustomers(r.data.length); }),
      crmApi.opportunities.list().then(r => { if (r.success) setOpportunities(r.data); }),
      cashApi.today().then(r => { if (r.success) setTodayCash(r.data); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const totalSales = invoices
    .filter(i => i.status === "INVOICE_PAID")
    .reduce((s, i) => s + i.total, 0);

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const lowStockProducts = products.filter(p => (p.stock ?? 0) <= (p.minStock ?? 0));

  // Build chart data from invoices
  const chartData = (() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = `${date.getDate()}/${date.getMonth() + 1}`;
      map[key] = (map[key] ?? 0) + inv.total;
    });
    return Object.entries(map).slice(-7).map(([date, total]) => ({ date, total }));
  })();

  const openOpps = opportunities.filter(o => o.status === "OPEN").length;
  const wonOpps = opportunities.filter(o => o.status === "WON").length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="Resumen ejecutivo del negocio" />

      <div className="flex-1 p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Productos activos"
            value={products.length}
            icon={Package}
            color="blue"
            subtitle={`${lowStockProducts.length} con stock bajo`}
          />
          <StatCard
            title="Total ventas"
            value={`$${totalSales.toLocaleString("es", { maximumFractionDigits: 0 })}`}
            icon={DollarSign}
            color="emerald"
            subtitle={`${invoices.length} facturas`}
          />
          <StatCard
            title="Clientes"
            value={customers}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Oportunidades"
            value={openOpps}
            icon={Activity}
            color="amber"
            subtitle={`${wonOpps} ganadas`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Chart */}
          <GlassCard className="lg:col-span-2">
            <p className="section-title mb-4">Ventas recientes (7 días)</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(10,15,44,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#60a5fa" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Daily Cash */}
          <GlassCard>
            <p className="section-title mb-4 flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-blue-400" /> Caja del día
            </p>
            {todayCash ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Estado</span>
                  <Badge label={todayCash.status} variant={statusVariant(todayCash.status)} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Apertura</span>
                  <span className="text-white">${todayCash.openingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Ventas</span>
                  <span className="text-emerald-400">${todayCash.totalSales.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                  <span className="text-slate-300 font-medium">Balance</span>
                  <span className="text-white font-bold">
                    ${(todayCash.openingBalance + todayCash.totalSales).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
                <AlertTriangle className="w-8 h-8" />
                <p className="text-sm text-center">No hay caja abierta hoy</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Invoices */}
          <GlassCard>
            <p className="section-title mb-4">Últimas facturas</p>
            <div className="space-y-2">
              {recentInvoices.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Sin facturas</p>
              ) : (
                recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">
                        {inv.customer.firstName} {inv.customer.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${inv.total.toFixed(2)}</p>
                      <Badge label={inv.status} variant={statusVariant(inv.status)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Low Stock */}
          <GlassCard>
            <p className="section-title mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Productos con stock bajo
            </p>
            <div className="space-y-2">
              {lowStockProducts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Todo en orden</p>
              ) : (
                lowStockProducts.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.sku ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-400">{p.stock ?? 0}</p>
                      <p className="text-xs text-slate-500">mín: {p.minStock ?? 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
