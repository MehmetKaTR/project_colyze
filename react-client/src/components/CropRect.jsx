import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";

const CropRect = ({ typeNo, progNo, cropRect, setCropRect, imageSrc, scale }) => {
  const [ctrlPressed, setCtrlPressed] = useState(false);

  // Klavyeden Ctrl tuşunu dinle
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

  // Crop butonuna tıklanınca backend'e gönder
  const handleCrop = async () => {
    if (!cropRect) return;

    const rectX = cropRect.x / scale;
    const rectY = cropRect.y / scale;
    const rectW = cropRect.width / scale;
    const rectH = cropRect.height / scale;

    try {
      const response = await fetch("http://localhost:5050/type-rect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TypeNo: typeNo,
          ProgramNo: progNo,
          RectX: rectX,
          RectY: rectY,
          RectW: rectW,
          RectH: rectH,
        }),
      });
      const result = await response.json();
      console.log(result.message);
    } catch (error) {
      console.error("Crop koordinatları kaydedilemedi:", error);
    }
  };

  if (!cropRect) return null; // cropRect yoksa render etme

  return (
    <>
      <Rnd
        size={{ width: cropRect.width, height: cropRect.height }}
        position={{ x: cropRect.x, y: cropRect.y }}
        minWidth={1400}
        minHeight={600}
        disableDragging={ctrlPressed} // ✅ Ctrl basılıyken drag kapalı
        onDragStop={(e, d) => {
          setCropRect((prev) => ({ ...prev, x: d.x, y: d.y }));
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          setCropRect({
            width: Number(ref.style.width.replace("px", "")),
            height: Number(ref.style.height.replace("px", "")),
            x: position.x,
            y: position.y,
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
        style={{ zIndex: 9999 }} // ✅ her şeyin üstünde
      >
        Crop
      </button>
    </>
  );
};

export default CropRect;
