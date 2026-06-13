from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.assignment import (
    ConfigParamsUpdate,
    ExerciseConfigCreate,
    ExerciseConfigOut,
)
from app.services.assignments_service import (
    BadRequestError,
    NotFoundError,
    create_exercise_config,
    get_config,
    list_configs,
)
from app.services.exercise_config_service import BadRequestError as CfgBadRequest
from app.services.exercise_config_service import NotFoundError as CfgNotFound
from app.services.exercise_config_service import update_config_params

router = APIRouter(prefix="/exercise-configs", tags=["exercise-configs"])


@router.post("", response_model=ExerciseConfigOut, status_code=status.HTTP_201_CREATED)
def create_config_endpoint(
    payload: ExerciseConfigCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
    user: User = Depends(get_current_user),
):
    try:
        return create_exercise_config(
            db=db,
            exercise_id=payload.exercise_id,
            patient_user_id=payload.patient_user_id,
            params=payload.params,
            num_series=payload.num_series,
            num_reps=payload.num_reps,
            descanso_rep=payload.descanso_rep,
            descanso_serie=payload.descanso_serie,
            lado_ativo=payload.lado_ativo,
            meta_extensao=payload.meta_extensao,
            repouso_max=payload.repouso_max,
            limite_tronco=payload.limite_tronco,
            tolerancia=payload.tolerancia,
            pro_user=user,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[ExerciseConfigOut])
def list_configs_endpoint(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
    patient_user_id: str | None = None,
    exercise_id: int | None = None,
):
    if user.role == "PATIENT":
        patient_user_id = user.id

    return list_configs(db, patient_user_id, exercise_id)


@router.get("/{config_id}", response_model=ExerciseConfigOut)
def get_config_endpoint(config_id: int, db: DBSession = Depends(get_db)):
    try:
        return get_config(db, config_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{config_id}/params", response_model=ExerciseConfigOut)
def update_config_params_endpoint(
    config_id: int,
    payload: ConfigParamsUpdate,
    db: DBSession = Depends(get_db),
    _=Depends(require_role("PRO")),
    user: User = Depends(get_current_user),
):
    try:
        return update_config_params(db, user, config_id, payload.params)
    except CfgNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except CfgBadRequest as e:
        raise HTTPException(status_code=400, detail=str(e))