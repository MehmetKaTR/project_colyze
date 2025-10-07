// MeasurementLog.jsx
import React from "react";

const MeasurementLog = ({ results }) => {
  if (!results.length) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 h-40 overflow-auto">
        <h2 className="text-lg font-bold mb-2 text-gray-900">Measurement Log</h2>
        <p className="text-center text-sm text-gray-400 italic">No results yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 h-60 overflow-auto">
      <h2 className="text-lg font-bold mb-2 text-gray-900">Measurement Log</h2>
      <table className="table-auto w-full border-collapse border border-gray-300 text-gray-900 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 px-2 py-1">ID</th>
            <th className="border border-gray-300 px-2 py-1">R</th>
            <th className="border border-gray-300 px-2 py-1">G</th>
            <th className="border border-gray-300 px-2 py-1">B</th>
            <th className="border border-gray-300 px-2 py-1">I</th>
            <th className="border border-gray-300 px-2 py-1">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((res) => {
            const rowClass = res.Result === "OK" ? "bg-green-100" : "bg-red-100";

            const cellClass = (status) =>
              status === "OK" ? "bg-green-200" : "bg-red-200";

            return (
              <tr key={res.id} className={rowClass}>
                <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                  {res.id}
                </td>
                <td className={`border border-gray-300 px-2 py-1 text-center ${cellClass(res.Result)}`}>
                  {res.R !== null ? res.R : "-"}
                </td>
                <td className={`border border-gray-300 px-2 py-1 text-center ${cellClass(res.Result)}`}>
                  {res.G !== null ? res.G : "-"}
                </td>
                <td className={`border border-gray-300 px-2 py-1 text-center ${cellClass(res.Result)}`}>
                  {res.B !== null ? res.B : "-"}
                </td>
                <td className={`border border-gray-300 px-2 py-1 text-center ${cellClass(res.Result)}`}>
                  {res.I !== null ? res.I : "-"}
                </td>
                <td className={`border border-gray-300 px-2 py-1 text-center font-bold ${cellClass(res.Result)}`}>
                  {res.Result}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MeasurementLog;
