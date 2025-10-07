from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.camera_routes import camera_bp
from routes.plc_routes import plc_bp
from routes.db_routes import db_bp
from routes.auto_routes import auto_bp
from pathlib import Path

import os
import shutil
import atexit

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


def clear_temp_folders():
    for temp_dir in [TEMP_FRAMES_DIR, TEMP_TEXTS_DIR]:
        if os.path.exists(temp_dir):
            for item in os.listdir(temp_dir):
                item_path = os.path.join(temp_dir, item)
                try:
                    if os.path.isfile(item_path) or os.path.islink(item_path):
                        os.unlink(item_path)
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                except Exception as e:
                    print(f"Couldn't clean: {item_path}, error: {e}")
    print("🧹 Temp files were cleared.")

atexit.register(clear_temp_folders)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
