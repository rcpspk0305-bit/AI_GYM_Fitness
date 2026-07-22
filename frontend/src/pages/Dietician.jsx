import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/dietician`;

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "sans-serif",
  background: "#ffffff",
};

const labelStyle = {
  fontSize: 13,
  color: "#374151",
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
};

const cardStyle = {
  background: "#f9fafb",
  borderRadius: 14,
  padding: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
};

function StatCard({ label, value, color = "#2563eb" }) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: 14,
        background: "#ffffff",
        borderLeft: `5px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 6 }}>
        {value ?? "--"}
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

export default function Dietician() {
  const [form, setForm] = useState({
    weight: 70,
    height: 170,
    age: 20,
    gender: "male",
    goal: "muscle gain",
    diet_type: "vegetarian",
    activity: "moderate",
  });

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLog, setChatLog] = useState([
    {
      role: "assistant",
      text: "Ask anything about your diet plan — meals, protein, rice, snacks, hydration, or timing.",
    },
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "weight" || name === "height" || name === "age"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlan(null);

    try {
      const res = await axios.post(`${API}/recommend`, form);
      setPlan(res.data);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
        "Failed to generate diet plan. Check backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const askDietQuestion = async () => {
    if (!chatQuestion.trim()) return;

    const question = chatQuestion.trim();

    setChatLog((prev) => [...prev, { role: "user", text: question }]);
    setChatQuestion("");

    try {
      const res = await axios.post(`${API}/chat`, {
        question,
        context: {
          goal: form.goal,
          diet_type: form.diet_type,
          activity: form.activity,
          latest_plan: plan,
        },
      });

      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: res.data.answer || "No answer returned." },
      ]);
    } catch (err) {
      console.error(err);
      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I could not answer that right now.",
        },
      ]);
    }
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 24,
        fontFamily: "Inter, sans-serif",
        color: "#111827",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32, color: "#111827" }}>
          Dietician AI
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8, fontSize: 15 }}>
          Get a personalized meal plan powered by RAG + Gemini AI.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          ...cardStyle,
          background: "#ffffff",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Weight (kg)</label>
            <input
              type="number"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Height (cm)</label>
            <input
              type="number"
              name="height"
              value={form.height}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Age</label>
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Goal</label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="weight loss">Weight Loss</option>
              <option value="muscle gain">Muscle Gain</option>
              <option value="endurance">Endurance</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Diet Type</label>
            <select
              name="diet_type"
              value={form.diet_type}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="non-vegetarian">Non-Vegetarian</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Activity</label>
            <select
              name="activity"
              value={form.activity}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 20,
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            padding: "12px 18px",
            borderRadius: 10,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Get My Diet Plan"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 16,
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              padding: 12,
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
      </form>

      {plan && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <StatCard label="Status" value={plan.status} color="#2563eb" />
            <StatCard label="Source" value={plan.source} color="#7c3aed" />
            <StatCard label="BMI" value={plan.bmi} color="#059669" />
            <StatCard
              label="Calories"
              value={plan.daily_calories}
              color="#dc2626"
            />
            <StatCard
              label="Protein (g)"
              value={plan.protein_g}
              color="#ea580c"
            />
            <StatCard
              label="Carbs (g)"
              value={plan.carbs_g}
              color="#0891b2"
            />
            <StatCard label="Fats (g)" value={plan.fats_g} color="#ca8a04" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 18,
            }}
          >
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: 22 }}>Your Personalized Plan</h2>
              <p>
                <strong>Breakfast:</strong> {plan.meal_plan?.breakfast || "--"}
              </p>
              <p>
                <strong>Lunch:</strong> {plan.meal_plan?.lunch || "--"}
              </p>
              <p>
                <strong>Dinner:</strong> {plan.meal_plan?.dinner || "--"}
              </p>
              <p>
                <strong>Snacks:</strong> {plan.meal_plan?.snacks || "--"}
              </p>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: 22 }}>Grocery List</h2>
              {plan.grocery_list?.length ? (
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {plan.grocery_list.map((item, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No grocery list available.</p>
              )}
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: 18 }}>
            <h2 style={{ marginTop: 0, fontSize: 22 }}>Tips</h2>
            {plan.tips?.length ? (
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {plan.tips.map((tip, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tips available.</p>
            )}
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 24 }}>Diet Chat</h2>
        <p style={{ color: "#6b7280", marginTop: 6 }}>
          Ask anything — "Can I eat rice?", "Best pre-workout snack?", etc.
        </p>

        <div
          style={{
            marginTop: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#ffffff",
            height: 320,
            overflowY: "auto",
            padding: 14,
          }}
        >
          {chatLog.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: msg.role === "user" ? "#2563eb" : "#f3f4f6",
                  color: msg.role === "user" ? "#ffffff" : "#111827",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askDietQuestion()}
            placeholder="Ask a diet question..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={askDietQuestion}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              padding: "12px 16px",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}