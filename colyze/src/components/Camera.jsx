import React, { useEffect, useState, useRef } from 'react';

const Camera = ({ isRunning }) => {
  const [imageSrc, setImageSrc] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(fetchImage, 500);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const fetchImage = async () => {
    try {
      const response = await fetch('http://localhost:5050/live_camera');
      const data = await response.json();
      if (data.image) {
        setImageSrc(data.image);
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
    </div>
  );
};

export default Camera;
