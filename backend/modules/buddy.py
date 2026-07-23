from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db, ChatHistory, User, WorkoutSession
import random
import os
import json
import chromadb
from google import genai
from google.genai import types
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()
router = APIRouter()

# ─────────────────────────────────────────────
# Gemini setup
# ─────────────────────────────────────────────
USE_GEMINI = False
client = None
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if GEMINI_API_KEY:
        client = genai.Client(api_key=GEMINI_API_KEY)
        USE_GEMINI = True
except Exception as e:
    print("[WARN] Gemini setup failed in buddy:", e)

# ─────────────────────────────────────────────
# ChromaDB setup (RAG)
# ─────────────────────────────────────────────
collection = None
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    collection = chroma_client.get_or_create_collection(name="fitness_docs")
    
    # Pre-populate fitness collection if empty to ensure RAG has high quality content
    if collection.count() == 0:
        initial_docs = [
            "Hypertrophy guidelines: For muscle growth, target 10-20 working sets per muscle group per week. Rep ranges of 6-12 are optimal, training close to failure (RPE 8-10). Ensure progressive overload by increasing weight, reps, or sets over time.",
            "Cardio and fat loss: Combine high-intensity interval training (HIIT) with low-intensity steady-state cardio (LISS). Maintain a daily caloric deficit of 300-500 kcal for safe and sustainable fat loss.",
            "Recovery and sleep: Recovery is where muscle growth happens. Ensure 7-9 hours of sleep, stay hydrated (3L+ water daily), and consume 1.6-2.2g of protein per kg of bodyweight.",
            "Progressive overload: Gradually increase weight, reps, or sets over time to force adaptation. Never sacrifice form for weight.",
            "Mind-muscle connection: Focus on feeling the target muscle contract during each rep. Squeeze at the top of the movement and control the descent."
        ]
        collection.add(
            documents=initial_docs,
            ids=[f"fit_tip_{i}" for i in range(len(initial_docs))]
        )
        print("[OK] Pre-populated ChromaDB fitness_docs collection")
    else:
        print("[OK] ChromaDB fitness_docs collection loaded with", collection.count(), "documents")
except Exception as e:
    print("[WARN] ChromaDB setup failed in buddy:", e)

# ─────────────────────────────────────────────
# Request Model
# ─────────────────────────────────────────────
class GeminiChatResponse(BaseModel):
    reply: str = Field(..., description="A friendly, empathetic chat response addressing the user's message directly. Must be supportive and motivating.")
    recap: Optional[str] = Field(None, description="A brief recap of what was discussed previously in the conversation or current context.")
    session_analysis: Optional[str] = Field(None, description="An analysis of the user's logged workout session history, exercise performance, or consistency.")
    suggested_activities: Optional[List[str]] = Field(None, description="A list of 2-4 recommended physical activities or exercises for the user's next session.")
    workout_plan: Optional[str] = Field(None, description="A structured, day-by-day or week-by-week fitness session plan if requested, or a specific calendar plan.")

class ChatRequest(BaseModel):
    username: str = Field(default="guest")
    message: str = Field(..., min_length=1)
    bot_name: str = Field(default="FitBot")
    bot_gender: str = Field(default="neutral")

class ChatResponse(BaseModel):
    reply: str
    mood_detected: str
    sentiment_score: float
    history_used: int
    source: str
    recap: Optional[str] = None
    session_analysis: Optional[str] = None
    suggested_activities: Optional[List[str]] = None
    workout_plan: Optional[str] = None


# ─────────────────────────────────────────────
# Simple Emotion Detection
# ─────────────────────────────────────────────
def detect_mood(text):
    text = text.lower()
    if any(w in text for w in ["tired", "exhausted", "sleepy", "drained"]):
        return "tired"
    if any(w in text for w in ["sad", "depressed", "low", "give up"]):
        return "sad"
    if any(w in text for w in ["happy", "great", "good", "amazing", "pumped"]):
        return "happy"
    if any(w in text for w in ["angry", "frustrated", "annoyed", "hate"]):
        return "angry"
    return "neutral"

