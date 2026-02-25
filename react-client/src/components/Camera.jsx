import React, { useEffect, useState, useRef } from 'react';
import Polygon from './Polygon';
import CropRect from './CropRect';

const Camera = ({
  typeNo,
  progNo,
  polygons,
  focusedId,
  onPolygonUpdate,
  onRoiShift,
  cropMode,
  offset,
  setOffset,
  scale,
  setScale,
  hidePolygons = false,
  edgeDetections = [],
}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isCameraReady, setIsCameraReady] = useState(false);

  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const fetchSeqRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 1;
  const MAX_SCALE = 2.5;

  const [cropRect, setCropRect] = useState(null);
  const defaultRect = { x: 100, y: 100, width: 1485, height: 600 };

  useEffect(() => {
    if (!typeNo || !progNo) return;

    const fetchCropRect = async () => {
      try {
        const resp = await fetch(`http://localhost:5050/type-rect/${typeNo}/${progNo}`);
        const data = await resp.json();
        if (data.found) {
          setCropRect({ x: data.RectX, y: data.RectY, width: data.RectW, height: data.RectH });
        } else {
          setCropRect(defaultRect);
        }
      } catch (err) {
        console.error(err);
        setCropRect(defaultRect);
      }
    };

    fetchCropRect();
  }, [typeNo, progNo]);

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

  const fetchLiveImage = async (nextTypeNo, nextProgNo, nextCropMode, nextCropRect) => {
    const reqSeq = ++fetchSeqRef.current;
    try {
      let url = 'http://localhost:5050/live_camera';
      if (!nextCropMode && nextCropRect) {
        url += `?typeNo=${nextTypeNo}&progNo=${nextProgNo}&x=${nextCropRect.x}&y=${nextCropRect.y}&w=${nextCropRect.width}&h=${nextCropRect.height}`;
      } else {
        url += '?full=true';
      }

      const response = await fetch(url);
      if (reqSeq !== fetchSeqRef.current) return;
      if (!response.ok) {
        setIsCameraReady(false);
        return;
      }

      const data = await response.json();
      if (reqSeq !== fetchSeqRef.current) return;
      if (data.image) {
        setImageSrc(data.image);
        setIsCameraReady(true);
      } else {
        setIsCameraReady(false);
      }
    } catch {
      setIsCameraReady(false);
    }
  };

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      setImageSize((prev) => {
        if (prev.width !== w || prev.height !== h) {
          return { width: w, height: h };
        }
        return prev;
      });
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!typeNo || !progNo) return;
    if (!cropRect) return;

    setIsCameraReady(false);
    const tick = () => fetchLiveImage(typeNo, progNo, cropMode, cropRect);

    tick();
    intervalRef.current = setInterval(tick, 500);

    return () => clearInterval(intervalRef.current);
  }, [typeNo, progNo, cropMode, cropRect]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (!e.ctrlKey || !containerRef.current) return;
      e.preventDefault();

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 0.1 : -0.1;

      setScale((prev) => {
        const next = Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE);
        if (next === prev) return prev;

        const worldX = (cursorX - offset.x) / prev;
        const worldY = (cursorY - offset.y) / prev;

        const desiredX = cursorX - worldX * next;
        const desiredY = cursorY - worldY * next;

        const minX = container.offsetWidth - imageSize.width * next;
        const minY = container.offsetHeight - imageSize.height * next;

        const boundedX = Math.min(Math.max(desiredX, minX), 0);
        const boundedY = Math.min(Math.max(desiredY, minY), 0);

        setOffset({ x: boundedX, y: boundedY });
        lastOffset.current = { x: boundedX, y: boundedY };

        return parseFloat(next.toFixed(2));
      });
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
  }, [offset, imageSize.width, imageSize.height, setOffset, setScale]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: 'top left',
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
              imageRendering: 'pixelated',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize.width,
            height: imageSize.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'auto',
          }}
        >
          {!hidePolygons &&
            polygons.map((polygon, index) => {
              const polygonId = isNaN(polygon.id) ? `polygon-${index}` : polygon.id;
              const status = polygon.status;
              return (
                <Polygon
                  key={polygonId}
                  polygon={{ ...polygon, focused: polygon.id === focusedId }}
                  onUpdate={onPolygonUpdate}
                  status={status}
                  scale={scale}
                />
              );
            })}

          {hidePolygons && edgeDetections.length > 0 && (
            <svg
              width={imageSize.width}
              height={imageSize.height}
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
            >
              {edgeDetections.map((shape, idx) => {
                const points = (shape?.points || []).map((p) => `${p.x},${p.y}`).join(" ");
                if (!points) return null;
                return (
                  <polygon
                    key={`edge-detect-${idx}`}
                    points={points}
                    fill="rgba(34, 197, 94, 0.28)"
                    stroke="rgb(74, 222, 128)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          )}

          {cropMode && (
            <CropRect
              typeNo={typeNo}
              progNo={progNo}
              cropRect={cropRect}
              setCropRect={setCropRect}
              onRoiShift={onRoiShift}
              scale={scale}
            />
          )}
        </div>
      </div>
      {!isCameraReady && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[3000]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-slate-100 shadow-xl">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-400" />
            <span className="text-sm">Kamera aciliyor...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Camera;
