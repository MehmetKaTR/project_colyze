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

