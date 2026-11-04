from fastapi import APIRouter, Depends, Response, status

from ...application.goals import ContributionData, GoalData
from ...container import Container
from ...domain.entities import GoalContribution, GoalProgress, GoalsOverview, User
from ..dependencies import get_container, get_current_user
from ..schemas import (
    ContributionIn,
    ContributionOut,
    ContributionResultOut,
    GoalDetailOut,
    GoalIn,
    GoalOut,
    GoalsOverviewOut,
    GoalStatusIn,
)

router = APIRouter(prefix="/goals", tags=["goals"])


def goal_out(p: GoalProgress) -> GoalOut:
    g = p.goal
    return GoalOut(
        id=g.id, name=g.name, kind=g.kind, icon=g.icon, color=g.color, target_amount=g.target_amount,
        currency=g.currency, target_date=g.target_date, note=g.note, status=g.status, completed_on=g.completed_on,
        created_on=g.created_on, saved=p.saved, remaining=p.remaining, over=p.over, percent=p.percent,
        months_left=p.months_left, monthly_needed=p.monthly_needed, pace=p.pace, projected_date=p.projected_date,
    )


def goals_overview_out(o: GoalsOverview) -> GoalsOverviewOut:
    return GoalsOverviewOut(
        reserved=o.reserved, free=o.free, active_count=o.active_count, top=[goal_out(p) for p in o.top]
    )


def _detail(p: GoalProgress, contributions: list[GoalContribution]) -> GoalDetailOut:
    return GoalDetailOut(**goal_out(p).model_dump(), contributions=[ContributionOut.model_validate(c) for c in contributions])


@router.get("", response_model=list[GoalOut])
def list_goals(user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return [goal_out(p) for p in c.list_goals.execute(user.id)]


@router.get("/{goal_id}", response_model=GoalDetailOut)
def get_goal(goal_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return _detail(*c.get_goal.execute(user.id, goal_id))


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(data: GoalIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return goal_out(c.create_goal.execute(user.id, GoalData(**data.model_dump())))


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, data: GoalIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return goal_out(c.update_goal.execute(user.id, goal_id, GoalData(**data.model_dump())))


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    c.delete_goal.execute(user.id, goal_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{goal_id}/status", response_model=GoalOut)
def set_status(goal_id: int, data: GoalStatusIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    """Marcar como logrado (solo si ya llegó a la meta), archivar o reactivar."""
    return goal_out(c.set_goal_status.execute(user.id, goal_id, data.status))


def _result(r) -> ContributionResultOut:
    return ContributionResultOut(
        goal=goal_out(r.progress),
        contribution=ContributionOut.model_validate(r.contribution) if r.contribution else None,
        just_completed=r.just_completed,
    )


@router.post("/{goal_id}/contributions", response_model=ContributionResultOut, status_code=status.HTTP_201_CREATED)
def add_contribution(
    goal_id: int, data: ContributionIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    return _result(c.add_contribution.execute(user.id, goal_id, ContributionData(**data.model_dump())))


@router.put("/{goal_id}/contributions/{contribution_id}", response_model=ContributionResultOut)
def update_contribution(
    goal_id: int,
    contribution_id: int,
    data: ContributionIn,
    user: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    return _result(c.update_contribution.execute(user.id, goal_id, contribution_id, ContributionData(**data.model_dump())))


@router.delete("/{goal_id}/contributions/{contribution_id}", response_model=ContributionResultOut)
def delete_contribution(
    goal_id: int, contribution_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    return _result(c.delete_contribution.execute(user.id, goal_id, contribution_id))
