import { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import Polygon from "../Polygon";

export const Home = () => {
  const [polygons, setPolygons] = useState([]);
  const [focusedId, setFocusedId] = useState(null);

  // Sayfa yüklendiğinde polygons2.csv dosyasından verileri al
  useEffect(() => {
    const loadPolygonsFromCSV = async () => {
      const response = await fetch('colyze/documents/polygons.csv');
      const data = await response.text();
      
      const rows = data.split("\n");
      const loadedPolygons = rows.map((row, index) => {
        const [id, ...points] = row.split(",");
        if (id) {
          const polygonPoints = [];
          for (let i = 0; i < points.length; i += 2) {
            polygonPoints.push({ x: parseFloat(points[i]), y: parseFloat(points[i + 1]) });
          }
          return { id: parseInt(id), points: polygonPoints };
        }
        return null;
      }).filter(Boolean);

      setPolygons(loadedPolygons);
    };
    loadPolygonsFromCSV();
  }, []);

  const addPolygon = () => {
    setPolygons((prevPolygons) => {
      const baseX = 200 + prevPolygons.length * 20;
      const baseY = 200 + prevPolygons.length * 20;

      const newPolygon = {
        id: prevPolygons.length + 1,
        points: [
          { x: baseX, y: baseY },
          { x: baseX + 50, y: baseY },
          { x: baseX + 25, y: baseY - 50 },
        ],
      };

      return [...prevPolygons, newPolygon];
    });
  };

  const calculatePolygonCenter = (polygon) => {
    const x = polygon.points.reduce((sum, point) => sum + point.x, 0) / polygon.points.length;
    const y = polygon.points.reduce((sum, point) => sum + point.y, 0) / polygon.points.length;
    return { x, y };
  };

  const calculateDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const handlePolygonUpdate = (id, newPoints) => {
    setPolygons((prevPolygons) => {
      return prevPolygons.map((polygon) =>
        polygon.id === id ? { ...polygon, points: newPoints } : polygon
      );
    });
  };
  

  // Bir poligonun içinde bir nokta olup olmadığını kontrol eden fonksiyon (ray-casting algoritması)
const isPointInPolygon = (point, polygon) => {
  let x = point.x, y = point.y;
  let inside = false;

  for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
    let xi = polygon.points[i].x, yi = polygon.points[i].y;
    let xj = polygon.points[j].x, yj = polygon.points[j].y;

    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

// Click event'ini yakalamak için handleClick fonksiyonu
const handleClick = (e) => {
  const clickX = e.clientX;
  const clickY = e.clientY;
  const clickPoint = { x: clickX, y: clickY };

  let closestPolygon = null;
  let minDistance = Infinity;

  polygons.forEach((polygon) => {
    // Eğer tıklama poligonun içinde ise, onu focusla
    if (isPointInPolygon(clickPoint, polygon)) {
      closestPolygon = polygon;
      return;  // İçinde bulduğumuz poligonu hemen seçiyoruz
    }

    // Eğer içeride değilse, merkeze olan mesafeyi hesapla
    const center = calculatePolygonCenter(polygon);
    const distance = calculateDistance(clickPoint, center);

    if (distance < minDistance) {
      minDistance = distance;
      closestPolygon = polygon;
    }
  });

  if (closestPolygon) {
    setFocusedId(closestPolygon.id);
  }
};


  const deleteFocusedPolygon = () => {
    if (focusedId !== null) {
      setPolygons(polygons.filter((p) => p.id !== focusedId));
      setFocusedId(null);  // Odak kaybolur
    }
  };

  const savePolygonsToCSV = async () => {
    try {
      const response = await fetch('http://localhost:3000/save-polygons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(polygons),
      });
  
      if (!response.ok) throw new Error('Failed to save');
  
      alert("Polygons saved successfully!");
    } catch (error) {
      console.error("Error saving polygons:", error);
      alert("Error saving polygons!");
    }
  };


  const sendCsvToCalculateRgbi = async () => {
    try {
      const response = await fetch('colyze/documents/polygons.csv');
      const csvText = await response.text();
  
      const result = await fetch('http://localhost:5050/calculate_rgbi', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csvText,
      });
      console.log(result.body);
  
      const json = await result.json();
      console.log("RGBI Results:", json);
      alert("RGBI calculation complete. Check console for result.");
    } catch (err) {
      console.error("Failed to calculate RGBI:", err);
      alert("RGBI calculation failed.");
    }
  };
  
  

  return (
    <section className="min-h-screen pt-24 px-8 pb-8 bg-white text-white">
      <div className="flex space-x-4" onClick={handleClick}>
        <div className="w-full h-[700px] bg-gray-200 rounded-xl p-8 shadow-xl text-black relative">
          {/*<Camera/>*/}
          {polygons.map((polygon) => (
            <Polygon key={polygon.id} polygon={{ ...polygon, focused: polygon.id === focusedId }} onUpdate={handlePolygonUpdate} />

          ))}
        </div>
        <ControlPanel />
      </div>
      <button onClick={addPolygon} className="mt-4 p-2 bg-blue-500 text-white rounded m-3">
        Add Tool
      </button>
      <button onClick={deleteFocusedPolygon} className="mt-2 p-2 bg-red-500 text-white rounded m-3">
        Delete Tool
      </button>
      <button onClick={savePolygonsToCSV} className="mt-2 p-2 bg-green-500 text-white rounded m-3">
        Save Polygons to CSV
      </button>
      <button
        onClick={sendCsvToCalculateRgbi}
        className="mt-2 p-2 bg-yellow-500 text-white rounded"
      >
        Calculate RGBI
      </button>

    </section>
  );
};
