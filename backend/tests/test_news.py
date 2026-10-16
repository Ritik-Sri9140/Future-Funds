from datetime import datetime, timezone

import app.news as news


def _raw(article_id: str, country: str, published: str = "2026-10-14T08:00:00.000000Z") -> dict:
    return {
        "uuid": article_id,
        "title": f"Story {article_id}",
        "description": "A market move.",
        "url": f"https://example.com/{article_id}",
        "image_url": None,
        "source": "example.com",
        "published_at": published,
        "entities": [{"symbol": "X", "country": country}],
    }


def _page(rows: list[dict], found: int | None = None) -> dict:
    return {
        "meta": {"found": found if found is not None else len(rows), "returned": len(rows), "limit": 3, "page": 1},
        "data": rows,
    }


def test_missing_token_is_not_configured(monkeypatch):
    monkeypatch.delenv("MARKETAUX_API_TOKEN", raising=False)
    news.clear_cache()
    body = news.load_news()
    assert body["configured"] is False
    assert body["articles"] == []


def test_india_story_overrides_the_same_global_item():
    merged = news.merge_articles(
        [_raw("1", "in")],
        [_raw("1", "us"), _raw("2", "us", "2026-10-14T09:00:00.000000Z")],
    )
    by_id = {item["id"]: item for item in merged}
    assert by_id["1"]["scope"] == "in"
    assert by_id["2"]["scope"] == "global"
    assert [item["id"] for item in merged] == ["2", "1"]


def test_india_entity_in_the_global_feed_is_domestic():
    merged = news.merge_articles([], [_raw("9", "in")])
    assert merged[0]["scope"] == "in"


def test_stories_without_a_link_are_dropped():
    broken = _raw("3", "us")
    broken["url"] = ""
    assert news.merge_articles([broken], []) == []


def test_day_windows_use_india_local_midnights():
    now = datetime(2026, 10, 14, 9, 15, tzinfo=timezone.utc)
    assert news.day_windows(now, -330) == [
        ("2026-10-12T18:30:00", "2026-10-13T18:30:00"),
        ("2026-10-13T18:30:00", "2026-10-14T09:15:00"),
    ]


def test_collect_pages_until_the_short_page(monkeypatch):
    monkeypatch.setenv("MARKETAUX_API_TOKEN", "test-token")
    news.clear_cache()
    calls: list[int] = []

    def fetch(params):
        calls.append((params.get("countries"), params["page"]))
        assert params["api_token"] == "test-token"
        assert params["published_after"]
        assert params["published_before"]
        assert params["must_have_entities"] == "true"
        if params.get("countries") == "in":
            assert params["filter_entities"] == "true"
        if params["page"] == 1:
            return _page([_raw("a", "in"), _raw("b", "in"), _raw("c", "in")], found=4)
        return _page([_raw("d", "in")], found=4)

    body = news.load_news(fetch=fetch, use_cache=False)
    assert {item["id"] for item in body["articles"]} == {"a", "b", "c", "d"}
    assert all(item["scope"] == "in" for item in body["articles"])
    assert calls == [("in", 1), ("in", 2), (None, 1), (None, 2)] * 2


def test_cache_does_not_call_marketaux_twice(monkeypatch):
    monkeypatch.setenv("MARKETAUX_API_TOKEN", "test-token")
    news.clear_cache()
    calls = {"n": 0}

    def fetch(params):
        calls["n"] += 1
        return _page([])

    monkeypatch.setattr(news, "_fetch", fetch)
    first = news.load_news()
    second = news.load_news()
    assert first == second
    assert calls["n"] == 4


def test_upstream_failure_is_not_cached(monkeypatch):
    monkeypatch.setenv("MARKETAUX_API_TOKEN", "test-token")
    news.clear_cache()
    calls = {"n": 0}

    def fetch(params):
        calls["n"] += 1
        raise news.NewsUpstreamError("down")

    monkeypatch.setattr(news, "_fetch", fetch)
    try:
        news.load_news()
    except news.NewsUpstreamError:
        pass
    else:
        raise AssertionError("expected NewsUpstreamError")
    try:
        news.load_news()
    except news.NewsUpstreamError:
        pass
    else:
        raise AssertionError("expected NewsUpstreamError")
    assert calls["n"] == 2
