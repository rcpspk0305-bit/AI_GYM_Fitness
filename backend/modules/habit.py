from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, WorkoutSession
from datetime import datetime

router = APIRouter()

# ─────────────────────────────────────────────
# Request Model
# ─────────────────────────────────────────────
class HabitLogRequest(BaseModel):
    username: str = "guest"
    mood: int = 3
    stress: int = 2
    came_to_gym: bool = True


# ─────────────────────────────────────────────
# Log Habit
# ─────────────────────────────────────────────
@router.post("/log")
def log_habit(data: HabitLogRequest, db: Session = Depends(get_db)):
    now = datetime.now()

    session = WorkoutSession(
        username=data.username,
        exercise="habit_checkin",
        reps=0,
        sets_done=0,
        day_of_week=now.weekday(),
        hour=now.hour,
        date=now.strftime("%Y-%m-%d"),
        mood=data.mood,
        stress=data.stress,
        came_to_gym=data.came_to_gym,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "status": "logged",
        "id": session.id,
        "date": session.date,
        "came_to_gym": session.came_to_gym
    }


# ─────────────────────────────────────────────
# History
# ─────────────────────────────────────────────
@router.get("/history")
def get_history(username: str = "guest", db: Session = Depends(get_db)):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.username == username)
        .filter(WorkoutSession.exercise == "habit_checkin")
        .order_by(WorkoutSession.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "history": [
            {
                "id": s.id,
                "date": s.date,
                "day_of_week": s.day_of_week,
                "hour": s.hour,
                "mood": s.mood,
                "stress": s.stress,
                "came_to_gym": s.came_to_gym,
            }
            for s in sessions
        ]
    }


# ─────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────
@router.get("/stats")
def get_stats(username: str = "guest", db: Session = Depends(get_db)):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.username == username)
        .filter(WorkoutSession.exercise == "habit_checkin")
        .all()
    )

    total_sessions = len(sessions)
    total_attendance = sum(1 for s in sessions if s.came_to_gym)
    attendance_rate = (total_attendance / total_sessions * 100) if total_sessions else 0

    mood_values = [s.mood for s in sessions if s.mood is not None]
    stress_values = [s.stress for s in sessions if s.stress is not None]

    avg_mood = round(sum(mood_values) / len(mood_values), 2) if mood_values else 0
    avg_stress = round(sum(stress_values) / len(stress_values), 2) if stress_values else 0

    return {
        "total_sessions": total_sessions,
        "total_attendance": total_attendance,
        "attendance_rate": round(attendance_rate, 2),
        "avg_mood": avg_mood,
        "avg_stress": avg_stress
    }


# ─────────────────────────────────────────────
# Streak
# ─────────────────────────────────────────────
@router.get("/streak")
def get_streak(username: str = "guest", db: Session = Depends(get_db)):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.username == username)
        .filter(WorkoutSession.exercise == "habit_checkin")
        .order_by(WorkoutSession.date.desc())
        .all()
    )

    streak = 0
    seen_dates = set()

    for s in sessions:
        if s.date in seen_dates:
            continue
        seen_dates.add(s.date)

        if s.came_to_gym:
            streak += 1
        else:
            break

    return {"streak": streak}


# ─────────────────────────────────────────────
# Insights
# ─────────────────────────────────────────────
@router.get("/insights")
def get_insights(username: str = "guest", db: Session = Depends(get_db)):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.username == username)
        .filter(WorkoutSession.exercise == "habit_checkin")
        .all()
    )

    if not sessions:
        return {
            "best_day": "N/A",
            "worst_day": "N/A",
            "best_hour": "N/A",
            "main_blocker": "Not enough data"
        }

    day_names = {
        0: "Monday",
        1: "Tuesday",
        2: "Wednesday",
        3: "Thursday",
        4: "Friday",
        5: "Saturday",
        6: "Sunday"
    }

    day_count = {}
    hour_count = {}
    skipped = 0
    stressed = 0

    for s in sessions:
        if s.came_to_gym:
            day_count[s.day_of_week] = day_count.get(s.day_of_week, 0) + 1
            hour_count[s.hour] = hour_count.get(s.hour, 0) + 1
        else:
            skipped += 1
            if s.stress is not None and s.stress >= 4:
                stressed += 1

    best_day_num = max(day_count, key=day_count.get) if day_count else None
    best_hour = max(hour_count, key=hour_count.get) if hour_count else None

    blocker = "stress" if stressed >= skipped / 2 and skipped > 0 else "inconsistency"

    return {
        "best_day": day_names.get(best_day_num, "N/A"),
        "worst_day": "Needs more data",
        "best_hour": f"{best_hour}:00" if best_hour is not None else "N/A",
        "main_blocker": blocker
    }