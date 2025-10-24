from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from models.feature_models import Feature as FeatureModel, FeatureCreate
from routes.auth import get_current_user
from ..dependencies import get_feature_service
from services.feature_service import FeatureService

router = APIRouter()

@router.get("/features", response_model=List[FeatureModel])
async def get_features(
    feature_service: FeatureService = Depends(get_feature_service)
):
    features = feature_service.get_all_features()
    return features

@router.post("/features", response_model=FeatureModel)
async def create_feature(
    feature: FeatureCreate,
    current_user: dict = Depends(get_current_user),
    feature_service: FeatureService = Depends(get_feature_service)
):
    db_feature = FeatureModel(**feature.dict(), submitted_by=current_user["id"])
    new_feature_id = feature_service.create_feature(db_feature)
    db_feature.id = new_feature_id
    return db_feature