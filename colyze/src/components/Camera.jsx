import React, { useEffect, useState, useRef } from 'react';

const Camera = ({ isRunning }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [rgb, setRgb] = useState({ r: 0, g: 0, b: 0 });
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(fetchImage, 500);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const fetchImage = async () => {
    try {
      const response = await fetch('http://localhost:5050/capture');
      const data = await response.json();
      if (data.image) {
        setImageSrc(data.image);
        setRgb({ r: data.avg_r, g: data.avg_g, b: data.avg_b });
      }
    } catch (error) {
      console.error('Görüntü alınamadı:', error);
    }
  };

  return (
    <div className="relative w-full h-full flex justify-center items-center rounded-xl overflow-hidden">
      {imageSrc && (
        <img
          src={imageSrc}
          alt="camera"
          className="object-cover w-full h-full"
        />
      )}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-75 px-3 py-1 rounded-md shadow-md text-black text-sm font-semibold">
        R: {rgb.r} | G: {rgb.g} | B: {rgb.b}
      </div>
    </div>
  );
};

export default Camera;
