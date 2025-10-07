export const MeasurementResultTable = ({
  title = "MEASUREMENT RESULTS",
  columns = [],
  data = [],
  refreshKey = 0 // yeni prop
}) => {
  return (
    <div className="w-full h-[30vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black relative">
      <span className="flex justify-center items-center text-black font-bold mb-1">
        {title}
      </span>

      <div className="h-full overflow-auto" key={refreshKey}>
        {data.length === 0 ? (
          <p className="text-center">No results yet.</p>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full text-sm text-center">
              <thead className="bg-gray-300">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="py-2 px-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`border-t ${
                      row.status === "OK" ? "bg-green-200" : row.status === "NOK" ? "bg-red-200" : ""
                    }`}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="py-1 px-4">
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
