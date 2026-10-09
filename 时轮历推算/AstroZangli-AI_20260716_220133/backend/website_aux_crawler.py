"""Parsers and worker logic for the reference site's auxiliary datasets."""

from __future__ import annotations

import fcntl
import hashlib
import logging
import random
import re
import signal
import sqlite3
import time
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

from website_aux_store import (
    DATASET_FIVE_PLANETS,
    DATASET_RAHU,
    ensure_aux_schema,
    initialize_aux_queue,
    save_five_planets,
    save_rahu_year,
)


FIVE_PLANETS_URL = "http://astro.xzzzqzyy.com/dba/twlsdata/per/wyz/search"
RAHU_URL = "http://astro.xzzzqzyy.com/dba/twlsdata/per/lhsj/search"
SUMMARY_FIELDS = ("积月闰余", "曜基数", "整零数", "太阳基数")
STOP = False

_CHANGE_NUM = re.compile(
    r"change_num\(\s*[\"']?(\d+)[\"']?\s*,\s*[\"']?([dh])[\"']?\s*\)"
)
_CHANGE_NUM1 = re.compile(
    r"change_num1\(\s*[\"']?(\d+)[\"']?\s*,\s*[\"']?([ym])[\"']?\s*\)"
)


def _values(node: Any, unit: str = "d") -> list[int]:
    if node is None:
        return []
    return [int(value) for value, found_unit in _CHANGE_NUM.findall(str(node)) if found_unit == unit]


def _header(node: Any) -> tuple[int | None, int | None]:
    values = {unit: int(value) for value, unit in _CHANGE_NUM1.findall(str(node))}
    return values.get("y"), values.get("m")


def _summary(month_block: Any) -> dict[str, list[int]]:
    rows = month_block.select("table tr") if month_block else []
    if len(rows) < 2:
        raise ValueError("page is missing the month summary table")
    labels = [cell.get_text(" ", strip=True) for cell in rows[0].find_all("td")]
    cells = rows[1].find_all("td")
    result = {name: _values(cell) for name, cell in zip(labels, cells)}
    for field in SUMMARY_FIELDS:
        result.setdefault(field, [])
    return result


def _column(cell: Any) -> dict[str, Any]:
    title = cell.select_one(".data-column-title")
    label = title.get_text(" ", strip=True) if title else cell.get_text(" ", strip=True)
    return {"label": label, "values": _values(cell)}


