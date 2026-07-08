import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Firebase uid or mock user_id
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="student") # student, faculty, admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lost_items = relationship("LostItem", back_populates="user", cascade="all, delete-orphan")
    found_items = relationship("FoundItem", back_populates="user", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="claimer", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class LostItem(Base):
    __tablename__ = "lost_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    location_lost = Column(String, nullable=False)
    date_lost = Column(DateTime, nullable=False)
    image_url = Column(String, nullable=True)
    contact_info = Column(String, nullable=False)
    status = Column(String, default="lost") # lost, claimed, matching, inactive
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="lost_items")
    matches = relationship("Match", foreign_keys="[Match.lost_item_id]", cascade="all, delete-orphan")
    claims = relationship("Claim", foreign_keys="[Claim.lost_item_id]")

class FoundItem(Base):
    __tablename__ = "found_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    location_found = Column(String, nullable=False)
    date_found = Column(DateTime, nullable=False)
    image_url = Column(String, nullable=True)
    contact_info = Column(String, nullable=False)
    status = Column(String, default="found") # found, claimed, matching, inactive
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="found_items")
    matches = relationship("Match", foreign_keys="[Match.found_item_id]", cascade="all, delete-orphan")
    claims = relationship("Claim", foreign_keys="[Claim.found_item_id]", cascade="all, delete-orphan")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lost_item_id = Column(Integer, ForeignKey("lost_items.id"), nullable=False)
    found_item_id = Column(Integer, ForeignKey("found_items.id"), nullable=False)
    text_score = Column(Float, default=0.0)
    keyword_score = Column(Float, default=0.0)
    image_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    status = Column(String, default="suggested") # suggested, approved, rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lost_item = relationship("LostItem", foreign_keys=[lost_item_id])
    found_item = relationship("FoundItem", foreign_keys=[found_item_id])

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    found_item_id = Column(Integer, ForeignKey("found_items.id"), nullable=False)
    lost_item_id = Column(Integer, ForeignKey("lost_items.id"), nullable=True)
    claimer_id = Column(String, ForeignKey("users.id"), nullable=False)
    unique_marks = Column(Text, nullable=False)
    purchase_date = Column(String, nullable=True)
    proof_url = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, approved, rejected, info_requested
    admin_feedback = Column(Text, nullable=True)
    qr_code_token = Column(String, nullable=True) # generated on claim approval for claims verification
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    found_item = relationship("FoundItem", foreign_keys=[found_item_id])
    lost_item = relationship("LostItem", foreign_keys=[lost_item_id])
    claimer = relationship("User", back_populates="claims")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info") # match, claim_approved, claim_rejected, info_requested, message
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False) # approve_claim, reject_claim, remove_spam, update_role
    target_type = Column(String, nullable=False) # claim, user, lost_item, found_item
    target_id = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
