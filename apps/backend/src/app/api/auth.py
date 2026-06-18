from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from passlib.exc import UnknownHashError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services.achievements_rules_service import evaluate_login_achievements
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == form.username)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    try:
        ok = verify_password(form.password, user.password_hash)
    except UnknownHashError:
        ok = False

    if not user or not ok:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_access_token(sub=user.id, role=user.role)

    evaluate_login_achievements(db, user.id)

    return TokenOut(access_token=token)
