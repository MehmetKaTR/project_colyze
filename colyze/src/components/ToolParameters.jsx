import React from 'react';
import RgbInputWidget from './RgbInputWidget';

const ToolParameters = ({
  polygons,
  setPolygons,
  focusedId,
  setFocusedId,
  resetPolygonPosition,
  measurementType, // RGBI veya HIST
  timeLog
}) => {
  const defaultTolerance = 0.1; // polygon.tolerance yoksa başlangıç

  return (
    <div className="w-full h-[30vh] bg-gray-200 rounded-xl p-4 shadow-xl text-black relative flex flex-col">
      <span className="flex justify-center items-center text-black font-bold mb-1">TOOL PARAMETERS {timeLog}</span>

      <div className="space-y-2 flex-1 overflow-auto px-2 py-0 mt-2 mb-2">
        {polygons.map((polygon) => (
          <div
            key={polygon.id}
            className={`flex justify-between items-center px-4 py-1 rounded-md cursor-pointer ${
              focusedId === polygon.id ? 'bg-blue-300' : 'bg-white hover:bg-gray-100'
            }`}
            onClick={() => setFocusedId(polygon.id)}
          >
            <span className="text-black font-medium">Polygon {polygon.id}</span>

            <div className="flex items-center mr-2">
              {/* RGBI inputları yalnızca measurementType RGBI ise */}
              {(measurementType === "RGB" || measurementType === "RGBI" || !measurementType) &&
                ['r', 'g', 'b', 'i'].map((channel) => (
                  <RgbInputWidget
                    key={channel}
                    label={channel.toUpperCase()}
                    value={polygon[channel] ?? 0}
                    onChange={(val) => {
                      const updatedPolygon = { ...polygon, [channel]: val };
                      setPolygons(prev =>
                        prev.map(p => (p.id === polygon.id ? updatedPolygon : p))
                      );
                    }}
                  />
                ))
              }

              {/* HIST inputu yalnızca measurementType HIST ise */}
              {measurementType === "HIST" && (
              <div className="flex items-center">
                <label className="text-black font-semibold mr-2">Tolerance:</label>
                <input
                  type="number"
                  step="0.01"
                  value={polygon.hist_tolerance ?? defaultTolerance} // burayı düzelt
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updatedPolygon = { ...polygon, hist_tolerance: val };
                    setPolygons(prev =>
                      prev.map(p => (p.id === polygon.id ? updatedPolygon : p))
                    );
                  }}
                  className="w-20 p-1 border rounded text-black"
                />
              </div>
            )}
            </div>

            {/* Reset butonu evrensel */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetPolygonPosition(polygon.id);
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs"
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
