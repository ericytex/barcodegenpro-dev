from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional

Base = declarative_base()

class Feature(Base):
    __tablename__ = 'features'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    upvotes = Column(Integer, default=0)
    status = Column(String, default='Suggestion')
    submitted_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FeatureCreate(BaseModel):
    title: str
    description: str

class FeatureUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    upvotes: Optional[int] = None
    status: Optional[str] = None
    submitted_by: Optional[int] = None

class FeatureResponse(BaseModel):
    id: int
    title: str
    description: str
    upvotes: int
    status: str
    submitted_by: int  # Changed to int to match database
    created_at: str

    class Config:
        from_attributes = True
