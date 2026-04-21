from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db, DietProfile
import chromadb
from google import genai
import os
import json
from dotenv import load_dotenv

# -----------------------------
# Load .env & Router Setup
# -----------------------------
load_dotenv()
router = APIRouter()

# -----------------------------
# Gemini setup
# -----------------------------
USE_GEMINI = False
client = None

try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    if GEMINI_API_KEY:
        client = genai.Client(api_key=GEMINI_API_KEY)
        USE_GEMINI = True
        print("[OK] Gemini AI loaded successfully")
    else:
        print("[WARN] GEMINI_API_KEY not found. Using fallback diet plan.")
except Exception as e:
    print("[WARN] Gemini import/setup failed:", e)
    USE_GEMINI = False

# -----------------------------
# ChromaDB setup
# -----------------------------
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    collection = chroma_client.get_or_create_collection(name="nutrition_docs")
    print("[OK] ChromaDB collection loaded")
except Exception as e:
    print("[WARN] ChromaDB setup failed:", e)
    collection = None

# -----------------------------
# Request & Response Models
# -----------------------------
class DietRequest(BaseModel):
    weight: float = Field(gt=20, lt=300, description="Weight in kg")
    height: float = Field(gt=50, lt=250, description="Height in cm")
    age: int = Field(gt=10, lt=100)
    gender: str
    goal: str
    diet_type: str
    activity: str

class MealPlan(BaseModel):
    breakfast: str
    lunch: str
    dinner: str
    snacks: str

class DietResponse(BaseModel):
    status: str
    source: str
    message: str = ""
    bmi: float = 0.0
    daily_calories: int = 0
    protein_g: int = 0
    carbs_g: int = 0
    fats_g: int = 0
    meal_plan: MealPlan = None
    grocery_list: list[str] = []
    tips: list[str] = []

class ChatRequest(BaseModel):
    question: str
    context: dict = {}

class ChatResponse(BaseModel):
    answer: str


# -----------------------------
# BMI Calculator
# -----------------------------
def calculate_bmi(weight, height_cm):
    height_m = height_cm / 100
    return round(weight / (height_m ** 2), 2)


# -----------------------------
# Fallback Diet Plan
# -----------------------------
def generate_fallback_plan(data: DietRequest):
    bmi = calculate_bmi(data.weight, data.height)

    calories = 2200
    if data.goal.lower() == "weight loss":
        calories = 1800
    elif data.goal.lower() == "muscle gain":
        calories = 2600
    elif data.goal.lower() == "endurance":
        calories = 2400

    protein = round(data.weight * 1.8)
    carbs = round(calories * 0.5 / 4)
    fats = round(calories * 0.25 / 9)

    diet_type = data.diet_type.lower()

    if diet_type == "vegetarian":
        breakfast = "Oats with milk, banana, almonds"
        lunch = "Rice + dal + paneer curry + salad"
        dinner = "Chapati + mixed veg + curd"
        snacks = "Fruits / nuts / sprouts"
        grocery = [
            "Oats", "Milk", "Bananas", "Almonds", "Rice",
            "Dal", "Paneer", "Chapati flour", "Vegetables", "Curd"
        ]
    elif diet_type == "vegan":
        breakfast = "Oats with soy milk, banana, peanut butter"
        lunch = "Brown rice + chickpeas + vegetables"
        dinner = "Chapati + tofu curry + salad"
        snacks = "Fruits / nuts / roasted chana"
        grocery = [
            "Oats", "Soy milk", "Bananas", "Peanut butter", "Brown rice",
            "Chickpeas", "Tofu", "Vegetables", "Chapati flour", "Nuts"
        ]
    else:
        breakfast = "Eggs + oats + banana"
        lunch = "Rice + chicken/fish + vegetables"
        dinner = "Chapati + paneer/chicken + salad"
        snacks = "Fruits / nuts / yogurt"
        grocery = [
            "Eggs", "Oats", "Bananas", "Rice", "Chicken/Fish",
            "Paneer", "Vegetables", "Chapati flour", "Yogurt", "Nuts"
        ]

    return {
        "bmi": bmi,
        "daily_calories": calories,
        "protein_g": protein,
        "carbs_g": carbs,
        "fats_g": fats,
        "meal_plan": {
            "breakfast": breakfast,
            "lunch": lunch,
            "dinner": dinner,
            "snacks": snacks,
        },
        "grocery_list": grocery,
        "tips": [
            "Drink at least 2.5 to 3 liters of water daily",
            "Prioritize protein in every meal",
            "Stay consistent for at least 6 weeks",
            "Avoid skipping breakfast and late-night junk eating"
        ]
    }


