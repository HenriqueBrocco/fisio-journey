from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.pro import ProCreate, ProOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/pro", response_model=ProOut, status_code=status.HTTP_201_CREATED)
def create_pro_endpoint(
    payload: ProCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("PRO")),
):
    exists = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    if exists:
        raise HTTPException(status_code=409, detail="Email já cadastrado.")

    pro = User(
        role="PRO",
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )

    db.add(pro)
    db.commit()
    db.refresh(pro)
    return pro