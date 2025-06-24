import React, { useEffect, useState, useRef } from 'react';
import Polygon from './Polygon';
import CropRect from './CropRect';

const Camera = ({ typeNo, progNo, polygons, focusedId, onPolygonUpdate, cropMode }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  const [scale, setScale] = useState(1);
  const MIN_SCALE = 1;
  const MAX_SCALE = 2.5;

  const [cropRect, setCropRect] = useState({ x: 100, y: 100, width: 1485, height: 600 });

  const handleMouseDown = (e) => {
    if (e.ctrlKey && e.button === 0) {
      e.preventDefault();
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
      const minX = container.offsetWidth - imageSize.width * scale;
      const minY = container.offsetHeight - imageSize.height * scale;

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
  
  const fetchLiveImage = async (typeNo, progNo, full) => {
    try {
      const url = full
        ? `http://localhost:5050/live_camera?full=true`
        : `http://localhost:5050/live_camera?typeNo=${typeNo}&progNo=${progNo}`;

      const response = await fetch(url);
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
        const w = img.width;
        const h = img.height;
        setImageSize(prev => {
          if (prev.width !== w || prev.height !== h) {
            return { width: w, height: h };
          }
          return prev;
        });
      };
    }
  }, [imageSrc]);

  useEffect(() => {
    fetchLiveImage(typeNo, progNo, cropMode); // cropMode=false ise full göster

    intervalRef.current = setInterval(() => {
      fetchLiveImage(typeNo, progNo, cropMode);
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [typeNo, progNo, cropMode]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setScale(prev => {
          const next = Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE);
          return parseFloat(next.toFixed(2));
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);


  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: 'top left'
        }}
      >
        {imageSrc && (
          <img
            id="camera-frame"
            src={imageSrc}
            alt="camera"
            className="select-none"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              width: 'auto',
              height: 'auto',
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              imageRendering: 'pixelated'
            }}
          />
        )}

        {/* Polygonlar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize.width,
            height: imageSize.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'auto'
          }}
        >
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

          {cropMode && (
            <CropRect
              typeNo={typeNo}
              progNo={progNo}
              cropRect={cropRect}
              setCropRect={setCropRect}
              imageSrc={imageSrc}
              scale={scale}
              setImageSrc={setImageSrc}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Camera;
