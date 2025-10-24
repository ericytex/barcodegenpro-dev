from pydantic import BaseModel
from datetime import datetime

class FeatureBase(BaseModel):
    title: str
    description: str

class FeatureCreate(FeatureBase):
    pass

class Feature(FeatureBase):
    id: int
    upvotes: int
    status: str
    submitted_by: int
    created_at: datetime

    class Config:
        orm_mode = True
