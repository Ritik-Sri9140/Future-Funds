"""Section 80C room and goal match. Mirrors frontend/src/engine/tax.ts."""
from __future__ import annotations

from datetime import datetime

SECTION_80C_CAP = 150_000
EMERGENCY_MONTHS = 6

CONTRIBUTION_KEYS = (
    "epf", "ppf", "elss", "lifeInsurance", "taxFd", "nsc",
    "homeLoanPrincipal", "tuition", "ssy", "other80c",
)

PRODUCTS = (
    {"id": "elss", "lock_in": 3, "bucket": "equity"},
    {"id": "ppf", "lock_in": 15, "bucket": "debt"},
    {"id": "nsc", "lock_in": 5, "bucket": "debt"},
    {"id": "taxFd", "lock_in": 5, "bucket": "fd"},
    {"id": "ssy", "lock_in": 15, "bucket": "debt", "needs_child": True, "category": "education"},
)


def months_left_in_fy(when: datetime) -> int:
    month = when.month
    if month >= 4:
        return 16 - month
    return 4 - month


def financial_year(when: datetime) -> str:
    start = when.year if when.month >= 4 else when.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def split_amount(total: float, weights: list[float]) -> list[int]:
    total_sum = sum(weights)
    if total_sum <= 0 or total <= 0:
        return [0 for _ in weights]
    raw = [(total * w) / total_sum for w in weights]
    floors = [int(n) for n in raw]  # toward zero; amounts are non-negative
    left = round(total) - sum(floors)
    order = sorted(
        [{"i": i, "frac": raw[i] - floors[i]} for i in range(len(raw))],
        key=lambda item: (-item["frac"], item["i"]),
    )
    for item in order:
        if left <= 0:
            break
        floors[item["i"]] += 1
        left -= 1
    return floors


def _used(tax: dict) -> int:
    contributions = tax.get("contributions") or {}
    has_child = bool(tax.get("hasEligibleChild"))
    total = 0.0
    for key in CONTRIBUTION_KEYS:
        if key == "ssy" and not has_child:
            continue
        total += max(0.0, float(contributions.get(key) or 0))
    return round(total)


def _fits(product: dict, goal: dict, has_child: bool) -> bool:
    if goal.get("status") == "done" or goal.get("category") == "emergency":
        return False
    if product.get("needs_child") and not has_child:
        return False
    if product.get("category") and goal.get("category") != product["category"]:
        return False
    return int(goal.get("years") or 0) >= int(product["lock_in"])


def _best_goal(product: dict, goals: list[dict], has_child: bool) -> dict | None:
    matches = [g for g in goals if _fits(product, g, has_child)]
    matches.sort(key=lambda g: g.get("rank") or 0)
    return matches[0] if matches else None


def _product_for_bucket(bucket: str, goal: dict, has_child: bool) -> dict | None:
    options = [p for p in PRODUCTS if p["bucket"] == bucket and _fits(p, goal, has_child)]
    ssy = next((p for p in options if p["id"] == "ssy"), None)
    if ssy:
        return ssy
    options.sort(key=lambda p: -int(p["lock_in"]))
    return options[0] if options else None


def _return_for(bucket: str, assumptions: dict) -> float:
    if bucket == "equity":
        return float(assumptions.get("equityReturn") or 0)
    if bucket == "fd":
        return float(assumptions.get("fdReturn") or 0)
    return float(assumptions.get("debtReturn") or 0)


def _build(tax: dict, goals: list[dict], assumptions: dict, affordable: int) -> tuple[list[dict], dict | None]:
    has_child = bool(tax.get("hasEligibleChild"))
    buckets = ("equity", "debt", "fd")
    ranked = sorted(goals, key=lambda g: g.get("rank") or 0)

    def can_take(goal: dict) -> bool:
        allocation = goal.get("allocation") or {}
        for bucket in buckets:
            product = _product_for_bucket(bucket, goal, has_child)
            if product is not None and float(allocation.get(bucket) or 0) > 0:
                return True
        return False

    primary = next((goal for goal in ranked if can_take(goal)), None)
    if primary is None:
        return [], None

    chosen = []
    allocation = primary.get("allocation") or {}
    for bucket in buckets:
        product = _product_for_bucket(bucket, primary, has_child)
        weight = float(allocation.get(bucket) or 0)
        if product is None or weight <= 0:
            continue
        chosen.append((product, weight))
    if not chosen:
        return [], None

    amounts = split_amount(affordable, [weight for _, weight in chosen])
    suggestions = []
    for index, (product, _) in enumerate(chosen):
        suggestions.append({
            "id": product["id"],
            "goalId": primary.get("id"),
            "amount": amounts[index],
            "kind": "use",
            "lockIn": product["lock_in"],
        })

    ssy = next(p for p in PRODUCTS if p["id"] == "ssy")
    if not any(s["id"] == "ssy" for s in suggestions):
        goal = _best_goal(ssy, goals, has_child)
        if goal is not None:
            suggestions.append({
                "id": "ssy",
                "goalId": goal.get("id"),
                "amount": 0,
                "kind": "also",
                "lockIn": ssy["lock_in"],
            })

    return suggestions, {"id": primary.get("id"), "name": primary.get("name"), "category": primary.get("category")}


def assess_tax(tax: dict, monthly_surplus: float, monthly_spend: float, cash_savings: float,
               goals: list[dict], assumptions: dict, when: datetime) -> dict:
    used = _used(tax or {})
    room = max(0, SECTION_80C_CAP - used)
    months_left = months_left_in_fy(when)
    yearly_surplus = round(max(0.0, monthly_surplus) * months_left)
    emergency_gap = round(max(0.0, monthly_spend * EMERGENCY_MONTHS - max(0.0, cash_savings))) if monthly_spend > 0 else 0
    affordable = min(room, max(0, yearly_surplus - emergency_gap))
    tax_applies = (tax or {}).get("regime") == "old"
    rate = (tax or {}).get("marginalRate") or 0
    illustrative = round(affordable * rate / 100) if tax_applies and rate in (5, 20, 30) else None

    suggestions, primary = _build(tax or {}, goals, assumptions, affordable)
    if not tax_applies:
        suggestions = [{**item, "amount": 0} for item in suggestions]

    if not tax_applies:
        blocked = "regime"
    elif room <= 0:
        blocked = "room"
    elif yearly_surplus <= 0:
        blocked = "surplus"
    elif affordable <= 0:
        blocked = "emergency"
    elif not any(item["amount"] > 0 for item in suggestions):
        blocked = "horizon"
    else:
        blocked = None

    if tax_applies and blocked:
        suggestions = []
        primary = None

    return {
        "financialYear": financial_year(when),
        "cap": SECTION_80C_CAP,
        "used": used,
        "room": room,
        "monthsLeft": months_left,
        "yearlySurplus": yearly_surplus,
        "emergencyGap": emergency_gap,
        "affordable": affordable,
        "taxApplies": tax_applies,
        "illustrativeTax": illustrative,
        "suggestions": suggestions,
        "primaryGoal": primary,
        "blocked": blocked,
    }
