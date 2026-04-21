from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, WorkoutSession

from typing import List
from pydantic import BaseModel

router = APIRouter()
pose_router = APIRouter()
recommend_router = APIRouter()

class EquipmentResponse(BaseModel):
    status: str
    message: str
    recommendations: List[str]
    top_exercises_detected: List[str] = []

EQUIPMENT_MAP = {
    "bicepcurl": ["Dumbbells", "Cable Machine", "Preacher Curl Bench", "EZ Bar"],
    "squat": ["Barbell", "Squat Rack", "Leg Press Machine", "Kettlebell", "Smith Machine"],
    "pushup": ["Pushup Bars", "Weighted Vest", "Resistance Bands"],
    "pullup": ["Pullup Bar", "Assisted Pullup Machine", "Lat Pulldown", "Weight Belt"],
    "deadlift": ["Barbell", "Hex Bar", "Lifting Belt", "Chalk", "Deadlift Platform"],
    "benchpress": ["Barbell", "Flat Bench", "Dumbbells", "Incline Bench"],
    "lunge": ["Dumbbells", "Kettlebell", "Smith Machine", "Bulgarian Split Squat Stand"]
}

@router.get("/recommend", response_model=EquipmentResponse)
def recommend_equipment(username: str = "guest", db: Session = Depends(get_db)):
    """
    Module 3: Smart Gym Assistant
    Recommends smart equipment based on the user's logged workout data.
    """
    sessions = db.query(WorkoutSession).filter(WorkoutSession.username == username).all()
    
    if not sessions:
        return EquipmentResponse(
            status="success",
            message="No workout data found. Start with basic equipment like Dumbbells or a Yoga Mat.",
            recommendations=["Dumbbells", "Yoga Mat", "Resistance Bands"]
        )
        
    # Find most frequent exercises
    exercise_counts = {}
    for s in sessions:
        if s.exercise:
            ex = s.exercise.strip().lower().replace("-", "").replace(" ", "")
            exercise_counts[ex] = exercise_counts.get(ex, 0) + s.reps
            
    if not exercise_counts:
        return EquipmentResponse(
            status="success",
            message="No specific exercises logged yet. Starting with basic equipment.",
            recommendations=["Dumbbells", "Yoga Mat", "Resistance Bands"]
        )
        
    top_exercises = sorted(exercise_counts, key=exercise_counts.get, reverse=True)[:3]
    
    # Simple recommendation logic
    recommendations = []
    for ex in top_exercises:
        if ex in EQUIPMENT_MAP:
            recommendations.extend(EQUIPMENT_MAP[ex])

    if not recommendations:
        recommendations = ["Dumbbells", "Kettlebell", "Adjustable Bench"]

    # Remove duplicates from recommendations
    unique_recommendations = list(dict.fromkeys(recommendations))

    top_ex_str = ", ".join(top_exercises)
    
    return EquipmentResponse(
        status="success",
        top_exercises_detected=top_exercises,
        recommendations=unique_recommendations,
        message=f"Based on your recent focus on {top_ex_str}, we recommend utilizing these smart equipments to maximize your gains."
    )