def calculate_compound_score(text: str) -> float:
    """A lightweight simulated VADER compound score without external dependencies (-1.0 to 1.0)"""
    positive_words = {"good", "great", "awesome", "excellent", "happy", "love", "pumped", "best", "progress"}
    negative_words = {"bad", "terrible", "awful", "hate", "sad", "tired", "quit", "pain", "worst", "fail"}
    
    words = set(text.lower().replace(".", "").replace(",", "").split())
    pos_count = len(words.intersection(positive_words))
    neg_count = len(words.intersection(negative_words))
    
    score = (pos_count - neg_count) * 0.35
    return max(-1.0, min(1.0, score))


# ─────────────────────────────────────────────
# Smart Reply Generator (Fallback)
# ─────────────────────────────────────────────
def generate_reply(message, mood, history):
    message = message.lower()
    last_user_msgs = [h.message for h in history if h.role == "user"][-3:]

    if mood == "tired":
        return random.choice([
            "You don’t need a perfect workout today. Just show up. Even 10 minutes counts.",
            "Low energy days happen. Try a light session instead of skipping completely.",
            "Your future self will thank you for doing even a small workout today."
        ])
    if mood == "sad":
        return random.choice([
            "Tough days hit everyone. Moving your body can actually help your mood.",
            "You’re doing better than you think. Start small today.",
            "One workout won’t fix everything, but it helps more than you expect."
        ])
    if mood == "happy":
        return random.choice([
            "That’s the energy I like. Use it for a strong workout today.",
            "Perfect mood for pushing limits. Let’s go!",
            "Ride this momentum and crush your session."
        ])

    if "gym" in message:
        return "Consistency beats motivation. Even if you don’t feel like it, just go."
    if "diet" in message or "food" in message:
        return "Focus on protein, hydration, and consistency. No extreme diets needed."
    if "plan" in message:
        return "Stick to your current plan for at least 2–3 weeks before changing anything."

    if last_user_msgs:
        return f"You mentioned earlier: '{last_user_msgs[-1]}'. Stay consistent and build from there."

    return random.choice([
        "Small progress daily beats random motivation bursts.",
        "Discipline is what gets results, not mood.",
        "You don’t need motivation. You need a system."
    ])


