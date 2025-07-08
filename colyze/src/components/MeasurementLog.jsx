import React from "react";

const MeasurementLog = ({ results, showFrameIds = false, leftFrames = [] }) => {
  // frame dosya adına karşılık result ID eşleşmesini bulmak için:
  // results dizisindeki her sonucu frame ile eşleştirmek için
  // index kullanabiliriz, yoksa boş string gösteririz.

  // Alternatif: results sıralaması matchedResults sıralaması ile aynı olmalı.

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 h-40 overflow-auto">
      <h2 className="text-lg font-bold mb-2 text-gray-900">Measurement Log</h2>
      {results.length === 0 ? (
        <p className="text-center text-sm text-gray-400 italic">No results yet.</p>
      ) : (
        <table className="table-auto w-full border-collapse border border-gray-300 text-gray-900 text-sm">
          <thead>
            <tr>
              {showFrameIds && <th className="border border-gray-300 px-2 py-1">Frame ID</th>}
              <th className="border border-gray-300 px-2 py-1">ID</th>
              {/* <th>DateTime</th> Tarih istenmedi */}
              <th className="border border-gray-300 px-2 py-1">TypeNo</th>
              <th className="border border-gray-300 px-2 py-1">ProgNo</th>
              <th className="border border-gray-300 px-2 py-1">MeasType</th>
              <th className="border border-gray-300 px-2 py-1">Barcode</th>
              <th className="border border-gray-300 px-2 py-1">ToolCount</th>
              <th className="border border-gray-300 px-2 py-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res, idx) => {
              // Frame adı bulmak için, matchedResults sıralaması aynıysa idx ile eşleştirebiliriz
              // Eğer props'tan leftFrames geldi ise dosya adını al
              const frameName = showFrameIds && leftFrames[idx] ? leftFrames[idx].filename : null;

              return (
                <tr
                  key={`${res.ID ?? "noid"}-${idx}`}
                  className={`${
                    res.Result === "OK"
                      ? "bg-green-100"
                      : res.Result === "NOK"
                      ? "bg-red-100"
                      : ""
                  }`}
                >
                  {showFrameIds && (
                    <td className="border border-gray-300 px-2 py-1 text-xs font-mono">{frameName}</td>
                  )}
                  <td className="border border-gray-300 px-2 py-1">{res.ID ?? "N/A"}</td>
                  <td className="border border-gray-300 px-2 py-1">{res.TypeNo ?? ""}</td>
                  <td className="border border-gray-300 px-2 py-1">{res.ProgNo ?? ""}</td>
                  <td className="border border-gray-300 px-2 py-1">{res.MeasType ?? ""}</td>
                  <td className="border border-gray-300 px-2 py-1">{res.Barcode ?? ""}</td>
                  <td className="border border-gray-300 px-2 py-1">{res.ToolCount ?? ""}</td>
                  <td className="border border-gray-300 px-2 py-1">{res.Result ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MeasurementLog;
