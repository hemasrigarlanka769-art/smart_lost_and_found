import os
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas, auth, ai_matcher

router = APIRouter(prefix="/items", tags=["Items"])

# Cloudinary Setup (optional)
CLOUDINARY_AVAILABLE = False
try:
    import cloudinary
    import cloudinary.uploader
    if os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY"):
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True
        )
        CLOUDINARY_AVAILABLE = True
        print("Cloudinary successfully configured.")
except ImportError:
    pass

# Ensure local upload dir exists
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=dict)
def upload_image(file: UploadFile = File(...)):
    """
    Uploads an image. If Cloudinary config exists, uploads to Cloudinary.
    Otherwise, saves locally in static/uploads/ and returns local url.
    """
    if CLOUDINARY_AVAILABLE:
        try:
            result = cloudinary.uploader.upload(file.file)
            return {"image_url": result.get("secure_url")}
        except Exception as e:
            print(f"Cloudinary upload failed, falling back to local storage: {e}")
    
    # Local Storage Fallback
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
        # Return a relative URL that the frontend can load from the API
        return {"image_url": f"/static/uploads/{unique_filename}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file locally: {e}"
        )

# Trigger AI matches for a new lost item
def run_matches_for_lost(lost_item: models.LostItem, db: Session):
    found_items = db.query(models.FoundItem).filter(models.FoundItem.status == "found").all()
    for found_item in found_items:
        scores = ai_matcher.calculate_match_score(lost_item, found_item)
        if scores["overall"] >= 50.0: # Match threshold
            # Create match record
            match = models.Match(
                lost_item_id=lost_item.id,
                found_item_id=found_item.id,
                text_score=scores["text"],
                keyword_score=scores["keyword"],
                image_score=scores["image"],
                overall_score=scores["overall"],
                status="suggested"
            )
            db.add(match)
            
            # Notify lost item owner
            notif_lost = models.Notification(
                user_id=lost_item.user_id,
                title="Smart Match Found!",
                message=f"We found a potential match ({scores['overall']}% score) for your lost item '{lost_item.name}': '{found_item.name}'. Check it out!",
                type="match"
            )
            db.add(notif_lost)
            
            # Notify found item owner
            notif_found = models.Notification(
                user_id=found_item.user_id,
                title="Potential Owner Found!",
                message=f"Someone reported a lost item '{lost_item.name}' that matches your found item '{found_item.name}' ({scores['overall']}% score).",
                type="match"
            )
            db.add(notif_found)
    db.commit()

# Trigger AI matches for a new found item
def run_matches_for_found(found_item: models.FoundItem, db: Session):
    lost_items = db.query(models.LostItem).filter(models.LostItem.status == "lost").all()
    for lost_item in lost_items:
        scores = ai_matcher.calculate_match_score(lost_item, found_item)
        if scores["overall"] >= 50.0:
            match = models.Match(
                lost_item_id=lost_item.id,
                found_item_id=found_item.id,
                text_score=scores["text"],
                keyword_score=scores["keyword"],
                image_score=scores["image"],
                overall_score=scores["overall"],
                status="suggested"
            )
            db.add(match)
            
            # Notify lost item owner
            notif_lost = models.Notification(
                user_id=lost_item.user_id,
                title="Smart Match Found!",
                message=f"We found a potential match ({scores['overall']}% score) for your lost item '{lost_item.name}': '{found_item.name}'. Check it out!",
                type="match"
            )
            db.add(notif_lost)
            
            # Notify found item owner
            notif_found = models.Notification(
                user_id=found_item.user_id,
                title="Potential Owner Found!",
                message=f"Someone reported a lost item '{lost_item.name}' that matches your found item '{found_item.name}' ({scores['overall']}% score).",
                type="match"
            )
            db.add(notif_found)
    db.commit()

# Lost Items endpoints
@router.post("/lost", response_model=schemas.LostItemResponse, status_code=status.HTTP_201_CREATED)
def report_lost_item(
    item: schemas.LostItemCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    db_item = models.LostItem(**item.model_dump(), user_id=current_user.id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Run matching task asynchronously/inline
    try:
        run_matches_for_lost(db_item, db)
    except Exception as e:
        print(f"Failed to run matching: {e}")
        
    return db_item

@router.get("/lost", response_model=List[schemas.LostItemResponse])
def get_lost_items(
    category: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.LostItem)
    
    if category:
        query = query.filter(models.LostItem.category == category)
    if location:
        query = query.filter(models.LostItem.location_lost.contains(location))
    if status:
        query = query.filter(models.LostItem.status == status)
    if keyword:
        query = query.filter(
            models.LostItem.name.contains(keyword) | 
            models.LostItem.description.contains(keyword)
        )
        
    return query.order_by(models.LostItem.created_at.desc()).all()

@router.get("/lost/me", response_model=List[schemas.LostItemResponse])
def get_my_lost_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.LostItem).filter(models.LostItem.user_id == current_user.id).order_by(models.LostItem.created_at.desc()).all()

@router.get("/lost/{item_id}", response_model=schemas.LostItemResponse)
def get_lost_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.LostItem).filter(models.LostItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
    return item

@router.delete("/lost/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lost_item(
    item_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    item = db.query(models.LostItem).filter(models.LostItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Allow deletion only by creator or admin
    if item.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    db.delete(item)
    db.commit()
    return None

# Found Items endpoints
@router.post("/found", response_model=schemas.FoundItemResponse, status_code=status.HTTP_201_CREATED)
def report_found_item(
    item: schemas.FoundItemCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    db_item = models.FoundItem(**item.model_dump(), user_id=current_user.id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Run matching task asynchronously/inline
    try:
        run_matches_for_found(db_item, db)
    except Exception as e:
        print(f"Failed to run matching: {e}")
        
    return db_item

@router.get("/found", response_model=List[schemas.FoundItemResponse])
def get_found_items(
    category: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.FoundItem)
    
    if category:
        query = query.filter(models.FoundItem.category == category)
    if location:
        query = query.filter(models.FoundItem.location_found.contains(location))
    if status:
        query = query.filter(models.FoundItem.status == status)
    if keyword:
        query = query.filter(
            models.FoundItem.name.contains(keyword) | 
            models.FoundItem.description.contains(keyword)
        )
        
    return query.order_by(models.FoundItem.created_at.desc()).all()

@router.get("/found/me", response_model=List[schemas.FoundItemResponse])
def get_my_found_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.FoundItem).filter(models.FoundItem.user_id == current_user.id).order_by(models.FoundItem.created_at.desc()).all()

@router.get("/found/{item_id}", response_model=schemas.FoundItemResponse)
def get_found_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.FoundItem).filter(models.FoundItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found")
    return item

@router.delete("/found/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_found_item(
    item_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    item = db.query(models.FoundItem).filter(models.FoundItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Allow deletion only by creator or admin
    if item.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    db.delete(item)
    db.commit()
    return None
