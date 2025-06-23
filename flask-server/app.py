from flask import Flask
from flask_cors import CORS
from routes.camera_routes import camera_bp
from routes.plc_routes import plc_bp
from routes.db_routes import db_bp

app = Flask(__name__)
CORS(app)

# Blueprint'leri kaydet
app.register_blueprint(camera_bp)
app.register_blueprint(plc_bp)
app.register_blueprint(db_bp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
