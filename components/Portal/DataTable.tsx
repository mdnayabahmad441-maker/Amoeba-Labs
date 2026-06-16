"use client";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="border border-amber-300/10 rounded-lg p-8 text-center">
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:block md:space-y-0 md:overflow-hidden md:rounded-lg md:border md:border-amber-300/10">
      <div className="hidden md:block md:overflow-x-auto">
        <table className="w-full min-w-max">
        <thead className="bg-amber-300/5 border-b border-amber-300/10">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left p-4 text-sm font-semibold text-gray-300"
              >
                {col.label}
              </th>
            ))}
            {actions && <th className="text-left p-4 text-sm font-semibold text-gray-300">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className={`border-t border-white/5 hover:bg-amber-300/5 transition ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="p-4 text-sm text-gray-300">
                  {col.render ? col.render(item[col.key], item) : String(item[col.key] || "-")}
                </td>
              ))}
              {actions && (
                <td className="p-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  {actions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border border-amber-300/10 bg-black/20 p-4 ${
              onRowClick ? "cursor-pointer" : ""
            }`}
            onClick={() => onRowClick?.(item)}
          >
            <div className="space-y-3">
              {columns.map((col) => (
                <div key={String(col.key)} className="min-w-0">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {col.label}
                  </div>
                  <div className="break-words text-sm text-gray-200">
                    {col.render ? col.render(item[col.key], item) : String(item[col.key] || "-")}
                  </div>
                </div>
              ))}
            </div>
            {actions && (
              <div
                className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {actions(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
