// Auto.jsx
import React, { useState, useEffect } from "react";
import FrameGallery from "../FrameGallery";
import MeasurementLog from "../MeasurementLog";

// Helper: result_lines dizisini poligon bazında parse eder
const parseResultLines = (lines, isHist = false) => {
  const results = [];
  let current = null;

  lines.forEach(line => {
    if (!line || typeof line !== "string") return;
    const text = line.trim();
    if (!text) return;

    if (text.startsWith("ID ")) {
      if (current) results.push(current);
      const idMatch = text.match(/\d+/);
      const id = idMatch ? parseInt(idMatch[0], 10) : null;

      if (isHist) {
        current = { id, R_diff: null, G_diff: null, B_diff: null, Result: null };
      } else {
        current = { id, R: null, G: null, B: null, I: null, Result: null };
      }
    } else if (current) {
      if (isHist) {
        if (text.startsWith("R_diff:")) current.R_diff = parseFloat(text.split(":")[1].trim());
        else if (text.startsWith("G_diff:")) current.G_diff = parseFloat(text.split(":")[1].trim());
        else if (text.startsWith("B_diff:")) current.B_diff = parseFloat(text.split(":")[1].trim());
        else if (text.startsWith("RESULT:")) current.Result = text.split(":")[1].trim();
      } else {
        if (text.startsWith("R:")) current.R = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
        else if (text.startsWith("G:")) current.G = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
        else if (text.startsWith("B:")) current.B = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
        else if (text.startsWith("I:")) current.I = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
        else if (text.startsWith("RESULT:")) current.Result = text.split(":")[1].trim();
      }
    }
  });

  if (current) results.push(current);
  return results;
};

export const Auto = () => {
  const [leftFrames, setLeftFrames] = useState([]);
  const [rightFrames, setRightFrames] = useState([]);
  const [focusedFrame, setFocusedFrame] = useState(null);
  const [measurementResults, setMeasurementResults] = useState([]);
  const [isHist, setIsHist] = useState(false); // tablo tipi için

  const fetchFrames = async () => {
    try {
      const res = await fetch("http://localhost:5050/auto_frames");
      const data = await res.json();
      setLeftFrames(data);
    } catch (err) {
      console.error("Frames fetch error:", err);
    }
  };

  useEffect(() => {
    fetchFrames();
  }, []);

  const handleFrameClick = async (frame) => {
    setFocusedFrame(frame);

    try {
      const res = await fetch(
        `http://localhost:5050/auto_result_text?filename=${frame.filename}`
      );
      const data = await res.json();

      if (data?.result_lines) {
        const histFormat = frame.filename.includes("_histogram");
        setIsHist(histFormat);

        const parsedResults = parseResultLines(data.result_lines, histFormat);
        setMeasurementResults(parsedResults);
      } else {
        setMeasurementResults([]);
        setIsHist(false);
      }
    } catch (err) {
      console.error("Result fetch error:", err);
      setMeasurementResults([]);
      setIsHist(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-20 p-6 space-y-4">
      <div className="w-full h-[600px] bg-white border shadow rounded flex items-center justify-center">
        {focusedFrame ? (
          <img
            src={`http://localhost:5050${focusedFrame.path}`}
            alt="Focused Frame"
            className="h-full object-contain"
          />
        ) : (
          <p className="text-gray-500 text-xl">Bir frame seçiniz...</p>
        )}
      </div>

      <MeasurementLog results={measurementResults} showFrameIds={false} isHist={isHist} />

      <div className="flex space-x-6">
        <div className="w-full flex flex-col space-y-4">
          <FrameGallery frames={leftFrames} onFrameClick={handleFrameClick} />
        </div>
        <div className="w-full flex flex-col space-y-4">
          <FrameGallery frames={rightFrames} onFrameClick={handleFrameClick} />
        </div>
      </div>
    </div>
  );
};

export default Auto;
