import { useState, useEffect, useRef } from "react";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import ToolParameters from '../ToolParameters';
import MeasurementResultTable from '../MeasurementResultTable';
import { getTypeProgNO, loadPolygonsFromDB, SaveFrameWithPolygons, sendPolygonsToCalculateRgbi} from "../Flask";

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
  const [measurementType, setMeasurementType] = useState(null);
  const [rgbiResults, setRgbiResults] = useState([]);
  const [histogramResults, setHistogramResults] = useState([]);
  const [autoResultBuffer, setAutoResultBuffer] = useState([]);


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

  const getFormattedDateTime = () => {
    const now = new Date();

    const pad = (n, z = 2) => String(n).padStart(z, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
          `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
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
    const datetime = getFormattedDateTime();
    if (!imageElement) {
      alert("Kamera görüntüsü yok");
      return;
    }

    setMeasurementType("RGBI");

    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');

    const results = await sendPolygonsToCalculateRgbi({
      typeNo,
      progNo,
      tolerance,
      setRgbiResults, 
      imageDataUrl,
      datetime,
    });
    console.log("SÖYLE",results)
    setAutoResultBuffer(results)

    const updatedPolygons = updatePolygonsWithStatus(polygons, results);
    setPolygons(updatedPolygons)

    SaveFrameWithPolygons(typeNo, progNo, updatedPolygons, imageDataUrl, datetime);
  };

  const updatePolygonsWithStatus = (polygons, rgbiResults) => {
    return polygons.map(polygon => {
      const matchedResult = rgbiResults.find(r => r.id === polygon.id);
      return matchedResult
        ? { ...polygon, status: matchedResult.status }
        : { ...polygon, status: "empty" }; 
    });
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

  const RGBITeach = async () => {
    const imageElement = document.getElementById("camera-frame");
    TeachTheMeasurement(typeNo, progNo, imageElement, setTolerance, polygons);
  }

  const fetchPolygonsFromDB = async (typeNo, progNo) => {
    const res = await fetch(`http://localhost:5050/tools_by_typeprog?typeNo=${typeNo}&progNo=${progNo}`);
    if (!res.ok) throw new Error("Poligonlar çekilemedi.");
    return await res.json();
  };

  const sendPolygonsToMeasureHistogram = async ({ typeNo, progNo, polygons, imageElement, datetimeStr }) => {
    try {
      if (!typeNo || !progNo || !imageElement) {
        alert("Eksik bilgi!");
        return;
      }

      // Teach histogramları al
      const teachHistogramsResp = await fetch(`http://localhost:5050/get_histograms?typeNo=${typeNo}&progNo=${progNo}`);
      const teachHistograms = await teachHistogramsResp.json(); // [{toolId, histogram:{r,g,b}}]

      if (!teachHistograms || teachHistograms.length === 0) {
        alert("Teach histogram verisi alınamadı.");
        return;
      }

      // Görüntüyü al
      const canvas = document.createElement("canvas");
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg");

      // Öncelikle fotoğrafı kaydet
      const saveResponse = await fetch("http://localhost:5050/save_frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          measureType: "hist",
          datetimeStr,   // burada gönderiyoruz
          image: imageDataUrl,
        }),
      });

      if (!saveResponse.ok) {
        alert("Fotoğraf kaydetme başarısız.");
        return;
      }

      const saveData = await saveResponse.json();
      console.log("Fotoğraf kaydedildi:", saveData.filename);

      // Measure API'ye gönder
      const response = await fetch("http://localhost:5050/measure_histogram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          polygons,
          image: imageDataUrl,
          teachHistograms,
        }),
      });

      if (!response.ok) {
        alert("Ölçüm yapılamadı.");
        return;
      }

      const result = await response.json();
      console.log("Measure Histogram Results:", result);
      return result;

    } catch (err) {
      console.error("Measurement failed:", err);
      alert("Histogram ölçüm hatası.");
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
        const result = await captureSingleMeasurement(imageElement, polygons);
        allResults.push(result);
        await new Promise(res => setTimeout(res, 200));
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
        const poly = polygons.find(p => p.id === r.id);
        const tol_r = poly?.r ?? 0;
        const tol_g = poly?.g ?? 0;
        const tol_b = poly?.b ?? 0;
        const tol_i = poly?.i ?? 0;

        return {
          id: r.id,
          min_r: Math.max(0, r.avg_r - tol_r),
          max_r: Math.min(255, r.avg_r + tol_r),
          min_g: Math.max(0, r.avg_g - tol_g),
          max_g: Math.min(255, r.avg_g + tol_g),
          min_b: Math.max(0, r.avg_b - tol_b),
          max_b: Math.min(255, r.avg_b + tol_b),
          min_i: Math.max(0, r.intensity - tol_i),
          max_i: Math.min(255, r.intensity + tol_i),
        };
      });

      setTolerance(toleranceLimits);

      // 🔁 DB'ye kaydet
      const saveResponse = await fetch("http://localhost:5050/save_rgbi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          measurements: toleranceLimits,
        }),
      });

      if (!saveResponse.ok) {
        const errText = await saveResponse.text();
        console.error("❌ RGBI kayıt hatası:", errText);
        alert("RGBI kayıt hatası!");
      } else {
        alert("Teaching ve RGBI kayıt işlemi tamamlandı!");
      }

    } catch (err) {
      console.error("Teach failed:", err);
      alert("Teaching failed.");
    }
  };


  const HistMeasure = async () => {
  try {
    // datetime'ı oluştur
    const now = new Date();
    const datetimeStr = now.toISOString().replace(/:/g, "-").replace(/\..+/, ""); 

    const imageElement = document.getElementById("camera-frame");
    if (!imageElement) {
      alert("Kamera görüntüsü bulunamadı.");
      return;
    }
    setMeasurementType("HIST");

    const polygons = await fetchPolygonsFromDB(typeNo, progNo);

    const result = await sendPolygonsToMeasureHistogram({
      typeNo,
      progNo,
      polygons,
      imageElement,
      datetimeStr,    // buraya ekle
    });

    if (!result) {
      alert("Histogram sonucu alınamadı.");
      return;
    }

    setHistogramResults(result);

    // Hepsi OK mi?
    const isAllOK = result.every(r => r.status === "OK");

    // Backend'e sonucu kaydet
    await fetch("http://localhost:5050/save_results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TypeNo: typeNo,
        ProgNo: progNo,
        MeasType: "HIST",
        Barcode: 123456,
        ToolCount: polygons.length,
        Result: isAllOK ? "OK" : "NOK",
        DateTime: datetimeStr,  // buraya ekle
      }),
    });

    alert("Histogram sonucu kaydedildi.");
  } catch (error) {
    console.error("HistMeasure hatası:", error);
    alert("Histogram ölçüm hatası.");
  }
};



  const sendPolygonsToTeachHistogram = async ({ typeNo, progNo, polygons, image }) => {
    try {
      if (!typeNo || !progNo || !image) {
        alert("Eksik bilgi!");
        return;
      }

      const response = await fetch("http://localhost:5050/teach_histogram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeNo, progNo, polygons, image }),
      });

      if (!response.ok) {
        alert("Teach işlemi başarısız oldu.");
        return;
      }

      const result = await response.json();
      console.log("Teach Histogram Sonucu:", result);

      // Gelen tüm histogramları save_histogram'a yolla
      for (const item of result.histograms) {
        const saveResponse = await fetch("http://localhost:5050/save_histogram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeNo,
            progNo,
            toolId: item.toolId,
            histogram: item.histogram,
          }),
        });

        if (!saveResponse.ok) {
          console.error("❌ Histogram kaydedilemedi:", await saveResponse.text());
        }
      }

      alert("Teach ve kayıt işlemleri başarıyla tamamlandı!");

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

  const renderMeasurementTable = () => {
    switch (measurementType) {
      case "RGBI":
        return (
          <MeasurementResultTable
            title="RGBI RESULTS"
            columns={["ID", "R", "G", "B", "I", "Status"]}
            data={rgbiResults.map(r => ({
              id: r.id,
              r: r.avg_r,
              g: r.avg_g,
              b: r.avg_b,
              i: r.intensity,
              status: r.status,
            }))}
          />
        );
      case "HIST":
        return (
          <MeasurementResultTable
            title="HISTOGRAM RESULTS"
            columns={["ID", "Diff R", "Diff G", "Diff B", "Status"]}
            data={histogramResults.map(r => ({
              id: r.id,
              "diff r": r.diff_r,
              "diff g": r.diff_g,
              "diff b": r.diff_b,
              status: r.status,
            }))}
          />
        );
      default:
        return (
          <MeasurementResultTable
            title="MEASUREMENT RESULTS"
            columns={["ID", "R", "G", "B", "I", "Status"]}
            data={[]}
          />
        );
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

        {renderMeasurementTable()}

      </div>

    </section>
  );
};
