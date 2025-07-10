// Flask.jsx
export const loadPolygonsFromCSV = async (typeNo) => {
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
          polygonPoints.push({ x, y });
        }
        return { id: parseInt(id), points: polygonPoints };
      }
      return null;
    }).filter(Boolean);

    return loadedPolygons;
  } catch (error) {
    console.error('CSV yüklenirken hata:', error.message);
    return [];
  }
};


export const loadTypeToPolygons = async (typeNo) => {
  try {
    const response = await fetch('http://localhost:5050/save-polygons-to-type-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeNo }),
    });

    const result = await response.json();
    return response.ok;
  } catch (error) {
    console.error("Kopyalama hatası:", error.message);
    return false;
  }
};


export const getTypeProgNO = async () => {
  try {
    const response = await fetch('http://localhost:5050/get_type_program', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to get type and program');

    const data = await response.json();
    return {
      typeNo: data.type_no,
      progNo: data.program_no
    };
  } catch (error) {
    console.error('Hata:', error.message);
    return null;
  }
};


export const loadPolygonsFromDB = async (typeNo, progNo) => {
  try {
    const response = await fetch(`http://localhost:5050/tools_by_typeprog?typeNo=${typeNo}&progNo=${progNo}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Hata oluştu");
    return data;
  } catch (error) {
    console.error("Veritabanından poligonlar alınamadı:", error.message);
    return [];
  }
};


const fetchRgbiTeachTolerance = async (typeNo, progNo) => {
  try {
    const res = await fetch(`http://localhost:5050/get_rgbi_teach?typeNo=${typeNo}&progNo=${progNo}`);
    if (!res.ok) {
      alert("RGBI teach verisi çekilemedi.");
      return null;
    }
    const data = await res.json();
    return data; // [{toolId, rMin, rMax, gMin, gMax, bMin, bMax, iMin, iMax}, ...]
  } catch (e) {
    console.error("Teach verisi çekme hatası:", e);
    return null;
  }
};

export const sendPolygonsToCalculateRgbi = async ({
  typeNo,
  progNo,
  setRgbiResults,
  imageDataUrl,
  datetime
}) => {
  try {
    if (typeNo == null || progNo == null) {
      alert("TypeNo veya ProgNo tanımlı değil!");
      return;
    }

    if (!imageDataUrl) {
      alert("Görüntü verisi yok.");
      return;
    }

    // Öncelikle fotoğrafı kaydet
    const saveResponse = await fetch("http://localhost:5050/save_frame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        typeNo, 
        progNo, 
        measureType: "rgbi",  
        image: imageDataUrl,
        datetime: datetime 
      }),
    });

    if (!saveResponse.ok) {
      alert("Fotoğraf kaydetme başarısız.");
      return;
    }

    const saveData = await saveResponse.json();
    console.log("Fotoğraf kaydedildi:", saveData.filename);

    // Backend'den poligonları al
    const polyRes = await fetch(
      `http://localhost:5050/tools_by_typeprog?typeNo=${typeNo}&progNo=${progNo}`
    );
    if (!polyRes.ok) {
      alert("Poligonlar çekilemedi.");
      return;
    }
    const polygons = await polyRes.json();

    // Poligonlar ve görüntüyle RGBI hesaplat
    const response = await fetch("http://localhost:5050/calculate_rgbi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygons, image: imageDataUrl }),
    });

    if (!response.ok) {
      alert("RGBI hesaplama başarısız.");
      return;
    }

    const results = await response.json();

    // Teach tolerans verilerini çek
    const tolerance = await fetchRgbiTeachTolerance(typeNo, progNo);
    if (!tolerance) {
      alert("Teach tolerans verisi alınamadı.");
      return;
    }

    // Gelen sonuçlara tolerans kontrolü uygula
    const checkedResults = results.map((tool) => {
      const tol = tolerance.find((t) => t.toolId === tool.id.toString());
      if (!tol) return { ...tool, status: "NOK" };

      const isOk =
        tool.avg_r >= tol.rMin && tool.avg_r <= tol.rMax &&
        tool.avg_g >= tol.gMin && tool.avg_g <= tol.gMax &&
        tool.avg_b >= tol.bMin && tool.avg_b <= tol.bMax &&
        tool.intensity >= tol.iMin && tool.intensity <= tol.iMax;

      return { ...tool, status: isOk ? "OK" : "NOK" };
    });

    // Sonuçları ekrana yansıt
    setRgbiResults(checkedResults);
    console.log("RGBI Ölçüm Sonuçları:", checkedResults);

    // Genel sonucu belirle (hepsi OK mı?)
    const overallResult = checkedResults.every(t => t.status === "OK") ? "OK" : "NOK";
    const toolCount = checkedResults.length;
    const barcode = "1"; // Sabit barcode değeri (gerekirse dinamik yapılabilir)

    // Sonucu veritabanına kaydet
    await fetch("http://localhost:5050/save_results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TypeNo: typeNo,
        ProgNo: progNo,
        MeasType: "RGBI",
        Barcode: barcode,
        ToolCount: toolCount,
        Result: overallResult,
        DateTime: datetime
      }),
    });

    alert("RGBI ölçümü tamamlandı ve sonuç kaydedildi.");
    return checkedResults
  } catch (err) {
    console.error("RGBI hesaplama hatası:", err);
    alert("RGBI hesaplama başarısız.");
    return []
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


export const SendHistResultToDB = async () => {
  try {
    const response = await fetch('http://localhost:5050/save_results_hist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to get type and program');

    const data = await response.json();
    return {
      typeNo: data.type_no,
      progNo: data.program_no
    };
  } catch (error) {
    console.error('Hata:', error.message);
    return null;
  }
};


export const SaveFrameWithPolygons = async (typeNo, progNo, polygons, imageDataUrl, datetime) => {
  try {
      if (typeNo == null || progNo == null) {
        alert("TypeNo veya ProgNo tanımlı değil!");
        return;
      }

      if (!imageDataUrl) {
        alert("Görüntü verisi yok.");
        return;
      }

      // Öncelikle fotoğrafı kaydet
      const saveResponse = await fetch("http://localhost:5050/save_frame_with_polygons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          typeNo, 
          progNo, 
          measureType: "rgbi",  
          image: imageDataUrl,
          datetime: datetime,
          polygons: polygons 
        }),
      });

      if (!saveResponse.ok) {
        alert("Fotoğraf kaydetme başarısız.");
        return;
      }

      const saveData = await saveResponse.json();
      console.log("Fotoğraf kaydedildi:", saveData.filename);

  }
  catch (err) {
      console.error("RGBI hesaplama hatası:", err);
      alert("RGBI hesaplama başarısız.");
  }
};