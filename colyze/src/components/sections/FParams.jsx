import { useState, useEffect, useRef } from "react";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import ToolParameters from '../ToolParameters';
import { getTypeProgNO, loadPolygonsFromDB, sendPolygonsToCalculateRgbi} from "../Flask";

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

  useEffect(() => {
    const init = async () => {
      if (typeNo !== null && progNo !== null) {
        let loaded;
        if (typeNo !== prevTypeNo || progNo !== prevProgNo) {
          loaded = await loadPolygonsFromDB(typeNo, progNo);
          setPrevTypeNo(typeNo);
          setPrevProgNo(progNo);
        } else {
          loaded = await loadPolygonsFromDB(typeNo, progNo); // Aynıysa yine DB'den çek
        }
        setPolygons(loaded);
      }
    };
    init();
  }, [typeNo, progNo]);

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

const deleteFocusedPolygon = async () => {
  if (focusedId !== null) {
    try {
      // Poligonu frontend'de filtrele ve id'leri yeniden sırala
      const updatedPolygons = polygons
        .filter(p => p.id !== focusedId)
        .map((p, index) => ({ ...p, id: index + 1 }));

      setPolygons(updatedPolygons);
      setFocusedId(null);

      // Backend'e sadece tüm güncel polygons listesini gönder
      await savePolygonsToDB(updatedPolygons);

    } catch (err) {
      console.error("Polygon silinirken hata oluştu:", err);
      alert("Polygon silinemedi.");
    }
  }
};

  const savePolygonsToDB = async () => {
    try {
      const payload = {
        typeNo,
        progNo,
        polygons
      };

      const response = await fetch('http://localhost:5050/update-polygons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('DB update failed');

      alert("Polygons updated in database!");
    } catch (error) {
      console.error("Error updating polygons in DB:", error);
      //alert("Failed to update database.");
    }
  };
  
  const RGBICalculate = async () => {
    const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera görüntüsü yok");
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');

      sendPolygonsToCalculateRgbi({
        typeNo,
        progNo,
        tolerance,
        setRgbiResults,
        imageDataUrl,
      });
  }

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

  const RGBITeach = async () => {
    const imageElement = document.getElementById("camera-frame");
    TeachTheMeasurement(typeNo, progNo, imageElement, setTolerance, polygons);
  }

  const fetchPolygonsFromDB = async (typeNo, progNo) => {
    const res = await fetch(`http://localhost:5050/tools_by_typeprog?typeNo=${typeNo}&progNo=${progNo}`);
    if (!res.ok) throw new Error("Poligonlar çekilemedi.");
    return await res.json();
  };

  const sendPolygonsToMeasureHistogram = async ({ typeNo, progNo, polygons, imageElement }) => {
  try {
    if (!typeNo || !progNo) {
      alert("TypeNo veya ProgNo tanımlı değil!");
      return;
    }

    if (!imageElement) {
      alert("Kamera görüntüsü bulunamadı.");
      return;
    }

    // Canvas oluşturup görüntüyü base64 formatına çevir
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL("image/jpeg");

    // POST isteği gönder
    const response = await fetch("http://localhost:5050/measure_histogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeNo,
        progNo,
        polygons,
        image: imageDataUrl,
      }),
    });

    if (!response.ok) {
      alert("Ölçüm yapılamadı.");
      return;
    }

    const result = await response.json();

    // Sonuçları işleyebilir veya state'e set edebilirsin
    console.log("Measure Histogram Results:", result);

    // Örneğin statusa göre kullanıcıya bilgi verebilirsin:
    result.forEach(({ id, status, diff_r, diff_g, diff_b }) => {
      console.log(`Tool ${id} durumu: ${status} (R:${diff_r}, G:${diff_g}, B:${diff_b})`);
    });

    return result;
  } catch (error) {
    console.error("Histogram measurement failed:", error);
    alert("Histogram measurement failed.");
  }
};


const captureSingleMeasurement = async (imageElement, polygonData) => {
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  const imageDataUrl = canvas.toDataURL('image/jpeg');

  const response = await fetch('http://localhost:5050/calculate_rgbi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ polygons: polygonData, image: imageDataUrl }),
  });

  return await response.json();
};