# ─────────────────────────────────────────────
# Chat Endpoint
# ─────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
def chat(data: ChatRequest, db: Session = Depends(get_db)):
    mood = detect_mood(data.message)
    compound = calculate_compound_score(data.message)

    # Get last 10 messages for memory context
    history = (
        db.query(ChatHistory)
        .filter(ChatHistory.username == data.username)
        .order_by(ChatHistory.created_at.desc())
        .limit(10)
        .all()
    )
    history = list(reversed(history))  # chronological order
    source = "rule-based"

    # Fetch User Profile
    user = db.query(User).filter(User.username == data.username).first()
    user_profile = ""
    if user:
        user_profile = f"Age: {user.age or 'N/A'}, Gender: {user.gender or 'N/A'}, Weight: {user.weight_kg or 'N/A'} kg, Height: {user.height_cm or 'N/A'} cm, Goal: {user.goal or 'N/A'}, Fitness Level: {user.fitness_level or 'N/A'}"

    # Fetch Recent Workout Data
    workout_sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.username == data.username)
        .order_by(WorkoutSession.created_at.desc())
        .limit(5)
        .all()
    )
    
    workout_context = []
    for s in workout_sessions:
        if s.exercise == "habit_checkin":
            status = "Came to gym" if s.came_to_gym else "Did not come to gym"
            workout_context.append(f"- {s.date}: Habit Check-in (Mood: {s.mood}/5, Stress: {s.stress}/5, Status: {status})")
        else:
            workout_context.append(f"- {s.date}: {s.exercise} ({s.sets_done} sets of {s.reps} reps)")
    
    workout_text = "\n".join(workout_context) if workout_context else "No workouts logged yet."

    # RAG lookup from ChromaDB
    rag_context = ""
    if collection is not None:
        try:
            rag_results = collection.query(query_texts=[data.message], n_results=2)
            if rag_results and rag_results.get("documents") and rag_results["documents"][0]:
                rag_context = "\n".join(rag_results["documents"][0])
        except Exception as rag_err:
            print("[WARN] RAG lookup failed in buddy:", rag_err)

    recap = None
    session_analysis = None
    suggested_activities = None
    workout_plan = None

    if USE_GEMINI and client is not None:
        try:
            bot_name = data.bot_name
            bot_gender = data.bot_gender
            history_text = "\n".join([f"{msg.role}: {msg.message}" for msg in history])
            
            prompt = f"""
            You are {bot_name}, a supportive {bot_gender} AI gym buddy.
            
            User Profile:
            {user_profile if user_profile else "No profile set yet."}
            
            Recent Workout & Activity Data:
            {workout_text}
            
            ChromaDB RAG Knowledge:
            {rag_context}
            
            Current User Mood: {mood} (Sentiment Score: {compound:.2f})
            
            Recent Chat History:
            {history_text}
            
            User's new message: "{data.message}"
            
            Please provide a response structured as JSON using the defined schema:
            - reply: A friendly, highly motivating, and empathetic chat response (1-3 sentences) directly addressing their new message. Do not use markdown.
            - recap: Summarize the key context of previous conversations, especially if the user is following up or continuing a topic.
            - session_analysis: Analyze the user's recent workout and activity data (consistency, sets/reps, habit check-ins) and give encouragement or insights.
            - suggested_activities: A list of 2-4 appropriate exercises or activities that align with their goals and current state.
            - workout_plan: If the user explicitly asks for a workout schedule or plan, provide a clear structured plan. Otherwise, leave it null.
            """

            # ─────────────────────────────────────────────
            # Self-Looping Reflection & Correction Agent Loop
            # ─────────────────────────────────────────────
            max_loops = 2
            current_loop = 0
            critique = ""
            ai_data = {}

            while current_loop < max_loops:
                loop_prompt = prompt
                if critique:
                    loop_prompt += f"\n\n[CRITIQUE FEEDBACK FOR CORRECTION]:\n{critique}\nPlease rewrite and fix the response JSON to satisfy these points."

                # Choose best model (fallback cascade)
                try:
                    response = client.models.generate_content(
                        model="gemini-1.5-pro",
                        contents=loop_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=GeminiChatResponse,
                        )
                    )
                except Exception:
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=loop_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=GeminiChatResponse,
                        )
                    )

                response_text = response.text.strip()
                ai_data = json.loads(response_text)

                # Critic evaluation step (Reflection)
                critic_prompt = f"""
                You are a strict quality controller. Analyze this AI gym buddy response JSON:
                {response_text}
                
                Verify the following:
                1. Is the reply empathetic, encouraging, and free of generic preambles?
                2. Does the session_analysis match the user's actual workouts?
                3. Are the suggested_activities specific?
                4. If the user asked for a workout plan/schedule, is it fully detailed in workout_plan?
                
                Return JSON only conforming to this schema:
                {{
                  "passed": true or false,
                  "critique": "what needs to be corrected, or empty if passed"
                }}
                """
                
                try:
                    critic_res = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=critic_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    critic_data = json.loads(critic_res.text.strip())
                    if critic_data.get("passed", True):
                        break
                    else:
                        critique = critic_data.get("critique", "")
                        print(f"[REFL] Loop {current_loop} failed criticism: {critique}")
                        current_loop += 1
                except Exception as critic_err:
                    print("[WARN] Critic step failed, skipping evaluation:", critic_err)
                    break

            reply = ai_data.get("reply", "")
            recap = ai_data.get("recap")
            session_analysis = ai_data.get("session_analysis")
            suggested_activities = ai_data.get("suggested_activities")
            workout_plan = ai_data.get("workout_plan")
            source = "gemini-reflected" if current_loop > 0 else "gemini"
            
        except Exception as e:
            print("[WARN] Gemini agent loop failed, using fallback:", e)
            reply = generate_reply(data.message, mood, history)
    else:
        reply = generate_reply(data.message, mood, history)

    # Save user message
    user_log = ChatHistory(
        username=data.username,
        role="user",
        message=data.message,
        sentiment=mood,
        compound=compound
    )
    db.add(user_log)

    # Save bot reply
    bot_log = ChatHistory(
        username=data.username,
        role="assistant",
        message=reply,
        sentiment="neutral",
        compound=0.5 
    )
    db.add(bot_log)
    db.commit()

    return ChatResponse(
        reply=reply,
        mood_detected=mood,
        sentiment_score=compound,
        history_used=len(history),
        source=source,
        recap=recap,
        session_analysis=session_analysis,
        suggested_activities=suggested_activities,
        workout_plan=workout_plan
    )