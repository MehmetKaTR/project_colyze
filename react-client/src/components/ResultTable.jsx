import React from "react";

const ResultTable = ({ results }) => {
  const columns = ["ID", "DateTime", "TypeNo", "ProgNo", "MeasType", "Barcode", "ToolCount", "Result"];

  if (!results || results.length === 0) {
    return <p className="text-slate-400 text-center py-8">No results.</p>;
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-700">
      <table className="w-full table-auto text-sm text-left text-slate-100">
        <thead>
          <tr className="bg-slate-800">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 border-b border-slate-700 whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => {
            const status = String(row.Result || "").toUpperCase();
            const rowClass = status === "OK" ? "bg-emerald-900/20" : status === "NOK" ? "bg-rose-900/20" : "bg-slate-900/40";

            return (
              <tr key={idx} className={`${rowClass} hover:bg-slate-800/60`}>
                {columns.map((col, i) => (
                  <td key={i} className="px-3 py-2 border-b border-slate-800 whitespace-nowrap">
                    {row[col]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultTable;
