// ResultTable.jsx
import React from "react";

const ResultTable = ({ results }) => {
  const columns = ["ID", "DateTime", "TypeNo", "ProgNo", "MeasType", "Barcode", "ToolCount", "Result"];

  if (!results || results.length === 0) {
    return <p className="text-gray-500 text-center">Sonuç yok.</p>;
  }

  return (
    <table className="w-full table-auto text-sm text-left text-gray-700">
      <thead>
        <tr className="bg-gray-100">
          {columns.map((col) => (
            <th key={col} className="px-3 py-2 border">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {results.map((row, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            {columns.map((col, i) => (
              <td key={i} className="px-3 py-2 border">{row[col]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ResultTable;
