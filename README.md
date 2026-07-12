# eJayJay

Personal project hub for [ejayjay.com](https://ejayjay.com) — a branded directory of live work, experiments, and personal organization.

## Netlify

This repo is a **static site**. In Netlify:

- Publish directory: `.` (site root)
- Or use the included `netlify.toml` (already set)

After connect-to-GitHub, each push to `main` redeploys.

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5050/](http://127.0.0.1:5050/)

You can also open `index.html` via any static server from the repo root.

## Projects

Edit `data/projects.json` to add or update projects (`name`, `tagline`, `about`, `url`, `status`, `visibility`), then commit and push for Netlify to update.
