"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { productsApi, getErrorMessage } from "@/lib/api";
import { Product } from "@/types";
import {
  ArrowLeft, Package, Pencil, Archive, Trash2, Tag, Ruler,
  Percent, Warehouse, Star, Boxes, AlertTriangle, Settings2,
} from "lucide-react";

const PRODUCT_TYPE_LABEL: Record<string, string> = { PHYSICAL: "Físico", SERVICE: "Servicio" };

const money = (value: number | undefined, currency = "USD") =>
  (value ?? 0).toLocaleString("es-CL", { style: "currency", currency, minimumFractionDigits: 2 });

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

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

  useEffect(() => { if (!Number.isNaN(id)) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const archive = async () => {
    if (!product) return;
    if (!confirm(`¿Desactivar "${product.name}"?\n\nEl producto quedará inactivo pero seguirá en la base de datos (su SKU seguirá reservado).`)) return;
    setBusy(true);
    try {
      await productsApi.delete(product.id);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const hardDelete = async () => {
    if (!product) return;
    const ok = confirm(
      `¿Eliminar PERMANENTEMENTE "${product.name}" (SKU: ${product.sku ?? "—"})?\n\n` +
      "Esta acción NO se puede deshacer: se borra por completo de la base de datos, no solo se desactiva."
    );
    if (!ok) return;
    setBusy(true);
    try {
      await productsApi.hardDelete(product.id);
      router.push("/products");
    } catch (err) {
      alert(getErrorMessage(err));
      setBusy(false);
    }
  };

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

  return (
    <div className="flex flex-col h-full">
      <Header title={product.name} subtitle={`SKU ${product.sku ?? "—"}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <button onClick={() => router.push("/products")} className="btn-secondary mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a productos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 items-start">

          {/* ── Image ─────────────────────────────────────────────────────── */}
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
                <Package className="w-16 h-16 text-blue-400/40" />
              )}
            </div>
          </GlassCard>

          {/* ── Main info ─────────────────────────────────────────────────── */}
          <div className="space-y-5">
            <GlassCard>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {product.category && <Badge label={product.category.name} variant="info" />}
                <Badge label={PRODUCT_TYPE_LABEL[product.productType ?? "PHYSICAL"] ?? product.productType ?? "Físico"} variant="purple" />
                <Badge label={product.status ?? "ACTIVE"} variant={statusVariant(product.status ?? "ACTIVE")} />
              </div>

              <h1 className="text-2xl font-bold text-white mb-1">{product.name}</h1>
              {(product.brand || product.model) && (
                <p className="text-sm text-slate-400 mb-4">
                  {[product.brand, product.model].filter(Boolean).join(" · ")}
                </p>
              )}

              <div className="flex items-end gap-3 mb-1">
                <span className="text-3xl font-bold text-emerald-400">{money(product.price, product.currency)}</span>
                {product.discount ? <Badge label={`-${product.discount}%`} variant="orange" /> : null}
              </div>
              {margin != null && (
                <p className="text-xs text-slate-500 mb-4">
                  Costo {money(product.costPrice, product.currency)} · Margen {money(margin, product.currency)}
                  {marginPct != null && ` (${marginPct.toFixed(0)}%)`}
                </p>
              )}

              <div className="border-t border-white/10 pt-4 mt-4">
                <p className="text-sm font-semibold text-white mb-3">Lo que tienes que saber de este producto</p>
                <ul className="space-y-2.5 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" /> SKU: <span className="text-white">{product.sku ?? "—"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Unidad de medida: <span className="text-white">{product.unitOfMeasure ?? "UND"}</span>
                  </li>
                  {product.tracksInventory && (
                    <li className="flex items-center gap-2">
                      <Boxes className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Stock: <span className={lowStock ? "text-amber-400 font-medium" : "text-white"}>{product.stock ?? 0} {product.unitOfMeasure ?? "UND"}</span>
                      {lowStock && <span className="text-amber-400 text-xs">(bajo mínimo)</span>}
                    </li>
                  )}
                  {product.warehouseLocation && (
                    <li className="flex items-center gap-2">
                      <Warehouse className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Ubicación: <span className="text-white">{product.warehouseLocation}</span>
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {product.taxExempt ? "Exento de impuesto" : `Impuesto: ${product.taxRate ?? 0}% (${product.taxClassification ?? "GENERAL"})`}
                  </li>
                  {(product.averageRating != null) && (
                    <li className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {product.averageRating.toFixed(1)} / 5
                      <span className="text-slate-500">({product.ratingCount ?? 0} calificaciones)</span>
                    </li>
                  )}
                </ul>
              </div>
            </GlassCard>

            {product.description && (
              <GlassCard>
                <p className="section-title mb-2">Descripción</p>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{product.description}</p>
              </GlassCard>
            )}

            {/* ── Specifications ──────────────────────────────────────────── */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="w-4 h-4 text-blue-400" />
                  <p className="section-title">Especificaciones</p>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center border-b border-white/5 py-2 text-sm"
                    >
                      <dt className="text-slate-500 shrink-0 mr-3">{key}</dt>
                      <dd className="text-slate-200 font-medium text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </GlassCard>
            )}

            <GlassCard>
              <p className="section-title mb-3">Características del producto</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                {[
                  ["SKU", product.sku ?? "—"],
                  ["Categoría", product.category?.name ?? "Sin categoría"],
                  ["Marca", product.brand ?? "—"],
                  ["Modelo", product.model ?? "—"],
                  ["Tipo", PRODUCT_TYPE_LABEL[product.productType ?? "PHYSICAL"] ?? product.productType ?? "—"],
                  ["Unidad de medida", product.unitOfMeasure ?? "—"],
                  ["Stock mínimo", product.minStock != null ? `${product.minStock} ${product.unitOfMeasure ?? "UND"}` : "—"],
                  ["Stock máximo", product.maxStock != null ? `${product.maxStock} ${product.unitOfMeasure ?? "UND"}` : "—"],
                  ["Moneda", product.currency ?? "USD"],
                  ["Estado", product.status ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-white/5 py-1.5">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-slate-200 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <GlassCard>
              <p className="section-title mb-1">Inventario</p>
              <p className="text-sm text-slate-400 mb-4">
                {product.tracksInventory ? "Este producto controla inventario." : "Este producto no controla inventario."}
              </p>

              {product.tracksInventory && (
                <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm text-slate-400">Stock actual</span>
                  <span className={`text-lg font-bold ${lowStock ? "text-amber-400" : "text-white"}`}>{product.stock ?? 0}</span>
                </div>
              )}

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
                  <Trash2 className="w-4 h-4" /> Eliminar permanentemente
                </button>
              </div>
            </GlassCard>

            {product.category && (
              <GlassCard>
                <p className="section-title mb-2">Categoría</p>
                <Badge label={product.category.name} variant="info" />
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
