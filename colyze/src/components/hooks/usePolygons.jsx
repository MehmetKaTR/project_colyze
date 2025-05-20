import { useState, useEffect, useRef } from "react";
import { loadPolygonsFromCSV, getTypeProgNO } from "../Flask";

export default function usePolygons(cameraContainerRef) {
  const [typeNo, setTypeNo] = useState(null);
  const [progNo, setProgNo] = useState(null);
  const [prevTypeNo, setPrevTypeNo] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [focusedId, setFocusedId] = useState(null);

  // Düzenli aralıklarla typeNo kontrolü
  useEffect(() => {
    const interval = setInterval(async () => {
      const newTypeNo = await getTypeProgNO();
      if (newTypeNo !== null && newTypeNo !== typeNo) {
        setTypeNo(newTypeNo);
        console.log("typeNo değişti:", newTypeNo);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [typeNo]);

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
  }, [typeNo, prevTypeNo]);

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
    setPolygons((prevPolygons) =>
      prevPolygons.map((polygon) =>
        polygon.id === id ? { ...polygon, points: newPoints } : polygon
      )
    );
  };

  const calculatePolygonCenter = (polygon) => {
    const x = polygon.points.reduce((sum, p) => sum + p.x, 0) / polygon.points.length;
    const y = polygon.points.reduce((sum, p) => sum + p.y, 0) / polygon.points.length;
    return { x, y };
  };

  const calculateDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const isPointInPolygon = (point, polygon) => {
    let x = point.x,
      y = point.y;
    let inside = false;

    for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
      let xi = polygon.points[i].x,
        yi = polygon.points[i].y;
      let xj = polygon.points[j].x,
        yj = polygon.points[j].y;

      let intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  };

  const handleClick = (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;
    const clickPoint = { x: clickX, y: clickY };

    let closestPolygon = null;
    let minDistance = Infinity;

    polygons.forEach((polygon) => {
      if (isPointInPolygon(clickPoint, polygon)) {
        closestPolygon = polygon;
        return;
      }

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
      setPolygons((prevPolygons) =>
        prevPolygons.filter((p) => p.id !== focusedId)
      );
      setFocusedId(null);
    }
  };

  const resetPolygonPosition = (polygonId) => {
    setPolygons((prevPolygons) =>
      prevPolygons.map((polygon) => {
        if (polygon.id !== polygonId) return polygon;

        const points = polygon.points;
        if (points.length === 0) return polygon;

        const dx = points[0].x;
        const dy = points[0].y;

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

  // Diğer işlemler, örn. CSV'ye kaydetme fonksiyonları da buraya eklenebilir

  return {
    polygons,
    focusedId,
    addPolygon,
    handlePolygonUpdate,
    handleClick,
    deleteFocusedPolygon,
    resetPolygonPosition,
    setFocusedId,
    typeNo,
    progNo,
    setProgNo,
  };
}
