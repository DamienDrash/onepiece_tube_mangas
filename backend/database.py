"""DuckDB persistence layer for VAPID keys, push subscriptions, and settings."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

import duckdb

logger = logging.getLogger(__name__)

_conn: Optional[duckdb.DuckDBPyConnection] = None


def _db_path() -> Path:
    storage = Path(os.getenv("STORAGE_DIR", "./data"))
    storage.mkdir(parents=True, exist_ok=True)
    return storage / "onepiece.duckdb"


def get_connection() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        _conn = duckdb.connect(str(_db_path()))
        _init_schema(_conn)
    return _conn


def _init_schema(conn: duckdb.DuckDBPyConnection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS vapid_keys (
            id INTEGER PRIMARY KEY,
            private_key TEXT NOT NULL,
            public_key TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            endpoint TEXT PRIMARY KEY,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    logger.debug("DuckDB schema initialized at %s", _db_path())


def get_vapid_keys() -> Optional[tuple]:
    conn = get_connection()
    row = conn.execute(
        "SELECT private_key, public_key FROM vapid_keys WHERE id = 1"
    ).fetchone()
    return (row[0], row[1]) if row else None


def save_vapid_keys(private_key: str, public_key: str) -> None:
    conn = get_connection()
    conn.execute("""
        INSERT INTO vapid_keys (id, private_key, public_key)
        VALUES (1, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            private_key = excluded.private_key,
            public_key = excluded.public_key
    """, [private_key, public_key])
    logger.info("VAPID keys persisted to DuckDB")


def get_subscriptions() -> List[Dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT endpoint, p256dh, auth FROM push_subscriptions"
    ).fetchall()
    return [
        {"endpoint": r[0], "keys": {"p256dh": r[1], "auth": r[2]}}
        for r in rows
    ]


def subscription_exists(endpoint: str) -> bool:
    conn = get_connection()
    row = conn.execute(
        "SELECT 1 FROM push_subscriptions WHERE endpoint = ?", [endpoint]
    ).fetchone()
    return row is not None


def add_subscription(endpoint: str, p256dh: str, auth: str) -> bool:
    try:
        conn = get_connection()
        conn.execute("""
            INSERT INTO push_subscriptions (endpoint, p256dh, auth)
            VALUES (?, ?, ?)
            ON CONFLICT (endpoint) DO UPDATE SET
                p256dh = excluded.p256dh,
                auth = excluded.auth
        """, [endpoint, p256dh, auth])
        return True
    except Exception as exc:
        logger.error("Failed to save subscription: %s", exc)
        return False


def remove_subscription(endpoint: str) -> bool:
    try:
        conn = get_connection()
        conn.execute(
            "DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]
        )
        return True
    except Exception as exc:
        logger.error("Failed to remove subscription: %s", exc)
        return False


def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_connection()
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?", [key]
    ).fetchone()
    return row[0] if row else default


def save_setting(key: str, value: str) -> None:
    conn = get_connection()
    conn.execute("""
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT (key) DO UPDATE SET value = excluded.value
    """, [key, value])
