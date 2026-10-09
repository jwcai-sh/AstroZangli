"""SQLite storage for the reference site's five-planets and Rahu datasets."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DATASET_FIVE_PLANETS = "five_planets"
DATASET_RAHU = "rahu"


def ensure_aux_schema(db: sqlite3.Connection) -> None:
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS website_five_planets (
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            day INTEGER NOT NULL,
            payload_json TEXT NOT NULL,
            source_url TEXT NOT NULL,
            fetched_at REAL NOT NULL,
            raw_sha256 TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (year, month, day)
        );

        CREATE TABLE IF NOT EXISTS website_rahu_years (
            year INTEGER PRIMARY KEY,
            payload_json TEXT NOT NULL,
            source_url TEXT NOT NULL,
            fetched_at REAL NOT NULL,
            raw_sha256 TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS website_aux_crawl_queue (
            dataset TEXT NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL DEFAULT 0,
            day INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            error TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (dataset, year, month, day)
        );
        """
    )


def initialize_aux_queue(db: sqlite3.Connection, start_year: int, end_year: int) -> None:
    if not 1 <= start_year <= end_year <= 2500:
        raise ValueError("years must be within 1..2500")

    ensure_aux_schema(db)
    db.executemany(
        """
        INSERT OR IGNORE INTO website_aux_crawl_queue(dataset, year, month, day)
        VALUES (?, ?, ?, ?)
        """,
        (
            (DATASET_FIVE_PLANETS, year, month, day)
            for year in range(start_year, end_year + 1)
            for month in range(1, 13)
            for day in range(1, 31)
        ),
    )
    db.executemany(
        """
        INSERT OR IGNORE INTO website_aux_crawl_queue(dataset, year)
        VALUES (?, ?)
        """,
        ((DATASET_RAHU, year) for year in range(start_year, end_year + 1)),
    )
    with db:
        db.execute(
            """
            UPDATE website_aux_crawl_queue
            SET status='done', error=''
            WHERE dataset=? AND year BETWEEN ? AND ?
              AND EXISTS (
                  SELECT 1 FROM website_five_planets p
                  WHERE p.year=website_aux_crawl_queue.year
                    AND p.month=website_aux_crawl_queue.month
                    AND p.day=website_aux_crawl_queue.day
              )
            """,
            (DATASET_FIVE_PLANETS, start_year, end_year),
        )
        db.execute(
            """
            UPDATE website_aux_crawl_queue
            SET status='done', error=''
            WHERE dataset=? AND year BETWEEN ? AND ?
              AND EXISTS (
                  SELECT 1 FROM website_rahu_years r
                  WHERE r.year=website_aux_crawl_queue.year
              )
            """,
            (DATASET_RAHU, start_year, end_year),
        )


def save_five_planets(
    db: sqlite3.Connection,
    year: int,
    month: int,
    day: int,
    payload: dict[str, Any],
    source_url: str,
    fetched_at: float,
    raw_sha256: str,
) -> None:
    _save(
        db,
        """
        INSERT INTO website_five_planets
            (year, month, day, payload_json, source_url, fetched_at, raw_sha256, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(year, month, day) DO UPDATE SET
            payload_json=excluded.payload_json,
            source_url=excluded.source_url,
            fetched_at=excluded.fetched_at,
            raw_sha256=excluded.raw_sha256,
            updated_at=excluded.updated_at
        """,
        (year, month, day, payload, source_url, fetched_at, raw_sha256),
    )


def save_rahu_year(
    db: sqlite3.Connection,
    year: int,
    payload: dict[str, Any],
    source_url: str,
    fetched_at: float,
    raw_sha256: str,
) -> None:
    _save(
        db,
        """
        INSERT INTO website_rahu_years
            (year, payload_json, source_url, fetched_at, raw_sha256, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(year) DO UPDATE SET
            payload_json=excluded.payload_json,
            source_url=excluded.source_url,
            fetched_at=excluded.fetched_at,
            raw_sha256=excluded.raw_sha256,
            updated_at=excluded.updated_at
        """,
        (year, payload, source_url, fetched_at, raw_sha256),
    )


def _save(
    db: sqlite3.Connection,
    statement: str,
    values: tuple[Any, ...],
) -> None:
    updated_at = datetime.now(timezone.utc).isoformat()
    serialized = []
    for value in values:
        if isinstance(value, dict):
            serialized.append(json.dumps(value, ensure_ascii=False, sort_keys=True))
        else:
            serialized.append(value)
    db.execute(statement, tuple(serialized) + (updated_at,))
