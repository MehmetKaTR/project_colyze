from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.camera_routes import camera_bp
from routes.db_routes import db_bp
from routes.auto_routes import auto_bp
from datetime import datetime, timezone
import os
import shutil
import atexit
from path_config import TEMP_FRAMES_DIR, TEMP_TEXTS_DIR, ensure_runtime_layout

ensure_runtime_layout()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 
APP_STARTED_AT = datetime.now(timezone.utc)

app.register_blueprint(camera_bp)
app.register_blueprint(db_bp)
app.register_blueprint(auto_bp)

@app.route('/healthz')
def healthz():
    uptime = (datetime.now(timezone.utc) - APP_STARTED_AT).total_seconds()
    return {
        "status": "ok",
        "service": "colyze-backend",
        "uptime_seconds": round(uptime, 2),
        "started_at_utc": APP_STARTED_AT.isoformat(),
    }

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
    app.run(host='127.0.0.1', port=5050, debug=False, threaded=True, use_reloader=False)
