from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.camera_routes import camera_bp
from routes.plc_routes import plc_bp
from routes.db_routes import db_bp
from routes.auto_routes import auto_bp  # auto route’unu da unutma

app = Flask(__name__)
CORS(app)

# Blueprint'leri kaydet
app.register_blueprint(camera_bp)
app.register_blueprint(plc_bp)
app.register_blueprint(db_bp)
app.register_blueprint(auto_bp)

# STATIC dosyaları sunmak için route (resim klasörünü erişilebilir yap)
@app.route('/frames/<path:filename>')
def serve_frame(filename):
    from pathlib import Path
    frame_dir = Path("temp_frames")
    return send_from_directory(frame_dir, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
