from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth, ai_matcher

router = APIRouter(prefix="/matches", tags=["Matches"])

@router.get("/lost/{lost_item_id}", response_model=List[schemas.MatchResponse])
def get_matches_for_lost_item(
    lost_item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify lost item exists
    lost_item = db.query(models.LostItem).filter(models.LostItem.id == lost_item_id).first()
    if not lost_item:
        raise HTTPException(status_code=404, detail="Lost item not found")

    # Only owner or admin can see matching options
    if lost_item.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    matches = db.query(models.Match).filter(
        models.Match.lost_item_id == lost_item_id,
        models.Match.status == "suggested"
    ).order_by(models.Match.overall_score.desc()).all()

    return matches

@router.get("/found/{found_item_id}", response_model=List[schemas.MatchResponse])
def get_matches_for_found_item(
    found_item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify found item exists
    found_item = db.query(models.FoundItem).filter(models.FoundItem.id == found_item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")

    # Only reporter or admin can see matching options
    if found_item.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    matches = db.query(models.Match).filter(
        models.Match.found_item_id == found_item_id,
        models.Match.status == "suggested"
    ).order_by(models.Match.overall_score.desc()).all()

    return matches

@router.put("/{match_id}/status", response_model=schemas.MatchResponse)
def update_match_status(
    match_id: int,
    status_update: str, # accepted, rejected
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match record not found")

    # Verify that the user is the owner of the lost item or admin
    if match.lost_item.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    if status_update not in ["accepted", "rejected", "suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status option")

    match.status = status_update
    db.commit()
    db.refresh(match)
    return match

@router.post("/recalculate", status_code=status.HTTP_200_OK)
def trigger_matching_recalculation(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    """
    Admin-only endpoint that clears the existing match matrix and regenerates 
    suggestions for all active lost and found items.
    """
    # 1. Clear existing suggestions
    db.query(models.Match).delete()
    
    # 2. Get active items
    lost_items = db.query(models.LostItem).filter(models.LostItem.status == "lost").all()
    found_items = db.query(models.FoundItem).filter(models.FoundItem.status == "found").all()
    
    matches_created = 0
    for lost in lost_items:
        for found in found_items:
            scores = ai_matcher.calculate_match_score(lost, found)
            if scores["overall"] >= 50.0:
                match = models.Match(
                    lost_item_id=lost.id,
                    found_item_id=found.id,
                    text_score=scores["text"],
                    keyword_score=scores["keyword"],
                    image_score=scores["image"],
                    overall_score=scores["overall"],
                    status="suggested"
                )
                db.add(match)
                matches_created += 1
                
    db.commit()
    return {"message": f"Recalculation complete. {matches_created} potential matches identified."}
