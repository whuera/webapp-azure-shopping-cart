"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { accountingApi } from "@/lib/api";
import { ChartOfAccount, AccountingPeriod, JournalEntry, FixedAsset } from "@/types";
import {
  BookOpen, Calendar, FileText, Cpu,
  Plus, RefreshCw, CheckCircle, RotateCcw, Wrench,
} from "lucide-react";

type Tab = "accounts" | "periods" | "journal" | "assets";

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<AccountingPeriod | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(false);

  // Account modal
  const [accModal, setAccModal] = useState(false);
  const [accForm, setAccForm] = useState<Partial<ChartOfAccount>>({ code: "", name: "", accountType: "ASSET", level: 3 });
  const [accSaving, setAccSaving] = useState(false);

  // Asset modal
  const [assetModal, setAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState<Partial<FixedAsset>>({
    code: "", name: "", purchaseCost: 0, salvageValue: 0,
    usefulLifeMonths: 60, depreciationMethod: "STRAIGHT_LINE",
  });
  const [assetSaving, setAssetSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [ar, pr, cr] = await Promise.allSettled([
      accountingApi.accounts.list(),
      accountingApi.periods.list(),
      accountingApi.periods.current(),
    ]);
    if (ar.status === "fulfilled" && ar.value.success) setAccounts(ar.value.data);
    if (pr.status === "fulfilled" && pr.value.success) setPeriods(pr.value.data);
    if (cr.status === "fulfilled" && cr.value.success) setCurrentPeriod(cr.value.data);
    accountingApi.fixedAssets.list().then(r => { if (r.success) setAssets(r.data); });
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (tab === "journal" && currentPeriod) {
      accountingApi.journal.list(currentPeriod.id).then(r => { if (r.success) setEntries(r.data); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currentPeriod]);

  const saveAccount = async () => {
    setAccSaving(true);
    await accountingApi.accounts.create(accForm);
    setAccModal(false);
    accountingApi.accounts.list().then(r => { if (r.success) setAccounts(r.data); });
    setAccSaving(false);
  };

  const initAccounts = async () => {
    if (!confirm("¿Inicializar el plan de cuentas estándar?")) return;
    await accountingApi.accounts.initialize();
    loadAll();
  };

  const saveAsset = async () => {
    setAssetSaving(true);
    await accountingApi.fixedAssets.create(assetForm);
    setAssetModal(false);
    accountingApi.fixedAssets.list().then(r => { if (r.success) setAssets(r.data); });
    setAssetSaving(false);
  };

  const closePeriod = async (id: number) => {
    if (!confirm("¿Cerrar este período contable?")) return;
    await accountingApi.periods.close(id);
    loadAll();
  };

  const postEntry = async (id: number) => {
    await accountingApi.journal.post(id);
    if (currentPeriod) accountingApi.journal.list(currentPeriod.id).then(r => { if (r.success) setEntries(r.data); });
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "accounts", label: "Plan de cuentas", icon: BookOpen },
    { key: "periods", label: "Períodos", icon: Calendar },
    { key: "journal", label: "Asientos", icon: FileText },
    { key: "assets", label: "Activos fijos", icon: Cpu },
  ];

  const accountCols: Column<ChartOfAccount>[] = [
    { key: "code", label: "Código", render: a => <span className="font-mono text-blue-400">{a.code}</span> },
    { key: "name", label: "Nombre", render: a => <span className="text-white">{a.name}</span> },
    { key: "accountType", label: "Tipo", render: a => <Badge label={a.accountType} variant="info" /> },
    { key: "level", label: "Nivel", render: a => <span className="text-slate-400">{a.level}</span> },
    { key: "isActive", label: "Estado", render: a => (
      <Badge label={a.isActive ? "Activa" : "Inactiva"} variant={a.isActive ? "success" : "danger"} />
    )},
  ];

  const periodCols: Column<AccountingPeriod>[] = [
    { key: "periodKey", label: "Período", render: p => <span className="font-mono text-white">{p.periodKey}</span> },
    { key: "name", label: "Nombre", render: p => <span className="text-slate-200">{p.name}</span> },
    { key: "status", label: "Estado", render: p => <Badge label={p.status} variant={statusVariant(p.status)} /> },
    { key: "actions", label: "", render: p => (
      p.status === "PERIOD_OPEN" ? (
        <button onClick={() => closePeriod(p.id)} className="btn-secondary text-xs px-2 py-1">
          <CheckCircle className="w-3 h-3" /> Cerrar
        </button>
      ) : null
    )},
  ];

  const entryCols: Column<JournalEntry>[] = [
    { key: "entryNumber", label: "Número", render: e => <span className="font-mono text-blue-400">{e.entryNumber}</span> },
    { key: "entryDate", label: "Fecha", render: e => <span className="text-xs text-slate-400">{new Date(e.entryDate).toLocaleDateString("es")}</span> },
    { key: "entryType", label: "Tipo", render: e => <Badge label={e.entryType} variant="info" /> },
    { key: "description", label: "Descripción", render: e => <span className="text-slate-300 text-xs">{e.description ?? "—"}</span> },
    { key: "totalDebit", label: "Débito", render: e => <span className="text-emerald-400">${e.totalDebit.toFixed(2)}</span> },
    { key: "status", label: "Estado", render: e => <Badge label={e.status} variant={statusVariant(e.status)} /> },
    { key: "actions", label: "", render: e => (
      e.status === "DRAFT" ? (
        <button onClick={() => postEntry(e.id)} className="btn-secondary text-xs px-2 py-1">
          <CheckCircle className="w-3 h-3" /> Contabilizar
        </button>
      ) : null
    )},
  ];

  const assetCols: Column<FixedAsset>[] = [
    { key: "code", label: "Código", render: a => <span className="font-mono text-blue-400">{a.code}</span> },
    { key: "name", label: "Nombre", render: a => <span className="text-white">{a.name}</span> },
    { key: "purchaseCost", label: "Costo compra", render: a => <span className="text-emerald-400">${(a.purchaseCost ?? 0).toFixed(2)}</span> },
    { key: "bookValue", label: "Valor libro", render: a => <span className="text-white">${(a.bookValue ?? 0).toFixed(2)}</span> },
    { key: "depreciationMethod", label: "Método", render: a => <Badge label={a.depreciationMethod ?? "—"} variant="default" /> },
    { key: "status", label: "Estado", render: a => <Badge label={a.status ?? "—"} variant={statusVariant(a.status ?? "")} /> },
    { key: "actions", label: "", render: a => (
      <button onClick={() => accountingApi.fixedAssets.dispose(a.id).then(loadAll)} className="btn-danger text-xs px-2 py-1">
        Dar de baja
      </button>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Contabilidad" subtitle="Plan de cuentas, asientos y activos fijos" />
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">

        {/* Period banner */}
        {currentPeriod && (
          <GlassCard padding="sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium text-sm">Período actual: {currentPeriod.name}</p>
                  <p className="text-slate-500 text-xs">{currentPeriod.startDate} → {currentPeriod.endDate}</p>
                </div>
              </div>
              <Badge label={currentPeriod.status} variant={statusVariant(currentPeriod.status)} />
            </div>
          </GlassCard>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {tab === "accounts" && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={initAccounts} className="btn-secondary">
                  <Wrench className="w-4 h-4" /> Inicializar plan
                </button>
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => setAccModal(true)} className="btn-primary ml-auto">
                  <Plus className="w-4 h-4" /> Nueva cuenta
                </button>
              </div>
              <DataTable columns={accountCols} data={accounts} loading={loading} keyExtractor={a => a.id} emptyText="Sin cuentas. Inicialice el plan de cuentas." />
            </div>
          )}

          {tab === "periods" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <DataTable columns={periodCols} data={periods} loading={loading} keyExtractor={p => p.id} emptyText="Sin períodos contables" />
            </div>
          )}

          {tab === "journal" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <DataTable columns={entryCols} data={entries} loading={loading} keyExtractor={e => e.id} emptyText="Sin asientos en el período actual" />
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => setAssetModal(true)} className="btn-primary ml-auto">
                  <Plus className="w-4 h-4" /> Nuevo activo
                </button>
              </div>
              <DataTable columns={assetCols} data={assets} loading={loading} keyExtractor={a => a.id} emptyText="Sin activos fijos" />
            </div>
          )}
        </div>
      </div>

      {/* Account Modal */}
      <Modal open={accModal} onClose={() => setAccModal(false)} title="Nueva cuenta contable" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Código *</label>
            <input className="input font-mono" value={accForm.code ?? ""}
              onChange={e => setAccForm(p => ({ ...p, code: e.target.value }))} placeholder="Ej: 1.1.01" />
          </div>
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={accForm.name ?? ""}
              onChange={e => setAccForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={accForm.accountType}
              onChange={e => setAccForm(p => ({ ...p, accountType: e.target.value }))}>
              {["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nivel</label>
            <select className="input" value={accForm.level}
              onChange={e => setAccForm(p => ({ ...p, level: Number(e.target.value) }))}>
              <option value={1}>1 - Grupo</option>
              <option value={2}>2 - Subgrupo</option>
              <option value={3}>3 - Cuenta</option>
              <option value={4}>4 - Auxiliar</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setAccModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveAccount} className="btn-primary" disabled={accSaving}>
            {accSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear
          </button>
        </div>
      </Modal>

      {/* Asset Modal */}
      <Modal open={assetModal} onClose={() => setAssetModal(false)} title="Nuevo activo fijo" size="md">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Código *", key: "code", type: "text" },
            { label: "Nombre *", key: "name", type: "text" },
            { label: "Costo de compra", key: "purchaseCost", type: "number" },
            { label: "Valor residual", key: "salvageValue", type: "number" },
            { label: "Vida útil (meses)", key: "usefulLifeMonths", type: "number" },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.type} className="input"
                value={String((assetForm as Record<string, unknown>)[f.key] ?? "")}
                onChange={e => setAssetForm(p => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Método depreciación</label>
            <select className="input" value={assetForm.depreciationMethod}
              onChange={e => setAssetForm(p => ({ ...p, depreciationMethod: e.target.value }))}>
              <option value="STRAIGHT_LINE">Línea recta</option>
              <option value="DECLINING_BALANCE">Decreciente</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha compra</label>
            <input type="date" className="input" value={assetForm.purchaseDate ?? ""}
              onChange={e => setAssetForm(p => ({ ...p, purchaseDate: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input h-16 resize-none" value={assetForm.description ?? ""}
              onChange={e => setAssetForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setAssetModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveAsset} className="btn-primary" disabled={assetSaving}>
            {assetSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear
          </button>
        </div>
      </Modal>
    </div>
  );
}
