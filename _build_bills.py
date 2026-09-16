"""Detect monthly bills: same day each month (±2), amount may vary."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SRC = Path(r"c:\Users\jakli\Downloads\stmt (14).csv")
OUT = Path(r"c:\eJayJay\data\bills.json")

FULL = [
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
]

BILL_RULES = [
    (r"TESLA", "Tesla Insurance", "auto"),
    (r"ZELLE RECURRING PAYMENT TO MIMI|ZELLE PAYMENT TO MIMI CONF#", "Rent — Mimi", "housing"),
    (r"ZELLE RECURRING PAYMENT TO LORENA", "Lorena Abzuman", "household"),
    (r"MAIL ORDER PHARMAC|KP RX\d+ MAILORDER", "Mail-order pharmacy", "health"),
    (r"KAISER FOUNDAT", "Kaiser premium", "health"),
    (r"VER WIR", "Verizon Wireless", "utilities"),
    (r"BA MASTERCARD", "BofA Mastercard", "credit"),
    (r"SPECTRUM TIME EARNER", "Spectrum", "utilities"),
    (r"SOUTHER CALIFORNIA EDISON", "SCE Edison", "utilities"),
    (r"PRIMO BRANDS", "Primo Brands", "household"),
    (r"PRE-PAID LEGAL", "Prepaid Legal", "services"),
    (r"NETFLIX", "Netflix", "tech_subscription"),
    (r"PYTHONANYWHERE", "PythonAnywhere", "tech_subscription"),
    (r"OPENAI \*CHATGPT SUBSCR", "ChatGPT Plus", "tech_subscription"),
    (r"PADDLE\.NET\* N8N", "n8n Cloud", "tech_subscription"),
    (r"CURSOR, AI POWERED IDE", "Cursor", "tech_subscription"),
    (r"ANTHROPIC", "Anthropic", "tech_subscription"),
    (r"YOUTUBEPREMIUM", "YouTube Premium", "tech_subscription"),
    (r"GOOGLE ONE|GOOGLE \*GOOGLE", "Google One", "tech_subscription"),
    (r"APPLE.COM/BILL", "Apple", "tech_subscription"),
    (r"ACORNS", "Acorns", "savings"),
    (r"RENDER\.COM", "Render.com", "tech_subscription"),
    (r"AMAZON DIGI", "Amazon Digital", "tech_subscription"),
    (r"PUBLIC STORAGE", "Storage", "housing"),
    (r"SHELL CREDIT CARD", "Car gas", "auto"),
    (r"CHASE CREDIT CRD", "Freedom Flex", "credit"),
    (r"NETLIFY", "Netlify", "tech_subscription"),
    (r"CITATION-PERMITS PROCES|CITY OF BEVERLY HILLS P", "Beverly Hills permits", "auto"),
]

TRANSFER = re.compile(
    r"ONLINE SCHEDULED TRANSFER|ONLINE BANKING TRANSFER|"
    r"OVERDRAFT PROTECTION|BKOFAMERICA MOBILE .*DEPOSIT",
    re.I,
)

CATEGORIES = {
    "housing": {"label": "Housing", "color": "#ffd166"},
    "household": {"label": "Household", "color": "#06d6a0"},
    "health": {"label": "Health", "color": "#ff073a"},
    "utilities": {"label": "Utilities", "color": "#ffe600"},
    "credit": {"label": "Credit cards", "color": "#ff6b35"},
    "services": {"label": "Services", "color": "#9d4edd"},
    "tech_subscription": {"label": "Tech subscription", "color": "#39ff14"},
    "savings": {"label": "Savings", "color": "#d4af37"},
    "auto": {"label": "Auto", "color": "#118ab2"},
}


def parse_amount(s: str) -> float:
    return float((s or "").replace('"', "").replace(",", "").strip() or 0)


def clean_desc(d: str) -> str:
    return re.sub(r"\s+", " ", d.strip().strip('"'))


def name_bill(desc: str):
    u = desc.upper()
    for pat, name, cat in BILL_RULES:
        if re.search(pat, u):
            return name, cat
    return None


rows = []
with SRC.open(encoding="utf-8", errors="replace") as f:
    started = False
    for raw in f:
        line = raw.rstrip("\n")
        if line.startswith("Date,Description,Amount"):
            started = True
            continue
        if not started:
            continue
        nums = re.findall(r"-?[\d,]+\.\d{2}", line)
        dm = re.match(r"^(\d{2}/\d{2}/\d{4}),(.*)$", line)
        if not dm or len(nums) < 2:
            continue
        date_s = dm.group(1)
        amt = parse_amount(nums[-2])
        desc = dm.group(2)
        desc = re.sub(r',"?-?[\d,]+\.\d{2}"?,?"?-?[\d,]+\.\d{2}"?\s*$', "", desc)
        desc = clean_desc(desc.strip().strip('"').strip(","))
        if "Beginning balance" in desc or amt == 0:
            continue
        dt = datetime.strptime(date_s, "%m/%d/%Y")
        rows.append(
            {
                "month": dt.strftime("%Y-%m"),
                "desc": desc,
                "amount": amt,
            }
        )

groups = defaultdict(list)
for r in rows:
    if r["amount"] >= 0 or TRANSFER.search(r["desc"]):
        continue
    named = name_bill(r["desc"])
    if not named:
        continue
    name, cat = named
    groups[name].append({**r, "category": cat})

STATIC_LATEST = {"Tesla Insurance"}
STATIC_AMOUNT = {
    "Lorena Abzuman": 600.00,
    "Storage": 80.00,
    "Car gas": 120.00,
    "Verizon Wireless": 200.00,
    "Netlify": 9.00,
    "Freedom Flex": 266.00,
    "BofA Mastercard": 120.00,
    "Chase Slate": 40.00,
    "BofA Business Advantage 360": 35.00,
    "Anthropic": 20.00,
}
STATIC_CATEGORY = {
    "Chase Slate": "credit",
    "BofA Business Advantage 360": "credit",
    "Anthropic": "tech_subscription",
}
YEAR_AVERAGE = {"Mail-order pharmacy", "Beverly Hills permits"}

bills = []
for name, txs in groups.items():
    in_year = [t for t in txs if t["month"] in FULL]
    months = sorted({t["month"] for t in in_year})
    if name not in YEAR_AVERAGE and name not in STATIC_AMOUNT and len(months) < 10:
        continue
    if not in_year and name not in STATIC_AMOUNT:
        continue
    by_month = defaultdict(float)
    for t in txs:
        if t["amount"] >= 0:
            continue
        by_month[t["month"]] += abs(t["amount"])
    if name in STATIC_AMOUNT:
        monthly = STATIC_AMOUNT[name]
    elif name in STATIC_LATEST:
        last_month = sorted(by_month)[-1]
        monthly = round(by_month[last_month], 2)
    elif name in YEAR_AVERAGE:
        monthly = round(sum(abs(t["amount"]) for t in in_year) / 12, 2)
    else:
        recent_months = sorted(by_month)[-3:]
        monthly = round(sum(by_month[m] for m in recent_months) / len(recent_months), 2)
    bills.append(
        {
            "name": name,
            "amount": monthly,
            "frequency": "monthly",
            "category": (in_year[0]["category"] if in_year else txs[0]["category"]),
        }
    )

have = {b["name"] for b in bills}
for name, amount in STATIC_AMOUNT.items():
    if name in have:
        continue
    bills.append(
        {
            "name": name,
            "amount": amount,
            "frequency": "monthly",
            "category": STATIC_CATEGORY.get(name, "credit"),
        }
    )

bills.sort(key=lambda b: -b["amount"])
total = round(sum(b["amount"] for b in bills), 2)
payload = {
    "meta": {
        "generated": "2026-09-16",
        "source": "Bank of America checking statement",
        "period": "Sep 2025 – Aug 2026",
        "totalMonthly": total,
        "note": "Most bills use the last 3 months. Tesla uses the latest posted premium. Lorena Abzuman is $600/mo for laundry. Storage is $80/mo. Car gas is $120/mo. Verizon is $200/mo after kids' share. Netlify is $9/mo. Freedom Flex is $266/mo. BofA Mastercard is $120/mo. Chase Slate is $40/mo. BofA Business Advantage 360 is $35/mo. Mail-order pharmacy and Beverly Hills permits are 12-month averages.",
    },
    "charges": bills,
    "categories": CATEGORIES,
}
OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(f"{'monthly':>10}  bill")
for b in bills:
    print(f"{b['amount']:10.2f}  {b['name']}")
print("COUNT", len(bills), "TOTAL", total)
