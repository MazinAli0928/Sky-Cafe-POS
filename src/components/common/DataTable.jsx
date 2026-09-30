import React from "react";
import EmptyState from "./EmptyState";

const DataTable = ({ columns, data, emptyMessage = "No items found", emptySubtext = "" }) => {
  if (!data || data.length === 0) {
    return <EmptyState title={emptyMessage} subtitle={emptySubtext} />;
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3.5 px-4 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              className="hover:bg-slate-50/80 transition-colors duration-150"
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`py-3.5 px-4 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                >
                  {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
