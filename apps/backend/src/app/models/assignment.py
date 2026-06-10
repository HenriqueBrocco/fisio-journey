from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExerciseConfig(Base):
    __tablename__ = "exercise_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercises.id"))
    patient_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))

    # Deixa flexível em JSON pra amputação / futuro:
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    num_series: Mapped[int] = mapped_column(Integer)
    num_reps: Mapped[int] = mapped_column(Integer)
    descanso_rep: Mapped[int] = mapped_column(Integer)
    descanso_serie: Mapped[int] = mapped_column(Integer)
    lado_ativo: Mapped[str] = mapped_column(String)
    meta_extensao: Mapped[int] = mapped_column(Integer)
    repouso_max: Mapped[int] = mapped_column(Integer)
    limite_tronco: Mapped[int] = mapped_column(Integer)
    tolerancia: Mapped[int] = mapped_column(Integer)


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercises.id"))
    config_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercise_configs.id"))

    schedule: Mapped[str] = mapped_column(String(30), default="DAILY")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
