"""
Flask server for DocStrange extraction
Deploy this separately (Railway, Render, Fly.io) and call from Vercel
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from docstrange_service import extract_with_docstrange
import tempfile
import os

app = Flask(__name__)
CORS(app)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/extract", methods=["POST"])
def extract():
    """Extract CSV from PDF using DocStrange"""
    if "file" not in request.files:
        return jsonify({
            "error": "No file provided",
            "success": False
        }), 400

    file = request.files["file"]
    statement_type = request.form.get("statementType", "debit")
    api_key = request.form.get("apiKey") or "a830e6de-e258-11f0-bf19-a23842209c4a"

    if file.filename == "":
        return jsonify({
            "error": "No file selected",
            "success": False
        }), 400

    # Save to temp file
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        result = extract_with_docstrange(tmp_path, api_key)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "error": str(e),
            "success": False
        }), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=port)

