from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.achievement import Achievement, UserAchievement
from app.models.user import User


class NotFoundError(Exception):
    pass


class BadRequestError(Exception):
    pass


def create_achievement(
    db: DBSession,
    code: str,
    name: str,
    description: str,
    icon: str | None,
    points: int,
    active: bool,
) -> Achievement:
    existing = db.execute(
        select(Achievement).where(Achievement.code == code)
    ).scalar_one_or_none()
    if existing:
        raise BadRequestError("Já existe conquista com esse código.")

    achievement = Achievement(
        code=code,
        name=name,
        description=description,
        icon=icon,
        points=points,
        active=active,
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return achievement


def list_achievements(db: DBSession) -> list[Achievement]:
    return db.execute(select(Achievement).order_by(Achievement.id)).scalars().all()


def get_achievement(db: DBSession, achievement_id: int) -> Achievement:
    achievement = db.execute(
        select(Achievement).where(Achievement.id == achievement_id)
    ).scalar_one_or_none()
    if not achievement:
        raise NotFoundError("Conquista não encontrada.")
    return achievement


def update_achievement(
    db: DBSession,
    achievement_id: int,
    code: str | None,
    name: str | None,
    description: str | None,
    icon: str | None,
    points: int | None,
    active: bool | None,
) -> Achievement:
    achievement = get_achievement(db, achievement_id)

    if code is not None and code != achievement.code:
        existing = db.execute(
            select(Achievement).where(Achievement.code == code)
        ).scalar_one_or_none()
        if existing:
            raise BadRequestError("Já existe conquista com esse código.")
        achievement.code = code

    if name is not None:
        achievement.name = name
    if description is not None:
        achievement.description = description
    if icon is not None:
        achievement.icon = icon
    if points is not None:
        achievement.points = points
    if active is not None:
        achievement.active = active

    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return achievement


def delete_achievement(db: DBSession, achievement_id: int) -> None:
    achievement = get_achievement(db, achievement_id)
    db.delete(achievement)
    db.commit()


def unlock_user_achievement(
    db: DBSession,
    user_id: str,
    achievement_id: int,
    source: str | None,
    progress: int,
) -> UserAchievement:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise NotFoundError("Usuário não encontrado.")

    achievement = db.execute(
        select(Achievement).where(Achievement.id == achievement_id)
    ).scalar_one_or_none()
    if not achievement:
        raise NotFoundError("Conquista não encontrada.")

    existing = db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise BadRequestError("Essa conquista já foi desbloqueada para este usuário.")

    user_achievement = UserAchievement(
        user_id=user_id,
        achievement_id=achievement_id,
        source=source,
        progress=progress,
    )
    db.add(user_achievement)
    db.commit()
    db.refresh(user_achievement)
    return user_achievement


def list_user_achievements(db: DBSession, user_id: str) -> list[UserAchievement]:
    return db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
        .order_by(UserAchievement.id)
    ).scalars().all()


def update_user_achievement_progress(
    db: DBSession,
    user_id: str,
    achievement_id: int,
    progress: int,
) -> UserAchievement:
    user_achievement = db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement_id,
        )
    ).scalar_one_or_none()

    if not user_achievement:
        raise NotFoundError("Conquista do usuário não encontrada.")

    user_achievement.progress = progress
    db.add(user_achievement)
    db.commit()
    db.refresh(user_achievement)
    return user_achievement