import React from 'react';
import RgbInputWidget from './RgbInputWidget';

const ToolParameters = ({
  polygons,
  setPolygons,
  // mlPolygons,
  // setMlPolygons,
  focusedId,
  setFocusedId,
  resetPolygonPosition
}) => {
  /*
  const toggleOkNok = (polygonId) => {
    setMlPolygons(prev =>
      prev.map(p =>
        p.id === polygonId ? { ...p, okNok: !p.okNok } : p
      )
    );
  };
  */
  // polygon.id bazlı ML polygon bul
  //const getMlPolygon = (polygonId) => mlPolygons.find(p => p.id === polygonId) || {};

  return (
    <div className="w-full h-[30vh] bg-gray-200 rounded-xl p-4 shadow-xl text-black relative flex flex-col">
      <span className="flex justify-center items-center text-black font-bold mb-1">TOOL PARAMETERS</span>
      <div className="space-y-2 flex-1 overflow-auto px-2 py-0 mt-2 mb-2">
        {polygons.map((polygon) => {
          //const mlPolygon = getMlPolygon(polygon.id); // ML polygon eşleşmesi

          return (
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

              {/* OK/NOK switch sadece ML polygons için */}
              {/*
              <div
                onClick={(e) => { e.stopPropagation(); toggleOkNok(polygon.id); }}
                className={`w-9 h-9 rounded-md flex justify-center items-center text-white font-bold cursor-pointer ${
                  mlPolygon.okNok ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {mlPolygon.okNok ? 'OK' : 'NOK'}
              </div>
              */}
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
          );
        })}
      </div>
    </div>
  );
};

export default ToolParameters;
