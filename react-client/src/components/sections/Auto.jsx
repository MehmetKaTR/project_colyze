import React, { useState, useEffect, useMemo, useCallback } from "react";
import FrameGallery from "../FrameGallery";
import MeasurementLog from "../MeasurementLog";

// Parse result_lines into row objects, grouped by polygon id.
const parseResultLines = (lines, mode = "rgbi") => {
  const normalizedMode = String(mode || "rgbi").toLowerCase();
  const isHist = normalizedMode === "histogram" || normalizedMode === "hist";
  const isEdge = normalizedMode === "edge";
  const results = [];
  let current = null;

  lines.forEach((line) => {
    if (!line || typeof line !== "string") return;
    const text = line.trim();
    if (!text) return;

    if (text.startsWith("ID ")) {
      if (current) results.push(current);
      const idMatch = text.match(/\d+/);
      const id = idMatch ? parseInt(idMatch[0], 10) : null;

      current = isHist
        ? { id, R_diff: null, G_diff: null, B_diff: null, Result: null }
        : isEdge
          ? { id, Found: null, Count: null, Score: null, AreaRatio: null, Tolerance: null, Result: null }
          : { id, R: null, G: null, B: null, I: null, Result: null };
      return;
    }

    if (!current) return;

    if (isHist) {
      if (text.startsWith("R_diff:")) current.R_diff = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("G_diff:")) current.G_diff = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("B_diff:")) current.B_diff = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("RESULT:")) current.Result = text.split(":")[1].trim();
      return;
    }

    if (isEdge) {
      if (text.startsWith("Found:")) current.Found = text.split(":")[1].trim();
      else if (text.startsWith("Count:")) current.Count = parseInt(text.split(":")[1].trim(), 10);
      else if (text.startsWith("Score:")) current.Score = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("AreaRatio:")) current.AreaRatio = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("Edge:")) current.Score = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("Ref:")) current.AreaRatio = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("Diff:")) current.Score = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("Tolerance:")) current.Tolerance = parseFloat(text.split(":")[1].trim());
      else if (text.startsWith("RESULT:")) current.Result = text.split(":")[1].trim();
      return;
    }

    if (text.startsWith("R:")) current.R = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
    else if (text.startsWith("G:")) current.G = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
    else if (text.startsWith("B:")) current.B = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
    else if (text.startsWith("I:")) current.I = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
    else if (text.startsWith("RESULT:")) current.Result = text.split(":")[1].trim();
  });

  if (current) results.push(current);
  return results;
};

