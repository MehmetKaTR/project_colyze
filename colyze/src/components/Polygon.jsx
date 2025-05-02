import React, { useState } from "react";

const Polygon = ({ polygon, onClick, onUpdate }) => {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [draggingPolygon, setDraggingPolygon] = useState(false);

  const handleMouseDown = (e, index) => {
    if (e.button === 2) {
      e.preventDefault();
      if (typeof index === 'number') {
        setDraggingIndex(index); // nokta drag
      } else if (polygon.focused) {
        setDraggingPolygon(true); // tüm shape drag
      }
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

  const handleAddPoint = (e) => {
    if (e.shiftKey && e.button === 0 && polygon.focused) {
      const rect = e.target.getBoundingClientRect();
      const newPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      const newPoints = [...polygon.points, newPoint];
      onUpdate(polygon.id, newPoints);
    }
  };

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
        handleAddPoint(e); // Shift+click için
      }}
    >
      <polygon points={pointString} fill={polygon.focused ? "rgba(0,0,255,0.4)" : "transparent"} stroke="white" strokeWidth="2" />
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
