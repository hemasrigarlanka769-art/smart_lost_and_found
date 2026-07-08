import os
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from . import models
from .routers import items, claims, matches, notifications, admin

# Generate database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Lost and Found System API",
    description="Backend API supporting the AI-powered College Lost & Found Platform",
    version="1.0.0"
)

# CORS configuration to allow local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local upload directory for image storage fallback hosting
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include Routers
app.include_router(items.router)
app.include_router(claims.router)
app.include_router(matches.router)
app.include_router(notifications.router)
app.include_router(admin.router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "system": "Smart Lost and Found System API",
        "timestamp": os.environ.get("CURRENT_TIME", "2026-07-04T19:50:55+05:30")
    }

@app.post("/users/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """
    Saves or retrieves a newly registered user from the database.
    """
    db_user = db.query(models.User).filter(models.User.id == user_data.id).first()
    if db_user:
        return db_user
        
    db_user = models.User(
        id=user_data.id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

