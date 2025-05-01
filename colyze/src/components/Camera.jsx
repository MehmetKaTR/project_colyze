import { useState } from 'react';

function Camera() {
  const [imgSrc, setImgSrc] = useState(null);
  const [stats, setStats] = useState({ avg_r: 0, avg_g: 0, avg_b: 0, intensity: 0 });

  const handleCapture = async () => {
    try {
      const res = await fetch('http://localhost:5000/capture');
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setImgSrc(data.image);
      setStats({
        avg_r: data.avg_r,
        avg_g: data.avg_g,
        avg_b: data.avg_b,
        intensity: data.intensity
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Webcam Capture &amp; RGB Statistik</h1>

      <div
        style={{
          width: 480,
          height: 360,
          border: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#eee'
        }}
      >
        {imgSrc
          ? <img src={imgSrc} alt="capture" style={{ maxWidth: '100%', maxHeight: '100%' }} />
          : <span>Henüz bir görüntü yok</span>
        }
      </div>

      <button onClick={handleCapture} style={{ marginTop: 10, padding: '8px 16px' }}>
        Capture
      </button>

      <div style={{ marginTop: 20 }}>
        <p>Ort. R: {stats.avg_r}</p>
        <p>Ort. G: {stats.avg_g}</p>
        <p>Ort. B: {stats.avg_b}</p>
        <p>Intensity: {stats.intensity}</p>
      </div>
    </div>
  );
}

export default Camera;
