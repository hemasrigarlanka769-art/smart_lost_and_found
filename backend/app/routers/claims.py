import io
import uuid
import base64
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/claims", tags=["Claims"])

@router.post("", response_model=schemas.ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim: schemas.ClaimCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if item exists and is still found (not claimed)
    found_item = db.query(models.FoundItem).filter(models.FoundItem.id == claim.found_item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")
    if found_item.status == "claimed":
        raise HTTPException(status_code=400, detail="Item has already been claimed")

    # Check if this user already has a pending claim on this item
    existing = db.query(models.Claim).filter(
        models.Claim.found_item_id == claim.found_item_id,
        models.Claim.claimer_id == current_user.id,
        models.Claim.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending claim for this item")

    db_claim = models.Claim(
        **claim.model_dump(),
        claimer_id=current_user.id,
        status="pending"
    )
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)

    # Notify staff/admin about a new claim
    # (In a real system, we'd send an email. Here we record it for notifications)
    admin_users = db.query(models.User).filter(models.User.role == "admin").all()
    for admin in admin_users:
        notif = models.Notification(
            user_id=admin.id,
            title="New Claim Submitted",
            message=f"User {current_user.name} submitted a claim for '{found_item.name}'. Check details to verify.",
            type="claim"
        )
        db.add(notif)
    db.commit()

    return db_claim

@router.get("/me", response_model=List[schemas.ClaimResponse])
def get_my_claims(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Claim).filter(models.Claim.claimer_id == current_user.id).order_by(models.Claim.created_at.desc()).all()

@router.get("/{claim_id}", response_model=schemas.ClaimResponse)
def get_claim_details(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    claim = db.query(models.Claim).filter(models.Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Allow details to be viewed by claimant or admins
    if claim.claimer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return claim

@router.get("/{claim_id}/qr", response_model=dict)
def get_claim_qr(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Generates a QR code image as a base64 data URL for approved claims.
    """
    claim = db.query(models.Claim).filter(models.Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Allow claimant or admin
    if claim.claimer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    if claim.status != "approved":
        raise HTTPException(status_code=400, detail="QR code is only available for approved claims")

    # Generate token if not exists
    if not claim.qr_code_token:
        claim.qr_code_token = f"claim_{claim.id}_{uuid.uuid4().hex[:12]}"
        db.commit()

    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(claim.qr_code_token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert image to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "token": claim.qr_code_token,
        "qr_image": f"data:image/png;base64,{qr_base64}"
    }

@router.post("/verify-token/{token}", response_model=schemas.ClaimResponse)
def verify_claim_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_staff_or_admin)
):
    """
    Handoff verification endpoint: admin/staff scans QR code containing token,
    verifying it and completing the handoff.
    """
    claim = db.query(models.Claim).filter(models.Claim.qr_code_token == token).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Invalid handoff token")
    
    if claim.status != "approved":
        raise HTTPException(status_code=400, detail="This claim is not approved or has already been resolved")

    # Complete the claim and items
    claim.status = "resolved"
    
    found_item = db.query(models.FoundItem).filter(models.FoundItem.id == claim.found_item_id).first()
    if found_item:
        found_item.status = "claimed"
        
    if claim.lost_item_id:
        lost_item = db.query(models.LostItem).filter(models.LostItem.id == claim.lost_item_id).first()
        if lost_item:
            lost_item.status = "claimed"
            
    # Audit log
    log = models.AdminLog(
        admin_id=current_user.id,
        action="complete_handoff",
        target_type="claim",
        target_id=str(claim.id),
        details=f"Handoff completed via QR token scan by {current_user.name}."
    )
    db.add(log)

    # Notify claimant
    notif = models.Notification(
        user_id=claim.claimer_id,
        title="Belonging Handed Over!",
        message=f"Your claim for '{found_item.name if found_item else 'item'}' has been finalized and the item was successfully handed over. Thank you!",
        type="claim_approved"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(claim)
    return claim
