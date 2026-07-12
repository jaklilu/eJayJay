"""eJayJay — personal project hub (static site + local Flask)."""

from __future__ import annotations

from pathlib import Path

from flask import Flask, send_from_directory

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder="static", static_url_path="/static")


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/data/<path:filename>")
def data_files(filename: str):
    return send_from_directory(BASE_DIR / "data", filename)


@app.route("/p/<project_id>")
def project_shortlink(project_id: str):
    """Keep short links working locally; Netlify redirects /p/* to index."""
    return send_from_directory(BASE_DIR, "index.html")


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5050)
