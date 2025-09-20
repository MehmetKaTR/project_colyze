from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.camera_routes import camera_bp
from routes.plc_routes import plc_bp
from routes.db_routes import db_bp
from routes.auto_routes import auto_bp
from pathlib import Path

# BASE_DIR: app.py'nin bulunduğu klasör
BASE_DIR = Path(__file__).resolve().parent.parent / "flask-server"

# Temp klasörler
TEMP_FRAMES_DIR = BASE_DIR / "temp_frames"
TEMP_TEXTS_DIR = BASE_DIR / "temp_texts"

app = Flask(__name__)
CORS(app)

# Blueprint'leri kaydet
app.register_blueprint(camera_bp)
app.register_blueprint(plc_bp)
app.register_blueprint(db_bp)
app.register_blueprint(auto_bp)

# STATIC dosyaları sunmak için route
@app.route('/frames/<path:filename>')
def serve_frame(filename):
    return send_from_directory(TEMP_FRAMES_DIR, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
