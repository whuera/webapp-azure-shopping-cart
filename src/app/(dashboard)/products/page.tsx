"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { productsApi, getErrorMessage } from "@/lib/api";
import { Product, Category } from "@/types";
import {
  Plus, Search, Package, RefreshCw, Pencil, Trash2, CheckCircle2, AlertTriangle,
  Loader2, XCircle, Archive,
} from "lucide-react";

const SKU_CHECK_DEBOUNCE_MS = 500;
type SkuCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken"; ownerName: string }
  | { status: "error" };

const EMPTY_PRODUCT: Partial<Product> = {
  name: "", description: "", price: 0, costPrice: 0,
  sku: "", productType: "PHYSICAL", unitOfMeasure: "UND",
  taxRate: 0, stock: 0, minStock: 0, tracksInventory: true,
  imageUrl: "",
};

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit"; item?: Product }>({
    open: false, mode: "create",
  });
  const [form, setForm] = useState<Partial<Product>>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [skuCheck, setSkuCheck] = useState<SkuCheckState>({ status: "idle" });
  const skuDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skuRequestSeq = useRef(0);

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
  useEffect(() => () => clearTimeout(skuDebounceRef.current), []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Looks up whether `sku` is already taken by another product. Ignores
  // out-of-order responses (e.g. a slow check for an earlier keystroke
  // resolving after a newer one) via a monotonically increasing sequence id.
  const checkSkuAvailability = useCallback(async (sku: string, excludeId?: number) => {
    const trimmed = sku.trim();
    clearTimeout(skuDebounceRef.current);
    if (!trimmed) { setSkuCheck({ status: "idle" }); return; }
    const requestId = ++skuRequestSeq.current;
    setSkuCheck({ status: "checking" });
    try {
      const owner = await productsApi.checkSku(trimmed, excludeId);
      if (requestId !== skuRequestSeq.current) return; // a newer check superseded this one
      setSkuCheck(owner ? { status: "taken", ownerName: owner.name } : { status: "available" });
    } catch {
      if (requestId !== skuRequestSeq.current) return;
      setSkuCheck({ status: "error" });
    }
  }, []);

  // Debounced check while typing: waits for a pause in typing before hitting the API.
  const onSkuChange = (value: string) => {
    setForm(p => ({ ...p, sku: value }));
    clearTimeout(skuDebounceRef.current);
    if (!value.trim()) { setSkuCheck({ status: "idle" }); return; }
    skuDebounceRef.current = setTimeout(
      () => checkSkuAvailability(value, modal.item?.id),
      SKU_CHECK_DEBOUNCE_MS
    );
  };

  // Instant check on blur/Tab, in case the debounce hasn't fired yet.
  const onSkuBlur = () => checkSkuAvailability(form.sku ?? "", modal.item?.id);

  const openCreate = () => {
    setForm(EMPTY_PRODUCT); setSaveError(null); setCreatedProduct(null); setSkuCheck({ status: "idle" });
    setModal({ open: true, mode: "create" });
  };
  const openEdit = (p: Product) => {
    setForm(p); setSaveError(null); setCreatedProduct(null); setSkuCheck({ status: "idle" });
    setModal({ open: true, mode: "edit", item: p });
  };

  // Supports arriving from the product detail page's "Editar" button
  // (/products?edit=123) by auto-opening the edit modal once the list loads.
  useEffect(() => {
    if (loading) return;
    const editId = searchParams.get("edit");
    if (!editId) return;
    const target = products.find(p => p.id === Number(editId));
    if (target) openEdit(target);
    router.replace("/products");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products, searchParams]);
  const closeModal = () => {
    clearTimeout(skuDebounceRef.current);
    setModal({ open: false, mode: "create" });
    setSaveError(null); setCreatedProduct(null); setSkuCheck({ status: "idle" });
  };

  // After a successful create, reset the form and keep the modal open so
  // the user can immediately register another product.
  const createAnother = () => {
    setForm(EMPTY_PRODUCT); setSaveError(null); setCreatedProduct(null); setSkuCheck({ status: "idle" });
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (modal.mode === "create") {
        const res = await productsApi.create(form);
        setCreatedProduct(res.data);
        load();
      } else {
        await productsApi.update(modal.item!.id, form);
        closeModal();
        load();
      }
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Soft delete — just marks the product as inactive. It keeps the row (and
  // its SKU) in the database, so it can still block a future SKU or clutter
  // the list. Use "hardDeleteProduct" below to actually remove test/junk data.
  const archiveProduct = async (p: Product) => {
    if (!confirm(`¿Desactivar "${p.name}"?\n\nEl producto quedará inactivo pero seguirá en la base de datos (su SKU seguirá reservado).`)) return;
    try {
      await productsApi.delete(p.id);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  // Hard delete — permanently removes the row from the database and frees
  // its SKU. Irreversible, so it asks for extra, explicit confirmation.
  const hardDeleteProduct = async (p: Product) => {
    const ok = confirm(
      `¿Eliminar PERMANENTEMENTE "${p.name}" (SKU: ${p.sku ?? "—"})?\n\n` +
      "Esta acción NO se puede deshacer: se borra por completo de la base de datos, no solo se desactiva."
    );
    if (!ok) return;
    try {
      await productsApi.hardDelete(p.id);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
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
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.name}
            className="w-8 h-8 rounded-lg object-cover border border-white/10"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-400" />
          </div>
        )}
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
        <button onClick={() => openEdit(p)} className="btn-secondary px-2 py-1.5 text-xs" title="Editar">
          <Pencil className="w-3 h-3" />
        </button>
        {p.status !== "DELETE_PRODUCT" && (
          <button onClick={() => archiveProduct(p)} className="btn-secondary px-2 py-1.5 text-xs" title="Desactivar (no borra los datos)">
            <Archive className="w-3 h-3" />
          </button>
        )}
        <button onClick={() => hardDeleteProduct(p)} className="btn-danger px-2 py-1.5 text-xs" title="Eliminar permanentemente (no se puede deshacer)">
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
          onRowClick={p => router.push(`/products/${p.id}`)}
        />
      </div>

      {/* Product Modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={createdProduct ? "Producto creado" : modal.mode === "create" ? "Nuevo producto" : "Editar producto"}
        size="lg"
      >
      {createdProduct ? (
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">¡Producto creado exitosamente!</h3>
          <p className="text-sm text-slate-400 mb-6">
            <span className="text-white font-medium">{createdProduct.name}</span> se agregó al catálogo.
          </p>
          <div className="flex gap-3">
            <button onClick={closeModal} className="btn-secondary">Cerrar</button>
            <button onClick={createAnother} className="btn-primary">
              <Plus className="w-4 h-4" /> Crear otro producto
            </button>
          </div>
        </div>
      ) : (
      <>
        {saveError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text" className="input"
              value={form.name ?? ""}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">SKU</label>
            <div className="relative">
              <input
                type="text" className="input pr-9"
                placeholder="Se autogenera si lo dejas vacío"
                value={form.sku ?? ""}
                onChange={e => onSkuChange(e.target.value)}
                onBlur={onSkuBlur}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {skuCheck.status === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                {skuCheck.status === "available" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {skuCheck.status === "taken" && <XCircle className="w-4 h-4 text-red-400" />}
              </div>
            </div>
            {skuCheck.status === "taken" && (
              <p className="text-xs text-red-400 mt-1">
                Este SKU ya lo usa &quot;{skuCheck.ownerName}&quot;. Elige otro.
              </p>
            )}
            {skuCheck.status === "error" && (
              <p className="text-xs text-amber-400 mt-1">No se pudo verificar el SKU. Se revalidará al guardar.</p>
            )}
          </div>

          {[
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
            <label className="label">URL de imagen</label>
            <div className="flex items-center gap-3">
              {form.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt="Vista previa"
                  className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <input
                type="url" className="input" placeholder="https://ejemplo.com/imagen.jpg"
                value={form.imageUrl ?? ""}
                onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input h-20 resize-none" value={form.description ?? ""}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button onClick={closeModal} className="btn-secondary">Cancelar</button>
          <button
            onClick={save} className="btn-primary"
            disabled={saving || skuCheck.status === "checking" || skuCheck.status === "taken"}
            title={skuCheck.status === "taken" ? "Elige un SKU disponible antes de guardar" : undefined}
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {modal.mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </>
      )}
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
