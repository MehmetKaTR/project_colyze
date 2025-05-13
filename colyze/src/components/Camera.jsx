import React, { useEffect, useState, useRef } from 'react';

const Camera = () => {
  const [imageSrc, setImageSrc] = useState('');
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchImage = async (width, height) => {
    try {
      const response = await fetch(`http://localhost:5050/live_camera?width=${width}&height=${height}`);
      const data = await response.json();
      if (data.image) {
        setImageSrc(data.image);
      }
    } catch (error) {
      console.error('Görüntü alınamadı:', error);
    }
  };

  useEffect(() => {
    const updateAndFetch = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        fetchImage(offsetWidth, offsetHeight);
      }
    };

    updateAndFetch();
    intervalRef.current = setInterval(updateAndFetch, 500);

    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex justify-center items-center rounded-xl overflow-hidden"
    >
      {imageSrc && (
        <img
          id="camera-frame" // 🔴 Önemli: RGBI hesaplama için bu ID kullanılacak
          src={imageSrc}
          alt="camera"
          className="object-contain w-full h-full"
        />
      )}
    </div>
  );
};

export default Camera;
