"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { productsApi } from "@/lib/api";
import { Product, Category } from "@/types";
import { Plus, Search, Package, RefreshCw, Pencil, Trash2 } from "lucide-react";

const EMPTY_PRODUCT: Partial<Product> = {
  name: "", description: "", price: 0, costPrice: 0,
  sku: "", productType: "PHYSICAL", unitOfMeasure: "UND",
  taxRate: 0, stock: 0, minStock: 0, tracksInventory: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit"; item?: Product }>({
    open: false, mode: "create",
  });
  const [form, setForm] = useState<Partial<Product>>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");

  const load = async () => {
    setLoading(true);
    const [pr, cr] = await Promise.allSettled([
      productsApi.list(),
      productsApi.categories(),
    ]);
    if (pr.status === "fulfilled" && pr.value.success) setProducts(pr.value.data);
    if (cr.status === "fulfilled" && cr.value.success) setCategories(cr.value.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(EMPTY_PRODUCT); setModal({ open: true, mode: "create" }); };
  const openEdit = (p: Product) => { setForm(p); setModal({ open: true, mode: "edit", item: p }); };
  const closeModal = () => setModal({ open: false, mode: "create" });

  const save = async () => {
    setSaving(true);
    try {
      if (modal.mode === "create") await productsApi.create(form);
      else await productsApi.update(modal.item!.id, form);
      closeModal();
      load();
    } finally { setSaving(false); }
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    await productsApi.delete(p.id);
    load();
  };

  const saveCategory = async () => {
    if (!catName.trim()) return;
    await productsApi.createCategory({ name: catName });
    setCatName(""); setCatModal(false);
    productsApi.categories().then(r => { if (r.success) setCategories(r.data); });
  };

  const columns: Column<Product>[] = [
    { key: "name", label: "Producto", render: p => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
          <Package className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="font-medium text-white">{p.name}</p>
          <p className="text-xs text-slate-500">{p.sku ?? "—"}</p>
        </div>
      </div>
    )},
    { key: "price", label: "Precio", render: p => (
      <span className="text-emerald-400 font-medium">${p.price.toFixed(2)}</span>
    )},
    { key: "stock", label: "Stock", render: p => (
      <span className={`font-medium ${(p.stock ?? 0) <= (p.minStock ?? 0) ? "text-amber-400" : "text-white"}`}>
        {p.stock ?? 0}
      </span>
    )},
    { key: "productType", label: "Tipo", render: p => (
      <Badge label={p.productType ?? "PHYSICAL"} variant="info" />
    )},
    { key: "status", label: "Estado", render: p => (
      <Badge label={p.status ?? "ACTIVE"} variant={statusVariant(p.status ?? "ACTIVE")} />
    )},
    { key: "actions", label: "", render: p => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(p)} className="btn-secondary px-2 py-1.5 text-xs">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={() => deleteProduct(p)} className="btn-danger px-2 py-1.5 text-xs">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Productos" subtitle="Gestión del catálogo de productos" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <GlassCard padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="input pl-9"
              />
            </div>
            <button onClick={() => setCatModal(true)} className="btn-secondary">
              <Plus className="w-4 h-4" /> Categoría
            </button>
            <button onClick={load} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" /> Nuevo producto
            </button>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: products.length, color: "text-blue-400" },
            { label: "Stock bajo", value: products.filter(p => (p.stock ?? 0) <= (p.minStock ?? 0)).length, color: "text-amber-400" },
            { label: "Servicios", value: products.filter(p => p.productType === "SERVICE").length, color: "text-purple-400" },
          ].map(s => (
            <GlassCard key={s.label} padding="sm" className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">{s.label}</span>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            </GlassCard>
          ))}
        </div>

        {/* Table */}
        <DataTable
          columns={columns} data={filtered} loading={loading}
          keyExtractor={p => p.id}
          emptyText="No se encontraron productos"
        />
      </div>

      {/* Product Modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Nuevo producto" : "Editar producto"}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Nombre *", key: "name", type: "text" },
            { label: "SKU", key: "sku", type: "text" },
            { label: "Precio *", key: "price", type: "number" },
            { label: "Precio costo", key: "costPrice", type: "number" },
            { label: "Stock", key: "stock", type: "number" },
            { label: "Stock mínimo", key: "minStock", type: "number" },
            { label: "Marca", key: "brand", type: "text" },
            { label: "Modelo", key: "model", type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type={f.type} className="input"
                value={String((form as Record<string, unknown>)[f.key] ?? "")}
                onChange={e => setForm(p => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label className="label">Categoría</label>
            <select
              className="input"
              value={(form.category as { id: number })?.id ?? ""}
              onChange={e => {
                const cat = categories.find(c => c.id === Number(e.target.value));
                setForm(p => ({ ...p, category: cat }));
              }}
            >
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.productType ?? "PHYSICAL"}
              onChange={e => setForm(p => ({ ...p, productType: e.target.value }))}>
              <option value="PHYSICAL">Físico</option>
              <option value="SERVICE">Servicio</option>
            </select>
          </div>

          <div>
            <label className="label">Unidad de medida</label>
            <select className="input" value={form.unitOfMeasure ?? "UND"}
              onChange={e => setForm(p => ({ ...p, unitOfMeasure: e.target.value }))}>
              {["UND", "KG", "LT", "MT", "BOX", "HR"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Tasa impuesto (%)</label>
            <input type="number" className="input" value={form.taxRate ?? 0}
              onChange={e => setForm(p => ({ ...p, taxRate: Number(e.target.value) }))} />
          </div>

          <div className="col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input h-20 resize-none" value={form.description ?? ""}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button onClick={closeModal} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {modal.mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nueva categoría" size="sm">
        <div>
          <label className="label">Nombre de categoría</label>
          <input type="text" className="input" value={catName}
            onChange={e => setCatName(e.target.value)} placeholder="Ej: Electrónica" />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setCatModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveCategory} className="btn-primary">Crear</button>
        </div>
      </Modal>
    </div>
  );
}
