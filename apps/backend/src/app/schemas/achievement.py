from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AchievementCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=4)
    name: str = Field(..., max_length=120)
    description: str = Field(..., max_length=500)
    icon: str | None = Field(None, max_length=255)
    points: int = 0
    active: bool = True


class AchievementUpdate(BaseModel):
    code: str | None = Field(None, min_length=1, max_length=4)
    name: str | None = Field(None, max_length=120)
    description: str | None = Field(None, max_length=500)
    icon: str | None = Field(None, max_length=255)
    points: int | None = None
    active: bool | None = None


class AchievementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str
    icon: str | None
    points: int
    active: bool
    created_at: datetime


class UserAchievementCreate(BaseModel):
    source: str | None = Field(None, max_length=120)
    progress: int = 0


class UserAchievementProgressUpdate(BaseModel):
    progress: int


class UserAchievementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    achievement_id: int
    progress: int
    source: str | None
    unlocked_at: datetime
    created_at: datetime