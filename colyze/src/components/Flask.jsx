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

// Flask.js
export const getTypeProgNO = async () => {
  try {
    const response = await fetch('http://localhost:5050/get_type', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to get type');

    const data = await response.json();
    const newTypeNo = data[0]?.type_no;

    return newTypeNo;
  } catch (error) {
    console.error('Hata:', error.message);
    return null;
  }
};