def parse_five_planets_day_html(year: int, month: int, day: int, html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.select_one(".tw_div h3")
    response_year, response_month = _header(heading)
    if (response_year, response_month) != (year, month):
        raise ValueError("five-planets response year/month mismatch")

    month_block = soup.select_one(".tw_div dl.dl_month")
    summary = _summary(month_block)
    day_container = soup.select_one(".tw_div .dl_div")
    blocks = day_container.find_all("dl", recursive=False) if day_container else []
    if not blocks:
        raise ValueError("five-planets page has no daily sections")

    response_day = next((_values(block.select_one("h4"), unit="h") for block in blocks), [])
    if response_day != [day]:
        raise ValueError("five-planets response day mismatch")

    sections = []
    for index, block in enumerate(blocks):
        title = block.select_one("h4")
        title_text = title.get_text(" ", strip=True) if title else ""
        cells = block.select("td")
        if index == 0:
            name = "五曜公积日"
        else:
            name = title_text
        sections.append({"name": name, "columns": [_column(cell) for cell in cells]})

    return {
        "year": year,
        "month": month,
        "day": day,
        "label": f"公元{year}年藏历{month}月{day}日",
        "summary": summary,
        "sections": sections,
        "available": True,
        "error": "",
    }


def _rahu_day(block: Any) -> dict[str, Any]:
    heading = block.select_one("h4")
    day_values = _values(heading, unit="h")
    if len(day_values) != 1:
        raise ValueError("Rahu day block has no unique day number")
    cells = sorted(
        block.select("td[class*='group-column-']"),
        key=lambda cell: next(
            int(part.split("-")[-1])
            for part in cell.get("class", [])
            if part.startswith("group-column-")
        ),
    )
    return {"day": day_values[0], "columns": [_values(cell) for cell in cells]}


def parse_rahu_year_html(year: int, html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(".tw_div")
    month_blocks = []
    if root:
        for container in root.find_all("div", recursive=False):
            heading = container.find("h3", recursive=False)
            month_block = container.find("dl", class_="dl_month", recursive=False)
            if heading is None or month_block is None:
                continue
            response_year, response_month = _header(heading)
            if response_year != year or response_month is None:
                raise ValueError("Rahu response year/month mismatch")
            title = container.select_one("dl.dl_lh_title")
            day_container = title.select_one(".dl_div") if title else None
            day_blocks = day_container.find_all("dl", recursive=False) if day_container else []
            days = [_rahu_day(block) for block in day_blocks]
            if not days:
                raise ValueError("Rahu month has no daily values")
            is_leap = "闰" in heading.get_text(" ", strip=True)
            month_blocks.append(
                {
                    "monthIndex": len(month_blocks) + 1,
                    "month": response_month,
                    "isLeap": is_leap,
                    "label": f"公元{year}年藏历{response_month}月" + ("（闰月）" if is_leap else ""),
                    "summary": _summary(month_block),
                    "days": days,
                }
            )
    if not month_blocks:
        raise ValueError("Rahu page has no lunar month blocks")
    return {"year": year, "months": month_blocks, "available": True, "error": ""}


def retry_delay(attempt: int, retry_after: str | None = None) -> float:
    delay = min(21600, 30 * 2 ** min(attempt, 10)) + random.uniform(0, 10)
    if retry_after:
        try:
            server_delay = float(retry_after)
        except ValueError:
            try:
                server_delay = parsedate_to_datetime(retry_after).timestamp() - time.time()
            except (ValueError, TypeError, OverflowError):
                server_delay = 0
        delay = max(delay, server_delay)
    return delay


def _request(session: requests.Session, dataset: str, year: int, month: int, day: int) -> tuple[dict[str, Any], str, bytes]:
    if dataset == DATASET_FIVE_PLANETS:
        response = session.get(
            FIVE_PLANETS_URL,
            params={"year": year, "month": month, "day": day},
            timeout=(10, 60),
        )
        response.raise_for_status()
        return parse_five_planets_day_html(year, month, day, response.text), response.url, response.content
    response = session.get(RAHU_URL, params={"year": year}, timeout=(10, 90))
    response.raise_for_status()
    return parse_rahu_year_html(year, response.text), response.url, response.content


def pause(seconds: float) -> None:
    until = time.monotonic() + seconds
    while not STOP and time.monotonic() < until:
        time.sleep(min(1, max(0, until - time.monotonic())))


def run_worker(
    db_path: Path,
    start_year: int,
    end_year: int,
    interval: float = 2.0,
    dataset: str = "all",
    log_file: Path | None = None,
    max_requests: int = 0,
    max_consecutive_failures: int = 10,
    resume_existing: bool = False,
) -> int:
    if max_consecutive_failures < 1:
        raise ValueError("max_consecutive_failures must be positive")
    global STOP
    STOP = False
    handlers: list[logging.Handler] = [logging.StreamHandler()]
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        from logging.handlers import RotatingFileHandler

        handlers.append(RotatingFileHandler(log_file, maxBytes=5000000, backupCount=3))
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", handlers=handlers, force=True)

    lock = open(str(db_path) + ".aux_crawler.lock", "a")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise RuntimeError("another auxiliary crawler is already running")

    db = sqlite3.connect(db_path, timeout=60)
    db.row_factory = sqlite3.Row
    ensure_aux_schema(db)
    if not resume_existing:
        initialize_aux_queue(db, start_year, end_year)
    session = requests.Session()
    session.headers["User-Agent"] = "KalachakraResearchCache/1.0 (single-worker auxiliary cache)"
    request_count = 0
    consecutive_failures = 0

    def stop(signum: int, frame: Any) -> None:
        global STOP
        nonlocal request_count
        del signum, frame
        STOP = True
        logging.info("STOP requested after %s requests", request_count)

    previous_handlers = (signal.getsignal(signal.SIGTERM), signal.getsignal(signal.SIGINT))
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    filters: tuple[str, ...] = (DATASET_FIVE_PLANETS, DATASET_RAHU) if dataset == "all" else (dataset,)
    try:
        logging.info("START years=%s..%s dataset=%s interval=%s", start_year, end_year, dataset, interval)
        while not STOP:
            placeholders = ",".join("?" for _ in filters)
            row = db.execute(
                f"""
                SELECT dataset,year,month,day,attempts
                FROM website_aux_crawl_queue
                WHERE dataset IN ({placeholders}) AND status!='done'
                  AND year BETWEEN ? AND ? AND next_attempt<=?
                ORDER BY CASE WHEN status=? THEN 0 ELSE 1 END,
                         CASE WHEN year BETWEEN 2020 AND 2035 THEN 0 ELSE 1 END,
                         CASE dataset WHEN 'rahu' THEN 0 ELSE 1 END,
                         attempts,year,month,day
                LIMIT 1
                """,
                (*filters, start_year, end_year, time.time(),
                 "retry" if request_count % 2 == 0 else "pending"),
            ).fetchone()
            if row is None:
                remaining = db.execute(
                    f"SELECT count(*) FROM website_aux_crawl_queue WHERE dataset IN ({placeholders}) AND status!='done' AND year BETWEEN ? AND ?",
                    (*filters, start_year, end_year),
                ).fetchone()[0]
                if not remaining:
                    logging.info("COMPLETE")
                    return 0
                pause(30)
                continue

            try:
                payload, source_url, raw = _request(session, row["dataset"], row["year"], row["month"], row["day"])
                fetched_at = time.time()
                raw_sha256 = hashlib.sha256(raw).hexdigest()
                with db:
                    if row["dataset"] == DATASET_FIVE_PLANETS:
                        save_five_planets(db, row["year"], row["month"], row["day"], payload, source_url, fetched_at, raw_sha256)
                    else:
                        save_rahu_year(db, row["year"], payload, source_url, fetched_at, raw_sha256)
                    db.execute(
                        "UPDATE website_aux_crawl_queue SET status='done',attempts=?,error='' WHERE dataset=? AND year=? AND month=? AND day=?",
                        (row["attempts"] + 1, row["dataset"], row["year"], row["month"], row["day"]),
                    )
                logging.info("SAVED %s %s-%02d-%02d", row["dataset"], row["year"], row["month"], row["day"])
                consecutive_failures = 0
            except (requests.RequestException, ValueError) as error:
                consecutive_failures += 1
                attempt = row["attempts"] + 1
                response = getattr(error, "response", None)
                delay = retry_delay(attempt, response.headers.get("Retry-After") if response is not None else None)
                with db:
                    db.execute(
                        "UPDATE website_aux_crawl_queue SET status='retry',attempts=?,next_attempt=?,error=? WHERE dataset=? AND year=? AND month=? AND day=?",
                        (attempt, time.time() + delay, str(error)[:500], row["dataset"], row["year"], row["month"], row["day"]),
                    )
                logging.warning("RETRY %s %s-%02d-%02d in %.0fs: %s", row["dataset"], row["year"], row["month"], row["day"], delay, error)
            request_count += 1
            if consecutive_failures >= max_consecutive_failures:
                logging.error("CIRCUIT_BREAKER consecutive_failures=%s; manual restart required", consecutive_failures)
                return 2
            if max_requests and request_count >= max_requests:
                logging.info("MAX_REQUESTS reached: %s", request_count)
                return 0
            pause(interval + random.uniform(0, 1))
    finally:
        logging.info(
            "STOP queue=%s",
            db.execute("SELECT dataset,status,count(*) FROM website_aux_crawl_queue GROUP BY dataset,status").fetchall(),
        )
        signal.signal(signal.SIGTERM, previous_handlers[0])
        signal.signal(signal.SIGINT, previous_handlers[1])
        session.close()
        db.close()
        lock.close()
