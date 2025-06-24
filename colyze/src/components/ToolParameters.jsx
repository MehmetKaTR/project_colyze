import React from 'react';
import RgbInputWidget from './RgbInputWidget';

const ToolParameters = ({ polygons, setPolygons, focusedId, setFocusedId, resetPolygonPosition }) => {
  return (
    <div className="w-full h-[30vh] bg-gray-200 rounded-xl p-4 shadow-xl text-black relative flex flex-col">
      <span className="flex justify-center items-center text-black font-bold mb-1">TOOL PARAMETERS</span>
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

            {/* RGBA input widgetları */}
            <div className="flex items-center mr-2">
              {['r', 'g', 'b', 'i'].map((channel) => (
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
              ))}
            </div>

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
