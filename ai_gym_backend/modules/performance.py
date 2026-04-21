from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List
import numpy as np

router = APIRouter()

class PoseData(BaseModel):
    exercise: str
    reps_completed: int = Field(ge=0, description="Total reps logged in this set")
    form_accuracy: float = Field(ge=0.0, le=1.0, description="Average tracking accuracy score")
    avg_rep_duration: float = Field(gt=0, description="Duration in seconds per rep")
    errors: List[str] = Field(default_factory=list, description="Specific form errors detected")
    consistency_variance: float = Field(default=0.1, ge=0.0, le=1.0, description="Variance in tracking across reps")

class PerformanceResponse(BaseModel):
    status: str
    exercise: str
    performance_score: float
    efficiency_rating: str
    feedback: List[str]
    technical_insights: List[str]

@router.post("/analyze", response_model=PerformanceResponse)
def analyze_performance(data: PoseData):
    """
    Module 6: Pose-to-Performance Analyzer
    Generates a high-level motion efficiency score using simulated MediaPipe tracking data.
    """
    # 1. Base efficiency calculation using Numpy for non-linear scaling
    # We reward high accuracy exponentially
    base_score = float(np.power(data.form_accuracy, 1.5) * 100)
    
    # 2. Penalize for identified biomechanical errors
    # Critical errors lose 15 points, minor lose 5
    penalty = sum(15 if "critical" in e.lower() else 5 for e in data.errors)

    # 3. Dynamic timing assessment (Time Under Tension)
    timing_penalty = 0
    feedback_messages = list(data.errors)
    technical_insights = []
    
    if data.avg_rep_duration < 1.5:
        timing_penalty = 12
        feedback_messages.append("Your reps are too explosive. Focus on a 3-second eccentric (lowering) phase.")
        technical_insights.append("Low Time Under Tension (TUT) restricts hypertrophy.")
    elif data.avg_rep_duration > 6.0:
        timing_penalty = 8
        feedback_messages.append("Reps are excessively slow. Consider lowering the weight if you are struggling to lock out.")
        technical_insights.append("Excessive TUT indicates near-failure or overload.")
    else:
        technical_insights.append("Optimal Time Under Tension achieved.")

    # 4. Consistency impact
    if data.consistency_variance > 0.3:
        timing_penalty += 5
        feedback_messages.append("Your form degrades as the set progresses. Try resting longer between sets.")
        technical_insights.append(f"High variance detected ({data.consistency_variance}). Muscle fatigue likely.")

    # Calculate final scaled score
    final_score = max(0.0, min(100.0, base_score - penalty - timing_penalty))
    
    # Determine Rating Matrix
    if final_score < 50:
        efficiency_rating = "Needs Improvement"
    elif final_score < 75:
        efficiency_rating = "Good"
    elif final_score < 90:
        efficiency_rating = "Great"
    else:
        efficiency_rating = "Excellent"
        
    if not feedback_messages and final_score >= 90:
        feedback_messages.append("Perfect biomechanics! Keep overloading this movement safely.")
        
    return PerformanceResponse(
        status="success",
        exercise=data.exercise,
        performance_score=round(final_score, 1),
        efficiency_rating=efficiency_rating,
        feedback=feedback_messages,
        technical_insights=technical_insights
    )
