# eJayJay — Agent Handoff Context

**Last updated:** 2026-07-14  
**Owner:** jaklilu  
**Domain intent:** ejayjay.com as a permanent personal brand hub for all projects  
**Repo:** https://github.com/jaklilu/eJayJay.git  
**Local path:** `C:\eJayJay`

### Link password gate (2026-07-14)

- Outbound project links (title + “Visit site”) require a password before opening.
- Default password: `ejayjay` — change `GATE_PASSWORD` in `static/js/main.js`.
- After one correct entry, unlock is remembered in `localStorage` (persists across visits).
- Client-side only (fine for casual gate; not cryptographic security on a static Netlify site).

---

## What this project is

**eJayJay** is a personal project hub / showroom:

- Public directory of live projects (click title → visit site)
- Card click (non-title) → side detail panel with `about`, tags, Visit site
- Personal shelf for private/org items
- Brand-first landing page (elegant, dark, neon accents)
- **Not** a remote-PC / home-network gateway (explicitly out of scope)

Audience: owner first; also prospect clients and people who need a single link to see work.

---

## Architecture (current)

The site is **static-first** so it works on **Netlify**.

| Layer | Role |
|--------|------|
| `index.html` | Static shell (hero, sections, detail panel markup) |
| `static/css/style.css` | All styling |
| `static/js/main.js` | Fetches JSON, renders cards, filters, detail panel |
| `data/projects.json` | Source of truth for all projects |
| `app.py` | Optional local Flask server (serves same static files) |
| `netlify.toml` | Publish `.`, redirect `/p/*` → index |

**Production:** Netlify (static).  
**Local:** Flask on **port 5050** (`http://127.0.0.1:5050/`) — port 5000 is blocked on this Windows machine.

Flask no longer Jinja-renders project lists. Legacy `templates/` still exist but are **not** used by the live static flow. Prefer editing `index.html` + `static/` + `data/projects.json`.

---

## How to run locally

```bash
cd C:\eJayJay
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5050/

User rule: **always start Flask** when working in this project.

---

## Deploy / Git

- Remote: `origin` → `https://github.com/jaklilu/eJayJay.git`
- Branch: `main`
- Netlify publish directory: **`.`** (repo root), per `netlify.toml`
- Push to `main` to redeploy Netlify

### Uncommitted at last handoff

`data/projects.json` has local edits **not yet pushed**, including:

- Cousin's CrossConnect added
- Year updates (Bible Bus, Family Tree, Kids Mahaber, Wegene → 2025; Ethio AI → 2024; CrossConnect → 2023)

Next agent should **commit + push** if Netlify should show those changes.

---

## Project data model (`data/projects.json`)

Each entry:

```json
{
  "id": "slug",
  "name": "Display Name",
  "tagline": "One-line card description (under title)",
  "about": "Longer copy for detail panel",
  "url": "https://… or null",
  "status": "live | wip | archive",
  "visibility": "public | personal",
  "tags": ["web", "…"],
  "year": 2025
}
```

### Interaction rules (do not break)

1. **Title link only** → opens `url` in new tab (`data-title-link`)
2. **Rest of card** → opens detail side panel (`data-open-detail`)
3. Filters (All / Live / WIP / Archive) apply to **public** directory only

### Public projects (as of handoff)

| Name | URL | Year |
|------|-----|------|
| The Bible Bus | https://thebiblebus.net/ | 2025 |
| Family Tree | https://familytree-jaklilu.pythonanywhere.com/ | 2025 |
| Hibret Edir | https://hibret-edir.netlify.app/ | 2026 |
| Wegene Family Mahaber | https://wegene-family-mahaber.netlify.app/ | 2025 |
| Kids Mahaber | https://jaklilu5.wixsite.com/kidsmahaber | 2025 |
| Tesfa Counseling | https://tesfacounseling.com/ | 2026 |
| DB Advocacy Group | https://db-advocacy-group.netlify.app/ | 2026 |
| Ethio AI Solutions | https://ethioaisolutions.com/ | 2024 |
| School of Life | https://shool-of-life.netlify.app/site/ | 2026 |
| Royal Family | https://theroyalfamilytree.com/ | 2026 |
| Cousin's CrossConnect | https://jaklilu.pythonanywhere.com/ | 2023 |

