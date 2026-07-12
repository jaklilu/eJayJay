"""
Template for safe SQLite usage (timeouts, explicit close, lock handling).
Use when eJayJay grows beyond JSON file storage.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "ejayjay.db"
TIMEOUT_SECONDS = 5.0


def safe_db_test() -> bool:
    conn = None
    cur = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=TIMEOUT_SECONDS)
        conn.execute("PRAGMA busy_timeout = 5000")
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        return True
    except sqlite3.OperationalError as exc:
        if "locked" in str(exc).lower():
            print("Database is locked — try again shortly.")
        else:
            print(f"Database error: {exc}")
        return False
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    print("ok" if safe_db_test() else "fail")
