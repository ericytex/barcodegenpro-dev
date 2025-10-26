from models.database import DatabaseManager
from models.feature_models import Feature
from typing import List, Dict, Any

class FeatureService:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    def get_all_features(self) -> List[Dict[str, Any]]:
        """Get all features from the database"""
        return self.db_manager.get_all_features()

    def create_feature(self, feature: Feature) -> int:
        """Create a new feature in the database"""
        return self.db_manager.insert_feature(feature)
    
    def update_feature(self, feature_id: int, updates: Dict[str, Any]) -> bool:
        """Update a feature in the database"""
        return self.db_manager.update_feature(feature_id, updates)
    
    def delete_feature(self, feature_id: int) -> bool:
        """Delete a feature from the database"""
        return self.db_manager.delete_feature(feature_id)