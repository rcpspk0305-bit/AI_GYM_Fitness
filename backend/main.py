from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import (
    init_db, get_db,
    WorkoutSession, HabitLog,
    DietLog, ChatHistory, Recommendation, ProgressPhoto, IoTTelemetry
)

from modules import trainer, dietician, buddy, habit, recommender, equipment, performance, iot
from modules.mqtt_service import start_mqtt, stop_mqtt

init_db()

app = FastAPI(
    title="AI Gym & Fitness Assistant",
    description="AI fitness ecosystem with Trainer, Dietician, Buddy, Recommender, Performance, Equipment, and IoT",
    version="3.0.0",
)

# GZip is added first so it runs INSIDE the CORS wrapper
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS is added last so it is the OUTERMOST layer
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-gym-fitness.onrender.com"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trainer.router, prefix="/trainer", tags=["Trainer"])
app.include_router(dietician.router, prefix="/dietician", tags=["Dietician"])
app.include_router(buddy.router, prefix="/buddy", tags=["Buddy"])
app.include_router(habit.router, prefix="/habit", tags=["Habit"])
app.include_router(recommender.router, prefix="/recommender", tags=["Recommender"])
app.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
app.include_router(performance.router, prefix="/performance", tags=["Performance"])
app.include_router(iot.router, prefix="/iot", tags=["IoT"])


@app.on_event("startup")
def app_startup():
    start_mqtt()


@app.on_event("shutdown")
def app_shutdown():
    stop_mqtt()


@app.api_route("/", methods=["GET", "HEAD"], tags=["Health"])
def root():
    return {
        "status": "running",
        "version": "3.0.0",
        "modules": [
            "trainer", "dietician", "habit", "buddy",
            "recommender", "equipment", "performance", "iot"
        ],
        "docs": "https://ai-gym-backend.onrender.com/docs",
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


@app.get("/dashboard", tags=["Dashboard"])
def get_dashboard(db: Session = Depends(get_db)):
    # Optimize WorkoutSession aggregation
    total_reps = db.query(func.sum(WorkoutSession.reps)).scalar() or 0
    total_sessions = db.query(WorkoutSession).count()

    by_exercise_query = db.query(WorkoutSession.exercise, func.sum(WorkoutSession.reps)).group_by(WorkoutSession.exercise).all()
    by_exercise = {exercise: reps for exercise, reps in by_exercise_query if exercise}
    favourite_exercise = max(by_exercise, key=by_exercise.get) if by_exercise else "N/A"

    # Optimize HabitLog aggregation
    total_logged = db.query(HabitLog).count()
    sessions_attended = db.query(HabitLog).filter(HabitLog.came_to_gym == 1).count()
    attendance_rate = round((sessions_attended / total_logged * 100), 1) if total_logged > 0 else 0

    # Streak logic (fetch only came_to_gym status to check recent streak)
    recent_habits = db.query(HabitLog.came_to_gym).order_by(HabitLog.created_at.desc()).all()
    current_streak = 0
    for l in recent_habits:
        if l.came_to_gym == 1:
            current_streak += 1
        else:
            break

    # Optimize DietLog fetching (only load the latest entry)
    total_plans = db.query(DietLog).count()
    latest_diet = db.query(DietLog).order_by(DietLog.created_at.desc()).first()

    # Optimize ChatHistory/sentiment fetching
    total_messages = db.query(ChatHistory).filter(ChatHistory.role == "user").count()
    compounds_query = db.query(ChatHistory.compound).filter(ChatHistory.role == "user", ChatHistory.compound != None).all()
    compounds = [c[0] for c in compounds_query]
    avg_sentiment = round(sum(compounds) / len(compounds), 3) if compounds else 0.0
    sentiment_trend = (
        "positive" if avg_sentiment > 0.05 else
        "negative" if avg_sentiment < -0.05 else
        "neutral"
    )

    # Optimize Recommendation and ProgressPhoto counts
    recommendations_count = db.query(Recommendation).count()
    photos_count = db.query(ProgressPhoto).count()

    # Telemetry fetching (keep limit 20, but query only heart_rate column)
    telemetry_query = db.query(IoTTelemetry.heart_rate).order_by(IoTTelemetry.created_at.desc()).limit(20).all()
    heart_rate_history = [t[0] for t in reversed(telemetry_query) if t[0]]

    return {
        "workout": {
            "total_reps": total_reps,
            "total_sessions": total_sessions,
            "favourite_exercise": favourite_exercise,
            "by_exercise": by_exercise,
        },
        "habit": {
            "attendance_rate": attendance_rate,
            "current_streak": current_streak,
            "total_logged": total_logged,
            "total_sessions": sessions_attended,
        },
        "diet": {
            "total_plans": total_plans,
            "latest_calories": latest_diet.calorie_target if latest_diet else None,
            "latest_goal": latest_diet.goal if latest_diet else None,
            "latest_bmi": latest_diet.bmi if latest_diet else None,
        },
        "buddy": {
            "total_messages": total_messages,
            "avg_sentiment": avg_sentiment,
            "sentiment_trend": sentiment_trend,
        },
        "recommender": {
            "plans_generated": recommendations_count,
        },
        "storage": {
            "progress_photos": photos_count,
        },
        "telemetry": {
            "heart_rate_history": heart_rate_history,
        },
    }