from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, WorkoutSession,ProgressPhoto
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import os
from datetime import datetime
from database import get_db, User, WorkoutSession, RepLog, HabitLog
router   = APIRouter()
CSV_PATH = "data/workout_log.csv"

def ensure_csv():
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(CSV_PATH):
        pd.DataFrame(columns=[
            "date","day_of_week","hour","mood",
            "stress","reps_logged","came_to_gym"
        ]).to_csv(CSV_PATH, index=False)

ensure_csv()

class LogEntry(BaseModel):
    mood:        int
    stress:      int
    hour:        int
    came_to_gym: bool
    username:    str = "guest"

class PredictRequest(BaseModel):
    day_of_week: int
    hour:        int
    mood:        int
    stress:      int
    username:    str = "guest"


def load_df_from_db(db: Session) -> pd.DataFrame:
    """Load all habit logs from SQLite — used for ML training."""
    logs = db.query(WorkoutSession).all()
    if not logs:
        return pd.DataFrame()
    return pd.DataFrame([{
        "day_of_week": l.day_of_week,
        "hour":        l.hour,
        "mood":        l.mood,
        "stress":      l.stress,
        "came_to_gym": l.came_to_gym,
    } for l in logs])


@router.post("/log")
def log_habit(entry: LogEntry, db: Session = Depends(get_db)):
    """Log daily habit entry — called from Habit Tracker page."""
    now = datetime.now()
    log = HabitLog(
        date        = now.strftime("%Y-%m-%d"),
        day_of_week = now.weekday(),
        hour        = entry.hour,
        mood        = entry.mood,
        stress      = entry.stress,
        reps_logged = 0,
        came_to_gym = int(entry.came_to_gym),
    )
    db.add(log)
    db.commit()

    # Also write to CSV backup
    ensure_csv()
    import pandas as pd
    new_row = pd.DataFrame([{
        "date": now.strftime("%Y-%m-%d"),
        "day_of_week": now.weekday(),
        "hour": entry.hour, "mood": entry.mood,
        "stress": entry.stress, "reps_logged": 0,
        "came_to_gym": int(entry.came_to_gym),
    }])
    existing = pd.read_csv(CSV_PATH)
    pd.concat([existing, new_row], ignore_index=True).to_csv(CSV_PATH, index=False)

    return {"status": "logged", "total_entries": db.query(HabitLog).count()}


@router.post("/predict")
def predict_attendance(req: PredictRequest, db: Session = Depends(get_db)):
    # ── Use DB data for training (more reliable than CSV) ──
    df = load_df_from_db(db)

    if len(df) < 5:
        base = 0.3
        if req.mood   >= 4: base -= 0.1
        if req.stress >= 4: base += 0.2
        skip_prob = round(max(0.05, min(0.95, base)), 2)
        return {
            "skip_probability": skip_prob,
            "nudge":            _nudge(skip_prob),
            "model":            "rule-based (log 5+ entries to unlock ML)",
            "data_count":       len(df),
        }

    features = ["day_of_week", "hour", "mood", "stress"]
    X = df[features].values
    y = (1 - df["came_to_gym"]).astype(int).values

    clf = RandomForestClassifier(n_estimators=150, random_state=42)
    clf.fit(X, y)

    user_vec   = np.array([[req.day_of_week, req.hour, req.mood, req.stress]])
    proba      = clf.predict_proba(user_vec)[0]
    classes    = list(clf.classes_)
    # If only one class was seen during training, skip_prob is 0 or 1
    skip_prob  = round(float(proba[classes.index(1)]) if 1 in classes else 0.0, 2)
    importance = dict(zip(features, clf.feature_importances_.round(3)))

    # ── Personalised nudge using DB history ──
    user_logs = db.query(WorkoutSession ).all()
    went_high_stress = sum(1 for l in user_logs if l.stress >= 4 and l.came_to_gym == 1)
    total_high_stress = sum(1 for l in user_logs if l.stress >= 4)
    stress_rate = (went_high_stress / total_high_stress * 100) if total_high_stress > 0 else 0

    extra_nudge = ""
    if req.stress >= 4 and stress_rate > 50:
        extra_nudge = f" You've gone {stress_rate:.0f}% of the time when stressed — you can do it!"

    return {
        "skip_probability":   skip_prob,
        "nudge":              _nudge(skip_prob) + extra_nudge,
        "model":              "RandomForest (trained on your DB history)",
        "data_count":         len(df),
        "feature_importance": importance,
        "personal_insight":   {
            "high_stress_attendance": f"{stress_rate:.0f}%",
            "total_sessions":         int(df["came_to_gym"].sum()),
        }
    }


def _nudge(prob: float) -> str:
    if prob >= 0.75:   return "High skip risk! Set an alarm now and lay out your gym clothes."
    elif prob >= 0.5:  return "Moderate risk. Tell someone you're going — accountability helps."
    elif prob >= 0.25: return "Low risk. You're likely going. Stay consistent!"
    else:              return "Very likely going. Great discipline — keep it up!"


