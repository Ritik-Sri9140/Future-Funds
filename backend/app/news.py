"""Financial news from Marketaux, cached so the free quota is spent once an hour."""

from __future__ import annotations

import json
import logging
import os
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

PAGE_LIMIT = 3  # free plan maximum
MAX_PAGES = 4  # per local day, so yesterday is not crowded out by today
CACHE_SECONDS = 60 * 60
ENDPOINT = "https://api.marketaux.com/v1/news/all"
DEFAULT_TZ_OFFSET = -330  # India, minutes as returned by Date.getTimezoneOffset()

_lock = threading.Lock()
_cache: dict | None = None


class NewsUpstreamError(Exception):
    pass


def configured() -> bool:
    return bool(os.getenv("MARKETAUX_API_TOKEN", "").strip())


def clear_cache() -> None:
    global _cache
    with _lock:
        _cache = None


def clamp_offset(minutes: int) -> int:
    return max(-14 * 60, min(14 * 60, int(minutes)))


def day_windows(now: datetime, tz_offset_minutes: int) -> list[tuple[str, str]]:
    """Yesterday and today in the browser's zone, as UTC bounds for Marketaux."""
    now_utc = now.astimezone(timezone.utc).replace(microsecond=0)
    local_now = now_utc + timedelta(minutes=-tz_offset_minutes)
    local_today = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    windows: list[tuple[str, str]] = []
    for days_ago in (1, 0):
        start_local = local_today - timedelta(days=days_ago)
        end_local = start_local + timedelta(days=1)
        start_utc = start_local + timedelta(minutes=tz_offset_minutes)
        end_utc = now_utc if days_ago == 0 else end_local + timedelta(minutes=tz_offset_minutes)
        windows.append((
            start_utc.strftime("%Y-%m-%dT%H:%M:%S"),
            end_utc.strftime("%Y-%m-%dT%H:%M:%S"),
        ))
    return windows


