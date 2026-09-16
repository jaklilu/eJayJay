"""Build curated recurring + expense JSON for the hub pages."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SRC = Path(r"c:\Users\jakli\Downloads\stmt (14).csv")
OUT = Path(r"c:\eJayJay\data\money.json")

RECURRING_RULES = [
    (r"TESLA", "Tesla Insurance", "Insurance", "monthly"),
    (r"ZELLE RECURRING PAYMENT TO MIMI", "Rent — Mimi", "Housing", "monthly"),
    (r"ZELLE PAYMENT TO MIMI CONF#", "Rent — Mimi", "Housing", "monthly"),
    (r"ZELLE RECURRING PAYMENT TO LORENA", "Lorena Abzum", "Household", "monthly"),
    (r"KAISER FOUNDAT", "Kaiser premium", "Health", "monthly"),
    (r"VER WIR", "Verizon Wireless", "Utilities", "monthly"),
    (r"BA MASTERCARD", "BofA Mastercard", "Credit cards", "monthly"),
    (r"SPECTRUM TIME EARNER", "Spectrum", "Utilities", "monthly"),
    (r"SOUTHER CALIFORNIA EDISON", "SCE Edison", "Utilities", "monthly"),
    (r"PRIMO BRANDS", "Primo Brands (water)", "Household", "monthly"),
    (r"SHELL CREDIT CARD", "Shell credit card", "Auto", "monthly"),
    (r"ROBINHOOD DES:DEBITS", "Robinhood auto-invest", "Savings/invest", "weekly"),
    (r"AXA EQUITABLE", "AXA Equitable", "Insurance", "quarterly"),
    (r"DEXCOM", "Dexcom", "Health", "monthly"),
    (r"PUBLIC STORAGE", "Public Storage", "Housing", "monthly"),
    (r"PRE-PAID LEGAL", "Prepaid Legal", "Services", "monthly"),
    (r"NETFLIX", "Netflix", "Subscriptions", "monthly"),
    (r"PYTHONANYWHERE", "PythonAnywhere", "Tech/hosting", "monthly"),
    (r"OPENAI \*CHATGPT SUBSCR", "ChatGPT Plus", "Subscriptions", "monthly"),
    (r"PADDLE\.NET\* N8N", "n8n Cloud", "Tech/hosting", "monthly"),
    (r"CURSOR, AI POWERED IDE", "Cursor", "Subscriptions", "monthly"),
    (r"YOUTUBEPREMIUM", "YouTube Premium", "Subscriptions", "monthly"),
    (r"GOOGLE ONE|GOOGLE \*GOOGLE", "Google One", "Subscriptions", "monthly"),
    (r"APPLE", "Apple subscriptions", "Subscriptions", "monthly"),
    (r"ACORNS", "Acorns", "Savings/invest", "monthly"),
    (r"ANTHROPIC", "Claude / Anthropic", "Subscriptions", "monthly"),
    (r"RENDER\.COM", "Render.com", "Tech/hosting", "monthly"),
    (r"NETLIFY", "Netlify", "Tech/hosting", "monthly"),
    (r"HOSTINGER", "Hostinger", "Tech/hosting", "monthly"),
    (r"RETELLAI", "Retell AI", "Tech/hosting", "monthly"),
    (r"AMAZON DIGI", "Amazon Digital", "Subscriptions", "monthly"),
    (r"CHASE CREDIT CRD", "Chase credit card", "Credit cards", "monthly"),
    (r"ONLINE SCHEDULED PAYMENT TO ACCT", "Scheduled account payment", "Credit cards", "monthly"),
]

TRANSFER_PAT = re.compile(
    r"ONLINE SCHEDULED TRANSFER|ONLINE BANKING TRANSFER|"
    r"OVERDRAFT PROTECTION|BKOFAMERICA MOBILE .*DEPOSIT",
    re.I,
)

INCOME_HINT = re.compile(
    r"FIDELITY|ZELLE PAYMENT FROM|ZELLE RECURRING PAYMENT FROM|"
    r"MONEY NETWORK|UI DEPOSIT|REFUND",
    re.I,
)

EXPENSE_CATS = [
    (r"PAYPAL \*HIBRETEDIRA|HIBRET", "Community", "Hibret Edir (per death, not monthly)"),
    (r"PAYPAL \*WEGENE", "Community", "Wegene"),
    (r"FRANCHISE TAX|DIGITAL TAX|H&R", "Taxes", "Tax payments / prep"),
    (r"FAST WINDOWS|OSCAR WINDOW|CODY ALONZO|TITLE 24|GRAINGER", "Home repair", "Home / window / electrical"),
    (r"AIR|SOUTHWES|EXPEDIA|MARRIOTT|COURTYARD|EMASSY|RENAISSANCE|PALM SPRING", "Travel", "Flights / hotels / trips"),
    (r"FACEBK", "Ads / marketing", "Facebook ads"),
    (r"ZELLE PAYMENT TO|VENMO|RMTLY", "Family / gifts", "Zelle / Venmo / Remitly"),
    (r"KAISER 0809305|KP SCAL|KP RX|985 MAIL ORDER|RESOLUTION IMAGING", "Medical visits", "Copays / pharmacy / imaging"),
    (r"WAYMO|UBER|PARKING|LADOT|LAZ |ACE PARKING|PMC - PAID|JINS LA", "Transport", "Rides / parking"),
    (r"LAUNDRY|OPS\*LAUND", "Household", "Laundry"),
    (r"AMAZON|WALMART|TARGET|BEST BUY|MACYS|ROSS|LOWE|STAPLES|MICHAELS", "Shopping", "Retail / Amazon"),
    (r"SHELL OIL|SHELL SERVICE|CHEVRON|JIFFY LUBE", "Auto", "Gas / service (not CC bill)"),
    (r"GODADDY|TWILIO|OPENGENIUS|TRIBALPAGES|FAMILY TREE|THE BIBLE BUS", "Tech / projects", "Domains / APIs / app charges"),
    (r"CITATION", "Fines", "Parking citations"),
    (r"DMV|AAA CA|SECRETARY OF STATE", "Gov / licenses", "DMV / AAA / SOS"),
    (r"ATM WITHDRWL", "Cash", "ATM cash"),
    (r"TST\*|IN-N-OUT|IHOP|MESSOB|STARBUCKS|MCDONALD|URTH|CAFE|RESTAURANT|BAKERY|PASTRY|BURGER|TACO|HOPDODDY|AWASH|ZANKOU|OCEAN PRIME|LAUREL GRILL|MOON HOUSE|DOORDASH|GOLDEN CITY|NATALEE|DELICE|WHOLEFDS|PAVILIONS|RALPHS|SELAM MARKET", "Food", "Restaurants / groceries"),
]


def parse_amount(s: str) -> float:
    return float((s or "").replace('"', "").replace(",", "").strip() or 0)


def clean_desc(d: str) -> str:
    return re.sub(r"\s+", " ", d.strip().strip('"'))


def match_recurring(desc: str):
    u = desc.upper()
    for pat, name, cat, cadence in RECURRING_RULES:
        if re.search(pat, u):
            return name, cat, cadence
    return None


def match_expense(desc: str):
    u = desc.upper()
    for pat, cat, label in EXPENSE_CATS:
        if re.search(pat, u):
            return cat, label
    return "Other", desc[:70]


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
        rows.append({"date": date_s, "dt": dt, "month": dt.strftime("%Y-%m"), "desc": desc, "amount": amt})

debits = [r for r in rows if r["amount"] < 0]
credits = [r for r in rows if r["amount"] > 0]

rec_map = defaultdict(list)
expense_map = defaultdict(list)
skipped_transfers = []

for r in debits:
    if TRANSFER_PAT.search(r["desc"]):
        skipped_transfers.append(r)
        continue
    rec = match_recurring(r["desc"])
    if rec:
        name, cat, cadence = rec
        rec_map[name].append({**r, "category": cat, "cadence": cadence})
    else:
        cat, label = match_expense(r["desc"])
        expense_map[cat].append({**r, "label": label})

recurring = []
for name, items in rec_map.items():
    months = sorted({i["month"] for i in items})
    by_month = defaultdict(float)
    for i in items:
        by_month[i["month"]] += abs(i["amount"])
    monthly_vals = [by_month[m] for m in months]
    typical = sorted(monthly_vals)[len(monthly_vals) // 2] if monthly_vals else 0
    last3 = [by_month[m] for m in months[-3:]] if months else []
    last3_avg = sum(last3) / len(last3) if last3 else 0
    recurring.append(
        {
            "name": name,
            "category": items[0]["category"],
            "cadence": items[0]["cadence"],
            "month_count": len(months),
            "tx_count": len(items),
            "typical_month": round(typical, 2),
            "last3_avg": round(last3_avg, 2),
            "total": round(sum(i["amount"] for i in items), 2),
            "amounts": sorted({round(abs(i["amount"]), 2) for i in items})[:8],
            "recent": [
                {"date": i["date"], "amount": i["amount"], "desc": i["desc"][:80]}
                for i in items[-4:]
            ],
        }
    )
recurring.sort(key=lambda x: -x["typical_month"])

expenses = []
for cat, items in expense_map.items():
    by_label = defaultdict(list)
    for i in items:
        by_label[i["label"]].append(i)
    details = []
    for label, txs in by_label.items():
        details.append(
            {
                "name": label,
                "tx_count": len(txs),
                "total": round(sum(t["amount"] for t in txs), 2),
                "months": sorted({t["month"] for t in txs}),
            }
        )
    details.sort(key=lambda x: x["total"])
    expenses.append(
        {
            "category": cat,
            "tx_count": len(items),
            "total": round(sum(i["amount"] for i in items), 2),
            "items": details[:18],
        }
    )
expenses.sort(key=lambda x: x["total"])

monthly = defaultdict(lambda: {"recurring": 0.0, "expenses": 0.0, "income": 0.0, "transfers_out": 0.0})
rec_names = {r["name"] for r in recurring}
for r in debits:
    if TRANSFER_PAT.search(r["desc"]):
        monthly[r["month"]]["transfers_out"] += r["amount"]
        continue
    rec = match_recurring(r["desc"])
    if rec:
        monthly[r["month"]]["recurring"] += r["amount"]
    else:
        monthly[r["month"]]["expenses"] += r["amount"]
for r in credits:
    if TRANSFER_PAT.search(r["desc"]):
        continue
    monthly[r["month"]]["income"] += r["amount"]

months = []
for m in sorted(monthly):
    x = monthly[m]
    months.append(
        {
            "month": m,
            "recurring": round(x["recurring"], 2),
            "expenses": round(x["expenses"], 2),
            "income": round(x["income"], 2),
            "transfers_out": round(x["transfers_out"], 2),
        }
    )

full_months = [m for m in months if m["month"] not in ("2025-08", "2026-09")]
last3 = full_months[-3:]
snapshot = {
    "recurring_last3": round(sum(m["recurring"] for m in last3) / 3, 2),
    "expenses_last3": round(sum(m["expenses"] for m in last3) / 3, 2),
    "income_last3": round(sum(m["income"] for m in last3) / 3, 2),
    "recurring_typical_sum": round(sum(r["typical_month"] for r in recurring), 2),
}

payload = {
    "source": "Bank of America checking statement",
    "period": {"start": rows[0]["date"], "end": rows[-1]["date"]},
    "note": "Transfers between your own accounts are excluded from recurring and expense totals.",
    "snapshot": snapshot,
    "recurring": recurring,
    "expenses": expenses,
    "months": months,
    "grok_errors": [
        {
            "item": "Hibret Edir $110",
            "why": "Per-death edir contribution, not a monthly subscription. Hits in clusters when a member dies.",
        },
        {
            "item": "The Bible Bus / Family Tree $1–$6 charges",
            "why": "App/test micro-charges, not a recurring bill.",
        },
        {
            "item": "Restaurants (Messob, Urth, In-N-Out)",
            "why": "Repeat visits, not bills.",
        },
        {
            "item": "Parking citations / meters / Waymo",
            "why": "Variable usage, not a subscription.",
        },
        {
            "item": "Scheduled transfer to CHK 5440",
            "why": "Moving money to another account of yours, not an expense.",
        },
        {
            "item": "Zelle to Behailu",
            "why": "Internal family/self transfers, not a vendor bill.",
        },
        {
            "item": "Amazon shopping / laundry / ATM",
            "why": "Spending, but not a contracted monthly charge.",
        },
    ],
}

OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print("recurring", len(recurring), "expense cats", len(expenses))
print("typical/mo sum", snapshot["recurring_typical_sum"])
print("last3 rec", snapshot["recurring_last3"], "exp", snapshot["expenses_last3"])
for r in recurring:
    print(f"{r['typical_month']:8.2f}  {r['name']} ({r['cadence']}, {r['month_count']} mo)")
