from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SessionCreate(BaseModel):
    exercise_id: int
    assignment_id: int
    config_snapshot: dict[str, Any] = Field(default_factory=dict)


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_user_id: str
    exercise_id: int
    assignment_id: int
    status: str
    config_snapshot: dict
    started_at: datetime
    finished_at: datetime | None = None


class SessionSummaryIn(BaseModel):
    reps: int = 0
    rom: float = 0.0  # no seu model está Integer, mas vamos tratar como float no schema
    cadence: float | None = None
    alerts: list = Field(default_factory=list)
    accuracy: int | None = None


class SessionSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    reps: int
    rom: float
    cadence: float | None = None
    alerts: list = []
    accuracy: int | None = None
    created_at: datetime


class SessionFinalizeIn(BaseModel):
    reps: int | None = None
    rom: float | None = None
    cadence: float | None = None
    alerts: list[Any] | None = None
    accuracy: int | None = None


class AchievementUnlockedOut(BaseModel):
    code: str
    name: str
    description: str
    icon: str | None = None
    points: int


class SessionFinalizeOut(BaseModel):
    session: SessionOut
    summary: SessionSummaryOut | None = None
    new_achievements: list[AchievementUnlockedOut] = []