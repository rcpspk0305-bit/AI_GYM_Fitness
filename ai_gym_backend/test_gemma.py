from dotenv import load_dotenv
load_dotenv()
import os
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

print("Attempting to call gemini-2.5-flash...")
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello"
    )
    print("Success:", response.text)
except Exception as e:
    print("Error:", repr(e))
