import clsx from "clsx";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  columns, data, loading, emptyText = "Sin resultados",
  keyExtractor, onRowClick,
}: Props<T>) {
  return (
    <div className="overflow-auto rounded-xl border border-white/10">
      <table className="w-full min-w-max">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={clsx("table-header text-left", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="table-cell text-center py-10">
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-cell text-center text-slate-500 py-10">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={keyExtractor(row)}
                className={clsx("table-row", onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row)}
              >
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
  );
}
