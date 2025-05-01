from flask import Flask, jsonify
from flask_cors import CORS
import cv2
import base64
import numpy as np

app = Flask(__name__)
CORS(app)  # Tüm domainlerden erişime izin ver

# Kamera bağlantısı (ilk kamera)
camera = cv2.VideoCapture(0)

@app.route('/capture')
def capture():
    ret, frame = camera.read()
    if not ret:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    # RGB'ye çevir
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Ortalama R, G, B hesapla
    avg_r = np.mean(rgb_frame[:, :, 0])
    avg_g = np.mean(rgb_frame[:, :, 1])
    avg_b = np.mean(rgb_frame[:, :, 2])

    # Görüntüyü base64 olarak kodla
    _, buffer = cv2.imencode('.jpg', cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR))
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    img_uri = f"data:image/jpeg;base64,{img_base64}"

    return jsonify({
        'avg_r': round(avg_r, 1),
        'avg_g': round(avg_g, 1),
        'avg_b': round(avg_b, 1),
        'image': img_uri
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
