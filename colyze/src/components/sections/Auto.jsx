import React, { useState, useEffect } from "react";
import FrameGallery from "../FrameGallery";
import MeasurementLog from "../MeasurementLog";

export const Auto = () => {
  const [leftFrames, setLeftFrames] = useState([]);
  const [focusedFrame, setFocusedFrame] = useState(null);
  const [measurementResults, setMeasurementResults] = useState([]);

  useEffect(() => {
    async function fetchFrames() {
      const res = await fetch("http://localhost:5050/auto_frames");
      const data = await res.json();
      setLeftFrames(data);
    }
    fetchFrames();
  }, []);

  const handleFrameClick = async (frame) => {
    setFocusedFrame(frame);

    const { typeNo, progNo, datetime, measureType } = frame;
    if (!typeNo || !progNo || !datetime || !measureType) return;

    // datetime örneği: "2025-07-10_12-04-16-100"
    // Bunu "2025-07-10 12:04:16.100000" formatına çevirelim
    let formattedDatetime = datetime;

    if (datetime.includes("_") && datetime.includes("-")) {
      const [datePart, timePart] = datetime.split("_");
      const [hour, minute, second, millisec] = timePart.split("-");
      const microsec = (millisec || "0").padEnd(6, "0"); // 6 hane mikro saniye için
      formattedDatetime = `${datePart} ${hour}:${minute}:${second}.${microsec}`;
    }
    console.log(formattedDatetime)

    const query = new URLSearchParams({
      typeNo,
      progNo,
      datetime: formattedDatetime,
      measureType,
    }).toString();

    console.log("Gönderilen query:", decodeURIComponent(query));

    const res = await fetch(`http://localhost:5050/get_result_by_metadata?${query}`);
    const result = await res.json();
    console.log("HOCAM", result);

    setMeasurementResults(result ? [result] : []);
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-20 p-6 space-y-6">
      <div className="w-full h-[500px] bg-white border shadow rounded flex items-center justify-center">
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
      </div>
    </div>
  );
};

export default Auto;
