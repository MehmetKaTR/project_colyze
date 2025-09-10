from flask import Flask
from flask_cors import CORS
from app.routes.auto_routes import auto_bp
from app.routes.camera_routes import camera_bp
from app.routes.db_routes import db_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Blueprint'leri kaydet
    app.register_blueprint(auto_bp)
    app.register_blueprint(camera_bp)
    app.register_blueprint(db_bp)

    return app
