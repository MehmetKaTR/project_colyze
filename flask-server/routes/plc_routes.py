from flask import Blueprint, jsonify

plc_bp = Blueprint('plc', __name__)

@plc_bp.route('/get_type_program', methods=['GET'])
def get_type_and_program():
    return jsonify({
        'type_no': 1,
        'program_no': 1
    })