const TeachTheMeasurement = async (typeNo, progNo, imageElement, setTolerance, polygons) => {
  try {
    if (!imageElement) {
      alert("Kamera görüntüsü bulunamadı.");
      return;
    }

    let allResults = [];

    for (let i = 0; i < 10; i++) {
      const result = await captureSingleMeasurement(imageElement, polygons); // state'ten gelen polygonları kullan
      allResults.push(result);
      await new Promise(res => setTimeout(res, 200)); // yeni frame için gecikme
    }

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

    const toleranceLimits = averagedResults.map(r => {
      const poly = polygons.find(p => p.id === r.id);  // Güncel polygon listesi
      const tol_r = poly?.r ?? 0;
      const tol_g = poly?.g ?? 0;
      const tol_b = poly?.b ?? 0;
      const tol_i = poly?.i ?? 0;

      return {
        id: r.id,
        min_r: r.avg_r - tol_r,
        max_r: r.avg_r + tol_r,
        min_g: r.avg_g - tol_g,
        max_g: r.avg_g + tol_g,
        min_b: r.avg_b - tol_b,
        max_b: r.avg_b + tol_b,
        min_i: r.intensity - tol_i,
        max_i: r.intensity + tol_i,
      };
    });

    setTolerance(toleranceLimits);
    console.log("limits", toleranceLimits);
    alert("Teaching complete. Tolerance values set.");
  } catch (err) {
    console.error("Teach failed:", err);
    alert("Teaching failed.");
  }
};



  const HistMeasure = async () => {
      try {
      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera görüntüsü bulunamadı.");
        return;
      }

      // Polygonları backend'den çekelim
      const polygons = await fetchPolygonsFromDB(typeNo, progNo);
      
      const result = await sendPolygonsToMeasureHistogram({ typeNo, progNo, polygons, imageElement });
      
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }

  const sendPolygonsToTeachHistogram = async ({ typeNo, progNo, polygons, image }) => {
  try {
    if (!typeNo || !progNo) {
      alert("TypeNo veya ProgNo tanımlı değil!");
      return;
    }

    if (!image) {
      alert("Kamera görüntüsü bulunamadı.");
      return;
    }

    // Artık burada canvas'a çizme işlemi yok, direkt base64 stringi kullan
    const response = await fetch("http://localhost:5050/teach_histogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeNo,
        progNo,
        polygons,
        image,   // base64 stringi direk buraya koyduk
      }),
    });

    if (!response.ok) {
      alert("Teach işlemi başarısız oldu.");
      return;
    }

    const result = await response.json();
    console.log("Teach Histogram Sonucu:", result);
    alert("Teach işlemi başarılı!");

    return result;

  } catch (error) {
    console.error("Teach histogram failed:", error);
    alert("Teach histogram failed.");
  }
};


const HistTeach = async () => {
  const imageElement = document.getElementById("camera-frame");
  if (!imageElement) {
    alert("Kamera görüntüsü yok");
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  const imageDataUrl = canvas.toDataURL('image/jpeg');
  
  await sendPolygonsToTeachHistogram({
    typeNo,
    progNo,
    polygons,
    image: imageDataUrl,   // burası artık base64 string
  });
};

const measureFuncs = {
  rgb: RGBICalculate,
  hist: HistMeasure,
};

const teachFuncs = {
  rgb: RGBITeach,
  hist: HistTeach,
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
          onSave={savePolygonsToDB}
          onCalculate={measureFuncs}
          onTeach={teachFuncs}
          onCropModeToggle={() => setCropMode(prev => !prev)} // burada toggle'ı gönderiyorsun
        />
      </div>
      <div className="flex flex-row space-x-4">

      <div className="w-full h-[30vh] bg-gray-200 rounded-xl shadow-xl text-black relative flex flex-col">
        <ToolParameters
          polygons={polygons}
          setPolygons={setPolygons}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          resetPolygonPosition={resetPolygonPosition}
        />
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
