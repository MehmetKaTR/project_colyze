import { useState, useEffect, useRef } from "react";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import Polygon from "../Polygon";

export const Home = () => {
  const cameraContainerRef = useRef(null);
  const [typeNo, setTypeNo] = useState(null);
  const [prevTypeNo, setPrevTypeNo] = useState(null); 
  const [polygons, setPolygons] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [rgbiResults, setRgbiResults] = useState([]);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (cameraContainerRef.current) {
        const { width, height } = cameraContainerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize(); // ilk render

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);


  // type_no'yu periyodik olarak kontrol et
  useEffect(() => {
    const interval = setInterval(() => {
      getTypeProgNO();
    }, 2000); // 2 saniyede bir kontrol et

    return () => clearInterval(interval); // component unmount olursa interval iptal edilir
  }, []);

  // typeNo veya prevTypeNo değiştiğinde CSV dosyasını yükle
  useEffect(() => {
    const init = async () => {
      if (typeNo !== null) {
        if (typeNo !== prevTypeNo) {
          await loadPolygonsFromCSV(typeNo);
          setPrevTypeNo(typeNo);
        } else {
          await loadPolygonsFromCSV("polygons");
        }
      }
    };

    init();
  }, [typeNo]);
  
  const CAMERA_WIDTH = 1920;
  const CAMERA_HEIGHT = 1080;

  const loadPolygonsFromCSV = async (typeNo) => {
    try {
      const fileName = typeNo === "polygons"
        ? 'polygons.csv'
        : `types/type_${typeNo}/p2.csv`;

      const response = await fetch(`colyze/documents/${fileName}`);
      const data = await response.text();

      const rows = data.split("\n");
      const loadedPolygons = rows.map((row) => {
        const [id, ...points] = row.split(",");
        if (id) {
          const polygonPoints = [];
          for (let i = 0; i < points.length; i += 2) {
            const x = parseFloat(points[i]);
            const y = parseFloat(points[i + 1]);

            const scaledX = x * (containerSize.width / CAMERA_WIDTH);
            const scaledY = y * (containerSize.height / CAMERA_HEIGHT);

            polygonPoints.push({ x: x, y: y });
          }
          return { id: parseInt(id), points: polygonPoints };
        }
        return null;
      }).filter(Boolean);

      setPolygons(loadedPolygons);
    } catch (error) {
      console.error('CSV yüklenirken hata:', error.message);
    }
  };


  const getTypeProgNO = async () => {
    try {
      const response = await fetch('http://localhost:3050/get_type', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to get type');

      const data = await response.json();
      const newTypeNo = data[0]?.type_no;

      // Yalnızca typeNo değişmişse set et
      if (newTypeNo !== typeNo) {
        setTypeNo(newTypeNo);
        console.log('typeNo değişti:', newTypeNo);
      }

      return newTypeNo;
    } catch (error) {
      console.error('Hata:', error.message);
      return null;
    }
  };
  

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
      const container = document.getElementById("camera-container");
      const canvasWidth = container.offsetWidth;
      const canvasHeight = container.offsetHeight;

      const payload = {
        width: canvasWidth,
        height: canvasHeight,
        polygons: polygons
      };
      console.log("Payload being sent:", payload);

      const response = await fetch('http://localhost:3000/save-polygons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save');

      alert("Polygons saved successfully!");
    } catch (error) {
      console.error("Error saving polygons:", error);
      alert("Error saving polygons!");
    }
  };

  const saveTypePolygonsToCSV = async () => {
    try {
      const response = await fetch('http://localhost:3000/save-polygons-to-type-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeNo: typeNo,  // typeNo'yu buraya ekliyoruz
          polygons: polygons
        }),
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

      // Gösterilen görüntüyü (base64) al
      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera görüntüsü bulunamadı.");
        return;
      }

      // img'den canvas'a çizip base64 al
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg'); // base64

      // API'ye hem csv hem de img gönder
      const result = await fetch('http://localhost:5050/calculate_rgbi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: csvText,
          image: imageDataUrl
        }),
      });

      const json = await result.json();
      console.log("RGBI Results:", json);

      const sortedResults = json.sort((a, b) => a.id - b.id);
      setRgbiResults(sortedResults);

      alert("RGBI calculation complete.");
    } catch (err) {
      console.error("Failed to calculate RGBI:", err);
      alert("RGBI calculation failed.");
    }
  };

  return (
      <section className="min-h-screen pt-24 px-8 pb-8 bg-white text-white">
        <div className="flex space-x-4 space-y-4">
          <div
          ref={cameraContainerRef}
          id="camera-container"
          className="relative w-full h-[62vh] bg-gray-200 rounded-xl p-4 shadow-xl text-black"
          onClick={handleClick}
        >
          <Camera />
          {polygons.map((polygon, index) => {
            const polygonId = isNaN(polygon.id) ? `polygon-${index}` : polygon.id;
            return (
              <Polygon
                key={polygonId}
                polygon={{ ...polygon, focused: polygon.id === focusedId }}
                onUpdate={handlePolygonUpdate}
              />
            );
          })}
        </div>
        <ControlPanel
          onAdd={addPolygon}
          onDelete={deleteFocusedPolygon}
          onSave={savePolygonsToCSV}
          onCalculate={sendCsvToCalculateRgbi}
          onTypeSave={saveTypePolygonsToCSV}
        />
      </div>
      <div className="flex flex-row space-x-4">

      <div className="w-full h-full bg-gray-200 rounded-xl p-8 shadow-xl text-black relative">
        <span className="flex justify-center items-center text-black">TOOL PARAMETERS</span>

      
      </div>

      <div className="w-full h-[25vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black relative">
        <span className="flex justify-center items-center text-black font-bold mb-4">MEASUREMENT RESULTS</span>

        <div className="h-full overflow-auto">
          {rgbiResults.length === 0 ? (
            <p className="text-center">No results yet.</p>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full text-sm text-center">
                <thead className="bg-gray-300">
                  <tr>
                    <th className="py-2 px-4">ID</th>
                    <th className="py-2 px-4">R</th>
                    <th className="py-2 px-4">G</th>
                    <th className="py-2 px-4">B</th>
                    <th className="py-2 px-4">I</th>
                  </tr>
                </thead>
                <tbody>
                  {rgbiResults.map((tool) => (
                    <tr key={tool.id} className="border-t">
                      <td className="py-1 px-4">{tool.id}</td>
                      <td className="py-1 px-4">{tool.avg_r.toFixed(2)}</td>
                      <td className="py-1 px-4">{tool.avg_g.toFixed(2)}</td>
                      <td className="py-1 px-4">{tool.avg_b.toFixed(2)}</td>
                      <td className="py-1 px-4">{tool.intensity.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  </div>

    </section>
  );
};
