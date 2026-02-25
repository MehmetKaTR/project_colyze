import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";

const CropRect = ({ typeNo, progNo, cropRect, setCropRect, onRoiShift, scale }) => {
  const [ctrlPressed, setCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Control") setCtrlPressed(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === "Control") setCtrlPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleCrop = async () => {
    if (!cropRect) return;

    try {
      const response = await fetch("http://localhost:5050/type-rect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TypeNo: typeNo,
          ProgramNo: progNo,
          RectX: cropRect.x,
          RectY: cropRect.y,
          RectW: cropRect.width,
          RectH: cropRect.height,
        }),
      });
      const result = await response.json();
      console.log(result.message);
    } catch (error) {
      console.error("Crop koordinatlari kaydedilemedi:", error);
    }
  };

  if (!cropRect) return null;

  return (
    <>
      <Rnd
        size={{ width: cropRect.width * scale, height: cropRect.height * scale }}
        position={{ x: cropRect.x * scale, y: cropRect.y * scale }}
        minWidth={1400 * scale}
        minHeight={600 * scale}
        disableDragging={ctrlPressed}
        onDragStop={(e, d) => {
          const newX = d.x / scale;
          const newY = d.y / scale;
          const dx = newX - cropRect.x;
          const dy = newY - cropRect.y;
          setCropRect((prev) => ({ ...prev, x: newX, y: newY }));
          if (onRoiShift && (dx !== 0 || dy !== 0)) {
            onRoiShift(dx, dy);
          }
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          setCropRect({
            width: Number(ref.style.width.replace("px", "")) / scale,
            height: Number(ref.style.height.replace("px", "")) / scale,
            x: position.x / scale,
            y: position.y / scale,
          });
        }}
        style={{
          border: "2px dashed red",
          zIndex: 10,
          position: "absolute",
        }}
      />

      <button
        onClick={handleCrop}
        className="absolute top-2 left-2 bg-white px-3 py-1 text-black border border-gray-300 rounded hover:bg-gray-100"
        style={{ zIndex: 9999 }}
      >
        Save ROI
      </button>
    </>
  );
};

export default CropRect;
