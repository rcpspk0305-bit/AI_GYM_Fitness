from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    username: str = "Cherry"

class HabitLogRequest(BaseModel):
    username: str = "Cherry"
    mood: int
    stress: int
    hour: int
    came_to_gym: bool

class UserProfileRequest(BaseModel):
    username: str = "Cherry"
    goal: Optional[str] = "general fitness"
    diet_preference: Optional[str] = "balanced"
    preferred_workout_time: Optional[str] = "morning"