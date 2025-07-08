import React, { useEffect, useState } from "react";
import FrameGallery from "../FrameGallery";
import MeasurementLog from "../MeasurementLog";

export const Auto = () => {
  const [leftFrames, setLeftFrames] = useState([]);
  const [measurementResults, setMeasurementResults] = useState([]);
  const [usedResultIds, setUsedResultIds] = useState(new Set());

  useEffect(() => {
    const fetchFramesAndResults = async () => {
      try {
        const [framesRes, resultsRes] = await Promise.all([
          fetch("http://localhost:5050/auto_frames"),
          fetch("http://localhost:5050/get_frame_results"),
        ]);

        const [framesData, resultsData] = await Promise.all([
          framesRes.json(),
          resultsRes.json(),
        ]);

        if (!Array.isArray(framesData) || !Array.isArray(resultsData)) return;

        const usedIds = new Set();

        // Frame-Result eşleştirme
        const matchedResults = framesData
          .map((frameObj) => {
            const frameDate = extractDatetimeFromFilename(frameObj.filename);
            if (!frameDate) return null;

            // En yakın ve kullanılmamış sonucu bul
            const closestResult = findClosestDBResult(frameDate, resultsData, usedIds);
            console.log(closestResult)

            return closestResult ? { 
              frame: frameObj.filename, 
              result: closestResult 
            } : null;
          })
          .filter(Boolean);

        setLeftFrames(framesData);
        setMeasurementResults(matchedResults.map((m) => m.result));
        setUsedResultIds(usedIds); // durumu kaydet
      } catch (err) {
        console.error("Veriler alınamadı:", err);
      }
    };

    fetchFramesAndResults();
  }, []);

  // Dosya isminden tarih saat çıkarma
  function extractDatetimeFromFilename(filename) {
    if (typeof filename !== "string") return null;

    const match = filename.match(/\d{4}-\d{2}-\d{2}[T_]\d{2}-\d{2}-\d{2}/);
    if (!match) return null;

    let isoStr = match[0].replace("_", "T").replace(/-/g, ":");
    isoStr = isoStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");

    return new Date(isoStr);
  }

  // En yakın ve kullanılmamış sonucu bulma
  function findClosestDBResult(frameDate, dbResults, usedIds) {
    if (!frameDate) return null;

    const parsedResults = dbResults
      .map((row) => ({
        ...row,
        dateObj: parseDBDate(row.DateTime),
        diffMs: Math.abs(parseDBDate(row.DateTime) - frameDate),
      }))
      .filter((r) => !isNaN(r.dateObj) && !usedIds.has(r.ID));

    if (parsedResults.length === 0) return null;

    parsedResults.sort((a, b) => a.diffMs - b.diffMs);

    const closest = parsedResults[0];
    if (closest && closest.ID) usedIds.add(closest.ID);

    return closest;
  }

  // DB tarih stringini Date objesine çevirme
  function parseDBDate(str) {
    if (typeof str !== "string") return new Date(0);

    const [day, month, rest] = str.split(".");
    if (!rest) return new Date(0);
    const [year, time] = rest.split(" ");
    if (!time) return new Date(0);

    const timeClean = time.split(".")[0];
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timeClean}`);
  }

  return (
    <div className="min-h-screen flex bg-gray-100 pt-20 p-6 space-x-6">
      {/* Sol Panel */}
      <div className="w-1/2 flex flex-col space-y-4">
        <FrameGallery frames={leftFrames} />
        <MeasurementLog results={measurementResults} showFrameIds={true} leftFrames={leftFrames} />
      </div>

      {/* Sağ Panel (İstersen aynısını koyabilirsin) */}
      <div className="w-1/2 flex flex-col space-y-4">
        <FrameGallery frames={leftFrames} />
        <MeasurementLog results={measurementResults} showFrameIds={true} leftFrames={leftFrames} />
      </div>
    </div>
  );
};

export default Auto;
