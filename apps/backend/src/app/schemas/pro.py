from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProCreate(BaseModel):
    name: str = Field(..., max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class ProOut(BaseModel):
    id: str
    role: str
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)