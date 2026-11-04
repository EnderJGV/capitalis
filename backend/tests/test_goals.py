from datetime import date
from decimal import Decimal

import pytest

from app.application.accounts import AccountData, CreateAccount
from app.application.dashboard import GetSummary
from app.application.goals import (
    AddContribution,
    ContributionData,
    CreateGoal,
    DeleteContribution,
    DeleteGoal,
    GetGoal,
    GoalData,
    ListGoals,
    SetGoalStatus,
    UpdateContribution,
    UpdateGoal,
)
from app.application.rates import CurrencyConverter
from app.domain.entities import User
from app.domain.exceptions import (
    ContributionNotFound,
    GoalNotFound,
    GoalWithdrawalTooLarge,
    InvalidGoalStatus,
)

from .fakes import FakeRateProvider, FakeUnitOfWork, Store

D = Decimal
TODAY = date(2026, 11, 3)


@pytest.fixture
def env():
    store = Store()
    uow = FakeUnitOfWork(store)
    factory = lambda: uow  # noqa: E731
    user = User(id=1, name="Ana", email="ana@example.com", password_hash="x", currency="BRL", language="es")
    bank = CreateAccount(factory).execute(1, AccountData(name="Itaú", currency="BRL", initial_balance=D("5000")))
    return store, factory, user, bank


def make_goal(factory, **overrides):
    values = dict(name="Viaje a Japón", target_amount=D("1000"), currency="BRL", target_date=date(2027, 4, 30))
    values.update(overrides)
    return CreateGoal(factory).execute(1, GoalData(**values), TODAY)


def add(factory, goal_id, amount, day=TODAY, **kw):
    return AddContribution(factory).execute(1, goal_id, ContributionData(D(amount), day, **kw), TODAY)


def test_create_goal_with_what_is_already_saved(env):
    _, factory, _, _ = env
    p = make_goal(factory, initial_amount=D("250"))
    assert (p.saved, p.percent, p.remaining) == (D("250"), 25, D("750"))
    # 6 meses (nov a abr) → 750 / 6
    assert (p.months_left, p.monthly_needed) == (6, D("125.00"))


