from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/analytics", response_model=schemas.AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    """
    Returns analytics metrics and recent admin logs.
    """
    total_lost = db.query(models.LostItem).count()
    total_found = db.query(models.FoundItem).count()
    
    # Calculate recovery rate: ratio of claimed items to total items reported
    total_claimed_found = db.query(models.FoundItem).filter(models.FoundItem.status == "claimed").count()
    recovery_rate = 0.0
    if total_found > 0:
        recovery_rate = round((total_claimed_found / total_found) * 100, 2)
        
    active_users = db.query(models.User).count()
    
    recent_logs = db.query(models.AdminLog).order_by(models.AdminLog.created_at.desc()).limit(10).all()
    
    return {
        "total_lost": total_lost,
        "total_found": total_found,
        "recovery_rate": recovery_rate,
        "active_users": active_users,
        "recent_activity": recent_logs
    }

@router.get("/claims", response_model=List[schemas.ClaimResponse])
def get_all_claims(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    """
    Lists all claims submitted across the platform.
    """
    return db.query(models.Claim).order_by(models.Claim.created_at.desc()).all()

@router.put("/claims/{claim_id}", response_model=schemas.ClaimResponse)
def review_claim(
    claim_id: int,
    review: schemas.ClaimUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    """
    Reviews a claim: approves, rejects, or requests more information.
    Creates logs and notifications.
    """
    claim = db.query(models.Claim).filter(models.Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if claim.status in ["resolved", "claimed"]:
        raise HTTPException(status_code=400, detail="This claim is already finalized")

    # Update claim status
    claim.status = review.status
    claim.admin_feedback = review.admin_feedback
    
    # If approved, generate QR code token immediately
    if review.status == "approved":
        import uuid
        claim.qr_code_token = f"claim_{claim.id}_{uuid.uuid4().hex[:12]}"
        
        # Mark items as claimed/reserved (matching state)
        found_item = db.query(models.FoundItem).filter(models.FoundItem.id == claim.found_item_id).first()
        if found_item:
            found_item.status = "matching" # Claim approved, waiting for handoff
        if claim.lost_item_id:
            lost_item = db.query(models.LostItem).filter(models.LostItem.id == claim.lost_item_id).first()
            if lost_item:
                lost_item.status = "matching"

    # Notification text setup
    title = f"Claim Status: {review.status.replace('_', ' ').capitalize()}"
    if review.status == "approved":
        message = f"Your claim for '{claim.found_item.name}' has been approved! Use the generated QR code in your dashboard for physical collection."
        notif_type = "claim_approved"
    elif review.status == "rejected":
        message = f"Your claim for '{claim.found_item.name}' was rejected. Reason: {review.admin_feedback or 'Not specified'}"
        notif_type = "claim_rejected"
    else: # info_requested
        message = f"Additional information requested for your claim on '{claim.found_item.name}'. Comments: {review.admin_feedback}"
        notif_type = "info_requested"

    # Save user notification
    notif = models.Notification(
        user_id=claim.claimer_id,
        title=title,
        message=message,
        type=notif_type
    )
    db.add(notif)
    
    # Log admin action
    log = models.AdminLog(
        admin_id=current_user.id,
        action=f"review_claim_{review.status}",
        target_type="claim",
        target_id=str(claim.id),
        details=f"Status set to {review.status}. Feedback: {review.admin_feedback}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(claim)
    return claim

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    """
    Returns list of all users.
    """
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@router.put("/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: str,
    role_update: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    """
    Updates role of a user.
    """
    if role_update.role not in ["student", "faculty", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role value")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = role_update.role
    
    # Log admin action
    log = models.AdminLog(
        admin_id=current_user.id,
        action="update_role",
        target_type="user",
        target_id=user.id,
        details=f"Updated role of {user.name} ({user.email}) to {role_update.role}."
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/spam/lost/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_spam_lost(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    item = db.query(models.LostItem).filter(models.LostItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
        
    db.delete(item)
    
    log = models.AdminLog(
        admin_id=current_user.id,
        action="remove_spam",
        target_type="lost_item",
        target_id=str(item_id),
        details=f"Removed spam lost item: '{item.name}' reported by UID {item.user_id}."
    )
    db.add(log)
    db.commit()
    return None

@router.delete("/spam/found/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_spam_found(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    item = db.query(models.FoundItem).filter(models.FoundItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found")
        
    db.delete(item)
    
    log = models.AdminLog(
        admin_id=current_user.id,
        action="remove_spam",
        target_type="found_item",
        target_id=str(item_id),
        details=f"Removed spam found item: '{item.name}' reported by UID {item.user_id}."
    )
    db.add(log)
    db.commit()
    return None
