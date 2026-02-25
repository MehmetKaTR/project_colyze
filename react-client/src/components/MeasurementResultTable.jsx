export const MeasurementResultTable = ({
  title = "MEASUREMENT RESULTS",
  columns = [],
  data = [],
  refreshKey = 0,
  timeLog,
}) => {
  return (
    <div className="w-full h-full rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-xl text-slate-100 relative overflow-hidden">
      <span className="flex justify-center items-center mb-2">
        <span className="font-semibold tracking-wide">{title}</span>
        <span className="text-slate-400 ml-2 text-sm">{timeLog}</span>
      </span>

      <div className="h-full overflow-auto pb-6" key={refreshKey}>
        {data.length === 0 ? (
          <p className="text-center text-slate-400">No results yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <table className="min-w-full text-sm text-center">
              <thead className="bg-slate-800">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="py-2 px-4 text-slate-200">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`border-t border-slate-700 ${
                      row.status === "OK"
                        ? "bg-emerald-900/30"
                        : row.status === "NOK"
                          ? "bg-rose-900/30"
                          : "bg-slate-900/50"
                    }`}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="py-1.5 px-4">
                        {typeof row[col.toLowerCase()] === "number"
                          ? row[col.toLowerCase()].toFixed(2)
                          : row[col.toLowerCase()] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
