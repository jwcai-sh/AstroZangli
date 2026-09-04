from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "five_elements_compare.sqlite3"


class FiveElementsCompareStore:
    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH):
        self.db_path = str(db_path)
        self._memory_connection: sqlite3.Connection | None = None
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        if self.db_path == ":memory:":
            if self._memory_connection is None:
                self._memory_connection = sqlite3.connect(self.db_path)
            return self._memory_connection
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(self.db_path)

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS five_elements_month_sources (
                    year INTEGER NOT NULL,
                    month INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (year, month, source)
                )
                """
            )

    def load_month_source(self, year: int, month: int, source: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT payload_json
                FROM five_elements_month_sources
                WHERE year = ? AND month = ? AND source = ?
                """,
                (year, month, source),
            ).fetchone()

        if row is None:
            return None
        return json.loads(row[0])

    def save_month_source(self, year: int, month: int, source: str, payload: dict[str, Any]) -> None:
        updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO five_elements_month_sources (year, month, source, payload_json, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(year, month, source) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (
                    year,
                    month,
                    source,
                    json.dumps(payload, ensure_ascii=False, sort_keys=True),
                    updated_at,
                ),
            )