Personal shelf: Personal notes, Lab archive (placeholders).

**Note:** School of Life URL uses typo host `shool-of-life` (as live); do not “fix” unless the DNS was corrected.

---

## Design system (keep consistent)

### Brand wordmark

- Font: **Unbounded** (brand only)
- Headlines: **Syne**
- Body: **Outfit**
- Letters: leave **e** neutral; **J** neon green `#39ff14`; **a** neon yellow `#ffe600`; **y** neon red `#ff073a`
- **No glow** / no text-shadow neon (user rejected glow)

### UI

- Dark luminous background (not white/cream)
- Work / Personal nav + section titles: **deep gold**
- Project **titles** cycle green → yellow → red (`nth-child`)
- Horizontal cards: meta, **name**, **tagline under name**, Details
- Detail panel slides from the right

### Avoid (user / design preferences)

- Purple AI-default themes, cream+terracotta clichés
- Flat white backgrounds
- Exposing home PC remotely
- Multi-layer glow effects on brand

Hero image: `static/img/hero-atmosphere.png`

---

## Key decisions & history

1. **Brand hub** under eJayJay — one domain for all work; subdomains later (e.g. `biblebus.ejayjay.com`) are free DNS records when ready.
2. Started as Flask + Jinja; **Netlify 404** because no `index.html` → converted to static site + thin Flask for local.
3. Project copy scraped from live sites for accurate taglines/`about`.
4. Bible Bus: scripture **reading** journey, not “Bible study.”
5. Renames early on: Hermes → Family Tree; OpenClaw → The Bible Bus (then full project list replaced those placeholders).
6. Hibret Edir spelling corrected to match live site (was “Herbret” on user’s list).

---

## Kids Mahaber (related, not in this repo)

- PythonAnywhere `kidsmahaber-jaklilu.pythonanywhere.com` currently returns only:  
  `Kids Mahaber Gathering API is running ✅`  
  That Flask file is an **API only** (`/` intentionally returns that string). Frontend was Wix.
- Hub link points to Wix for now: https://jaklilu5.wixsite.com/kidsmahaber
- Owner plans to **rewrite Kids Mahaber and host on Netlify** in a **separate Cursor window/folder**.
- Advice given: open Cursor in the existing Kids Mahaber folder as **reference**, rebuild fresh for Netlify (API needs serverless/backend; Netlify alone isn’t a drop-in for Flask JSON writes).
- **Security:** old Flask file had a **Gmail app password hard-coded**; user was told to revoke/rotate. Do not reintroduce secrets into git.

---

## Useful files

```
C:\eJayJay\
  context.md          ← this handoff
  index.html          ← Netlify entry
  netlify.toml
  app.py              ← local Flask :5050
  data/projects.json  ← edit projects here
  static/css/style.css
  static/js/main.js
  static/img/hero-atmosphere.png
  templates/          ← legacy Jinja (unused by static path)
  safe_db_test.py     ← SQLite safety template for future DB
  requirements.txt
  README.md
```

---

## User rules that matter here

- Start Flask when working on this project
- Prefer absolute paths; Windows PowerShell environment
- Don’t commit unless asked (but Netlify needs push for prod updates)
- DB: timeouts, close cursors, use `safe_db_test.py` as template if adding SQLite later
- If a shell hangs > ~6s, background and continue

---

## Likely next tasks

1. Commit + push pending `projects.json` changes to update Netlify
2. Point custom domain `ejayjay.com` DNS to Netlify
3. Wire Kids Mahaber Netlify URL into `projects.json` when rewrite ships
4. Optional: remove unused `templates/` or keep for reference
5. Optional: password-protect Personal shelf
6. Optional: admin UI to edit projects without hand-editing JSON

---

## Quick verify checklist

- [ ] `python app.py` → http://127.0.0.1:5050/ loads
- [ ] Projects appear from `/data/projects.json`
- [ ] Title opens external site; card opens detail panel
- [ ] Netlify site shows `index.html` (not 404)
- [ ] Brand letters: e / green J / yellow a / red y
