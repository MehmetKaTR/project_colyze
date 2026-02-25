// MeasurementLog.jsx
import React from "react";

const MeasurementLog = ({ results, mode = "rgbi", frameMeta = null }) => {
  const normalizedMode = String(mode || "rgbi").toLowerCase();
  const isHist = normalizedMode === "histogram" || normalizedMode === "hist";
  const isEdge = normalizedMode === "edge";
  const okCount = results.filter((item) => item.Result === "OK").length;
  const ngCount = results.filter((item) => item.Result && item.Result !== "OK").length;
  const totalCount = results.length;

  const fmt = (value, digits = 3) => {
    if (value == null || Number.isNaN(Number(value))) return "-";
    return Number(value).toFixed(digits);
  };

  if (!results.length) {
    return (
      <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/85 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-100">Measurement Log</h2>
          <span className="rounded-full border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            {String(mode || "rgbi").toUpperCase()}
          </span>
        </div>
        <div className="grid h-[calc(100%-2.2rem)] place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-300">No results yet</p>
            <p className="mt-1 text-xs text-slate-500">Bir frame secince detaylar burada gosterilir.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/85 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Measurement Log</h2>
          <p className="mt-1 text-xs text-slate-400">
            {frameMeta?.datetime || "No timestamp"} {frameMeta?.filename ? `| ${frameMeta.filename}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          {String(mode || "rgbi").toUpperCase()}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-700 bg-slate-950/55 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Total</p>
          <p className="text-lg font-semibold text-slate-100">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-emerald-300">OK</p>
          <p className="text-lg font-semibold text-emerald-100">{okCount}</p>
        </div>
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-rose-300">NOK</p>
          <p className="text-lg font-semibold text-rose-100">{ngCount}</p>
        </div>
      </div>

      <div className="h-[calc(100%-8.4rem)] min-h-0 overflow-auto rounded-xl border border-slate-700">
        <table className="w-full border-collapse text-slate-100 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
            <tr>
              <th className="border-b border-slate-700 px-2 py-2">ID</th>
              {isHist ? (
                <>
                  <th className="border-b border-slate-700 px-2 py-2">R_diff</th>
                  <th className="border-b border-slate-700 px-2 py-2">G_diff</th>
                  <th className="border-b border-slate-700 px-2 py-2">B_diff</th>
                </>
              ) : isEdge ? (
                <>
                  <th className="border-b border-slate-700 px-2 py-2">Found</th>
                  <th className="border-b border-slate-700 px-2 py-2">Count</th>
                  <th className="border-b border-slate-700 px-2 py-2">Score</th>
                  <th className="border-b border-slate-700 px-2 py-2">AreaRatio</th>
                  <th className="border-b border-slate-700 px-2 py-2">Tolerance</th>
                </>
              ) : (
                <>
                  <th className="border-b border-slate-700 px-2 py-2">R</th>
                  <th className="border-b border-slate-700 px-2 py-2">G</th>
                  <th className="border-b border-slate-700 px-2 py-2">B</th>
                  <th className="border-b border-slate-700 px-2 py-2">I</th>
                </>
              )}
              <th className="border-b border-slate-700 px-2 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res) => {
              const isOk = res.Result === "OK";
              const rowClass = isOk ? "bg-emerald-950/20" : "bg-rose-950/20";
              const resultBadgeClass = isOk
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                : "bg-rose-500/15 border-rose-400/40 text-rose-100";

              return (
                <tr key={res.id} className={`${rowClass} hover:bg-slate-800/60`}>
                  <td className="border-b border-slate-800 px-2 py-1.5 text-center font-semibold">{res.id}</td>
                  {isHist ? (
                    <>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{fmt(res.R_diff)}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{fmt(res.G_diff)}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{fmt(res.B_diff)}</td>
                    </>
                  ) : isEdge ? (
                    <>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{res.Found ?? "-"}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{res.Count ?? "-"}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{fmt(res.Score ?? res.Edge)}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{fmt(res.AreaRatio ?? res.Ref)}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{fmt(res.Tolerance)}</td>
                    </>
                  ) : (
                    <>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{res.R ?? "-"}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{res.G ?? "-"}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{res.B ?? "-"}</td>
                      <td className="border-b border-slate-800 px-2 py-1.5 text-center">{res.I ?? "-"}</td>
                    </>
                  )}
                  <td className="border-b border-slate-800 px-2 py-1.5 text-center">
                    <span className={`inline-flex min-w-[52px] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-bold ${resultBadgeClass}`}>
                      {res.Result || "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MeasurementLog;
