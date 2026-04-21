from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, Recommendation, WorkoutSession, User, DietProfile
import json
import random

router = APIRouter()

# ─────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────
class PlanRequest(BaseModel):
    username: str = "guest"
    goal: str
    level: str
    equipment: str
    days_per_week: int


class SmartRecommendRequest(BaseModel):
    username: str
    goal: str
    location: str


# ─────────────────────────────────────────────
# Workout Library
# ─────────────────────────────────────────────
WORKOUT_LIBRARY = {
    "muscle_gain": [
        {"name": "Push-Ups", "type": "Strength", "duration": 20, "calories_burned": 120, "equipment": "none", "muscles": "Chest, Arms"},
        {"name": "Dumbbell Curls", "type": "Strength", "duration": 15, "calories_burned": 80, "equipment": "dumbbells", "muscles": "Biceps"},
        {"name": "Squats", "type": "Strength", "duration": 20, "calories_burned": 130, "equipment": "none", "muscles": "Legs, Glutes"},
        {"name": "Bench Press", "type": "Strength", "duration": 25, "calories_burned": 160, "equipment": "gym", "muscles": "Chest, Triceps"},
    ],
    "weight_loss": [
        {"name": "Jump Rope", "type": "Cardio", "duration": 20, "calories_burned": 220, "equipment": "rope", "muscles": "Full Body"},
        {"name": "Burpees", "type": "HIIT", "duration": 15, "calories_burned": 180, "equipment": "none", "muscles": "Full Body"},
        {"name": "Mountain Climbers", "type": "HIIT", "duration": 15, "calories_burned": 150, "equipment": "none", "muscles": "Core, Legs"},
        {"name": "Running", "type": "Cardio", "duration": 30, "calories_burned": 300, "equipment": "treadmill", "muscles": "Legs"},
    ],
    "endurance": [
        {"name": "Cycling", "type": "Cardio", "duration": 30, "calories_burned": 250, "equipment": "cycle", "muscles": "Legs"},
        {"name": "Jogging", "type": "Cardio", "duration": 30, "calories_burned": 220, "equipment": "none", "muscles": "Legs"},
        {"name": "Jumping Jacks", "type": "Warm-up", "duration": 10, "calories_burned": 90, "equipment": "none", "muscles": "Full Body"},
    ],
    "flexibility": [
        {"name": "Yoga Flow", "type": "Flexibility", "duration": 30, "calories_burned": 100, "equipment": "mat", "muscles": "Full Body"},
        {"name": "Stretch Routine", "type": "Flexibility", "duration": 20, "calories_burned": 70, "equipment": "mat", "muscles": "Full Body"},
        {"name": "Mobility Drills", "type": "Mobility", "duration": 20, "calories_burned": 80, "equipment": "none", "muscles": "Joints"},
    ],
    "maintenance": [
        {"name": "Bodyweight Circuit", "type": "Mixed", "duration": 25, "calories_burned": 180, "equipment": "none", "muscles": "Full Body"},
        {"name": "Light Jog", "type": "Cardio", "duration": 20, "calories_burned": 150, "equipment": "none", "muscles": "Legs"},
        {"name": "Stretch + Core", "type": "Recovery", "duration": 20, "calories_burned": 90, "equipment": "mat", "muscles": "Core"},
    ],
}