@router.get("/streak")
def get_streak(db: Session = Depends(get_db)):
    logs = db.query(WorkoutSession).order_by(WorkoutSession.created_at).all()
    if not logs:
        return {"streak": 0, "total_sessions": 0, "history": []}

    streak = 0
    for l in reversed(logs):
        if l.came_to_gym == 1: streak += 1
        else: break

    history = [
        {"date": l.date, "came_to_gym": l.came_to_gym, "mood": l.mood, "stress": l.stress}
        for l in logs[-14:]
    ]

    return {
        "streak":         streak,
        "total_sessions": sum(1 for l in logs if l.came_to_gym == 1),
        "total_logged":   len(logs),
        "history":        history,
    }


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    logs = db.query(WorkoutSession).all()
    if not logs:
        return {"attendance_rate": 0, "best_day": "N/A", "best_hour": "N/A", "avg_mood": 0}

    df = pd.DataFrame([{
        "day_of_week": l.day_of_week, "hour": l.hour,
        "mood": l.mood, "came_to_gym": l.came_to_gym,
    } for l in logs])

    day_names = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    day_rates  = df.groupby("day_of_week")["came_to_gym"].mean()
    hour_rates = df.groupby("hour")["came_to_gym"].mean()

    return {
        "attendance_rate": round(df["came_to_gym"].mean() * 100, 1),
        "best_day":        day_names[int(day_rates.idxmax())] if not day_rates.empty else "N/A",
        "best_hour":       f"{int(hour_rates.idxmax())}:00" if not hour_rates.empty else "N/A",
        "avg_mood":        round(df["mood"].mean(), 1),
    }
class RepLog(BaseModel):
    reps: int
    exercise: str
    username: str

class ProgressPhotoRequest(BaseModel):
    username: str
    image_url: str
    note: str = ""

# ─────────────────────────────────────────────
# Log reps
# ─────────────────────────────────────────────
@router.post("/log-rep")
def log_rep(data: RepLog, db: Session = Depends(get_db)):
    session = WorkoutSession(
        exercise=data.exercise,
        reps=data.reps,
        sets_done=data.reps // 10,
        day_of_week=datetime.now().weekday(),
        hour=datetime.now().hour,
        date=datetime.now().strftime("%Y-%m-%d"),
    )
    db.add(session)
    db.commit()

    return {"status": "logged", "reps": data.reps}

# ─────────────────────────────────────────────
# Save Cloudinary image URL
# ─────────────────────────────────────────────
@router.post("/save-progress-photo")
def save_progress_photo(data: ProgressPhotoRequest, db: Session = Depends(get_db)):
    photo = ProgressPhoto(
        username=data.username,
        image_url=data.image_url,
        note=data.note
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "status": "saved",
        "photo_id": photo.id,
        "image_url": photo.image_url
    }

# ─────────────────────────────────────────────
# Fetch gallery
# ─────────────────────────────────────────────
@router.get("/progress-photos/{username}")
def get_progress_photos(username: str, db: Session = Depends(get_db)):
    photos = (
        db.query(ProgressPhoto)
        .filter(ProgressPhoto.username == username)
        .order_by(ProgressPhoto.created_at.desc())
        .all()
    )

    return {
        "photos": [
            {
                "id": p.id,
                "image_url": p.image_url,
                "note": p.note,
                "created_at": p.created_at
            }
            for p in photos
        ]
    }
@router.get("/workout-stats")
def get_workout_stats(db: Session = Depends(get_db)):
    sessions = db.query(WorkoutSession).all()
    if not sessions:
        return {"total_reps": 0, "total_sessions": 0, "favourite_exercise": "N/A", "by_exercise": {}}
    total_reps  = sum(s.reps for s in sessions)
    by_exercise = {}
    for s in sessions:
        if s.exercise:
            by_exercise[s.exercise] = by_exercise.get(s.exercise, 0) + s.reps
    return {
        "total_reps":         total_reps,
        "total_sessions":     len(sessions),
        "favourite_exercise": max(by_exercise, key=by_exercise.get) if by_exercise else "N/A",
        "by_exercise":        by_exercise,
    }
@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    logs = db.query(HabitLog).all()
    if not logs:
        return {"message": "No data yet", "insights": []}
    
    total      = len(logs)
    attended   = sum(1 for l in logs if l.came_to_gym == 1)
    avg_mood   = round(sum(l.mood or 0 for l in logs) / total, 1)
    avg_stress = round(sum(l.stress or 0 for l in logs) / total, 1)
    
    insights = []
    if avg_stress > 3.5:
        insights.append("Your stress levels are high — consider shorter workouts on tough days.")
    if attended / total < 0.5:
        insights.append("Attendance below 50% — try scheduling workouts at your best hour.")
    if avg_mood > 3.5:
        insights.append("Great mood scores! You show up when you feel good — keep that energy.")
    if not insights:
        insights.append("Consistent logging detected — your ML predictions are getting smarter!")

    return {
        "attendance_rate": round(attended / total * 100, 1),
        "avg_mood":        avg_mood,
        "avg_stress":      avg_stress,
        "insights":        insights,
        "total_logged":    total,
    }
@router.get("/habit-stats")
def get_habit_stats(db: Session = Depends(get_db)):
    logs = db.query(HabitLog).all()
    if not logs:
        return {"attendance_rate": 0, "best_day": "N/A",
                "best_hour": "N/A", "avg_mood": 0}
    import pandas as pd
    df = pd.DataFrame([{
        "day_of_week": l.day_of_week, "hour": l.hour,
        "mood": l.mood, "came_to_gym": l.came_to_gym,
    } for l in logs])
    day_names  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    day_rates  = df.groupby("day_of_week")["came_to_gym"].mean()
    hour_rates = df.groupby("hour")["came_to_gym"].mean()
    return {
        "attendance_rate": round(df["came_to_gym"].mean() * 100, 1),
        "best_day":   day_names[int(day_rates.idxmax())]  if not day_rates.empty  else "N/A",
        "best_hour":  f"{int(hour_rates.idxmax())}:00"    if not hour_rates.empty else "N/A",
        "avg_mood":   round(df["mood"].mean(), 1),
    }