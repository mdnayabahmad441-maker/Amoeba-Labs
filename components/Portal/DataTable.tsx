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
    <div className="border border-amber-300/10 rounded-lg overflow-hidden">
      <table className="w-full">
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
          {data.map((item, idx) => (
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
  );
}
