import { useState, useEffect, useRef } from "react";
import Camera from "../Camera";
import ControlPanel from "../ControlPanel";
import  ToolParameters   from '../ToolParameters';
import {MeasurementResultTable} from '../MeasurementResultTable';
import { getTypeProgNO, loadPolygonsFromDB, SaveFrameWithPolygons, sendPolygonsToCalculateRgbi, sendPolygonsToCalculateHistogram, captureSingleMeasurement, getTypes} from "../Flask";

export const FParams = () => {
  const cameraContainerRef = useRef(null);
  const [typeNo, setTypeNo] = useState(null);
  const [progNo, setProgNo] = useState(null);
  const [progName, setProgName] = useState(null);
  const [prevTypeNo, setPrevTypeNo] = useState(null);
  const [prevProgNo, setPrevProgNo] = useState(null);
  const [prevProgName, setPrevProgName] = useState(null);
  const [polygons, setPolygons] = useState([]);
  // const [mlPolygons, setMlPolygons] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [tolerance, setTolerance] = useState(null);
  const [histTolerance, setHistTolerance] = useState({});
  const [measurementType, setMeasurementType] = useState(null);
  const [rgbiResults, setRgbiResults] = useState([]);
  const [histogramResults, setHistogramResults] = useState([]);
  const [edgeResults, setEdgeResults] = useState([]);
  const [allTypes, setAllTypes] = useState([]);

  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [cameraProfiles, setCameraProfiles] = useState([]);
  const [activeCameraProfileId, setActiveCameraProfileId] = useState("");
  const [actionBanner, setActionBanner] = useState({ visible: false, text: "" });
  const [edgePreviewEnabled, setEdgePreviewEnabled] = useState(false);

  const latestTypeNo = useRef(typeNo);
  const latestProgNo = useRef(progNo);
  const latestProgName = useRef(progName);
  const cameraRestartSeq = useRef(0);
  const cameraRestartChain = useRef(Promise.resolve());
  const edgePreviewBusyRef = useRef(false);

  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const runWithActionBanner = async (text, task) => {
    setActionBanner({ visible: true, text });
    try {
      return await task();
    } finally {
      setActionBanner({ visible: false, text: "" });
    }
  };

  useEffect(() => {
    latestTypeNo.current = typeNo;
    latestProgNo.current = progNo;
    latestProgName.current = progName;
  }, [typeNo, progNo, progName]);

  // KamerayÄ± baÅŸlatan fonksiyon
  const startCamera = async (profileId = "") => {
    try {
      const endpoint = profileId
        ? `http://localhost:5050/start_camera?profile_id=${encodeURIComponent(profileId)}`
        : "http://localhost:5050/start_camera";
      const res = await fetch(endpoint);
      const data = await res.json();
      console.log("Camera start:", data.status || data.error);
    } catch (err) {
      console.error("Camera start error:", err);
    }
  };

  // KamerayÄ± durduran fonksiyon
  const stopCamera = async () => {
    try {
      const res = await fetch("http://localhost:5050/stop_camera");
      const data = await res.json();
      console.log("Camera stop:", data.status || data.error);
    } catch (err) {
      console.error("Camera stop error:", err);
    }
  };

  const restartCameraSafely = async (profileId = "") => {
    const seq = ++cameraRestartSeq.current;
    cameraRestartChain.current = cameraRestartChain.current.then(async () => {
      if (seq !== cameraRestartSeq.current) return;
      await stopCamera();
      if (seq !== cameraRestartSeq.current) return;
      await startCamera(profileId);
    });
    return cameraRestartChain.current;
  };

  const refreshCameraProfiles = async () => {
    try {
      const res = await fetch("http://localhost:5050/camera_profiles");
      if (!res.ok) throw new Error("Camera profiles fetch failed");
      const data = await res.json();
      setCameraProfiles(Array.isArray(data?.profiles) ? data.profiles : []);
      setActiveCameraProfileId(data?.active_profile_id || "");
    } catch (err) {
      console.error("Camera profiles fetch error:", err);
      setCameraProfiles([]);
      setActiveCameraProfileId("");
    }
  };

  const createCameraProfile = async (profileNameInput = "", options = {}) => {
    const profileName = (profileNameInput || window.prompt("Yeni kamera profil adi girin:") || "").trim();
    if (!profileName) return;
    const sourceXmlPath = options?.sourceXmlPath || "";

    try {
      let res = await fetch("http://localhost:5050/camera_profiles/create_from_xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          source_xml_path: sourceXmlPath || undefined,
        }),
      });

      // Backward compatibility: if backend not restarted yet, fallback to old endpoint.
      if (res.status === 404) {
        res = await fetch("http://localhost:5050/camera_profiles/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: profileName }),
        });
      }
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Profil olusturulamadi (HTTP ${res.status})`;
        alert(message);
        return;
      }
      await refreshCameraProfiles();
      const createdProfileId = data?.active_profile_id || "";
      setActiveCameraProfileId(createdProfileId);
      if (createdProfileId) {
        await activateCameraProfile(createdProfileId);
      }
    } catch (err) {
      console.error("Create camera profile error:", err);
      alert(`Profil olusturma hatasi: ${err?.message || "unknown error"}`);
    }
  };

  const activateCameraProfile = async (profileId) => {
    try {
      const res = await fetch("http://localhost:5050/camera_profiles/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Profil aktiflestirilemedi.");
        return;
      }
      await refreshCameraProfiles();
      setActiveCameraProfileId(data?.active_profile_id || profileId);
    } catch (err) {
      console.error("Activate camera profile error:", err);
      alert("Profil aktiflestirme hatasi.");
    }
  };

  const deleteCameraProfile = async (profileId) => {
    if (!profileId) return;
    try {
      const res = await fetch("http://localhost:5050/camera_profiles/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId }),
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        alert(data?.error || `Profil silinemedi (HTTP ${res.status})`);
        return;
      }
      await refreshCameraProfiles();
      setActiveCameraProfileId(data?.active_profile_id || "");
    } catch (err) {
      console.error("Delete camera profile error:", err);
      alert(`Profil silme hatasi: ${err?.message || "unknown error"}`);
    }
  };

  const saveCameraProfileSettings = async (payload) => {
    try {
      const res = await fetch("http://localhost:5050/camera_profiles/update_settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Profil ayarlari kaydedilemedi.");
        return;
      }
      await refreshCameraProfiles();
      alert("Profil ayarlari kaydedildi.");
    } catch (err) {
      console.error("Save camera profile settings error:", err);
      alert("Profil ayar kaydetme hatasi.");
    }
  };

  const refreshTypes = async () => {
    const types = await getTypes();
    setAllTypes(types);

    setRgbiResults([""]);
    setHistogramResults([""]);
    setEdgeResults([""]);
    setMeasurementType(""); 
    setTableRefreshKey(prev => prev + 1);
  };

  /*
  // Backend'den typeNo ve progNo'yu /types endpoint'inden al, ilk kaydÄ± kullan
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const types = await getTypes(); // [{TypeNo, ProgNo, ...}]
        if (!types || types.length === 0) return;

        setAllTypes(types);

        const firstType = types[0];
        const newTypeNo = firstType.TypeNo ?? firstType.type_no;
        const newProgNo = firstType.ProgNo ?? firstType.program_no;
        const newProgName = firstType.ProgName ?? firstType.program_name;

        if (newTypeNo == null || newProgNo == null) {
          console.warn("TypeNo veya ProgNo null geldi:", firstType);
          return;
        }

        if (newTypeNo !== latestTypeNo.current || newProgNo !== latestProgNo.current) {
          await stopCamera(); // KamerayÄ± durdur
          setTypeNo(newTypeNo);
          setProgNo(newProgNo);
          setProgName(newProgName)

          await startCamera(); // KamerayÄ± tekrar baÅŸlat
          console.log("typeNo/progNo deÄŸiÅŸti, kamera restart edildi:", newTypeNo, newProgNo);
        }
      } catch (err) {
        console.error("Type fetch error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);
  */

  // Ä°lk aÃ§Ä±lÄ±ÅŸta typeNo/progNo'yu backend'den al
  useEffect(() => {
    const init = async () => {
      try {
        await refreshCameraProfiles();
        const types = await getTypes(); // [{TypeNo, ProgNo, ...}]
        if (!types || types.length === 0) return;

        setAllTypes(types);

        const firstType = types[0];
        const newTypeNo = firstType.TypeNo ?? firstType.type_no;
        const newProgNo = firstType.ProgNo ?? firstType.program_no;
        const newProgName = firstType.ProgName ?? firstType.program_name;

        if (newTypeNo == null || newProgNo == null) {
          console.warn("TypeNo veya ProgNo null geldi:", firstType);
          return;
        }

        setTypeNo(newTypeNo);
        setProgNo(newProgNo);
        setProgName(newProgName);

        await restartCameraSafely();
        console.log("Ä°lk init yapÄ±ldÄ±, kamera restart edildi:", newTypeNo, newProgNo);
      } catch (err) {
        console.error("Type fetch error:", err);
      }
    };

    init();
  }, []);

  // PoligonlarÄ± DB'den yÃ¼kle
  useEffect(() => {
    const init = async () => {
      if (typeNo !== null && progNo !== null) {
        let loaded;
        if (typeNo !== prevTypeNo || progNo !== prevProgNo) {
          loaded = await loadPolygonsFromDB(typeNo, progNo);
          setPrevTypeNo(typeNo);
          setPrevProgNo(progNo);
          setPrevProgName(progName);
        } else {
          loaded = await loadPolygonsFromDB(typeNo, progNo);
        }
        setPolygons(loaded);
        // setMlPolygons(loaded.map(p => ({ ...p, okNok: false })));
      }
    };
    init();
  }, [typeNo, progNo, progName]);

  useEffect(() => {
    if (!polygons.length) {
      if (focusedId !== null) setFocusedId(null);
      return;
    }
    const hasFocused = polygons.some((p) => p.id === focusedId);
    if (!hasFocused) {
      setFocusedId(polygons[0].id);
    }
  }, [polygons, focusedId]);


  const getFormattedDateTime = () => {
    const now = new Date();

    const pad = (n, z = 2) => String(n).padStart(z, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
          `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
  };

  const getFormattedTime = () => {
    const now = new Date();

    const pad = (n, z = 2) => String(n).padStart(z, '0');

    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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
  

  // Ray-casting algoritmasÄ± ile noktanÄ±n poligon iÃ§inde olup olmadÄ±ÄŸÄ±nÄ± kontrol eden fonksiyon
  const isPointInPolygon = (point, polygon) => {
    const { x, y } = point;
    let inside = false;
    const points = polygon.points; // polygon nesnesinden points alÄ±yoruz

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;

      const intersect = ((yi > y) !== (yj > y)) &&
                        (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  };

  // Click event handler
  const handleClick = (e) => {
    const container = document.getElementById("camera-container");
    const rect = container.getBoundingClientRect();

    const style = window.getComputedStyle(container);
    const padX = parseFloat(style.paddingLeft || "0");
    const padY = parseFloat(style.paddingTop || "0");
    const clickPoint = {
      x: (e.clientX - rect.left - padX - cameraOffset.x) / scale,
      y: (e.clientY - rect.top - padY - cameraOffset.y) / scale,
    };
    
    // Burada sadece polygon nesnesini gÃ¶nderiyoruz
    const foundPolygon = polygons.find(polygon =>
      isPointInPolygon(clickPoint, polygon)
    );

    if (foundPolygon) {
      setFocusedId(foundPolygon.id);
    } else {
      setFocusedId(null);
    }
  };

  const deleteFocusedPolygon = async () => {
    if (focusedId !== null) {
      try {
        // Poligonu frontend'de filtrele ve id'leri yeniden sÄ±rala
        const updatedPolygons = polygons
          .filter(p => p.id !== focusedId)
          .map((p, index) => ({ ...p, id: index + 1 }));

        setPolygons(updatedPolygons);
        setFocusedId(null);

        // Backend'e sadece tÃ¼m gÃ¼ncel polygons listesini gÃ¶nder
        await savePolygonsToDB(updatedPolygons);

      } catch (err) {
        console.error("Polygon silinirken hata oluÅŸtu:", err);
        alert("Polygon silinemedi.");
      }
    }
  };

  const savePolygonsToDB = async (overridePolygons = polygons, options = {}) => {
    const { silent = false } = options;
    try {
      const payload = {
        typeNo,
        progNo,
        polygons: overridePolygons
      };

      const response = await fetch('http://localhost:5050/update-polygons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('DB update failed');

      if (!silent) alert("Polygons updated in database!");
      /*
      setMlPolygons(prev =>
        polygons.map(newP => {
          const old = prev.find(p => p.id === newP.id);
          return {
            ...newP,
            okNok: old ? old.okNok : false, // varsa koru, yoksa false ata
          };
        })
      );
      */
      // console.log("ML POLY: ", mlPolygons)

    } catch (error) {
      console.error("Error updating polygons in DB:", error);
      if (!silent) alert("Failed to update database.");
    }
  };

  const persistPolygonsForRun = async () => {
    await savePolygonsToDB(polygons, { silent: true });
  };
  
  const RGBICalculate = async () =>
    runWithActionBanner("RGBI olcum yapiliyor...", async () => {
    const imageElement = document.getElementById("camera-frame");
    const datetime = getFormattedDateTime();
    if (!imageElement) {
      alert("Kamera gÃ¶rÃ¼ntÃ¼sÃ¼ yok");
      return;
    }

    setMeasurementType("RGBI");

    await persistPolygonsForRun();

    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');

    const results = await sendPolygonsToCalculateRgbi({
      typeNo,
      progNo,
      setRgbiResults, 
      imageDataUrl,
      datetime,
    });
    console.log("SÃ–YLE",results)

    const updatedPolygons = updatePolygonsWithStatus(polygons, results);
    setPolygons(updatedPolygons)

    SaveFrameWithPolygons(typeNo, progNo, updatedPolygons, "rgbi", imageDataUrl, datetime);
    });


  const MLPreProc = async () => {
    try {
      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera gÃ¶rÃ¼ntÃ¼sÃ¼ yok");
        return;
      }

      const datetime = getFormattedDateTime();

      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');

      const preProcResponse = await fetch("http://localhost:5050/pre_proc_ml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mlPolygons,
          image: imageDataUrl
        })
      });

      if (!preProcResponse.ok) {
        throw new Error(`Pre-processing failed: ${preProcResponse.statusText}`);
      }

      const results = await preProcResponse.json();
      console.log("ML Results:", results);

      const saveResponse = await fetch("http://localhost:5050/save_ml_pre_proc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          dateTime: datetime,
          results
        })
      });

      if (!saveResponse.ok) {
        throw new Error(`Save ML pre-process failed: ${saveResponse.statusText}`);
      }

      console.log("ML Processing OK âœ…");

    } catch (err) {
      console.error("MLPreProc error:", err);
    }
  };


  const MLTest = async () => {
    try {
      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera gÃ¶rÃ¼ntÃ¼sÃ¼ yok");
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width || imageElement.videoWidth;
      canvas.height = imageElement.height || imageElement.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');

      // Pre-processing
      const preProcResponse = await fetch("http://localhost:5050/pre_proc_ml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mlPolygons,
          image: imageDataUrl
        })
      });
      const preProcData = await preProcResponse.json();

      // Her tool iÃ§in sadece kendi feature'larÄ± ile tahmin
      const toolIds = [1, 2, 3, 4];  // Mevcut tool IDâ€™ler
      const results = {};

      for (let toolId of toolIds) {
        // Sadece bu toolIdâ€™ye ait polygonlarÄ±n featureâ€™larÄ±
        console.log("hoha", preProcData)
        const toolFeatures = preProcData
          .filter(p => p.id === toolId)
          .map(p => p.features);

        if (toolFeatures.length === 0) continue; // polygon yoksa atla
        console.log(toolFeatures)

        const predictResponse = await fetch("http://localhost:5050/predict_ml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeNo,
            progNo,
            toolId,
            features: toolFeatures
          })
        });

        const predictData = await predictResponse.json();
        results[toolId] = predictData.predictions;
      }

      console.log("Tool bazlÄ± tahminler:", results);
      alert("Tahminler alÄ±ndÄ±, console.log'dan gÃ¶rebilirsiniz.");

    } catch (err) {
      console.error("Hata:", err);
      alert("Tahmin sÄ±rasÄ±nda hata oluÅŸtu: " + err.message);
    }
  };

  const updatePolygonsWithStatus = (polygons, rgbiResults) => {
    return polygons.map(polygon => {
      const matchedResult = rgbiResults.find(r => Number(r.id) === Number(polygon.id));
      return matchedResult
        ? { ...polygon, status: matchedResult.status }
        : { ...polygon, status: "empty" }; 
    });
  };

  const captureFrameImageData = (imageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL("image/jpeg");
    return { imageData, imageDataUrl, width: canvas.width, height: canvas.height };
  };

  const computeEdgeDensityInPolygon = (imageData, width, height, polygon, gradThreshold = 36) => {
    if (!polygon?.points?.length) return 0;

    const points = polygon.points;
    const xs = points.map((p) => Math.round(p.x));
    const ys = points.map((p) => Math.round(p.y));

    const minX = Math.max(1, Math.min(...xs));
    const maxX = Math.min(width - 2, Math.max(...xs));
    const minY = Math.max(1, Math.min(...ys));
    const maxY = Math.min(height - 2, Math.max(...ys));

    if (minX >= maxX || minY >= maxY) return 0;

    const data = imageData.data;
    const grayAt = (x, y) => {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    let total = 0;
    let edgeCount = 0;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (!isPointInPolygon({ x, y }, polygon)) continue;
        total += 1;

        const gx = grayAt(x + 1, y) - grayAt(x - 1, y);
        const gy = grayAt(x, y + 1) - grayAt(x, y - 1);
        const mag = Math.abs(gx) + Math.abs(gy);
        if (mag >= gradThreshold) edgeCount += 1;
      }
    }

    if (total === 0) return 0;
    return edgeCount / total;
  };

  const resetPolygonPosition = (polygonId) => {
    setPolygons((prevPolygons) =>
      prevPolygons.map((polygon) => {
        if (polygon.id !== polygonId) return polygon;

        const points = polygon.points;
        if (points.length === 0) return polygon;

        // Ä°lk noktayÄ± baz alarak kaydÄ±rma miktarÄ± hesapla
        const dx = points[0].x;
        const dy = points[0].y;

        // BÃ¼tÃ¼n noktalarÄ± orijine (Ã¶rneÄŸin x=10, y=10) taÅŸÄ±
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

  const RGBITeach = async () =>
    runWithActionBanner("RGBI teach yapiliyor...", async () => {
    await persistPolygonsForRun();
    const imageElement = document.getElementById("camera-frame");
    await TeachTheMeasurement(typeNo, progNo, imageElement, setTolerance, polygons);
    });

  const fetchPolygonsFromDB = async (typeNo, progNo) => {
    const res = await fetch(`http://localhost:5050/tools_by_typeprog?typeNo=${typeNo}&progNo=${progNo}`);
    if (!res.ok) throw new Error("Poligonlar Ã§ekilemedi.");
    return await res.json();
  };

  /*
  const sendPolygonsToCalculateHistogram = async ({ typeNo, progNo, polygons, imageElement, datetimeStr }) => {
    try {
      if (!typeNo || !progNo || !imageElement) {
        alert("Eksik bilgi!");
        return;
      }

      // Teach histogramlarÄ± al
      const teachHistogramsResp = await fetch(`http://localhost:5050/get_histograms?typeNo=${typeNo}&progNo=${progNo}`);
      const teachHistograms = await teachHistogramsResp.json(); // [{toolId, histogram:{r,g,b}}]

      if (!teachHistograms || teachHistograms.length === 0) {
        alert("Teach histogram verisi alÄ±namadÄ±.");
        return;
      }

      // GÃ¶rÃ¼ntÃ¼yÃ¼ al
      const canvas = document.createElement("canvas");
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg");

      // Ã–ncelikle fotoÄŸrafÄ± kaydet
      const saveResponse = await fetch("http://localhost:5050/save_frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          measureType: "hist",
          datetimeStr,   // burada gÃ¶nderiyoruz
          image: imageDataUrl,
        }),
      });

      if (!saveResponse.ok) {
        alert("FotoÄŸraf kaydetme baÅŸarÄ±sÄ±z.");
        return;
      }

      const saveData = await saveResponse.json();
      console.log("FotoÄŸraf kaydedildi:", saveData.filename);

      // Measure API'ye gÃ¶nder
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
        alert("Ã–lÃ§Ã¼m yapÄ±lamadÄ±.");
        return;
      }

      const result = await response.json();
      console.log("Measure Histogram Results:", result);
      return result;

    } catch (err) {
      console.error("Measurement failed:", err);
      alert("Histogram Ã¶lÃ§Ã¼m hatasÄ±.");
    }
  };
  */

  const TeachTheMeasurement = async (typeNo, progNo, imageElement, setTolerance, polygons) => {
    try {
      if (!imageElement) {
        alert("Kamera gÃ¶rÃ¼ntÃ¼sÃ¼ bulunamadÄ±.");
        return;
      }

      let allResults = [];

      for (let i = 0; i < 10; i++) {
        const result = await captureSingleMeasurement(imageElement, polygons);
        allResults.push(result);
        await new Promise(res => setTimeout(res, 200));
      }
console.log("LAAAANANANANANANANA", polygons)
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
      console.log("LAAAANANANANANANANA", polygons)

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
          tole_r: tol_r,
          tole_g: tol_g,
          tole_b: tol_b,
          tole_i: tol_i,
        };
      });
      

      setTolerance(toleranceLimits);

      // ğŸ” DB'ye kaydet
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
        console.error("âŒ RGBI kayÄ±t hatasÄ±:", errText);
        alert("RGBI kayÄ±t hatasÄ±!");
      } else {
        alert("Teaching ve RGBI kayÄ±t iÅŸlemi tamamlandÄ±!");
      }

    } catch (err) {
      console.error("Teach failed:", err);
      alert("Teaching failed.");
    }
  };


  const TeachTheHist = async (typeNo, progNo, imageElement, setHistTolerance, polygons) => {
    try {
      if (!imageElement) {
        alert("Kamera gÃ¶rÃ¼ntÃ¼sÃ¼ bulunamadÄ±.");
        return;
      }

      // Polygon baÅŸÄ±na averagedResults oluÅŸtur (RGBI gibi deÄŸil sadece tolerance iÃ§in)
      const toleranceLimits = polygons.map(poly => ({
        id: poly.id,
        hist_tol: poly?.hist_tolerance ?? 0.1, // default 0.1
      }));

      setHistTolerance(toleranceLimits.reduce((acc, cur) => {
        acc[cur.id] = cur.hist_tol;
        return acc;
      }, {}));

      // ğŸ” DB'ye kaydet
      const saveResponse = await fetch("http://localhost:5050/save_hist", {
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
        console.error("âŒ HIST kayÄ±t hatasÄ±:", errText);
        alert("HIST kayÄ±t hatasÄ±!");
      } else {
        alert("Teaching ve histogram toleranslarÄ± baÅŸarÄ±yla kaydedildi!");
      }

    } catch (err) {
      console.error("Teach failed:", err);
      alert("Teaching failed.");
    }
  };


  const HistCalculate = async () =>
    runWithActionBanner("Histogram olcum yapiliyor...", async () => {
      const imageElement = document.getElementById("camera-frame");
      const datetime = getFormattedDateTime();
      if (!imageElement) {
        alert("Kamera goruntusu yok");
        return;
      }

      setMeasurementType("HIST");
      await persistPolygonsForRun();

      const canvas = document.createElement("canvas");
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg");

      const results = await sendPolygonsToCalculateHistogram({
        typeNo,
        progNo,
        setHistogramResults,
        imageDataUrl,
        datetime,
      });
      console.log("Histogram Results:", results);

      const updatedPolygons = updatePolygonsWithStatus(polygons, results);
      setPolygons(updatedPolygons);
      SaveFrameWithPolygons(typeNo, progNo, updatedPolygons, "histogram", imageDataUrl, datetime);
    });

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
        alert("Teach iÅŸlemi baÅŸarÄ±sÄ±z oldu.");
        return;
      }

      const result = await response.json();
      console.log("Teach Histogram Sonucu:", result);

      // Gelen tÃ¼m histogramlarÄ± save_histogram'a yolla
      for (const item of result.histograms) {
        const poly = polygons.find(p => p.id === item.toolId);
        //const histTolerance = poly?.hist_tolerance ?? 0.1; // Polygonâ€™dan al, yoksa default

        const saveResponse = await fetch("http://localhost:5050/save_histogram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeNo,
            progNo,
            toolId: item.toolId,
            histogram: item.histogram,
            //histTolerance, // âœ… burayÄ± ekledik
          }),
        });

        if (!saveResponse.ok) {
          console.error("âŒ Histogram kaydedilemedi:", await saveResponse.text());
        }
      }

      alert("Teach ve kayÄ±t iÅŸlemleri baÅŸarÄ±yla tamamlandÄ±!");

    } catch (error) {
      console.error("Teach histogram failed:", error);
      alert("Teach histogram failed.");
    }
  };



  const HistTeach = async () =>
    runWithActionBanner("Histogram teach yapiliyor...", async () => {
    await persistPolygonsForRun();
    const imageElement = document.getElementById("camera-frame");
    if (!imageElement) {
      alert("Kamera gÃ¶rÃ¼ntÃ¼sÃ¼ yok");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');


    const polygonsWithTolerance = polygons.map(p => ({
      ...p,
      hist_tolerance: p.hist_tolerance ?? 0.1, // default 0.1
    }));


    await sendPolygonsToTeachHistogram({
      typeNo,
      progNo,
      polygons: polygonsWithTolerance,
      image: imageDataUrl,
    });

    await TeachTheHist(typeNo, progNo, imageElement, setHistTolerance, polygonsWithTolerance);
    });

  const shiftAllPolygonsBy = (dx, dy) => {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (dx === 0 && dy === 0) return;

    setPolygons((prevPolygons) =>
      prevPolygons.map((polygon) => ({
        ...polygon,
        points: (polygon.points || []).map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        })),
      }))
    );
  };

  const EdgeTeach = async () =>
    runWithActionBanner("Edge teach yapiliyor...", async () => {
      await persistPolygonsForRun();
      const imageElement = document.getElementById("camera-frame");
      if (!imageElement) {
        alert("Kamera goruntusu yok");
        return;
      }

      setMeasurementType("EDGE");
      const { imageDataUrl } = captureFrameImageData(imageElement);
      const polygonsWithDefaults = polygons.map((poly) => ({
        ...poly,
        edge_tolerance: poly.edge_tolerance ?? 1.0,
        edge_pattern_threshold: poly.edge_pattern_threshold ?? 120,
      }));

      const res = await fetch("http://localhost:5050/teach_edge_pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polygons: polygonsWithDefaults,
          image: imageDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Edge pattern teach basarisiz.");
        return;
      }

      const taughtRows = (data?.taught || []).filter((item) => item && !item.error && Array.isArray(item.edge_pattern_hu) && item.edge_pattern_hu.length > 0);
      if (!taughtRows.length) {
        alert("EDGE teach kaydi olusmadi. Threshold ayarini degistirip sekil algilanana kadar tekrar teach yapin.");
        return;
      }

      const taughtMap = new Map(taughtRows.map((item) => [Number(item.id), item]));
      const updatedPolygons = polygonsWithDefaults.map((poly) => {
        const taught = taughtMap.get(Number(poly.id));
        if (!taught || taught.error) return poly;
        return {
          ...poly,
          edge_pattern_hu: taught.edge_pattern_hu || [],
          edge_pattern_area: taught.edge_pattern_area || 0,
          edge_pattern_threshold: taught.edge_pattern_threshold ?? poly.edge_pattern_threshold ?? 120,
        };
      });

      setPolygons(updatedPolygons);
      const saveTeachRes = await fetch("http://localhost:5050/save_edge_pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          patterns: updatedPolygons
            .filter((p) => Array.isArray(p.edge_pattern_hu) && p.edge_pattern_hu.length > 0)
            .map((p) => ({
              id: p.id,
              edge_pattern_hu: p.edge_pattern_hu,
              edge_pattern_area: p.edge_pattern_area ?? 0,
              edge_pattern_threshold: p.edge_pattern_threshold ?? 120,
              edge_tolerance: p.edge_tolerance ?? 1.0,
            })),
        }),
      });
      if (!saveTeachRes.ok) {
        const saveTeachData = await saveTeachRes.json().catch(() => ({}));
        alert(saveTeachData?.error || "EDGE teach DB kaydi basarisiz.");
        return;
      }
      await savePolygonsToDB(updatedPolygons);
      alert("EDGE pattern teach tamamlandi.");
    });

  const runEdgePatternDetection = async ({ persistOutputs = false } = {}) => {
    const imageElement = document.getElementById("camera-frame");
    if (!imageElement) {
      return { ok: false, reason: "no_image" };
    }

    const datetime = getFormattedDateTime();
    const { imageDataUrl } = captureFrameImageData(imageElement);

    const edgeTeachRes = await fetch(`http://localhost:5050/get_edge_pattern_teach?typeNo=${typeNo}&progNo=${progNo}`);
    const edgeTeachData = await edgeTeachRes.json();
    if (!edgeTeachRes.ok) {
      return { ok: false, reason: edgeTeachData?.error || "teach_read_error" };
    }
    const teachMap = new Map((Array.isArray(edgeTeachData) ? edgeTeachData : []).map((row) => [Number(row.toolId), row]));
    if (!teachMap.size) {
      return { ok: false, reason: "teach_missing" };
    }

    const polygonsWithDefaults = polygons.map((poly) => ({
      ...poly,
      edge_tolerance: teachMap.get(Number(poly.id))?.edge_tolerance ?? poly.edge_tolerance ?? 1.0,
      edge_pattern_threshold: teachMap.get(Number(poly.id))?.edge_pattern_threshold ?? poly.edge_pattern_threshold ?? 120,
      edge_pattern_hu: teachMap.get(Number(poly.id))?.edge_pattern_hu ?? poly.edge_pattern_hu ?? [],
      edge_pattern_area: teachMap.get(Number(poly.id))?.edge_pattern_area ?? poly.edge_pattern_area ?? 0,
    }));

    const edgeRes = await fetch("http://localhost:5050/measure_edge_pattern", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polygons: polygonsWithDefaults,
        image: imageDataUrl,
      }),
    });
    const edgeData = await edgeRes.json();
    if (!edgeRes.ok) {
      return { ok: false, reason: edgeData?.error || "measure_error" };
    }

    const results = Array.isArray(edgeData?.results) ? edgeData.results : [];
    setEdgeResults(results);
    const resultMap = new Map(results.map((r) => [Number(r.id), r]));
    const updatedPolygons = polygonsWithDefaults.map((poly) => {
      const row = resultMap.get(Number(poly.id));
      return {
        ...poly,
        status: row?.status || "empty",
        detected_points: Array.isArray(row?.detections?.[0]?.points) ? row.detections[0].points : [],
      };
    });
    setPolygons(updatedPolygons);

    if (persistOutputs) {
      await savePolygonsToDB(updatedPolygons, { silent: true });
      await fetch("http://localhost:5050/save_txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
          measureType: "edge",
          image: imageDataUrl,
          datetime,
          results,
        }),
      });

      const overallResult = results.every((r) => r.status === "OK") ? "OK" : "NOK";
      await fetch("http://localhost:5050/save_results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TypeNo: typeNo,
          ProgNo: progNo,
          MeasType: "EDGE",
          Barcode: "1",
          ToolCount: results.length,
          Result: overallResult,
          DateTime: datetime,
        }),
      });

      SaveFrameWithPolygons(typeNo, progNo, updatedPolygons, "edge", imageDataUrl, datetime);
    }

    return { ok: true, results };
  };

  const EdgeCalculate = async () =>
    runWithActionBanner("Edge olcum yapiliyor...", async () => {
      setMeasurementType("EDGE");
      const detected = await runEdgePatternDetection({ persistOutputs: true });
      if (!detected.ok) {
        if (detected.reason === "teach_missing") {
          alert("EDGE pattern teach bulunamadi. Once EDGE teach yapin.");
          return;
        }
        alert("EDGE olcum basarisiz.");
        return;
      }
      alert("EDGE tespiti tamamlandi. Sonuclari Auto sayfasindan gorebilirsiniz.");
    });

  useEffect(() => {
    if (!edgePreviewEnabled) return;
    if (measurementType !== "EDGE") return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || edgePreviewBusyRef.current) return;
      edgePreviewBusyRef.current = true;
      try {
        await runEdgePatternDetection({ persistOutputs: false });
      } catch (err) {
        console.error("EDGE preview error:", err);
      } finally {
        edgePreviewBusyRef.current = false;
      }
    };

    tick();
    const intervalId = setInterval(tick, 900);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [edgePreviewEnabled, measurementType, polygons, typeNo, progNo]);

  const MLTeach = async () => {
    try {
      const response = await fetch("http://localhost:5050/teach_ml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeNo,
          progNo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("âœ… ML modeller baÅŸarÄ±yla eÄŸitildi:", data.results);
        alert("âœ… ML modeller baÅŸarÄ±yla eÄŸitildi!");
      } else {
        console.error("âŒ ML eÄŸitiminde hata:", data.error);
        alert("âŒ ML eÄŸitiminde hata: " + data.error);
      }
    } catch (err) {
      console.error("âŒ Sunucuya baÄŸlanÄ±rken hata oluÅŸtu:", err);
      alert("âŒ Sunucuya baÄŸlanÄ±rken hata oluÅŸtu: " + err.message);
    }
  };

  const measureFuncs = {
    rgb: RGBICalculate,// MLTest, //MLPreProc,
    hist: HistCalculate, //MLPreProc, //HistCalculate
    edge: EdgeCalculate,
  };

  const teachFuncs = {
    rgb: RGBITeach, //MLTeach
    hist: HistTeach,
    edge: EdgeTeach,
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
            refreshKey={tableRefreshKey}
            timeLog={getFormattedTime()}
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
            refreshKey={tableRefreshKey}
            timeLog={getFormattedTime()}
          />
        );
      case "EDGE":
        return (
          <MeasurementResultTable
            title="EDGE RESULTS"
            columns={["ID", "Found", "Count", "Score", "Tolerance", "Status"]}
            data={edgeResults.map(r => ({
              id: r.id,
              found: String(r.found),
              count: r.count ?? 0,
              score: r.score,
              tolerance: r.tolerance,
              status: r.status,
            }))}
            refreshKey={tableRefreshKey}
            timeLog={getFormattedTime()}
          />
        );
      default:
        return (
          <MeasurementResultTable
            title="MEASUREMENT RESULTS"
            columns={["-", "-", "-", "-", "-", "-"]}
            data={[]}
          />
        );
    }
  };
  const selectedPolygon = polygons.find((p) => p.id === focusedId);
  const edgeDetectionShapes = measurementType === "EDGE"
    ? edgeResults.flatMap((row) =>
        Array.isArray(row?.detections)
          ? row.detections.map((d) => ({ points: d.points || [] }))
          : []
      )
    : [];
  const hideBasePolygons = measurementType === "EDGE" && edgePreviewEnabled;

  return (
      <section className="relative h-[calc(100vh-4rem)] mt-16 px-3 md:px-4 py-3 bg-slate-950 text-slate-100 overflow-hidden">
        {actionBanner.visible && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-[140] -translate-x-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-slate-900/95 px-4 py-2 text-sm font-medium text-sky-100 shadow-lg">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-300/40 border-t-sky-200" />
              <span>{actionBanner.text}</span>
            </div>
          </div>
        )}
        <div className="h-full min-h-0 grid grid-rows-[minmax(0,1.8fr)_minmax(0,1fr)] gap-3">
        <div className="grid gap-3 min-h-0 xl:grid-cols-[minmax(0,1fr)_520px] 2xl:grid-cols-[minmax(0,1fr)_560px]">
          <div
          ref={cameraContainerRef}
          id="camera-container"
          className="relative w-full h-full min-h-0 rounded-3xl border border-slate-700/60 bg-slate-900/80 p-3 md:p-4 shadow-xl overflow-hidden"
          onClick={handleClick}
        >
          <Camera
            typeNo={typeNo}
            progNo={progNo}
            polygons={polygons}
            focusedId={focusedId}
            onPolygonUpdate={handlePolygonUpdate}
            onRoiShift={shiftAllPolygonsBy}
            cropMode={cropMode}
            offset={cameraOffset}
            setOffset={setCameraOffset}
            scale={scale}
            setScale={setScale}
            hidePolygons={hideBasePolygons}
            edgeDetections={edgeDetectionShapes}
          />

          <div className="pointer-events-none absolute left-6 bottom-6 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
            Active Tool: {selectedPolygon ? `#${selectedPolygon.id}` : "-"} | Total: {polygons.length} | Scale: {scale.toFixed(2)}x
          </div>

        </div>
        <ControlPanel
          typeNo={typeNo}
          progNo={progNo}
          progName={progName}
          allTypes={allTypes}
          onAdd={addPolygon}
          onDelete={deleteFocusedPolygon}
          onSave={savePolygonsToDB}
          onCalculate={measureFuncs}
          onTeach={teachFuncs}
          refreshTypes={refreshTypes}
          setMeasurementType={setMeasurementType}
          cameraProfiles={cameraProfiles}
          activeCameraProfileId={activeCameraProfileId}
          onRefreshCameraProfiles={refreshCameraProfiles}
          onCreateCameraProfile={createCameraProfile}
          onActivateCameraProfile={activateCameraProfile}
          onDeleteCameraProfile={deleteCameraProfile}
          onSaveCameraProfileSettings={saveCameraProfileSettings}
          onCropModeToggle={() => setCropMode(prev => !prev)}
          edgePreviewEnabled={edgePreviewEnabled}
          onEdgePreviewToggle={() => {
            setMeasurementType("EDGE");
            setEdgePreviewEnabled((prev) => !prev);
          }}
          onTypeProgramChange={async (newTypeNo, newProgNo, newProgName) => {
          setTypeNo(newTypeNo);
          setProgNo(newProgNo);
          setProgName(newProgName);

          await refreshTypes();

          await restartCameraSafely();
          console.log("Type/Prog changed:", newTypeNo, newProgNo, newProgName);
        }}
        />
      </div>
      <div className="grid min-h-0 gap-3 md:grid-cols-2">

        <ToolParameters
          polygons={polygons}
          setPolygons={setPolygons}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          resetPolygonPosition={resetPolygonPosition}
          measurementType={measurementType}
        />

        {renderMeasurementTable()}

      </div>
      </div>

    </section>
  );
};

