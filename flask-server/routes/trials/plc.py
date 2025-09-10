from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/get_type', methods=['GET'])
def get_typeNo():
    results = [{
        'type_no': 1,
    }]

    return jsonify(results)


@app.route('/get_program', methods=['GET'])
def get_programNo():
    results = [{
        'program_no': 2,
    }]

    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3050, debug=True)



