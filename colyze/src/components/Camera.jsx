import React, { useEffect, useState, useRef } from 'react';
import Polygon from './Polygon'; // Polygon bileşeni içeri aktarılmalı

const Camera = ({ polygons, focusedId, onPolygonUpdate }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.buttons === 3) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && containerRef.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      const newX = lastOffset.current.x + dx;
      const newY = lastOffset.current.y + dy;

      const container = containerRef.current;
      const maxX = 0;
      const maxY = 0;
      const minX = container.offsetWidth - imageSize.width;
      const minY = container.offsetHeight - imageSize.height;

      setOffset({
        x: Math.min(Math.max(newX, minX), maxX),
        y: Math.min(Math.max(newY, minY), maxY),
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      lastOffset.current = offset;
    }
  };

  const fetchImage = async () => {
    try {
      const response = await fetch(`http://localhost:5050/live_camera?width=1920&height=1080`);
      const data = await response.json();
      if (data.image) {
        setImageSrc(data.image);
      }
    } catch (error) {
      console.error('Görüntü alınamadı:', error);
    }
  };

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
    }
  }, [imageSrc]);

  useEffect(() => {
    fetchImage();
    intervalRef.current = setInterval(fetchImage, 500);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Görüntü ve poligonlar aynı kapsayıcıda, birlikte hareket eder */}
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`
        }}
      >
        {imageSrc && (
          <img
            id="camera-frame"
            src={imageSrc}
            alt="camera"
            className="select-none"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        )}

        {/* Poligonlar */}
        {polygons.map((polygon, index) => {
          const polygonId = isNaN(polygon.id) ? `polygon-${index}` : polygon.id;
          return (
            <Polygon
              key={polygonId}
              polygon={{ ...polygon, focused: polygon.id === focusedId }}
              onUpdate={onPolygonUpdate}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Camera;
