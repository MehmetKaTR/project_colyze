import React, { useState } from "react";
import ResultTable from "../ResultTable";
import { exportPDF, exportExcel } from "../ExportUtils";

export const Report = () => {
  const [typeNo, setTypeNo] = useState(1);
  const [progNo, setProgNo] = useState(1);
  const [measType, setMeasType] = useState("");
  const [result, setResult] = useState("ALL");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState([]);

  // 🔥 yeni state’ler
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleSearch = async () => {
    try {
      const response = await fetch("http://localhost:5050/get_results_to_db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type_no: typeNo,
          prog_no: progNo,
          measure_type: measType,
          result: result,
          barcode: barcode,
          from_date: fromDate,
          to_date: toDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Sunucu hatası: " + response.status);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("API HATASI:", err);
    }
  };

  const handleRefresh = () => {
    setResults([]);
    setFromDate("");
    setToDate("");
  };

  const handleExport = (type) => {
    if (type === "pdf") {
      exportPDF(results);
    } else if (type === "excel") {
      exportExcel(results);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-20 p-6 space-y-6">
      {/* Üst Form */}
      <div className="w-full border shadow rounded flex space-x-4 p-4 bg-white">
        <div className="w-1/2 grid grid-cols-2 grid-rows-3 gap-2">
          <div className="grid grid-cols-2">
            <input
              type="number"
              value={typeNo}
              onChange={(e) => setTypeNo(e.target.value)}
              className="w-full text-center rounded border text-black"
            />
            <div className="flex items-center justify-center text-black">TYPE NO</div>
          </div>
          <div className="grid grid-cols-2">
            <input
              type="number"
              value={progNo}
              onChange={(e) => setProgNo(e.target.value)}
              className="w-full text-center rounded border text-black"
            />
            <div className="flex items-center justify-center text-black">PROGRAM NO</div>
          </div>
          <div className="grid grid-cols-2">
            <select
              value={measType}
              onChange={(e) => setMeasType(e.target.value)}
              className="w-full text-center rounded border text-black"
            >
              <option value="">Seçiniz</option>
              <option value="Histogram">HIST</option>
              <option value="RGBI">RGBI</option>
            </select>
            <div className="flex items-center justify-center text-black">MEASURE TYPE</div>
          </div>
          <div className="grid grid-cols-2">
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full text-center rounded border text-black"
            >
              <option value="OK">OK</option>
              <option value="NOK">NOK</option>
              <option value="ALL">ALL</option>
            </select>
            <div className="flex items-center justify-center text-black">RESULT</div>
          </div>

          {/* 🔥 Yeni From-To tarih alanları */}
          <div className="grid grid-cols-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-center rounded border text-black"
            />
            <div className="flex items-center justify-center text-black">FROM</div>
          </div>
          <div className="grid grid-cols-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-center rounded border text-black"
            />
            <div className="flex items-center justify-center text-black">TO</div>
          </div>
        </div>

        {/* Sağ taraf (Barcode + Butonlar) */}
        <div className="w-1/2 flex flex-col justify-between space-y-4 text-black">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode..."
            className="w-full text-center rounded border h-10"
          />
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              SEARCH
            </button>
            <button
              onClick={handleRefresh}
              className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              REFRESH
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
            >
              PDF
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
            >
              EXCEL
            </button>
          </div>
        </div>
      </div>

      {/* Alt Sonuç Tablosu */}
      <div className="w-full bg-white border shadow rounded p-4 max-h-[600px] overflow-auto">
        <ResultTable results={results} />
      </div>
    </div>
  );
};
