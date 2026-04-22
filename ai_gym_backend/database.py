import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_STORAGE = os.getenv("APP_STORAGE", "/opt/render/project/src/storage")
os.makedirs(BASE_STORAGE, exist_ok=True)

DATABASE_URL = f"sqlite:///{BASE_STORAGE}/gym_assistant.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    goal = Column(String, nullable=True)
    fitness_level = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, default="guest")
    exercise = Column(String, default="unknown")
    reps = Column(Integer, default=0)
    sets_done = Column(Integer, default=0)
    day_of_week = Column(Integer)
    hour = Column(Integer)
    date = Column(String)
    mood = Column(Integer, default=3)
    stress = Column(Integer, default=2)
    came_to_gym = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RepLog(Base):
    __tablename__ = "rep_logs"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, default="guest")
    date = Column(String, index=True)
    exercise = Column(String)
    reps = Column(Integer)
    sets = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class DietProfile(Base):
    __tablename__ = "diet_profiles"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, default="guest")
    bmr = Column(Float)
    tdee = Column(Float)
    calorie_target = Column(Float)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    plan_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, default="guest")
    role = Column(String)
    message = Column(Text)
    sentiment = Column(String, nullable=True)
    compound = Column(Float, nullable=True)
    struggles = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, default="guest")
    goal = Column(String)
    level = Column(String)
    equipment = Column(String)
    days_per_week = Column(Integer)
    plan_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProgressPhoto(Base):
    __tablename__ = "progress_photos"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    image_url = Column(Text)
    note = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class HabitLog(Base):
    __tablename__ = "habit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    date = Column(String)
    day_of_week = Column(Integer)
    hour = Column(Integer)
    mood = Column(Integer)
    stress = Column(Integer)
    reps_logged = Column(Integer, default=0)
    came_to_gym = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


class DietLog(Base):
    __tablename__ = "diet_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    goal = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    bmi = Column(Float, nullable=True)
    bmr = Column(Integer, nullable=True)
    tdee = Column(Integer, nullable=True)
    calorie_target = Column(Integer, nullable=True)
    date = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IoTTelemetry(Base):
    __tablename__ = "iot_telemetry"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    username = Column(String, index=True, default="guest")
    device_type = Column(String, default="unknown")
    heart_rate = Column(Integer, nullable=True)
    resistance = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    incline = Column(Float, nullable=True)
    rep_speed = Column(Float, nullable=True)
    fatigue_score = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    status = Column(String, default="active")
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_user(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user