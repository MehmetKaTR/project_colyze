import React from "react";
import RgbInputWidget from "./RgbInputWidget";

const ToolParameters = ({
  polygons,
  setPolygons,
  focusedId,
  setFocusedId,
  resetPolygonPosition,
  measurementType,
  timeLog,
}) => {
  const defaultTolerance = 0.1;

  return (
    <div className="w-full h-full rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-xl text-slate-100 relative flex flex-col overflow-hidden">
      <span className="flex justify-center items-center text-slate-100 font-semibold mb-2 tracking-wide">
        TOOL PARAMETERS {timeLog}
      </span>

      <div className="space-y-2 flex-1 overflow-auto px-1 py-0">
        {polygons.map((polygon) => (
          <div
            key={polygon.id}
            className={`flex justify-between items-center px-3 py-2 rounded-lg border cursor-pointer ${
              focusedId === polygon.id
                ? "bg-sky-500/10 border-sky-400"
                : "bg-slate-800/80 border-slate-700 hover:bg-slate-800"
            }`}
            onClick={() => setFocusedId(polygon.id)}
          >
            <span className="text-slate-100 font-medium min-w-[80px]">Polygon {polygon.id}</span>

            <div className="flex items-center mr-2 flex-wrap gap-y-1">
              {(measurementType === "RGB" || measurementType === "RGBI" || !measurementType) &&
                ["r", "g", "b", "i"].map((channel) => (
                  <RgbInputWidget
                    key={channel}
                    label={channel.toUpperCase()}
                    value={polygon[channel] ?? 0}
                    onChange={(val) => {
                      const updatedPolygon = { ...polygon, [channel]: val };
                      setPolygons((prev) =>
                        prev.map((p) => (p.id === polygon.id ? updatedPolygon : p))
                      );
                    }}
                  />
                ))}

              {measurementType === "HIST" && (
                <div className="flex items-center">
                  <label className="text-slate-200 font-semibold mr-2">Tolerance:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={polygon.hist_tolerance ?? defaultTolerance}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const updatedPolygon = { ...polygon, hist_tolerance: val };
                      setPolygons((prev) =>
                        prev.map((p) => (p.id === polygon.id ? updatedPolygon : p))
                      );
                    }}
                    className="w-20 p-1 rounded border border-slate-600 bg-slate-950 text-slate-100"
                  />
                </div>
              )}

              {measurementType === "EDGE" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <label className="text-slate-200 font-semibold mr-2">Score Tol:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={polygon.edge_tolerance ?? 1.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const updatedPolygon = { ...polygon, edge_tolerance: Number.isFinite(val) ? val : 1.0 };
                        setPolygons((prev) =>
                          prev.map((p) => (p.id === polygon.id ? updatedPolygon : p))
                        );
                      }}
                      className="w-20 p-1 rounded border border-slate-600 bg-slate-950 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="text-slate-200 font-semibold mr-2">Threshold:</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="255"
                      value={polygon.edge_pattern_threshold ?? 120}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const normalized = Number.isFinite(val) ? Math.max(0, Math.min(255, val)) : 120;
                        const updatedPolygon = { ...polygon, edge_pattern_threshold: normalized };
                        setPolygons((prev) =>
                          prev.map((p) => (p.id === polygon.id ? updatedPolygon : p))
                        );
                      }}
                      className="w-20 p-1 rounded border border-slate-600 bg-slate-950 text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                resetPolygonPosition(polygon.id);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-md text-xs"
            >
              Reset
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolParameters;
