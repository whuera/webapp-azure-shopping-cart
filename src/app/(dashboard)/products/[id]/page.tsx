"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { productsApi, getErrorMessage } from "@/lib/api";
import { Product } from "@/types";
import { useSetBottomPanelTabs } from "@/context/BottomPanelContext";
import {
  ArrowLeft, Package, Pencil, Archive, Trash2, Tag, Ruler,
  Percent, Warehouse, Star, Boxes, AlertTriangle, Settings2,
  FileText, ListChecks,
} from "lucide-react";

const PRODUCT_TYPE_LABEL: Record<string, string> = { PHYSICAL: "Físico", SERVICE: "Servicio" };

const money = (value: number | undefined, currency = "USD") =>
  (value ?? 0).toLocaleString("es-CL", { style: "currency", currency, minimumFractionDigits: 2 });

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const setTabs = useSetBottomPanelTabs();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsApi.getById(id);
      if (res.success) setProduct(res.data);
      else setError(res.message ?? "No se encontró el producto.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isNaN(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const archive = async () => {
    if (!product) return;
    if (!confirm(`¿Desactivar "${product.name}"?\n\nEl producto quedará inactivo pero seguirá en la base de datos.`)) return;
    setBusy(true);
    try { await productsApi.delete(product.id); load(); }
    catch (err) { alert(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const hardDelete = async () => {
    if (!product) return;
    const ok = confirm(
      `¿Eliminar PERMANENTEMENTE "${product.name}" (SKU: ${product.sku ?? "—"})?\n\n` +
      "Esta acción NO se puede deshacer."
    );
    if (!ok) return;
    setBusy(true);
    try { await productsApi.hardDelete(product.id); router.push("/products"); }
    catch (err) { alert(getErrorMessage(err)); setBusy(false); }
  };

  // ── Register bottom-panel tabs whenever product data changes ─────────────
  useEffect(() => {
    if (!product) return () => setTabs([]);

    const lowStock = (product.stock ?? 0) <= (product.minStock ?? 0);
    const margin = product.costPrice ? product.price - product.costPrice : null;
    const marginPct = margin != null && product.costPrice ? (margin / product.costPrice) * 100 : null;

    setTabs([
      {
        id: "descripcion",
        label: "Descripción",
        icon: FileText,
        content: (
          <div className="p-4">
            {product.description
              ? <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{product.description}</p>
              : <p className="text-sm text-slate-500 italic">Sin descripción registrada.</p>
            }
          </div>
        ),
      },
      {
        id: "caracteristicas",
        label: "Características",
        icon: ListChecks,
        content: (
          <div className="p-4">
            <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0 text-sm">
              {([
                ["SKU", product.sku ?? "—"],
                ["Categoría", product.category?.name ?? "Sin categoría"],
                ["Marca", product.brand ?? "—"],
                ["Modelo", product.model ?? "—"],
                ["Tipo", PRODUCT_TYPE_LABEL[product.productType ?? "PHYSICAL"] ?? product.productType ?? "—"],
                ["Unidad de medida", product.unitOfMeasure ?? "—"],
                ["Stock mínimo", product.minStock != null ? `${product.minStock} ${product.unitOfMeasure ?? "UND"}` : "—"],
                ["Stock máximo", product.maxStock != null ? `${product.maxStock} ${product.unitOfMeasure ?? "UND"}` : "—"],
                ["Moneda", product.currency ?? "USD"],
                ["Impuesto", product.taxExempt ? "Exento" : `${product.taxRate ?? 0}% (${product.taxClassification ?? "GENERAL"})`],
                ["Descuento", product.discount ? `${product.discount}%` : "—"],
                ["Estado", product.status ?? "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-white/5 py-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-200 font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
            {margin != null && (
              <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 flex gap-6 text-sm">
                <div><span className="text-slate-500">Costo: </span><span className="text-white">{money(product.costPrice, product.currency)}</span></div>
                <div><span className="text-slate-500">Margen: </span><span className="text-emerald-400 font-medium">{money(margin, product.currency)}{marginPct != null && ` (${marginPct.toFixed(0)}%)`}</span></div>
              </div>
            )}
          </div>
        ),
      },
      {
        id: "especificaciones",
        label: "Especificaciones",
        icon: Settings2,
        content: (
          <div className="p-4">
            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-white/5 py-2 text-sm">
                    <dt className="text-slate-500 shrink-0 mr-3">{key}</dt>
                    <dd className="text-slate-200 font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-500 italic">Sin especificaciones registradas.</p>
            )}
          </div>
        ),
      },
      {
        id: "inventario",
        label: "Inventario",
        icon: Warehouse,
        content: (
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-400">
              {product.tracksInventory ? "Este producto controla inventario." : "Este producto no controla inventario."}
            </p>
            {product.tracksInventory && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-500 mb-1">Stock actual</p>
                  <p className={`text-xl font-bold ${lowStock ? "text-amber-400" : "text-white"}`}>{product.stock ?? 0}</p>
                  {lowStock && <p className="text-xs text-amber-400 mt-1">bajo mínimo</p>}
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-500 mb-1">Stock mínimo</p>
                  <p className="text-xl font-bold text-white">{product.minStock ?? 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-500 mb-1">Stock máximo</p>
                  <p className="text-xl font-bold text-white">{product.maxStock ?? "—"}</p>
                </div>
              </div>
            )}
            {product.warehouseLocation && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Warehouse className="w-4 h-4 text-slate-500" />
                <span>Ubicación:</span>
                <span className="font-medium text-white">{product.warehouseLocation}</span>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => router.push(`/products?edit=${product.id}`)} className="btn-primary" disabled={busy}>
                <Pencil className="w-4 h-4" /> Editar producto
              </button>
              {product.status !== "DELETE_PRODUCT" && (
                <button onClick={archive} className="btn-secondary" disabled={busy}>
                  <Archive className="w-4 h-4" /> Desactivar
                </button>
              )}
              <button onClick={hardDelete} className="btn-danger" disabled={busy}>
                <Trash2 className="w-4 h-4" /> Eliminar permanentemente
              </button>
            </div>
          </div>
        ),
      },
    ]);

    return () => setTabs([]);
  }, [product, setTabs, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Producto" subtitle="Cargando…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Producto" subtitle="No encontrado" />
        <div className="flex-1 p-6">
          <button onClick={() => router.push("/products")} className="btn-secondary mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a productos
          </button>
          <GlassCard className="flex items-start gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error ?? "No se encontró el producto."}</span>
          </GlassCard>
        </div>
      </div>
    );
  }

  const lowStock = (product.stock ?? 0) <= (product.minStock ?? 0);
  const margin = product.costPrice ? product.price - product.costPrice : null;
  const marginPct = margin != null && product.costPrice ? (margin / product.costPrice) * 100 : null;

  // ── Upper panel — hero info ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Header title={product.name} subtitle={`SKU ${product.sku ?? "—"}`} />
      <div className="flex-1 p-6">
        <button onClick={() => router.push("/products")} className="btn-secondary mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a productos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_260px] gap-5 items-start">

          {/* ── Image ───────────────────────────────────────────────── */}
          <GlassCard padding="sm">
            <div className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl} alt={product.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <Package className="w-12 h-12 text-blue-400/40" />
              )}
            </div>
          </GlassCard>

          {/* ── Main info ───────────────────────────────────────────── */}
          <GlassCard>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {product.category && <Badge label={product.category.name} variant="info" />}
              <Badge label={PRODUCT_TYPE_LABEL[product.productType ?? "PHYSICAL"] ?? product.productType ?? "Físico"} variant="purple" />
              <Badge label={product.status ?? "ACTIVE"} variant={statusVariant(product.status ?? "ACTIVE")} />
            </div>

            <h1 className="text-xl font-bold text-white mb-1">{product.name}</h1>
            {(product.brand || product.model) && (
              <p className="text-sm text-slate-400 mb-3">
                {[product.brand, product.model].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="flex items-end gap-3 mb-1">
              <span className="text-2xl font-bold text-emerald-400">{money(product.price, product.currency)}</span>
              {product.discount ? <Badge label={`-${product.discount}%`} variant="orange" /> : null}
            </div>
            {margin != null && (
              <p className="text-xs text-slate-500 mb-4">
                Costo {money(product.costPrice, product.currency)} · Margen {money(margin, product.currency)}
                {marginPct != null && ` (${marginPct.toFixed(0)}%)`}
              </p>
            )}

            {/* Key quick-facts strip */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                SKU: <strong className="text-white">{product.sku ?? "—"}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Ruler className="w-3.5 h-3.5 text-slate-500" />
                {product.unitOfMeasure ?? "UND"}
              </span>
              {product.tracksInventory && (
                <span className={`flex items-center gap-1.5 ${lowStock ? "text-amber-400" : "text-slate-400"}`}>
                  <Boxes className="w-3.5 h-3.5 text-slate-500" />
                  Stock: <strong className={lowStock ? "text-amber-400" : "text-white"}>{product.stock ?? 0}</strong>
                  {lowStock && " ⚠"}
                </span>
              )}
              {product.warehouseLocation && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                  {product.warehouseLocation}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-slate-400">
                <Percent className="w-3.5 h-3.5 text-slate-500" />
                {product.taxExempt ? "Exento" : `IVA ${product.taxRate ?? 0}%`}
              </span>
              {product.averageRating != null && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  {product.averageRating.toFixed(1)} ({product.ratingCount ?? 0})
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-3 italic">
              Usa las pestañas del panel inferior para ver Descripción · Características · Especificaciones · Inventario
            </p>
          </GlassCard>

          {/* ── Actions sidebar ─────────────────────────────────────── */}
          <div className="space-y-3">
            <GlassCard>
              <p className="section-title text-sm mb-3">Acciones</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => router.push(`/products?edit=${product.id}`)} className="btn-primary justify-center" disabled={busy}>
                  <Pencil className="w-4 h-4" /> Editar producto
                </button>
                {product.status !== "DELETE_PRODUCT" && (
                  <button onClick={archive} className="btn-secondary justify-center" disabled={busy}>
                    <Archive className="w-4 h-4" /> Desactivar
                  </button>
                )}
                <button onClick={hardDelete} className="btn-danger justify-center" disabled={busy}>
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </GlassCard>

            {product.category && (
              <GlassCard>
                <p className="section-title text-sm mb-2">Categoría</p>
                <Badge label={product.category.name} variant="info" />
              </GlassCard>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
