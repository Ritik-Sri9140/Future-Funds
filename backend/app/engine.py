"""Deterministic finance engine. Mirrors frontend/src/engine/finance.ts."""
from __future__ import annotations

import math
import random


def future_cost(cost: float, inflation_pct: float, years: float) -> float:
    return cost * (1 + inflation_pct / 100) ** years


def fv_sip(amount: float, annual_return_pct: float, months: int, step_up_pct: float = 0.0) -> float:
    r = annual_return_pct / 1200
    value, a = 0.0, amount
    for m in range(months):
        if m > 0 and m % 12 == 0:
            a *= 1 + step_up_pct / 100
        value = (value + a) * (1 + r)
    return value


def required_sip(target: float, annual_return_pct: float, months: int, step_up_pct: float = 0.0) -> float:
    if target <= 0:
        return 0.0
    if months <= 0:
        return target
    return target / fv_sip(1.0, annual_return_pct, months, step_up_pct)


def allocation_for(years: int) -> dict:
    if years > 10:
        return {"equity": 75, "debt": 15, "gold": 10, "fd": 0}
    if years > 7:
        return {"equity": 60, "debt": 30, "gold": 10, "fd": 0}
    if years > 3:
        return {"equity": 30, "debt": 55, "gold": 10, "fd": 5}
    if years > 1:
        return {"equity": 10, "debt": 50, "gold": 0, "fd": 40}
    return {"equity": 0, "debt": 20, "gold": 0, "fd": 80}


def buffered_return(ret_pct: float, vol_pct: float, years: float) -> float:
    """Matches frontend bufferedReturn: SIP sized for about 80% Monte Carlo odds."""
    cushion = 1.28 * vol_pct / math.sqrt(max(years, 1))
    return max(0.5, ret_pct - cushion)


def goal_plan(cost_today: float, inflation_pct: float, years: int, annual_return_pct: float,
              saved: float = 0.0, step_up_pct: float = 0.0, volatility_pct: float = 0.0) -> dict:
    months = max(years, 0) * 12
    fc = future_cost(cost_today, inflation_pct, max(years, 0))
    rate = buffered_return(annual_return_pct, volatility_pct, years) if volatility_pct > 0 else annual_return_pct
    saved_future = saved * (1 + rate / 1200) ** months
    need = max(fc - saved_future, 0.0)
    sip = required_sip(need, rate, months, step_up_pct)
    return {
        "future_cost": round(fc),
        "saved_future": round(saved_future),
        "monthly_sip": round(sip),
        "years": years,
        "suggested_allocation_pct": allocation_for(years),
    }


def monte_carlo(start: float, monthly: float, years: int, annual_return_pct: float, volatility_pct: float,
                target: float, runs: int = 1000, seed: int = 42, step_up_pct: float = 0.0) -> dict:
    rng = random.Random(seed)
    months = max(years, 0) * 12
    mu = annual_return_pct / 1200
    sd = volatility_pct / 100 / math.sqrt(12)
    finals = []
    for _ in range(runs):
        v, a = start, monthly
        for m in range(months):
            if m > 0 and m % 12 == 0:
                a *= 1 + step_up_pct / 100
            v = max(0.0, (v + a) * (1 + mu + sd * rng.gauss(0, 1)))
        finals.append(v)
    finals.sort()
    hits = sum(1 for v in finals if v >= target)
    return {
        "success_probability": round(hits / runs, 3),
        "p10": round(finals[int(0.1 * (runs - 1))]),
        "median": round(finals[int(0.5 * (runs - 1))]),
        "p90": round(finals[int(0.9 * (runs - 1))]),
    }


def cost_of_delay(monthly: float, annual_return_pct: float, years: int, delay_years: int) -> dict:
    now = fv_sip(monthly, annual_return_pct, years * 12)
    later = fv_sip(monthly, annual_return_pct, max(years - delay_years, 0) * 12)
    catch_up = monthly * now / later if later > 0 else None
    return {
        "start_now": round(now),
        "start_late": round(later),
        "lost": round(now - later),
        "catch_up_monthly_sip": round(catch_up) if catch_up else None,
    }
