from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    id: str
    email: EmailStr
    name: str

class UserCreate(UserBase):
    role: Optional[str] = "student"

class UserResponse(UserBase):
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str

# Lost Item Schemas
class LostItemBase(BaseModel):
    name: str
    category: str
    description: str
    location_lost: str
    date_lost: datetime
    image_url: Optional[str] = None
    contact_info: str

class LostItemCreate(LostItemBase):
    pass

class LostItemResponse(LostItemBase):
    id: int
    status: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Found Item Schemas
class FoundItemBase(BaseModel):
    name: str
    category: str
    description: str
    location_found: str
    date_found: datetime
    image_url: Optional[str] = None
    contact_info: str

class FoundItemCreate(FoundItemBase):
    pass

class FoundItemResponse(FoundItemBase):
    id: int
    status: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Match Schemas
class MatchResponse(BaseModel):
    id: int
    lost_item_id: int
    found_item_id: int
    text_score: float
    keyword_score: float
    image_score: float
    overall_score: float
    status: str
    created_at: datetime
    lost_item: Optional[LostItemResponse] = None
    found_item: Optional[FoundItemResponse] = None

    class Config:
        from_attributes = True

# Claim Schemas
class ClaimCreate(BaseModel):
    found_item_id: int
    lost_item_id: Optional[int] = None
    unique_marks: str
    purchase_date: Optional[str] = None
    proof_url: Optional[str] = None

class ClaimUpdate(BaseModel):
    status: str # approved, rejected, info_requested
    admin_feedback: Optional[str] = None

class ClaimResponse(BaseModel):
    id: int
    found_item_id: int
    lost_item_id: Optional[int] = None
    claimer_id: str
    unique_marks: str
    purchase_date: Optional[str] = None
    proof_url: Optional[str] = None
    status: str
    admin_feedback: Optional[str] = None
    qr_code_token: Optional[str] = None
    created_at: datetime
    found_item: Optional[FoundItemResponse] = None
    lost_item: Optional[LostItemResponse] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Admin Log Schemas
class AdminLogResponse(BaseModel):
    id: int
    admin_id: str
    action: str
    target_type: str
    target_id: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics Response
class AnalyticsResponse(BaseModel):
    total_lost: int
    total_found: int
    recovery_rate: float
    active_users: int
    recent_activity: List[AdminLogResponse]
