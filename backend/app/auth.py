import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import firebase_admin
from firebase_admin import credentials, auth
from .database import get_db
from . import models

security = HTTPBearer()

# Try to initialize Firebase Admin SDK if service account file exists or env variables are set
firebase_initialized = False
try:
    firebase_cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if firebase_cred_path and os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
        print("Firebase Admin SDK successfully initialized.")
    else:
        # Check if we can initialize from default credentials or if we should skip
        print("Firebase Credentials path not set or file not found. Running in hybrid/mock mode.")
except Exception as e:
    print(f"Failed to initialize Firebase Admin: {e}. Running in hybrid/mock mode.")

def verify_token(cred: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Decodes the Bearer token and verifies it with Firebase.
    """
    token = cred.credentials

    if not firebase_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK is not initialized on the server.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(decoded_token: dict = Depends(verify_token), db: Session = Depends(get_db)) -> models.User:
    """
    Retrieves the User from the database using the verified UID.
    """
    uid = decoded_token.get("uid")
    
    db_user = db.query(models.User).filter(models.User.id == uid).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not synced in database."
        )
    
    return db_user

def require_role(allowed_roles: list):
    """
    Dependency generator for checking user roles.
    """
    def dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )
        return current_user
    return dependency

# Helper dependencies
get_admin_user = require_role(["admin"])
get_staff_or_admin = require_role(["faculty", "admin"])
get_any_user = require_role(["student", "faculty", "admin"])