# -----------------------------
# Gemini AI Plan Generator
# -----------------------------
def generate_gemini_plan(data: DietRequest):
    prompt = f"""
You are an expert fitness dietician.

Generate a personalized diet plan in VALID JSON ONLY.
Do not include markdown, explanations, or extra text.

User details:
- Weight: {data.weight} kg
- Height: {data.height} cm
- Age: {data.age}
- Gender: {data.gender}
- Goal: {data.goal}
- Diet Type: {data.diet_type}
- Activity Level: {data.activity}

Return JSON in this exact structure:
{{
  "bmi": {calculate_bmi(data.weight, data.height)},
  "daily_calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "meal_plan": {{
    "breakfast": "string",
    "lunch": "string",
    "dinner": "string",
    "snacks": "string"
  }},
  "grocery_list": ["item1", "item2", "item3"],
  "tips": ["tip1", "tip2", "tip3", "tip4"]
}}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    text = response.text.strip()

    if text.startswith("```json"):
        text = text.replace("```json", "").replace("```", "").strip()
    elif text.startswith("```"):
        text = text.replace("```", "").strip()

    parsed = json.loads(text)
    return parsed


# -----------------------------
# Chat fallback
# -----------------------------
def fallback_chat_answer(question, context_data):
    return f"""
Based on your profile, a practical answer is:

For "{question}", focus on balanced meals, enough protein, hydration, and consistency.
Try to match your food choices with your goal ({context_data.get('goal', 'general fitness')}).
""".strip()


# -----------------------------
# Main Route
# -----------------------------
@router.post("/recommend", response_model=DietResponse)
def recommend_diet(data: DietRequest):
    try:
        if USE_GEMINI and client is not None:
            try:
                ai_plan = generate_gemini_plan(data)
                return DietResponse(
                    status="success",
                    source="gemini",
                    **ai_plan
                )
            except Exception as gemini_error:
                print("[WARN] Gemini failed, using fallback:", gemini_error)

        fallback_plan = generate_fallback_plan(data)
        return DietResponse(
            status="success",
            source="fallback",
            **fallback_plan
        )

    except Exception as e:
        print("[ERROR] Diet recommendation failed:", e)
        return DietResponse(
            status="error",
            source="error",
            message=str(e)
        )


# -----------------------------
# Chat Route
# -----------------------------
@router.post("/chat", response_model=ChatResponse)
def diet_chat(data: ChatRequest):
    question = data.question
    context_data = data.context

    if not question.strip():
        return ChatResponse(answer="Please ask a question about your diet plan.")

    try:
        # RAG context
        context = ""
        if collection is not None:
            try:
                rag_results = collection.query(query_texts=[question], n_results=3)
                if rag_results and rag_results.get("documents") and rag_results["documents"][0]:
                    context = "\n".join(rag_results["documents"][0])
            except Exception as rag_error:
                print("[WARN] RAG lookup failed:", rag_error)

        prompt = f"""
You are a helpful dietician assistant.

Use this nutrition knowledge if relevant:
{context}

User profile:
{context_data}

Question:
{question}

Answer in 2-3 sentences.
Be specific, practical, and easy to understand.
"""

        if USE_GEMINI and client is not None:
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                return ChatResponse(answer=response.text.strip())
            except Exception as gemini_error:
                print("[WARN] Gemini chat failed, using fallback:", gemini_error)

        return ChatResponse(answer=fallback_chat_answer(question, context_data))

    except Exception as e:
        print("[ERROR] Diet chat failed:", e)
        return ChatResponse(answer=f"Could not get answer: {str(e)}")