from services.feature_service import FeatureService
from models.database import DatabaseManager

db_manager = DatabaseManager()
feature_service = FeatureService(db_manager)

def get_feature_service():
    return feature_service
