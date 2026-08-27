"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronUp, ChevronDown, ChevronsUpDown, FileDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Disable sorting for this column even when the table has sorting enabled. */
  sortable?: boolean;
  /** Value used to sort this column. Defaults to row[key] when omitted. */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
  /** Plain-text value used for the PDF export. Defaults to sortAccessor/row[key]. */
  exportValue?: (row: T) => string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  /** Shows a leading "#" column numbering rows (accounts for pagination offset). */
  showIndex?: boolean;
  /** Enables click-to-sort column headers. Defaults to true whenever a column exposes a key/sortAccessor. */
  sortable?: boolean;
  /** Number of rows per page. When omitted, all rows render with no pagination. */
  pageSize?: number;
  /** Base filename (without extension) for the PDF export button. When omitted, the export button is hidden. */
  exportFileName?: string;
  /** Title printed at the top of the exported PDF. */
  exportTitle?: string;
  /** Shows the total row count (post-filter) above the table. */
  showTotalCount?: boolean;
}

type SortDir = "asc" | "desc";

function defaultAccessor<T>(row: T, key: string): string | number | Date | null | undefined {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined) return value as null | undefined;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) return value;
  return String(value);
}

export default function DataTable<T>({
  columns, data, loading, emptyText = "Sin resultados",
  keyExtractor, onRowClick, showIndex, sortable = true,
  pageSize, exportFileName, exportTitle, showTotalCount,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Reset to page 1 whenever the actual row composition changes (search/filter), but not on
  // every parent re-render — `data` arrives as a freshly-filtered array on each render even
  // when its contents haven't changed, so we key off row identities rather than array reference.
  const rowSignature = data.map(keyExtractor).join("|");
  useEffect(() => { setPage(1); }, [rowSignature]);

  // A column is sortable when sorting is on, it isn't explicitly opted out, and there's a way
  // to derive a comparable value — either an explicit accessor or a plain (non-composite) key.
  const isColumnSortable = (col: Column<T>) => {
    if (!sortable || col.sortable === false) return false;
    if (col.sortAccessor) return true;
    return !col.render;
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;
    const accessor = col.sortAccessor ?? ((row: T) => defaultAccessor(row, col.key));
    const withValues = data.map((row, i) => ({ row, i, value: accessor(row) }));
    withValues.sort((a, b) => {
      const av = a.value, bv = b.value;
      if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
      if (bv === null || bv === undefined) return -1;
      let cmp: number;
      if (av instanceof Date || bv instanceof Date) {
        cmp = new Date(av as string | Date).getTime() - new Date(bv as string | Date).getTime();
      } else if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), "es", { sensitivity: "base" });
      }
      if (cmp === 0) cmp = a.i - b.i; // stable
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withValues.map(w => w.row);
  }, [data, sortKey, sortDir, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const paged = pageSize ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;
  const startRow = pageSize ? (sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1) : (sorted.length === 0 ? 0 : 1);
  const endRow = pageSize ? Math.min(currentPage * pageSize, sorted.length) : sorted.length;

  const toggleSort = (col: Column<T>) => {
    if (!isColumnSortable(col)) return;
    if (sortKey === col.key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  };

  const handleExport = async () => {
    if (!exportFileName) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;
      const exportCols = columns.filter(c => c.label);
      const doc = new jsPDF({ orientation: exportCols.length > 5 ? "landscape" : "portrait" });
      if (exportTitle) {
        doc.setFontSize(14);
        doc.text(exportTitle, 14, 15);
      }
      autoTable(doc, {
        startY: exportTitle ? 20 : 10,
        head: [exportCols.map(c => c.label)],
        body: sorted.map(row =>
          exportCols.map(c => {
            if (c.exportValue) return c.exportValue(row);
            const accessor = c.sortAccessor ?? ((r: T) => defaultAccessor(r, c.key));
            const v = accessor(row);
            if (v === null || v === undefined) return "—";
            if (v instanceof Date) return v.toLocaleDateString("es-EC");
            return String(v);
          })
        ),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });
      doc.save(`${exportFileName}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      {(showTotalCount || exportFileName) && (
        <div className="flex justify-between items-center gap-3">
          {showTotalCount ? (
            <span className="text-xs text-slate-500">
              {sorted.length} {sorted.length === 1 ? "registro" : "registros"}
            </span>
          ) : <span />}
          {exportFileName && (
            <button
              onClick={handleExport}
              disabled={exporting || sorted.length === 0}
              className="btn-secondary p-2"
              title={exporting ? "Generando PDF..." : "Exportar PDF"}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full min-w-max">
          <thead>
            <tr>
              {showIndex && <th className="table-header text-left w-10">#</th>}
              {columns.map(col => {
                const canSort = isColumnSortable(col);
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={clsx("table-header text-left", canSort && "cursor-pointer select-none hover:text-white", col.className)}
                    onClick={() => toggleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {canSort && (
                        active
                          ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                          : <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (showIndex ? 1 : 0)} className="table-cell text-center py-10">
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showIndex ? 1 : 0)} className="table-cell text-center text-slate-500 py-10">
                  {emptyText}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={keyExtractor(row)}
                  className={clsx("table-row", onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row)}
                >
                  {showIndex && (
                    <td className="table-cell text-slate-500 text-xs">
                      {(pageSize ? (currentPage - 1) * pageSize : 0) + i + 1}
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={clsx("table-cell", col.className)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize && sorted.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>
            Mostrando {startRow}–{endRow} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
