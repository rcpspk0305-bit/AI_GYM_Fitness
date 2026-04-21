from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db, ChatHistory
import random
import os
from google import genai
from dotenv import load_dotenv

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
# Request Model
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    username: str = Field(default="guest")
    message: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    reply: str
    mood_detected: str
    sentiment_score: float
    history_used: int
    source: str


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
# Smart Reply Generator
# ─────────────────────────────────────────────
def generate_reply(message, mood, history):
    message = message.lower()

    # Context awareness (use last message)
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

    # Context-based responses
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

    # Get last 10 messages
    history = (
        db.query(ChatHistory)
        .filter(ChatHistory.username == data.username)
        .order_by(ChatHistory.created_at.desc())
        .limit(10)
        .all()
    )

    history = list(reversed(history))  # chronological order
    source = "rule-based"

    if USE_GEMINI and client is not None:
        try:
            # Build history context
            history_text = "\n".join([f"{msg.role}: {msg.message}" for msg in history[-5:]])
            prompt = f"""
            You are FitBot, a supportive AI gym buddy.
            The user is feeling: {mood} (Sentiment Score: {compound:.2f}).
            Recent chat history:
            {history_text}
            
            User's new message: "{data.message}"
            
            Provide a short, highly motivating, and empathetic response (1-3 sentences maximum).
            Do not use markdown. Just reply as a friend.
            """
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            reply = response.text.strip()
            source = "gemini"
        except Exception as e:
            print("[WARN] Gemini failed, using fallback:", e)
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

    # Save bot reply (bot compound is usually neutral/positive, set to 0.5 default)
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
        source=source
    )