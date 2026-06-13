from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentOut,
    AssignmentUpdate,
)
from app.schemas.session import SessionOut
from app.services.assignments_service import (
    BadRequestError,
    NotFoundError,
    create_assignment,
    get_assignment,
    list_assignments,
    update_assignment,
)
from app.services.exercise_config_service import BadRequestError as SessBadRequest
from app.services.exercise_config_service import NotFoundError as SessNotFound
from app.services.patient_sessions_service import create_session_from_assignment

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment_endpoint(
    payload: AssignmentCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
    user: User = Depends(get_current_user),
):
    try:
        return create_assignment(
            db=db,
            patient_user_id=payload.patient_user_id,
            exercise_id=payload.exercise_id,
            config_id=payload.config_id,
            schedule=payload.schedule,
            active=payload.active,
            pro_user=user,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[AssignmentOut])
def list_assignments_endpoint(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
    patient_user_id: str | None = None,
):
    return list_assignments(db, user, patient_user_id)


@router.get("/{assignment_id}", response_model=AssignmentOut)
def get_assignment_endpoint(
    assignment_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        a = get_assignment(db, user, assignment_id)
        return a
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestError as e:
        if str(e) == "Sem permissão":
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{assignment_id}", response_model=AssignmentOut)
def update_assignment_endpoint(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    try:
        return update_assignment(
            db=db,
            assignment_id=assignment_id,
            schedule=payload.schedule,
            active=payload.active,
            config_id=payload.config_id,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{assignment_id}/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED
)
def create_session_from_assignment_endpoint(
    assignment_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return create_session_from_assignment(db, user, assignment_id)
    except SessNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SessBadRequest as e:
        if str(e) == "Sem permissão":
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))