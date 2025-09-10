from flask import Blueprint, request, jsonify
from app.services.auto_service import AutoService

auto_bp = Blueprint("auto", __name__)
service = AutoService()

@auto_bp.route("/auto_frames", methods=["GET"])
def get_auto_frames():
    try:
        return jsonify(service.get_auto_frames())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auto_bp.route("/auto_result_text", methods=["GET"])
def get_result_text():
    try:
        filename = request.args.get("filename")
        if not filename:
            return jsonify({"error": "filename is required"}), 400
        return jsonify(service.get_result_text(filename))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
