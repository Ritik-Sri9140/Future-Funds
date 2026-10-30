from datetime import datetime

from app.tax import assess_tax, financial_year, months_left_in_fy, split_amount

WHEN = datetime(2026, 10, 30)
ASSUMPTIONS = {"equityReturn": 12, "debtReturn": 7, "fdReturn": 6.5}
LONG = {"equity": 75, "debt": 15, "gold": 10, "fd": 0}
HOUSE = {"equity": 30, "debt": 55, "gold": 10, "fd": 5}


def tax(**overrides):
    base = {
        "regime": "old",
        "marginalRate": 0,
        "hasEligibleChild": False,
        "contributions": {},
    }
    base.update(overrides)
    return base


def goal(**overrides):
    base = {
        "id": "retire",
        "name": "Retirement",
        "category": "retirement",
        "years": 20,
        "rank": 1,
        "status": "on-track",
        "allocation": dict(LONG),
    }
    base.update(overrides)
    return base


def test_financial_year_and_months_left():
    assert financial_year(datetime(2026, 10, 30)) == "2026-27"
    assert months_left_in_fy(datetime(2026, 10, 30)) == 6
    assert financial_year(datetime(2026, 4, 1)) == "2026-27"
    assert months_left_in_fy(datetime(2026, 4, 1)) == 12
    assert financial_year(datetime(2027, 3, 15)) == "2026-27"
    assert months_left_in_fy(datetime(2027, 3, 15)) == 1
    assert financial_year(datetime(2027, 1, 1)) == "2026-27"
    assert months_left_in_fy(datetime(2027, 1, 1)) == 3


def test_split_gives_the_extra_rupee_to_the_larger_fraction():
    assert split_amount(100_000, [75, 15]) == [83333, 16667]
    assert split_amount(150_000, [75, 15]) == [125000, 25000]


def test_old_regime_fills_the_cap_after_emergency_cash():
    result = assess_tax(
        tax(marginalRate=30, contributions={"epf": 0}),
        monthly_surplus=20_000,
        monthly_spend=50_000,
        cash_savings=400_000,
        goals=[goal()],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    assert result["room"] == 150_000
    assert result["yearlySurplus"] == 120_000
    assert result["emergencyGap"] == 0
    assert result["affordable"] == 120_000
    assert result["illustrativeTax"] == 36_000
    assert result["blocked"] is None
    assert [(s["id"], s["amount"]) for s in result["suggestions"]] == [("elss", 100_000), ("ppf", 20_000)]


def test_sukanya_is_ignored_until_a_child_is_marked():
    hidden = assess_tax(
        tax(contributions={"ssy": 50_000, "epf": 10_000}),
        0, 0, 0, [], ASSUMPTIONS, WHEN,
    )
    shown = assess_tax(
        tax(hasEligibleChild=True, contributions={"ssy": 50_000, "epf": 10_000}),
        0, 0, 0, [], ASSUMPTIONS, WHEN,
    )
    assert hidden["used"] == 10_000
    assert shown["used"] == 60_000


def test_emergency_cash_comes_before_a_lock_in():
    result = assess_tax(
        tax(),
        monthly_surplus=20_000,
        monthly_spend=50_000,
        cash_savings=0,
        goals=[goal()],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    assert result["emergencyGap"] == 300_000
    assert result["affordable"] == 0
    assert result["blocked"] == "emergency"
    assert result["suggestions"] == []


def test_new_regime_does_not_estimate_tax():
    result = assess_tax(
        tax(regime="new", marginalRate=30),
        monthly_surplus=20_000,
        monthly_spend=10_000,
        cash_savings=100_000,
        goals=[goal()],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    assert result["taxApplies"] is False
    assert result["illustrativeTax"] is None
    assert result["blocked"] == "regime"
    assert result["suggestions"]
    assert all(item["amount"] == 0 for item in result["suggestions"])


def test_emergency_goal_is_not_a_lock_in_even_when_the_date_is_far():
    result = assess_tax(
        tax(),
        monthly_surplus=50_000,
        monthly_spend=10_000,
        cash_savings=100_000,
        goals=[
            goal(id="cash", name="Emergency fund", category="emergency", years=12, rank=1),
            goal(rank=2),
        ],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    assert result["primaryGoal"]["id"] == "retire"
    assert all(item["goalId"] != "cash" for item in result["suggestions"])


def test_short_goals_are_not_given_a_lock_in():
    result = assess_tax(
        tax(),
        monthly_surplus=20_000,
        monthly_spend=10_000,
        cash_savings=100_000,
        goals=[goal(years=2, allocation=HOUSE)],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    assert result["blocked"] == "horizon"
    assert result["suggestions"] == []


def test_full_cap_leaves_no_room():
    result = assess_tax(
        tax(contributions={"epf": 200_000}),
        50_000, 10_000, 100_000, [goal()], ASSUMPTIONS, WHEN,
    )
    assert result["used"] == 200_000
    assert result["room"] == 0
    assert result["blocked"] == "room"


def test_education_with_a_child_uses_sukanya_for_the_debt_share():
    result = assess_tax(
        tax(hasEligibleChild=True),
        monthly_surplus=50_000,
        monthly_spend=10_000,
        cash_savings=100_000,
        goals=[goal(id="edu", category="education", years=16)],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    ids = [item["id"] for item in result["suggestions"]]
    assert ids == ["elss", "ssy"]


def test_sukanya_is_an_extra_when_retirement_is_funded_first():
    result = assess_tax(
        tax(hasEligibleChild=True),
        monthly_surplus=50_000,
        monthly_spend=10_000,
        cash_savings=100_000,
        goals=[
            goal(),
            goal(id="edu", name="Child education", category="education", years=16, rank=2),
        ],
        assumptions=ASSUMPTIONS,
        when=WHEN,
    )
    kinds = {item["id"]: item["kind"] for item in result["suggestions"]}
    assert kinds["elss"] == "use"
    assert kinds["ppf"] == "use"
    assert kinds["ssy"] == "also"
