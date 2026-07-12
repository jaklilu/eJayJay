"""eJayJay — personal project hub."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, abort, render_template, url_for

BASE_DIR = Path(__file__).resolve().parent
PROJECTS_PATH = BASE_DIR / "data" / "projects.json"

app = Flask(__name__)


def load_projects() -> list[dict]:
    with PROJECTS_PATH.open(encoding="utf-8") as f:
        return json.load(f)


@app.route("/")
def index():
    projects = load_projects()
    public = [p for p in projects if p.get("visibility") == "public"]
    personal = [p for p in projects if p.get("visibility") == "personal"]
    return render_template(
        "index.html",
        projects=projects,
        public_projects=public,
        personal_projects=personal,
    )


@app.route("/p/<project_id>")
def project_redirect(project_id: str):
    """Stable short URL: /p/<id> → external project URL when set."""
    projects = {p["id"]: p for p in load_projects()}
    project = projects.get(project_id)
    if not project:
        abort(404)
    url = project.get("url")
    if url:
        from flask import redirect

        return redirect(url, code=302)
    return render_template("project.html", project=project)


@app.context_processor
def inject_globals():
    return {"site_name": "eJayJay"}


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5050)
