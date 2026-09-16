"""eJayJay — personal project hub (static site + local Flask)."""

from __future__ import annotations

from pathlib import Path

from flask import Flask, abort, redirect, send_from_directory

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


@app.route("/expenses")
@app.route("/expenses/")
def expenses_redirect():
    return redirect("/personal/expenses/")


@app.route("/personal/<path:filename>")
def personal_files(filename: str):
    """Serve Grok/Netlify personal pages the same way the live static host does."""
    filename = filename.rstrip("/")
    folder = (BASE_DIR / "personal").resolve()
    target = (folder / filename).resolve()
    try:
        target.relative_to(folder)
    except ValueError:
        abort(404)
    if target.is_dir():
        index = target / "index.html"
        if index.is_file():
            return send_from_directory(target, "index.html")
        abort(404)
    if target.is_file():
        return send_from_directory(target.parent, target.name)
    abort(404)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5050)
