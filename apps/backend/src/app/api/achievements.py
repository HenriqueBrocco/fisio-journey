from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.achievement import (
    AchievementCreate,
    AchievementOut,
    AchievementUpdate,
    UserAchievementCreate,
    UserAchievementOut,
    UserAchievementProgressUpdate,
)
from app.services.achievements_service import (
    BadRequestError,
    NotFoundError,
    create_achievement,
    delete_achievement,
    get_achievement,
    list_achievements,
    list_user_achievements,
    unlock_user_achievement,
    update_achievement,
    update_user_achievement_progress,
)

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.post("", response_model=AchievementOut, status_code=status.HTTP_201_CREATED)
def create_achievement_endpoint(
    payload: AchievementCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    try:
        return create_achievement(
            db=db,
            code=payload.code,
            name=payload.name,
            description=payload.description,
            icon=payload.icon,
            points=payload.points,
            active=payload.active,
        )
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[AchievementOut])
def list_achievements_endpoint(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return list_achievements(db)


@router.get("/{achievement_id}", response_model=AchievementOut)
def get_achievement_endpoint(
    achievement_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return get_achievement(db, achievement_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{achievement_id}", response_model=AchievementOut)
def update_achievement_endpoint(
    achievement_id: int,
    payload: AchievementUpdate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    try:
        return update_achievement(
            db=db,
            achievement_id=achievement_id,
            code=payload.code,
            name=payload.name,
            description=payload.description,
            icon=payload.icon,
            points=payload.points,
            active=payload.active,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{achievement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_achievement_endpoint(
    achievement_id: int,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    try:
        delete_achievement(db, achievement_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/users/{user_id}/{achievement_id}",
    response_model=UserAchievementOut,
    status_code=status.HTTP_201_CREATED,
)
def unlock_user_achievement_endpoint(
    user_id: str,
    achievement_id: int,
    payload: UserAchievementCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    try:
        return unlock_user_achievement(
            db=db,
            user_id=user_id,
            achievement_id=achievement_id,
            source=payload.source,
            progress=payload.progress,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}", response_model=list[UserAchievementOut])
def list_user_achievements_endpoint(
    user_id: str,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == "PATIENT" and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissão.")
    return list_user_achievements(db, user_id)


@router.put(
    "/users/{user_id}/{achievement_id}/progress",
    response_model=UserAchievementOut,
)
def update_user_achievement_progress_endpoint(
    user_id: str,
    achievement_id: int,
    payload: UserAchievementProgressUpdate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    try:
        return update_user_achievement_progress(
            db=db,
            user_id=user_id,
            achievement_id=achievement_id,
            progress=payload.progress,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))