def _fetch(params: dict) -> dict:
    token = str(params.get("api_token", ""))
    query = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"{ENDPOINT}?{query}",
        headers={"Accept": "application/json", "User-Agent": "FutureFunds/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            payload = json.loads(res.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")[:300].replace(token, "")
        raise NewsUpstreamError(f"Marketaux returned {exc.code}. {body}".strip()) from exc
    except urllib.error.URLError as exc:
        raise NewsUpstreamError(f"Could not reach Marketaux: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise NewsUpstreamError("Marketaux returned a response that was not JSON.") from exc
    if isinstance(payload, dict) and payload.get("error") and "data" not in payload:
        message = str(payload["error"].get("message") or "Marketaux request failed").replace(token, "")
        raise NewsUpstreamError(message)
    return payload


def _collect(token: str, fetch, countries: str | None, published_after: str, published_before: str) -> list[dict]:
    rows: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        params = {
            "api_token": token,
            "language": "en",
            "must_have_entities": "true",
            "published_after": published_after,
            "published_before": published_before,
            "limit": PAGE_LIMIT,
            "page": page,
        }
        if countries:
            params["countries"] = countries
            params["filter_entities"] = "true"
        payload = fetch(params)
        batch = payload.get("data") or []
        rows.extend(item for item in batch if isinstance(item, dict))
        meta = payload.get("meta") or {}
        returned = int(meta.get("returned") or len(batch))
        found = int(meta.get("found") or 0)
        if returned < PAGE_LIMIT or (found and len(rows) >= found):
            break
    return rows


def _is_india(raw: dict) -> bool:
    for entity in raw.get("entities") or []:
        if str(entity.get("country") or "").lower() == "in":
            return True
    return False


def _article(raw: dict, scope: str) -> dict | None:
    article_id = str(raw.get("uuid") or "").strip()
    title = str(raw.get("title") or "").strip()
    url = str(raw.get("url") or "").strip()
    if not article_id or not title or not url:
        return None
    summary = str(raw.get("description") or raw.get("snippet") or "").strip()
    return {
        "id": article_id,
        "title": title,
        "summary": summary,
        "source": str(raw.get("source") or "").strip(),
        "url": url,
        "imageUrl": raw.get("image_url") or None,
        "publishedAt": str(raw.get("published_at") or ""),
        "scope": scope,
    }


def merge_articles(india: list[dict], worldwide: list[dict]) -> list[dict]:
    """India wins when the same story appears in both feeds."""
    by_id: dict[str, dict] = {}
    for raw in worldwide:
        item = _article(raw, "in" if _is_india(raw) else "global")
        if item:
            by_id[item["id"]] = item
    for raw in india:
        item = _article(raw, "in")
        if item:
            by_id[item["id"]] = item
    return sorted(by_id.values(), key=lambda item: item["publishedAt"], reverse=True)


def load_news(
    *,
    fetch=None,
    now: datetime | None = None,
    use_cache: bool = True,
    tz_offset_minutes: int = DEFAULT_TZ_OFFSET,
) -> dict:
    global _cache
    token = os.getenv("MARKETAUX_API_TOKEN", "").strip()
    if not token:
        return {"configured": False, "articles": [], "fetchedAt": None}

    offset = clamp_offset(tz_offset_minutes)
    moment = now or datetime.now(timezone.utc)
    local_date = (moment.astimezone(timezone.utc) + timedelta(minutes=-offset)).strftime("%Y-%m-%d")
    cache_key = f"{offset}:{local_date}"
    caller_fetch = fetch or _fetch
    if use_cache and fetch is None:
        with _lock:
            if _cache and _cache["key"] == cache_key and (moment.timestamp() - _cache["at"]) < CACHE_SECONDS:
                return _cache["body"]

    india: list[dict] = []
    worldwide: list[dict] = []
    for published_after, published_before in day_windows(moment, offset):
        india.extend(_collect(token, caller_fetch, "in", published_after, published_before))
        worldwide.extend(_collect(token, caller_fetch, None, published_after, published_before))
    body = {
        "configured": True,
        "articles": merge_articles(india, worldwide),
        "fetchedAt": moment.astimezone(timezone.utc).isoformat(),
    }
    if use_cache and fetch is None:
        with _lock:
            _cache = {"at": moment.timestamp(), "key": cache_key, "body": body}
    return body


def local_published_at(now: datetime, tz_offset_minutes: int, days_ago: int, hour: int = 8) -> str:
    """UTC timestamp that falls on a local calendar day in the browser's zone."""
    offset = clamp_offset(tz_offset_minutes)
    now_utc = now.astimezone(timezone.utc).replace(microsecond=0)
    local_now = now_utc + timedelta(minutes=-offset)
    local_stamp = local_now.replace(hour=hour, minute=0, second=0, microsecond=0) - timedelta(days=days_ago)
    utc_stamp = local_stamp + timedelta(minutes=offset)
    return utc_stamp.astimezone(timezone.utc).isoformat()


_DEMO_STORIES = (
    ("demo-rbi-hold", "in", 0, "RBI holds the policy rate as retail inflation cools",
     "A sample headline: the policy rate stays put while inflation eases, and bond yields slip."),
    ("demo-global-earnings", "global", 0, "Global stocks steady ahead of major earnings",
     "A sample headline: markets pause as investors wait for results from the largest companies."),
    ("demo-nifty-banks", "in", 1, "Bank and IT shares lift the Nifty and Sensex",
     "A sample headline: domestic benchmarks close higher, led by banks and technology."),
    ("demo-crude-eases", "global", 1, "Crude oil eases, supporting Asian currencies",
     "A sample headline: cheaper oil takes pressure off currencies that rely on energy imports."),
)


def demo_feed(*, now: datetime | None = None, tz_offset_minutes: int = DEFAULT_TZ_OFFSET) -> dict:
    """Sample India and global headlines for today and yesterday."""
    moment = now or datetime.now(timezone.utc)
    offset = clamp_offset(tz_offset_minutes)
    articles = [
        {
            "id": article_id,
            "title": title,
            "summary": summary,
            "source": "Future Funds demo",
            "url": f"https://example.com/future-funds/demo/{article_id}",
            "imageUrl": None,
            "publishedAt": local_published_at(moment, offset, days_ago),
            "scope": scope,
        }
        for article_id, scope, days_ago, title, summary in _DEMO_STORIES
    ]
    articles.sort(key=lambda item: item["publishedAt"], reverse=True)
    return {
        "configured": True,
        "demo": True,
        "articles": articles,
        "fetchedAt": moment.astimezone(timezone.utc).isoformat(),
    }


def load_news_or_demo(
    *,
    fetch=None,
    now: datetime | None = None,
    use_cache: bool = True,
    tz_offset_minutes: int = DEFAULT_TZ_OFFSET,
) -> dict:
    """Live Marketaux headlines, or demo headlines when that load fails."""
    try:
        return load_news(
            fetch=fetch,
            now=now,
            use_cache=use_cache,
            tz_offset_minutes=tz_offset_minutes,
        )
    except Exception:
        logger.exception("Financial news failed; serving demo headlines")
        return demo_feed(now=now, tz_offset_minutes=tz_offset_minutes)
