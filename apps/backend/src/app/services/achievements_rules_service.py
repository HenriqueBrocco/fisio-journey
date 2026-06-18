from __future__ import annotations

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session as DBSession

from app.models.achievement import Achievement, UserAchievement
from app.models.session import Session as SessionModel


def grant_achievement_if_missing(
    db: DBSession,
    user_id: str,
    code: str,
    source: str | None = None,
    progress: int = 100,
):
    achievement = db.execute(
        select(Achievement).where(
            Achievement.code == code,
            Achievement.active == True,
        )
    ).scalar_one_or_none()

    if not achievement:
        return None

    existing = db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement.id,
        )
    ).scalar_one_or_none()

    if existing:
        return None

    unlocked = UserAchievement(
        user_id=user_id,
        achievement_id=achievement.id,
        source=source,
        progress=progress,
    )
    db.add(unlocked)
    db.flush()

    return {
        "code": achievement.code,
        "name": achievement.name,
        "description": achievement.description,
        "icon": achievement.icon,
        "points": achievement.points,
    }


def evaluate_finished_session_achievements(
    db: DBSession,
    user_id: str,
) -> list[dict]:
    unlocked_now: list[dict] = []

    finished_sessions = db.execute(
        select(SessionModel).where(
            SessionModel.patient_user_id == user_id,
            SessionModel.status == "FINISHED",
        )
    ).scalars().all()

    finished_count = len(finished_sessions)

    if finished_count >= 1:
        ach = grant_achievement_if_missing(
            db,
            user_id=user_id,
            code="AC02",
            source="primeiro_exercicio_concluido",
            progress=100,
        )
        if ach:
            unlocked_now.append(ach)

        ach = grant_achievement_if_missing(
            db,
            user_id=user_id,
            code="AC03",
            source="primeira_sessao_concluida",
            progress=100,
        )
        if ach:
            unlocked_now.append(ach)

    distinct_days_count = db.execute(
        select(func.count(func.distinct(cast(SessionModel.finished_at, Date))))
        .where(
            SessionModel.patient_user_id == user_id,
            SessionModel.status == "FINISHED",
            SessionModel.finished_at.is_not(None),
        )
    ).scalar_one()

    if distinct_days_count >= 7:
        ach = grant_achievement_if_missing(
            db,
            user_id=user_id,
            code="AC04",
            source="7_dias_com_sessoes_concluidas",
            progress=100,
        )
        if ach:
            unlocked_now.append(ach)

    return unlocked_now