export const Auto = () => {
  const [frames, setFrames] = useState([]);
  const [focusedFrame, setFocusedFrame] = useState(null);
  const [measurementResults, setMeasurementResults] = useState([]);
  const [measureMode, setMeasureMode] = useState("rgbi");
  const [methodFilter, setMethodFilter] = useState("all");

  const normalizeMeasureType = (value) => {
    const mode = String(value || "").toLowerCase();
    if (mode === "histogram") return "hist";
    if (mode === "rgbi" || mode === "hist" || mode === "edge") return mode;
    return "unknown";
  };

  const getFrameTimestamp = (frame) => {
    const raw = String(frame?.datetime || "");
    if (!raw) return 0;
    const normalized = raw
      .replace("_", " ")
      .replace(/(\d{2})-(\d{2})-(\d{2})$/, "$1:$2:$3");
    const ts = Date.parse(normalized);
    return Number.isNaN(ts) ? 0 : ts;
  };

  const fetchFrames = async () => {
    try {
      const res = await fetch("http://localhost:5050/auto_frames");
      const data = await res.json();
      const incoming = Array.isArray(data) ? data : [];
      const sorted = incoming
        .map((frame, index) => ({ frame, index }))
        .sort((a, b) => {
          const ta = getFrameTimestamp(a.frame);
          const tb = getFrameTimestamp(b.frame);
          if (tb !== ta) return tb - ta;
          return b.index - a.index;
        })
        .map((item) => item.frame);
      setFrames(sorted);
    } catch (err) {
      console.error("Frames fetch error:", err);
    }
  };

  useEffect(() => {
    fetchFrames();
  }, []);

  const handleFrameClick = useCallback(async (frame) => {
    setFocusedFrame(frame);

    try {
      const res = await fetch(`http://localhost:5050/auto_result_text?filename=${frame.filename}`);
      const data = await res.json();

      if (data?.result_lines) {
        const mode = String(frame.measureType || "rgbi").toLowerCase();
        setMeasureMode(mode);
        setMeasurementResults(parseResultLines(data.result_lines, mode));
        return;
      }

      setMeasurementResults([]);
      setMeasureMode("rgbi");
    } catch (err) {
      console.error("Result fetch error:", err);
      setMeasurementResults([]);
      setMeasureMode("rgbi");
    }
  }, []);

  const filteredFrames = useMemo(() => {
    if (methodFilter === "all") return frames;
    return frames.filter(
      (frame) => normalizeMeasureType(frame?.measureType) === methodFilter
    );
  }, [frames, methodFilter]);

  useEffect(() => {
    if (!filteredFrames.length) {
      setFocusedFrame(null);
      setMeasurementResults([]);
      return;
    }

    if (!focusedFrame || !filteredFrames.some((f) => f.filename === focusedFrame.filename)) {
      handleFrameClick(filteredFrames[0]);
    }
  }, [filteredFrames, focusedFrame, handleFrameClick]);

  const okCount = measurementResults.filter((item) => item.Result === "OK").length;
  const ngCount = measurementResults.filter((item) => item.Result && item.Result !== "OK").length;
  const totalToolCount = measurementResults.length;
  const partResult = totalToolCount === 0 ? "-" : ngCount === 0 ? "OK" : "NOK";
  const totalPartCount = focusedFrame ? 1 : 0;
  const okPartCount = focusedFrame && partResult === "OK" ? 1 : 0;
  const ngPartCount = focusedFrame && partResult === "NOK" ? 1 : 0;

  return (
    <div className="h-[calc(100vh-4rem)] mt-16 bg-slate-950 px-3 md:px-4 py-3 overflow-hidden">
      <div className="h-full w-full flex flex-col gap-3">
        <section className="shrink-0 rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-4 md:p-5 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Colyze Auto</p>
              <h1 className="mt-1 text-xl md:text-2xl font-bold text-white">
                Smart Frame Analysis Dashboard
              </h1>
              <p className="mt-2 text-xs md:text-sm text-slate-300">
                Son olcum en ustte gosterilir. Metoda gore filtreleyip sonucu inceleyebilirsiniz.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 md:gap-3">
              <div className="inline-flex rounded-2xl border border-slate-600/80 bg-slate-950/70 p-1">
                {[
                  { key: "all", label: "ALL" },
                  { key: "rgbi", label: "RGBI" },
                  { key: "hist", label: "HIST" },
                  { key: "edge", label: "EDGE" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMethodFilter(item.key)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                      methodFilter === item.key
                        ? "bg-sky-500/85 text-white shadow-md"
                        : "text-slate-300 hover:bg-slate-800/85 hover:text-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-2 md:gap-3">
                <div className="rounded-2xl bg-slate-800/70 border border-slate-600 px-4 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-300">Total Part</p>
                  <p className="text-xl font-semibold text-slate-100">{totalPartCount}</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-2">
                <p className="text-[11px] uppercase tracking-wider text-emerald-300">OK</p>
                  <p className="text-xl font-semibold text-emerald-100">{okPartCount}</p>
                </div>
                <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 px-4 py-2">
                <p className="text-[11px] uppercase tracking-wider text-rose-300">NG</p>
                  <p className="text-xl font-semibold text-rose-100">{ngPartCount}</p>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-2 ${
                    partResult === "OK"
                      ? "bg-emerald-500/15 border-emerald-400/40"
                      : partResult === "NOK"
                        ? "bg-rose-500/15 border-rose-400/40"
                        : "bg-slate-800/70 border-slate-600"
                  }`}
                >
                  <p
                    className={`text-[11px] uppercase tracking-wider ${
                      partResult === "OK"
                        ? "text-emerald-300"
                        : partResult === "NOK"
                          ? "text-rose-300"
                          : "text-slate-300"
                    }`}
                  >
                    Part Result
                  </p>
                  <p
                    className={`text-xl font-semibold ${
                      partResult === "OK"
                        ? "text-emerald-100"
                        : partResult === "NOK"
                          ? "text-rose-100"
                          : "text-slate-100"
                    }`}
                  >
                    {partResult}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 min-h-0 grid gap-3 xl:grid-cols-[3fr_1.1fr] grid-rows-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="w-full h-full min-h-0 rounded-3xl border border-slate-700/60 bg-slate-900/80 shadow-xl p-3 md:p-4 flex items-center justify-center">
            {focusedFrame ? (
              <img
                src={`http://localhost:5050${focusedFrame.path}`}
                alt="Focused Frame"
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <p className="text-slate-400 text-base md:text-lg">Select a frame to preview.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-3 md:p-4 h-full min-h-0">
            <MeasurementLog
              results={measurementResults}
              mode={measureMode}
              frameMeta={focusedFrame}
            />
          </div>
          <div className="xl:col-span-2 h-full min-h-0">
            <FrameGallery
              frames={filteredFrames}
              onFrameClick={handleFrameClick}
              focusedFilename={focusedFrame?.filename}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Auto;
