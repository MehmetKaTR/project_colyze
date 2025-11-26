from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.camera_routes import camera_bp
from routes.db_routes import db_bp
from routes.auto_routes import auto_bp
from pathlib import Path

import os
import shutil
import atexit

BASE_DIR = Path(__file__).resolve().parent.parent / "flask-server"

TEMP_FRAMES_DIR = BASE_DIR / "temp_frames"
TEMP_TEXTS_DIR = BASE_DIR / "temp_texts"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

app.register_blueprint(camera_bp)
app.register_blueprint(db_bp)
app.register_blueprint(auto_bp)

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
    print("Temp files were cleared.")

atexit.register(clear_temp_folders)

if __name__ == '__main__':
    print("Flask backend running on http://127.0.0.1:5050")
    app.run(host='127.0.0.1', port=5050, debug=False)
