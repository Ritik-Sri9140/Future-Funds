from app.engine import cost_of_delay, fv_sip, future_cost, goal_plan, monte_carlo, required_sip


def test_future_cost_matches_brd_example():
    # ₹50L in 15 years at 6% inflation ≈ ₹1.20Cr
    assert round(future_cost(5_000_000, 6, 15) / 100_000, 1) == 119.8


def test_required_sip_round_trips():
    sip = required_sip(10_000_000, 12, 240)
    assert abs(fv_sip(sip, 12, 240) - 10_000_000) < 1


def test_slide_seven_numbers():
    assert round(fv_sip(10_000, 12, 360) / 100_000) == 353
    assert round(fv_sip(20_000, 12, 240) / 100_000) == 200


def test_saved_money_reduces_sip():
    assert goal_plan(2_500_000, 7, 7, 9, saved=300_000)["monthly_sip"] < goal_plan(2_500_000, 7, 7, 9)["monthly_sip"]


def test_step_up_lowers_starting_sip():
    assert required_sip(1e7, 12, 240, 10) < required_sip(1e7, 12, 240, 0)


def test_monte_carlo_bounds():
    r = monte_carlo(0, 50_000, 10, 12, 18, 1_000_000, runs=300)
    assert r["success_probability"] == 1.0
    r = monte_carlo(0, 100, 10, 12, 18, 1e9, runs=300)
    assert r["success_probability"] == 0.0


def test_cost_of_delay_positive():
    assert cost_of_delay(10_000, 12, 30, 1)["lost"] > 0


def test_buffered_sip_is_likely_to_hit():
    from app.engine import monte_carlo

    plain = goal_plan(2_000_000, 6, 15, 12)["monthly_sip"]
    buffered = goal_plan(2_000_000, 6, 15, 12, volatility_pct=16)["monthly_sip"]
    assert buffered > plain
    odds = monte_carlo(0, buffered, 15, 12, 16, future_cost(2_000_000, 6, 15), runs=400, seed=7)
    assert odds["success_probability"] >= 0.7
