import { Rnd } from 'react-rnd';

const CropRect = ({ typeNo, progNo, cropRect, setCropRect, imageSrc, scale, setImageSrc }) => {
    {/*
    const handleCrop = async () => {
    const canvas = document.createElement('canvas');
    const img = document.getElementById('camera-frame');
    if (!img) return;

    const scaledX = cropRect.x / scale;
    const scaledY = cropRect.y / scale;
    const scaledWidth = cropRect.width / scale;
    const scaledHeight = cropRect.height / scale;

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    const ctx = canvas.getContext('2d');
    const tempImg = new Image();
    tempImg.src = imageSrc;
    tempImg.onload = async () => {
        ctx.drawImage(
        tempImg,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        0,
        0,
        scaledWidth,
        scaledHeight
        );

        const croppedData = canvas.toDataURL('image/png');
        setImageSrc(croppedData);

        // Access'e gönder
        await fetch("http://localhost:5050/type-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            TypeNo: 1,
            ProgramNo: 1,
            ImageBase64: croppedData
        })
        });
    };
    };
    */}
    const handleCrop = async () => {
  if (!cropRect) return;

  // Ölçeklenmiş koordinatları gerçek görüntüye göre hesapla
  const rectX = cropRect.x / scale;
  const rectY = cropRect.y / scale;
  const rectW = cropRect.width / scale;
  const rectH = cropRect.height / scale;

  // Backend'e crop koordinatlarını gönder
  try {
    const response = await fetch("http://localhost:5050/type-rect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TypeNo: typeNo,       // Gerekirse dinamik yapabilirsin
        ProgramNo: progNo,       // Gerekirse dinamik yapabilirsin
        RectX: rectX,
        RectY: rectY,
        RectW: rectW,
        RectH: rectH
      }),
    });
    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error("Crop koordinatları kaydedilemedi:", error);
  }
};

  return (
    <>
      <Rnd
        size={{ width: cropRect.width, height: cropRect.height }}
        position={{ x: cropRect.x, y: cropRect.y }}
        minWidth={1400}
        minHeight={600}
        onDragStop={(e, d) => {
          setCropRect(prev => ({ ...prev, x: d.x, y: d.y }));
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          setCropRect({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
            x: position.x,
            y: position.y
          });
        }}
        style={{
          border: '2px dashed red',
          zIndex: 10,
          position: 'absolute'
        }}
      />

      <button
        onClick={handleCrop}
        className="absolute top-2 left-2 bg-white px-3 py-1 text-black border border-gray-300 rounded hover:bg-gray-100 z-20"
      >
        Crop
      </button>
    </>
  );
};

export default CropRect;
