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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleSearch = async () => {
    try {
      const response = await fetch("http://localhost:5050/get_results_to_db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_no: typeNo,
          prog_no: progNo,
          measure_type: measType,
          result,
          barcode,
          from_date: fromDate,
          to_date: toDate,
        }),
      });

      if (!response.ok) throw new Error("Server error: " + response.status);
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("API ERROR:", err);
    }
  };

  const handleRefresh = () => {
    setResults([]);
    setFromDate("");
    setToDate("");
  };

  const handleExport = (type) => {
    if (type === "pdf") exportPDF(results);
    else if (type === "excel") exportExcel(results);
  };

  return (
    <div className="h-[calc(100vh-4rem)] mt-16 px-3 md:px-4 py-3 bg-slate-950 text-slate-100 overflow-hidden">
      <div className="h-full flex flex-col gap-3">
        <section className="shrink-0 rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-4 md:p-5 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Colyze Report</p>
              <h1 className="mt-1 text-xl md:text-2xl font-bold text-white">Result Search and Export</h1>
              <p className="mt-2 text-xs md:text-sm text-slate-300">
                Filter saved measurements and export results quickly.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-2xl bg-slate-900/70 border border-slate-700 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Records</p>
                <p className="text-sm font-semibold text-slate-100">{results.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 border border-slate-700 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Filter Result</p>
                <p className="text-sm font-semibold text-sky-200">{result}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="shrink-0 rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-xl">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">Type No</span>
                <input
                  type="number"
                  value={typeNo}
                  onChange={(e) => setTypeNo(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">Program No</span>
                <input
                  type="number"
                  value={progNo}
                  onChange={(e) => setProgNo(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">Measure Type</span>
                <select
                  value={measType}
                  onChange={(e) => setMeasType(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                >
                  <option value="">All</option>
                  <option value="Histogram">HIST</option>
                  <option value="RGBI">RGBI</option>
                  <option value="EDGE">EDGE</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">Result</span>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                >
                  <option value="OK">OK</option>
                  <option value="NOK">NOK</option>
                  <option value="ALL">ALL</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3">
              <label className="block">
                <span className="block text-xs text-slate-400 mb-1">Barcode</span>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode..."
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3"
                />
              </label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-auto">
                <button onClick={handleSearch} className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 rounded-lg">
                  SEARCH
                </button>
                <button onClick={handleRefresh} className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-2 rounded-lg">
                  REFRESH
                </button>
                <button onClick={() => handleExport("pdf")} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg">
                  PDF
                </button>
                <button onClick={() => handleExport("excel")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg">
                  EXCEL
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 min-h-0 rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-xl overflow-auto">
          <ResultTable results={results} />
        </section>
      </div>
    </div>
  );
};
