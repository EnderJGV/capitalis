from datetime import date
from decimal import Decimal

import pytest

from app.domain.entities import Goal, GoalContribution
from app.domain.exceptions import InvalidContribution, InvalidGoalTarget
from app.domain.goals import build_progress, months_left, monthly_needed, next_status, pace, projected_date

D = Decimal


def goal(**overrides):
    values = dict(
        id=1, user_id=1, name="Viaje", target_amount=D("1200"), currency="BRL",
        created_on=date(2026, 1, 1), target_date=date(2026, 12, 31),
    )
    values.update(overrides)
    return Goal(**values)


# --- Meses y ahorro mensual -------------------------------------------------------------------


def test_months_left_counts_the_current_month():
    assert months_left(date(2026, 11, 3), date(2026, 11, 30)) == 1
    assert months_left(date(2026, 11, 3), date(2027, 1, 15)) == 3
    assert months_left(date(2026, 1, 31), date(2026, 12, 1)) == 12


def test_months_left_is_at_least_one_when_the_date_passed():
    assert months_left(date(2026, 11, 3), date(2026, 5, 1)) == 1


def test_monthly_needed_rounds_up_to_the_cent():
    assert monthly_needed(D("100"), 3) == D("33.34")
    assert monthly_needed(D("1200"), 12) == D("100.00")
    assert monthly_needed(D("0"), 4) == D("0.00")


# --- Ritmo ------------------------------------------------------------------------------------


def test_pace_without_date_is_none():
    assert pace(D("10"), D("100"), date(2026, 1, 1), None, date(2026, 6, 1)) is None


def test_pace_levels():
    # A mitad de camino se esperan 600 de 1200.
    created, end, today = date(2026, 1, 1), date(2026, 1, 1).replace(year=2027), date(2026, 7, 2)
    expected = (D("1200") * (today - created).days / (end - created).days).quantize(D("0.01"))
    assert pace(expected, D("1200"), created, end, today) == "on_track"
    assert pace(expected * D("0.85"), D("1200"), created, end, today) == "slightly_behind"
    assert pace(expected * D("0.5"), D("1200"), created, end, today) == "behind"


def test_pace_overdue_only_when_not_completed():
    created, end = date(2026, 1, 1), date(2026, 6, 1)
    assert pace(D("100"), D("1200"), created, end, date(2026, 7, 1)) == "overdue"
    assert pace(D("1200"), D("1200"), created, end, date(2026, 7, 1)) == "on_track"


def test_pace_on_track_right_after_creation():
    assert pace(D("0"), D("1200"), date(2026, 3, 1), date(2027, 3, 1), date(2026, 3, 1)) == "on_track"


# --- Proyección -------------------------------------------------------------------------------


def test_projection_uses_the_last_three_months():
    today = date(2026, 11, 3)
    contributions = [(date(2026, 10, 1), D("300")), (date(2026, 9, 1), D("300")), (date(2026, 8, 20), D("300")),
                     (date(2025, 1, 1), D("5000"))]  # demasiado vieja
    assert projected_date(contributions, D("600"), today) == date(2027, 1, 3)  # 300/mes → 2 meses


def test_projection_without_recent_savings_is_unknown():
    assert projected_date([(date(2025, 1, 1), D("100"))], D("500"), date(2026, 11, 3)) is None
    assert projected_date([(date(2026, 11, 1), D("-100"))], D("500"), date(2026, 11, 3)) is None


def test_projection_when_already_reached_is_today():
    assert projected_date([], D("0"), date(2026, 11, 3)) == date(2026, 11, 3)


# --- Estado -----------------------------------------------------------------------------------


def test_status_moves_between_active_and_completed():
    assert next_status("active", D("1200"), D("1200")) == "completed"
    assert next_status("active", D("1199.99"), D("1200")) == "active"
    assert next_status("completed", D("900"), D("1200")) == "active"
    assert next_status("completed", D("1500"), D("1200")) == "completed"


def test_achieved_and_archived_never_change_by_themselves():
    for status in ("achieved", "archived"):
        assert next_status(status, D("0"), D("1200")) == status
        assert next_status(status, D("5000"), D("1200")) == status


# --- Progreso ---------------------------------------------------------------------------------


def test_progress_of_an_active_goal():
    p = build_progress(goal(), [(date(2026, 6, 1), D("400")), (date(2026, 7, 1), D("200"))], date(2026, 7, 15))
    assert (p.saved, p.remaining, p.percent, p.over) == (D("600"), D("600"), 50, D("0"))
    assert p.months_left == 6 and p.monthly_needed == D("100.00")


def test_progress_caps_at_100_and_reports_the_excess():
    p = build_progress(goal(status="completed"), [(date(2026, 6, 1), D("1500"))], date(2026, 7, 1))
    assert (p.percent, p.over, p.remaining) == (100, D("300"), D("0"))
    assert p.monthly_needed is None and p.pace is None


def test_progress_without_date_has_no_monthly_target():
    p = build_progress(goal(target_date=None), [], date(2026, 7, 1))
    assert (p.percent, p.months_left, p.monthly_needed, p.pace) == (0, None, None, None)


# --- Entidades --------------------------------------------------------------------------------


def test_goal_target_must_be_positive():
    with pytest.raises(InvalidGoalTarget):
        goal(target_amount=D("0"))


def test_contribution_cannot_be_zero_but_can_be_negative():
    assert GoalContribution(id=None, goal_id=1, user_id=1, amount=D("-50"), date=date.today()).amount == D("-50")
    with pytest.raises(InvalidContribution):
        GoalContribution(id=None, goal_id=1, user_id=1, amount=D("0"), date=date.today())
