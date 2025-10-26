from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from models.feature_models import Feature as FeatureModel, FeatureCreate, FeatureResponse, FeatureUpdate
from dependencies import get_feature_service
from services.feature_service import FeatureService

router = APIRouter()

@router.get("/features", response_model=List[FeatureResponse])
async def get_features(
    feature_service: FeatureService = Depends(get_feature_service)
):
    features = feature_service.get_all_features()
    # Transform database rows to match FeatureResponse model
    result = []
    for feature in features:
        submitted_by = feature.get('submitted_by', 0)
        # Handle string values like 'anonymous'
        if isinstance(submitted_by, str):
            try:
                submitted_by = int(submitted_by) if submitted_by.isdigit() else 0
            except (ValueError, AttributeError):
                submitted_by = 0
        
        result.append(FeatureResponse(
            id=feature['id'],
            title=feature['title'],
            description=feature.get('description', ''),
            upvotes=feature.get('upvotes', 0) or 0,
            status=feature.get('status', 'Suggestion') or 'Suggestion',
            submitted_by=submitted_by or 0,
            created_at=feature.get('created_at', '') or ''
        ))
    return result

@router.post("/features", response_model=FeatureResponse)
async def create_feature(
    feature: FeatureCreate,
    feature_service: FeatureService = Depends(get_feature_service)
):
    # Create a basic feature without requiring authentication for now
    # Set default values for the feature
    db_feature = FeatureModel(
        title=feature.title,
        description=feature.description,
        upvotes=0,
        status='Suggestion',
        submitted_by=1
    )
    new_feature_id = feature_service.create_feature(db_feature)
    
    # Fetch the created feature to get all fields including timestamp
    features = feature_service.get_all_features()
    created_feature = next((f for f in features if f['id'] == new_feature_id), None)
    
    if created_feature:
        return FeatureResponse(
            id=created_feature['id'],
            title=created_feature['title'],
            description=created_feature.get('description', ''),
            upvotes=created_feature.get('upvotes', 0) or 0,
            status=created_feature.get('status', 'Suggestion') or 'Suggestion',
            submitted_by=created_feature.get('submitted_by', 0) or 0,
            created_at=created_feature.get('created_at', '') or ''
        )
    
    # Fallback if feature not found
    return {
        "id": new_feature_id,
        "title": feature.title,
        "description": feature.description,
        "upvotes": 0,
        "status": "Suggestion",
        "submitted_by": 1,
        "created_at": ""
    }

@router.put("/features/{feature_id}", response_model=FeatureResponse)
async def update_feature(
    feature_id: int,
    feature_update: FeatureUpdate,
    feature_service: FeatureService = Depends(get_feature_service)
):
    """Update a feature"""
    # Convert Pydantic model to dict, excluding None values
    updates = {k: v for k, v in feature_update.dict().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    success = feature_service.update_feature(feature_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    # Fetch and return the updated feature
    features = feature_service.get_all_features()
    updated_feature = next((f for f in features if f['id'] == feature_id), None)
    
    if updated_feature:
        return FeatureResponse(
            id=updated_feature['id'],
            title=updated_feature['title'],
            description=updated_feature.get('description', ''),
            upvotes=updated_feature.get('upvotes', 0) or 0,
            status=updated_feature.get('status', 'Suggestion') or 'Suggestion',
            submitted_by=updated_feature.get('submitted_by', 0) or 0,
            created_at=updated_feature.get('created_at', '') or ''
        )
    
    raise HTTPException(status_code=404, detail="Feature not found")

@router.delete("/features/{feature_id}")
async def delete_feature(
    feature_id: int,
    feature_service: FeatureService = Depends(get_feature_service)
):
    """Delete a feature"""
    success = feature_service.delete_feature(feature_id)
    if not success:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    return {"message": "Feature deleted successfully"}