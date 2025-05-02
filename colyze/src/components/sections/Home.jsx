import { useState } from "react";
import { RevealOnScroll } from "../RevealOnScroll";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import Polygon from "../Polygon"; // Polygon bileşenini import edelim

export const Home = () => {
  const [polygons, setPolygons] = useState([]); // Poligonları tutacak state

  // Poligon ekleme fonksiyonu
  const addPolygon = () => {
    setPolygons((prevPolygons) => {
      const baseX = 200 + prevPolygons.length * 20;
      const baseY = 200 + prevPolygons.length * 20;
  
      const newPolygon = {
        id: prevPolygons.length + 1,
        focused: false,
        points: [
          { x: baseX, y: baseY },
          { x: baseX + 50, y: baseY },
          { x: baseX + 25, y: baseY - 50 },
        ],
      };
  
      return [...prevPolygons, newPolygon];
    });
  };
  
  
  // Poligon tıklama fonksiyonu
  const handlePolygonClick = (id) => {
    console.log(`Poligona tıklanıyor, ID: ${id}`);
    setPolygons(polygons.map((polygon) => {
      if (polygon.id === id) {
        return { ...polygon, focused: !polygon.focused }; // Poligon odaklanma durumunu değiştir
      }
      return polygon;
    }));
  };


  const handlePolygonUpdate = (id, newPoints) => {
    setPolygons(prev =>
      prev.map(p =>
        p.id === id ? { ...p, points: newPoints } : p
      )
    );
  };
  
  

  return (
    <section id="home" className="min-h-screen pt-24 px-8 pb-8 bg-white text-white">
      <div className="flex space-x-4">
        {/* İlk div */}
        <div className="w-full h-[700px] bg-gray-200 rounded-xl p-8 shadow-xl text-black relative">
          {/*<Camera></Camera>*/}

          {/* Poligonları render et */}
          {polygons.map((polygon) => (
            <Polygon
            key={polygon.id}
            polygon={polygon}
            onClick={() => handlePolygonClick(polygon.id)}
            onUpdate={handlePolygonUpdate}
          />
          
          
          ))}
        </div>

        {/* İkinci div */}
        <ControlPanel></ControlPanel>
      </div>

      {/* Add Tool butonu */}
      <button onClick={addPolygon} className="mt-4 p-2 bg-blue-500 text-white rounded">
        Add Tool
      </button>
    </section>
  );
};
