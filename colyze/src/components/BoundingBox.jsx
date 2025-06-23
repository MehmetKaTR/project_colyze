import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';

const BoundingBox = ({ x = 100, y = 100, width = 120, height = 80, scale = 1 }) => {
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false);

  useEffect(() => {
    const handleMouseDown = (e) => {
      // Alt + Sağ tık (e.button === 2)
      if (e.altKey && e.button === 2) {
        e.preventDefault();
        setIsDraggingEnabled(true);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingEnabled(false);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, []);

  return (
    <Rnd
      default={{
        x,
        y,
        width,
        height,
      }}
      scale={scale}
      disableDragging={!isDraggingEnabled}
      bounds="parent"
      style={{
        border: '2px dashed red',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        zIndex: 9999,
      }}
    >
      <div style={{ width: '100%', height: '100%' }} />
    </Rnd>
  );
};

export default BoundingBox;