def test_contribution_then_withdrawal(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    r = add(factory, goal.goal.id, "400")
    assert (r.progress.saved, r.just_completed) == (D("400"), False)
    r = add(factory, goal.goal.id, "-150")
    assert r.progress.saved == D("250")


def test_withdrawal_cannot_exceed_savings(env):
    store, factory, _, _ = env
    goal = make_goal(factory, initial_amount=D("100"))
    with pytest.raises(GoalWithdrawalTooLarge):
        add(factory, goal.goal.id, "-100.01")


def test_goal_completes_once_and_celebrates_once(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    r1 = add(factory, goal.goal.id, "900")
    r2 = add(factory, goal.goal.id, "100")
    r3 = add(factory, goal.goal.id, "50")
    assert [r.just_completed for r in (r1, r2, r3)] == [False, True, False]
    assert (r3.progress.goal.status, r3.progress.goal.completed_on) == ("completed", TODAY)
    assert (r3.progress.percent, r3.progress.over) == (100, D("50"))


def test_withdrawal_reopens_a_completed_goal(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    add(factory, goal.goal.id, "1000")
    r = add(factory, goal.goal.id, "-1")
    assert (r.progress.goal.status, r.progress.goal.completed_on) == ("active", None)
    assert add(factory, goal.goal.id, "1").just_completed  # vuelve a celebrarse al volver a llegar


def test_mark_as_achieved_only_when_completed(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    with pytest.raises(InvalidGoalStatus):
        SetGoalStatus(factory).execute(1, goal.goal.id, "achieved", TODAY)
    add(factory, goal.goal.id, "1000")
    achieved = SetGoalStatus(factory).execute(1, goal.goal.id, "achieved", TODAY)
    assert achieved.goal.status == "achieved" and achieved.goal.completed_on == TODAY
    with pytest.raises(InvalidGoalStatus):
        add(factory, goal.goal.id, "10")  # un objetivo logrado ya no recibe aportes


def test_archive_and_reactivate(env):
    _, factory, _, _ = env
    goal = make_goal(factory, initial_amount=D("1000"))
    assert goal.goal.status == "completed"
    SetGoalStatus(factory).execute(1, goal.goal.id, "archived", TODAY)
    back = SetGoalStatus(factory).execute(1, goal.goal.id, "active", TODAY)
    assert back.goal.status == "completed"  # lo ahorrado ya alcanza la meta


def test_editing_the_target_settles_the_status(env):
    _, factory, _, _ = env
    goal = make_goal(factory, initial_amount=D("600"))
    lower = UpdateGoal(factory).execute(1, goal.goal.id, GoalData("Viaje", D("500"), "BRL"), TODAY)
    assert lower.goal.status == "completed"
    higher = UpdateGoal(factory).execute(1, goal.goal.id, GoalData("Viaje", D("2000"), "BRL"), TODAY)
    assert higher.goal.status == "active"


def test_edit_and_delete_contributions(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    c = add(factory, goal.goal.id, "300").contribution
    updated = UpdateContribution(factory).execute(1, goal.goal.id, c.id, ContributionData(D("1000"), TODAY), TODAY)
    assert updated.just_completed and updated.progress.goal.status == "completed"
    removed = DeleteContribution(factory).execute(1, goal.goal.id, c.id, TODAY)
    assert (removed.progress.saved, removed.progress.goal.status) == (D("0"), "active")
    with pytest.raises(ContributionNotFound):
        DeleteContribution(factory).execute(1, goal.goal.id, c.id, TODAY)


def test_deleting_a_contribution_cannot_leave_a_negative_balance(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    deposit = add(factory, goal.goal.id, "100").contribution
    add(factory, goal.goal.id, "-80")
    with pytest.raises(GoalWithdrawalTooLarge):
        DeleteContribution(factory).execute(1, goal.goal.id, deposit.id, TODAY)


def test_goals_are_private_to_their_owner(env):
    _, factory, _, _ = env
    goal = make_goal(factory)
    with pytest.raises(GoalNotFound):
        GetGoal(factory).execute(2, goal.goal.id)
    with pytest.raises(GoalNotFound):
        add_other = AddContribution(factory).execute(2, goal.goal.id, ContributionData(D("1"), TODAY), TODAY)  # noqa: F841


def test_delete_goal_removes_its_contributions(env):
    store, factory, _, _ = env
    goal = make_goal(factory, initial_amount=D("100"))
    DeleteGoal(factory).execute(1, goal.goal.id)
    assert store.goals == {} and store.contributions == {}
    assert ListGoals(factory).execute(1, TODAY) == []


# --- Resumen ---------------------------------------------------------------------------------


def summary(factory, user):
    converter = CurrencyConverter(factory, FakeRateProvider({"USD": D("1"), "BRL": D("5.5")}))
    return GetSummary(factory, converter).execute(user)


def test_contributions_reserve_money_without_touching_balances(env):
    store, factory, user, bank = env
    goal = make_goal(factory)
    add(factory, goal.goal.id, "400", account_id=bank.id)

    s = summary(factory, user)
    assert s.total_balance == D("5000") and (s.income, s.expense) == (D("0"), D("0"))
    assert (s.goals.reserved, s.goals.free) == (D("400"), D("4600"))
    assert store.transactions == {} and store.transfers == {}


def test_reserved_converts_other_currencies(env):
    _, factory, user, _ = env
    usd = make_goal(factory, name="Notebook", currency="USD", target_amount=D("2000"), initial_amount=D("100"))
    assert usd.saved == D("100")
    s = summary(factory, user)
    assert s.goals.reserved == D("550.00")


def test_achieved_and_archived_goals_stop_reserving(env):
    _, factory, user, _ = env
    done = make_goal(factory, name="Celular", initial_amount=D("1000"))
    SetGoalStatus(factory).execute(1, done.goal.id, "achieved", TODAY)
    other = make_goal(factory, name="Viejo", initial_amount=D("300"))
    SetGoalStatus(factory).execute(1, other.goal.id, "archived", TODAY)
    assert summary(factory, user).goals.reserved == D("0")


def test_summary_lists_the_three_closest_active_goals(env):
    _, factory, user, _ = env
    for name, due in (("D", date(2028, 1, 1)), ("A", date(2026, 12, 1)), ("B", date(2027, 1, 1)), ("C", None)):
        make_goal(factory, name=name, target_date=due)
    s = summary(factory, user)
    assert [p.goal.name for p in s.goals.top] == ["A", "B", "D"] and s.goals.active_count == 4
