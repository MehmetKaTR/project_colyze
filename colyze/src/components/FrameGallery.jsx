import React from "react";

const FrameGallery = ({ frames = [] }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 flex-1">
      <h2 className="text-lg font-bold mb-2 text-gray-700">Captured Frames</h2>
      <div className="grid grid-cols-3 gap-4">
        {frames.map((frame, idx) => (
          <div
            key={frame.filename || idx}
            className="border border-gray-300 rounded-lg p-2 flex flex-col items-center bg-gray-50"
          >
            {/* Görsel kutusu */}
            <div className="w-full h-24 rounded overflow-hidden mb-2">
              <img
                src={`http://localhost:5050${frame.path}`}
                alt={`Frame ${idx}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Açıklamalar */}
            <span className="text-xs text-gray-600 font-medium">
              {frame.measureType?.toUpperCase?.() || "UNKNOWN"}
            </span>
            <span className="text-[10px] text-gray-400 text-center">
              {frame.datetime}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FrameGallery;
