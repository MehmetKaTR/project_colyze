// Auto.jsx
import React, { useState, useEffect } from "react";
import FrameGallery from "../FrameGallery";
import MeasurementLog from "../MeasurementLog";

// Helper: result_lines dizisini poligon bazında parse eder ve sayıları tam sayıya yuvarlar
const parseResultLines = (lines) => {
  const results = [];
  let current = null;

  lines.forEach(line => {
    if (!line || typeof line !== "string") return; // Güvenlik kontrolü

    const text = line.trim();
    if (!text) return; // Boş satırları atla

    if (text.startsWith("ID ")) {
      if (current) results.push(current);
      const idMatch = text.match(/\d+/);
      const id = idMatch ? parseInt(idMatch[0], 10) : null;
      current = { id, R: null, G: null, B: null, I: null, Result: null };
    } else if (current) {
      if (text.startsWith("R:")) {
        current.R = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
      } else if (text.startsWith("G:")) {
        current.G = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
      } else if (text.startsWith("B:")) {
        current.B = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
      } else if (text.startsWith("I:")) {
        current.I = Math.round(parseFloat(text.split(":")[1].split("->")[0].trim()));
      } else if (text.startsWith("RESULT:")) {
        current.Result = text.split(":")[1].trim();
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

    const res = await fetch(
      `http://localhost:5050/auto_result_text?filename=${frame.filename}`
    );
    const data = await res.json();

    if (data?.result_lines) {
      const parsedResults = parseResultLines(data.result_lines);
      setMeasurementResults(parsedResults);
    } else {
      setMeasurementResults([]);
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

      <MeasurementLog results={measurementResults} showFrameIds={false} />

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
