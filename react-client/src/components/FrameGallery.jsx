import React from "react";

const FrameGallery = ({ frames = [], onFrameClick, focusedFilename }) => {
  return (
    <div className="h-full rounded-3xl border border-slate-700/60 bg-slate-900/80 shadow-xl p-3 md:p-4 overflow-hidden flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
        <h2 className="text-lg font-bold text-slate-100">Captured Frames</h2>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {frames.length} total
        </span>
      </div>

      {!frames.length ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
          No frames found yet.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2">
          {frames.map((frame, idx) => {
            const isFocused = frame.filename === focusedFilename;
            return (
              <button
                type="button"
                key={frame.filename || idx}
                onClick={() => onFrameClick?.(frame)}
                className={`text-left cursor-pointer rounded-xl p-2 border transition ${
                  isFocused
                    ? "border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-900/30"
                    : "border-slate-700 bg-slate-800/70 hover:border-slate-500"
                }`}
              >
                <div className="w-full h-24 rounded-lg overflow-hidden mb-2">
                  <img
                    src={`http://localhost:5050${frame.path}`}
                    alt={`Frame ${idx}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="block text-xs font-semibold text-slate-100">
                  {frame.measureType?.toUpperCase?.() || "UNKNOWN"}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  {frame.datetime}
                </span>
              </button>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
};

export default FrameGallery;
