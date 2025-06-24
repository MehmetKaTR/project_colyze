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


export const sendPolygonsToCalculateRgbi = async ({typeNo, progNo, tolerance, setRgbiResults, imageDataUrl}) => {
  try {
    if (typeNo == null || progNo == null) {
      alert("TypeNo veya ProgNo tanımlı değil!");
      return;
    }

    if (!imageDataUrl) {
      alert("Görüntü verisi yok.");
      return;
    }

    const polyRes = await fetch(`http://localhost:5050/tools_by_typeprog?typeNo=${typeNo}&progNo=${progNo}`);
    if (!polyRes.ok) {
      alert("Poligonlar çekilemedi.");
      return;
    }
    const polygons = await polyRes.json();

    const result = await fetch('http://localhost:5050/calculate_rgbi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ polygons, image: imageDataUrl }),
    });

    const json = await result.json();

    const checkedResults = json.map(tool => {
      const tol = tolerance?.find(t => t.id === tool.id);
      if (!tol) return { ...tool, status: "NOK" };

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

// 🔁 Tek bir ölçüm al
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



// 🧠 Ana teach fonksiyonu



