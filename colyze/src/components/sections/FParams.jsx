import { useState, useEffect, useRef } from "react";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import { loadPolygonsFromCSV, getTypeProgNO } from "../Flask";

export const FParams = () => {
  const cameraContainerRef = useRef(null);
  const [typeNo, setTypeNo] = useState(null);
  const [progNo, setProgNo] = useState(null);
  const [prevTypeNo, setPrevTypeNo] = useState(null);
  const [prevProgNo, setPrevProgNo] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [tolerance, setTolerance] = useState(null);
  const [rgbiResults, setRgbiResults] = useState([]);

  // Kamerayı başlatan fonksiyon
  const startCamera = async () => {
    try {
      const res = await fetch("http://localhost:5050/start_camera");
      const data = await res.json();
      console.log("Camera start:", data.status || data.error);
    } catch (err) {
      console.error("Camera start error:", err);
    }
  };

  // Kamerayı durduran fonksiyon
  const stopCamera = async () => {
    try {
      const res = await fetch("http://localhost:5050/stop_camera");
      const data = await res.json();
      console.log("Camera stop:", data.status || data.error);
    } catch (err) {
      console.error("Camera stop error:", err);
    }
  };

  // Son typeNo ve progNo değerlerini ref ile tut (closure sorununu önlemek için)
  const latestTypeNo = useRef(typeNo);
  const latestProgNo = useRef(progNo);

  useEffect(() => {
    latestTypeNo.current = typeNo;
    latestProgNo.current = progNo;
  }, [typeNo, progNo]);

  // Backend'den typeNo ve progNo'yu 2 sn'de bir kontrol et
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getTypeProgNO();
      if (
        result &&
        (result.typeNo !== latestTypeNo.current || result.progNo !== latestProgNo.current)
      ) {
        // Önce kamerayı durdur
        await stopCamera();

        // State güncelle
        setTypeNo(result.typeNo);
        setProgNo(result.progNo);

        // Sonra kamerayı tekrar başlat
        await startCamera();

        console.log("typeNo/progNo değişti, kamera restart edildi:", result.typeNo, result.progNo);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // typeNo değiştiğinde poligonları yükle
  useEffect(() => {
    const init = async () => {
      if (typeNo !== null) {
        let loaded;
        if (typeNo !== prevTypeNo) {
          loaded = await loadPolygonsFromCSV(typeNo);
          setPrevTypeNo(typeNo);
        } else {
          loaded = await loadPolygonsFromCSV("polygons");
        }
        setPolygons(loaded);
      }
    };
    init();
  }, [typeNo]);
  

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

    let foundPolygon = null;

    polygons.forEach((polygon) => {
      if (isPointInPolygon(clickPoint, polygon)) {
        foundPolygon = polygon;
      }
    });

    if (foundPolygon) {
      setFocusedId(foundPolygon.id);
    } else {
      setFocusedId(null);  // Hiçbir poligonun içinde değilse odak iptal edilir
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


      const payload = {
        width: 1920,
        height: 1080,
        polygons: polygons
      };
      console.log("Payload being sent:", payload);

      const response = await fetch('http://localhost:5050/save-polygons', {
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
      const response = await fetch('http://localhost:5050/save-polygons-to-type-csv', {
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

      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera görüntüsü bulunamadı.");
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');

      const result = await fetch('http://localhost:5050/calculate_rgbi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, image: imageDataUrl }),
      });

      const json = await result.json();

      // Tolerans kontrolü yap
      const checkedResults = json.map(tool => {
        const tol = tolerance?.find(t => t.id === tool.id);

        if (!tol) {
          // Eğer tolerans yoksa NOK yap
          return { ...tool, status: "NOK" };
        }

        const isOk =
          tool.avg_r >= tol.min_r && tool.avg_r <= tol.max_r &&
          tool.avg_g >= tol.min_g && tool.avg_g <= tol.max_g &&
          tool.avg_b >= tol.min_b && tool.avg_b <= tol.max_b &&
          tool.intensity >= tol.min_i && tool.intensity <= tol.max_i;

        return { ...tool, status: isOk ? "OK" : "NOK" };
      });

      setRgbiResults(checkedResults);
      alert("Measurement complete.");
    } catch (err) {
      console.error("Failed to calculate RGBI:", err);
      alert("Measurement failed.");
    }
  };

  const resetPolygonPosition = (polygonId) => {
    setPolygons((prevPolygons) =>
      prevPolygons.map((polygon) => {
        if (polygon.id !== polygonId) return polygon;

        const points = polygon.points;
        if (points.length === 0) return polygon;

        // İlk noktayı baz alarak kaydırma miktarı hesapla
        const dx = points[0].x;
        const dy = points[0].y;

        // Bütün noktaları orijine (örneğin x=10, y=10) taşı
        const targetX = 100;
        const targetY = 100;

        const offsetX = targetX - dx;
        const offsetY = targetY - dy;

        const movedPoints = points.map((p) => ({
          x: p.x + offsetX,
          y: p.y + offsetY,
        }));

        return {
          ...polygon,
          points: movedPoints,
        };
      })
    );
  };

  const TeachTheMeasurement = async () => {
    try {
      const response = await fetch('colyze/documents/polygons.csv');
      const csvText = await response.text();

      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera görüntüsü bulunamadı.");
        return;
      }

      let allResults = [];

      for (let i = 0; i < 10; i++) {
        // Canvas'a çizip base64 al
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');

        const result = await fetch('http://localhost:5050/calculate_rgbi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: csvText, image: imageDataUrl }),
        });

        const json = await result.json();
        allResults.push(json);
      }

      // allResults: 10 ölçüm sonucu array'leri, her biri id'lere göre objeler içeriyor.
      // Şimdi aynı id'ye sahip ölçümlerin ortalamasını alıyoruz.

      const averagedResults = allResults[0].map((_, idx) => {
        const id = allResults[0][idx].id;
        let sum_r = 0, sum_g = 0, sum_b = 0, sum_i = 0;
        allResults.forEach(resultSet => {
          sum_r += resultSet[idx].avg_r;
          sum_g += resultSet[idx].avg_g;
          sum_b += resultSet[idx].avg_b;
          sum_i += resultSet[idx].intensity;
        });
        return {
          id,
          avg_r: sum_r / allResults.length,
          avg_g: sum_g / allResults.length,
          avg_b: sum_b / allResults.length,
          intensity: sum_i / allResults.length,
        };
      });

      // Tolerans değerleri oluştur (±20)
      const toleranceValue = 20;
      const toleranceLimits = averagedResults.map(r => ({
        id: r.id,
        min_r: r.avg_r - toleranceValue,
        max_r: r.avg_r + toleranceValue,
        min_g: r.avg_g - toleranceValue,
        max_g: r.avg_g + toleranceValue,
        min_b: r.avg_b - toleranceValue,
        max_b: r.avg_b + toleranceValue,
        min_i: r.intensity - toleranceValue,
        max_i: r.intensity + toleranceValue,
      }));

      setTolerance(toleranceLimits);
      alert("Teaching complete. Tolerance values set.");
    } catch (err) {
      console.error("Teach failed:", err);
      alert("Teaching failed.");
    }
  };

  return (
      <section className="min-h-screen pt-20 px-8 pb-8 bg-white text-white">
        <div className="flex space-x-4 space-y-4">
          <div
          ref={cameraContainerRef}
          id="camera-container"
          className="relative w-full h-[65vh] bg-gray-200 rounded-xl p-4 shadow-xl text-black"
          onClick={handleClick}
        >
          <Camera
            typeNo={typeNo}
            progNo={progNo}
            polygons={polygons}
            focusedId={focusedId}
            onPolygonUpdate={handlePolygonUpdate}
            cropMode={cropMode}
          />

        </div>
        <ControlPanel
          typeNo={typeNo}
          progNo={progNo}
          onAdd={addPolygon}
          onDelete={deleteFocusedPolygon}
          onSave={savePolygonsToCSV}
          onCalculate={sendCsvToCalculateRgbi}
          onTeach={TeachTheMeasurement}
          onTypeSave={saveTypePolygonsToCSV}
          onCropModeToggle={() => setCropMode(prev => !prev)} // burada toggle'ı gönderiyorsun
        />
      </div>
      <div className="flex flex-row space-x-4">

      <div className="w-full h-[30vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black relative flex flex-col">
        <span className="flex justify-center items-center text-black font-bold mb-1">TOOL PARAMETERS</span>
        <div className="space-y-2 flex-1 overflow-auto">
          {polygons.map((polygon) => (
            <div
              key={polygon.id}
              className={`flex justify-between items-center px-4 py-2 rounded-md cursor-pointer ${
                focusedId === polygon.id ? 'bg-blue-300' : 'bg-white hover:bg-gray-100'
              }`}
              onClick={() => setFocusedId(polygon.id)}
            >
              <span className="text-black font-medium">Polygon {polygon.id}</span>
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

      <div className="w-full h-[30vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black relative">
        <span className="flex justify-center items-center text-black font-bold mb-1">MEASUREMENT RESULTS</span>

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
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rgbiResults.map((tool) => (
                    <tr
                      key={tool.id}
                      className={`border-t ${
                        tool.status === "OK" ? "bg-green-200" : "bg-red-200"
                      }`}
                    >
                      <td className="py-1 px-4">{tool.id}</td>
                      <td className="py-1 px-4">{tool.avg_r.toFixed(2)}</td>
                      <td className="py-1 px-4">{tool.avg_g.toFixed(2)}</td>
                      <td className="py-1 px-4">{tool.avg_b.toFixed(2)}</td>
                      <td className="py-1 px-4">{tool.intensity.toFixed(2)}</td>
                      <td className="py-1 px-4 font-bold">{tool.status}</td>
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
