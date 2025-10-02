import React, { useState, useEffect } from "react";

const Polygon = ({ polygon, onClick, onUpdate, status, scale }) => {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [draggingPolygon, setDraggingPolygon] = useState(false);
  const [history, setHistory] = useState([]); // Undo için

  const handleMouseDown = (e, index) => {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Sağ tık (taşıma için)
    if (e.button === 2) {
      e.preventDefault();
      if (typeof index === 'number') {
        setDraggingIndex(index);
      } else if (polygon.focused) {
        setDraggingPolygon(true);
      }
    } 
    // Alt + Sol Tık → Nokta sil (mevcut senin kodunda vardı)
    else if (e.button === 0 && e.altKey && polygon.focused) {
      e.preventDefault();
      let closestIndex = null;
      let closestDist = Infinity;
      polygon.points.forEach((p, i) => {
        const dx = p.x - cursorpt.x;
        const dy = p.y - cursorpt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });
      if (closestDist <= 10 && polygon.points.length > 3) {
        setHistory([...history, polygon.points]);
        const newPoints = polygon.points.filter((_, i) => i !== closestIndex);
        onUpdate(polygon.id, newPoints);
      }
    }
    // Ctrl + Sol Tık → En yakın noktayı sil
    else if (e.button === 0 && e.ctrlKey && polygon.focused) {
      e.preventDefault();
      if (polygon.points.length <= 3) return;
      let closestIndex = null;
      let closestDist = Infinity;
      polygon.points.forEach((p, i) => {
        const dx = p.x - cursorpt.x;
        const dy = p.y - cursorpt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });
      if (closestIndex !== null) {
        setHistory([...history, polygon.points]);
        const newPoints = polygon.points.filter((_, i) => i !== closestIndex);
        onUpdate(polygon.id, newPoints);
      }
    }
    // Shift + Sol Tık → Nokta ekle
    else if (e.button === 0 && e.shiftKey && polygon.focused) {
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      const newPoint = {
        x: (e.clientX - rect.left - 16) / scale,
        y: (e.clientY - rect.top - 16) / scale,
      };
      setHistory([...history, polygon.points]);
      const newPoints = [...polygon.points, newPoint];
      onUpdate(polygon.id, newPoints);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
    setDraggingPolygon(false);
  };

  const handleMouseMove = (e) => {
    if (draggingIndex !== null) {
      const newPoints = [...polygon.points];
      newPoints[draggingIndex] = {
        x: newPoints[draggingIndex].x + e.movementX,
        y: newPoints[draggingIndex].y + e.movementY,
      };
      onUpdate(polygon.id, newPoints);
    } else if (draggingPolygon) {
      const newPoints = polygon.points.map(p => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY,
      }));
      onUpdate(polygon.id, newPoints);
    }
  };

  // Ctrl + Z (Undo) listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z' && history.length > 0) {
        const last = history[history.length - 1];
        setHistory(history.slice(0, -1));
        onUpdate(polygon.id, last);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, polygon.id, onUpdate]);

  const pointString = polygon.points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, zIndex: polygon.focused ? 1000 : 1 }}
      width="100%"
      height="100%"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.target.tagName === 'svg' || e.target.tagName === 'polygon') {
          handleMouseDown(e);
        }
      }}
    >
      <polygon points={pointString} fill={
        polygon.focused
          ? "rgba(0,0,255,0.4)" 
          : status === "OK"
            ? "rgb(16, 230, 69)" 
            : status === "NOK"
              ? "rgba(192, 36, 36, 0.86)" 
              : "transparent"
      } stroke="white" strokeWidth="2" />
      {polygon.points.map((p, index) => (
        <circle
          key={index}
          cx={p.x}
          cy={p.y}
          r="6"
          fill="red"
          onMouseDown={(e) => handleMouseDown(e, index)}
        />
      ))}
    </svg>
  );
};

export default Polygon;
