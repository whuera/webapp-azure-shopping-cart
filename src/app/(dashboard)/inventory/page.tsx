"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { warehousesApi, inventoryApi, productsApi } from "@/lib/api";
import {
  Warehouse, Inventory, InventoryMovement,
  InventoryMovementRequest, TransferRequest, Product,
} from "@/types";
import {
  Plus, RefreshCw, Warehouse as WarehouseIcon,
  ArrowDown, ArrowUp, ArrowLeftRight, SlidersHorizontal,
} from "lucide-react";

type MovementType = "entry" | "exit" | "transfer" | "adjustment";

export default function InventoryPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWh, setSelectedWh] = useState<Warehouse | null>(null);
  const [stock, setStock] = useState<Inventory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);

  // Warehouse modal
  const [whModal, setWhModal] = useState(false);
  const [whForm, setWhForm] = useState<Partial<Warehouse>>({ name: "", location: "", description: "" });
  const [whSaving, setWhSaving] = useState(false);

  // Movement modal
  const [mvModal, setMvModal] = useState<{ open: boolean; type: MovementType }>({ open: false, type: "entry" });
  const [mvForm, setMvForm] = useState<Partial<InventoryMovementRequest & TransferRequest>>({
    productId: undefined, warehouseId: undefined, toWarehouseId: undefined,
    quantity: 0, reference: "", notes: "",
  });
  const [mvSaving, setMvSaving] = useState(false);

  const loadWarehouses = async () => {
    setLoadingWh(true);
    const r = await warehousesApi.list();
    if (r.success) setWarehouses(r.data);
    setLoadingWh(false);
  };

  const loadStock = async (wh: Warehouse) => {
    setLoadingStock(true);
    const [sr, mr] = await Promise.allSettled([
      inventoryApi.byWarehouse(wh.id),
      inventoryApi.movementsByWarehouse(wh.id),
    ]);
    if (sr.status === "fulfilled" && sr.value.success) setStock(sr.value.data);
    if (mr.status === "fulfilled" && mr.value.success) setMovements(mr.value.data);
    setLoadingStock(false);
  };

  useEffect(() => {
    loadWarehouses();
    productsApi.list().then(r => { if (r.success) setProducts(r.data); });
  }, []);

  useEffect(() => {
    if (selectedWh) loadStock(selectedWh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWh]);

  const saveWarehouse = async () => {
    setWhSaving(true);
    await warehousesApi.create(whForm);
    setWhModal(false);
    setWhForm({ name: "", location: "", description: "" });
    loadWarehouses();
    setWhSaving(false);
  };

  const saveMovement = async () => {
    setMvSaving(true);
    try {
      const { type } = mvModal;
      if (type === "entry") await inventoryApi.registerEntry(mvForm as InventoryMovementRequest);
      else if (type === "exit") await inventoryApi.registerExit(mvForm as InventoryMovementRequest);
      else if (type === "adjustment") await inventoryApi.adjustment(mvForm as InventoryMovementRequest);
      else await inventoryApi.transfer(mvForm as TransferRequest);
      setMvModal({ open: false, type: "entry" });
      if (selectedWh) loadStock(selectedWh);
    } finally { setMvSaving(false); }
  };

  const mvTypeLabel: Record<MovementType, string> = {
    entry: "Entrada", exit: "Salida", transfer: "Transferencia", adjustment: "Ajuste",
  };

  const stockCols: Column<Inventory>[] = [
    { key: "product", label: "Producto", render: i => (
      <div>
        <p className="font-medium text-white">{i.product.name}</p>
        <p className="text-xs text-slate-500">{i.product.sku ?? "—"}</p>
      </div>
    )},
    { key: "currentStock", label: "Stock actual", render: i => (
      <span className="text-white font-medium">{i.currentStock}</span>
    )},
    { key: "reservedStock", label: "Reservado", render: i => (
      <span className="text-amber-400">{i.reservedStock}</span>
    )},
    { key: "available", label: "Disponible", render: i => (
      <span className="text-emerald-400 font-semibold">{i.currentStock - i.reservedStock}</span>
    )},
  ];

  const mvCols: Column<InventoryMovement>[] = [
    { key: "createdAt", label: "Fecha", render: m => (
      <span className="text-slate-300 text-xs">{new Date(m.createdAt).toLocaleString("es")}</span>
    )},
    { key: "movementType", label: "Tipo", render: m => (
      <Badge
        label={m.movementType}
        variant={m.movementType.includes("ENTRY") || m.movementType.includes("TRANSFER_IN") ? "success" :
                 m.movementType.includes("EXIT") || m.movementType.includes("TRANSFER_OUT") ? "danger" : "info"}
      />
    )},
    { key: "product", label: "Producto", render: m => m.product.name },
    { key: "quantity", label: "Cantidad", render: m => (
      <span className="font-medium text-white">{m.quantity}</span>
    )},
    { key: "currentStock", label: "Stock final", render: m => (
      <span className="text-blue-400">{m.currentStock}</span>
    )},
    { key: "reference", label: "Referencia", render: m => (
      <span className="text-slate-500 text-xs">{m.reference ?? "—"}</span>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Inventario" subtitle="Gestión de bodegas y stock" />
      <div className="flex-1 p-6 flex gap-4 overflow-hidden">

        {/* Sidebar: Warehouses */}
        <div className="w-60 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">Bodegas</p>
            <div className="flex gap-1">
              <button onClick={loadWarehouses} className="btn-secondary px-2 py-1.5 text-xs">
                <RefreshCw className="w-3 h-3" />
              </button>
              <button onClick={() => setWhModal(true)} className="btn-primary px-2 py-1.5 text-xs">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {loadingWh ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {warehouses.map(wh => (
                <button
                  key={wh.id}
                  onClick={() => setSelectedWh(wh)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-200 ${
                    selectedWh?.id === wh.id
                      ? "bg-blue-600/20 border-blue-500/30 text-blue-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="w-4 h-4 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-medium text-sm truncate">{wh.name}</p>
                      <p className="text-xs text-slate-500 truncate">{wh.location ?? "—"}</p>
                    </div>
                  </div>
                </button>
              ))}
              {warehouses.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Sin bodegas</p>
              )}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {selectedWh ? (
            <>
              {/* Movement Buttons */}
              <GlassCard padding="sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="section-title">{selectedWh.name}</p>
                  <div className="flex gap-2">
                    {(["entry", "exit", "transfer", "adjustment"] as MovementType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          setMvForm({ productId: undefined, warehouseId: selectedWh.id, quantity: 0, reference: "", notes: "" });
                          setMvModal({ open: true, type: t });
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        {t === "entry" && <ArrowDown className="w-3 h-3 text-emerald-400" />}
                        {t === "exit" && <ArrowUp className="w-3 h-3 text-red-400" />}
                        {t === "transfer" && <ArrowLeftRight className="w-3 h-3 text-blue-400" />}
                        {t === "adjustment" && <SlidersHorizontal className="w-3 h-3 text-amber-400" />}
                        {mvTypeLabel[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Stock Table */}
              <div className="flex-1 overflow-auto">
                <p className="text-sm font-semibold text-slate-400 mb-2">Stock actual</p>
                <DataTable
                  columns={stockCols} data={stock} loading={loadingStock}
                  keyExtractor={i => i.id}
                  emptyText="Sin stock registrado en esta bodega"
                />
              </div>

              {/* Movements */}
              <div>
                <p className="text-sm font-semibold text-slate-400 mb-2">Últimos movimientos</p>
                <DataTable
                  columns={mvCols}
                  data={movements.slice(0, 10)}
                  loading={loadingStock}
                  keyExtractor={m => m.id}
                  emptyText="Sin movimientos"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <WarehouseIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>Selecciona una bodega para ver el inventario</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warehouse Modal */}
      <Modal open={whModal} onClose={() => setWhModal(false)} title="Nueva bodega" size="sm">
        <div className="space-y-3">
          {[{ label: "Nombre *", key: "name" }, { label: "Ubicación", key: "location" }, { label: "Descripción", key: "description" }].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input className="input" value={String((whForm as Record<string, unknown>)[f.key] ?? "")}
                onChange={e => setWhForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setWhModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveWarehouse} className="btn-primary" disabled={whSaving}>
            {whSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear
          </button>
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal
        open={mvModal.open}
        onClose={() => setMvModal({ open: false, type: "entry" })}
        title={mvTypeLabel[mvModal.type]}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className="label">Producto *</label>
            <select className="input" value={mvForm.productId ?? ""}
              onChange={e => setMvForm(p => ({ ...p, productId: Number(e.target.value) }))}>
              <option value="">Seleccionar...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {mvModal.type === "transfer" && (
            <div>
              <label className="label">Bodega destino *</label>
              <select className="input" value={mvForm.toWarehouseId ?? ""}
                onChange={e => setMvForm(p => ({ ...p, toWarehouseId: Number(e.target.value) }))}>
                <option value="">Seleccionar...</option>
                {warehouses.filter(w => w.id !== selectedWh?.id).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Cantidad *</label>
            <input type="number" className="input" value={mvForm.quantity ?? 0}
              onChange={e => setMvForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input className="input" value={mvForm.reference ?? ""}
              onChange={e => setMvForm(p => ({ ...p, reference: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input h-16 resize-none" value={mvForm.notes ?? ""}
              onChange={e => setMvForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setMvModal({ open: false, type: "entry" })} className="btn-secondary">Cancelar</button>
          <button onClick={saveMovement} className="btn-primary" disabled={mvSaving}>
            {mvSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Registrar
          </button>
        </div>
      </Modal>
    </div>
  );
}