GYM_SUGGESTIONS = {
    "hyderabad": [
        {"name": "Cult Fit", "area": "Madhapur", "rating": 4.6, "price": 1800, "type": "Premium Gym"},
        {"name": "Gold's Gym", "area": "Kukatpally", "rating": 4.4, "price": 2200, "type": "Strength Gym"},
        {"name": "Anytime Fitness", "area": "Ameerpet", "rating": 4.5, "price": 2500, "type": "24/7 Gym"},
    ],
    "default": [
        {"name": "Local Fitness Hub", "area": "City Center", "rating": 4.2, "price": 1500, "type": "General Gym"},
        {"name": "Power House Gym", "area": "Main Road", "rating": 4.3, "price": 2000, "type": "Strength Gym"},
    ],
}


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def generate_weekly_plan(workouts, days_per_week):
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    plan = []

    for i, day in enumerate(days):
        if i < days_per_week:
            workout = workouts[i % len(workouts)]
            plan.append({
                "day": day,
                "type": "workout",
                "label": workout["type"],
                "workout": workout["name"],
                "duration": workout["duration"],
                "calories": workout["calories_burned"],
                "muscles": workout["muscles"],
                "note": f"Focus on {workout['muscles']}"
            })
        else:
            plan.append({
                "day": day,
                "type": "rest",
                "label": "Recovery",
                "workout": "Rest / Light Stretching",
                "duration": 0,
                "calories": 0,
                "muscles": "Recovery",
                "note": "Let your body recover"
            })

    return plan


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@router.post("/plan")
def generate_plan(req: PlanRequest, db: Session = Depends(get_db)):
    goal = req.goal.lower()
    workouts = WORKOUT_LIBRARY.get(goal, WORKOUT_LIBRARY["maintenance"])

    # equipment filter
    filtered = [
        w for w in workouts
        if req.equipment == "none" or w["equipment"] in [req.equipment, "none", "gym"]
    ]

    if not filtered:
        filtered = workouts

    top_workouts = filtered[:3]
    weekly_plan = generate_weekly_plan(filtered, req.days_per_week)

    total_minutes = sum(day["duration"] for day in weekly_plan)
    total_calories = sum(day["calories"] for day in weekly_plan)

    response_data = {
        "goal": req.goal,
        "level": req.level,
        "summary": {
            "workout_days": req.days_per_week,
            "rest_days": 7 - req.days_per_week,
            "total_minutes": total_minutes,
            "total_calories": total_calories,
        },
        "top_workouts": top_workouts,
        "weekly_plan": weekly_plan,
        "message": f"Your {req.goal.replace('_', ' ')} plan is ready!"
    }

    saved_plan = Recommendation(
        username=req.username,
        goal=req.goal,
        level=req.level,
        equipment=req.equipment,
        days_per_week=req.days_per_week,
        plan_json=json.dumps(response_data)
    )
    db.add(saved_plan)
    db.commit()

    return response_data


@router.get("/workout-tips")
def get_workout_tips(goal: str, level: str):
    tips = {
        "muscle_gain": [
            "Train with progressive overload.",
            "Prioritize protein intake daily.",
            "Rest between heavy sets."
        ],
        "weight_loss": [
            "Stay in a calorie deficit.",
            "Mix cardio with strength training.",
            "Track your food honestly."
        ],
        "endurance": [
            "Increase volume gradually.",
            "Focus on breathing and pacing.",
            "Hydrate before and after workouts."
        ],
        "flexibility": [
            "Stretch consistently, not aggressively.",
            "Warm up before mobility work.",
            "Hold stretches 20–30 seconds."
        ],
        "maintenance": [
            "Keep workouts balanced and sustainable.",
            "Avoid burnout by rotating intensity.",
            "Stay active even on rest days."
        ],
    }

    level_tip = {
        "beginner": "Start simple. Consistency beats intensity.",
        "intermediate": "Track performance and increase difficulty weekly.",
        "advanced": "Focus on periodization and recovery quality."
    }

    return {
        "goal_tips": tips.get(goal.lower(), tips["maintenance"]),
        "level_tip": level_tip.get(level.lower(), "Stay consistent and train smart.")
    }


@router.post("/smart-recommend")
def smart_recommend(req: SmartRecommendRequest, db: Session = Depends(get_db)):
    logs = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.username == req.username)
        .order_by(WorkoutSession.created_at.desc())
        .limit(10)
        .all()
    )

    consistency = round((sum(1 for l in logs if l.came_to_gym) / len(logs)) * 100, 1) if logs else 50
    avg_hour = int(sum(l.hour for l in logs) / len(logs)) if logs else 18

    location_key = req.location.lower().strip()
    gyms = GYM_SUGGESTIONS.get(location_key, GYM_SUGGESTIONS["default"])

    if req.goal == "muscle_gain":
        program = "4-day Push/Pull/Legs split"
        challenge = "Complete 100 push-ups this week"
    elif req.goal == "weight_loss":
        program = "5-day fat loss cardio + strength split"
        challenge = "Burn 1500 calories this week"
    elif req.goal == "endurance":
        program = "3-day cardio endurance builder"
        challenge = "Run or cycle 15 km this week"
    elif req.goal == "flexibility":
        program = "Daily mobility + yoga recovery plan"
        challenge = "Do 15 minutes of stretching for 7 days"
    else:
        program = "Balanced 3-day full-body maintenance plan"
        challenge = "Hit 3 consistent sessions this week"

    explanation = (
        f"Based on your goal ({req.goal.replace('_', ' ')}), "
        f"your consistency score ({consistency}%), and your likely preferred workout time ({avg_hour}:00), "
        f"these recommendations are optimized for adherence and realistic progress."
    )

    return {
        "user_insights": {
            "consistency_score": consistency,
            "preferred_time": avg_hour
        },
        "recommended_gyms": gyms,
        "recommended_program": program,
        "challenge": challenge,
        "explanation": explanation
    }