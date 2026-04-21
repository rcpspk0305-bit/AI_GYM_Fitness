import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/recommender";

export default function Recommender() {
  const [form, setForm] = useState({
    username: "Cherry",
    goal: "muscle_gain",
    level: "beginner",
    equipment: "none",
    days_per_week: 3,
    location: "Hyderabad",
  });

  const [plan, setPlan] = useState(null);
  const [tips, setTips] = useState(null);
  const [smartRec, setSmartRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goals = [
    { value: "muscle_gain", label: "Muscle Gain" },
    { value: "weight_loss", label: "Weight Loss" },
    { value: "endurance", label: "Endurance" },
    { value: "flexibility", label: "Flexibility" },
    { value: "maintenance", label: "Maintenance" },
  ];

  const levels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  const equipmentOptions = [
    "none",
    "mat",
    "rope",
    "dumbbells",
    "barbell",
    "gym",
    "treadmill",
    "cycle",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "days_per_week" ? Number(value) : value,
    }));
  };

  const generatePlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlan(null);
    setTips(null);

    try {
      const [planRes, tipsRes] = await Promise.all([
        axios.post(`${API_BASE}/plan`, form),
        axios.get(`${API_BASE}/workout-tips`, {
          params: {
            goal: form.goal,
            level: form.level,
          },
        }),
      ]);

      setPlan(planRes.data);
      setTips(tipsRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate workout plan. Check backend and route setup.");
    } finally {
      setLoading(false);
    }
  };

  const getSmartRecommendations = async () => {
    setLoading(true);
    setError("");
    setSmartRec(null);

    try {
      const res = await axios.post(`${API_BASE}/smart-recommend`, {
        username: form.username,
        goal: form.goal,
        location: form.location,
      });

      setSmartRec(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch smart AI recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>🏋️ AI Fitness Recommender</h1>
        <p style={styles.subheading}>
          Get personalized workout plans, nearby gym suggestions, and AI-powered fitness recommendations.
        </p>

        <form onSubmit={generatePlan} style={styles.formCard}>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter username"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Goal</label>
              <select
                name="goal"
                value={form.goal}
                onChange={handleChange}
                style={styles.input}
              >
                {goals.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Level</label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                style={styles.input}
              >
                {levels.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Equipment</label>
              <select
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
                style={styles.input}
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Days per Week</label>
              <input
                type="number"
                name="days_per_week"
                value={form.days_per_week}
                onChange={handleChange}
                min="3"
                max="6"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter city (e.g. Hyderabad)"
              />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Generating Plan..." : "Generate My Plan"}
          </button>

          <button
            type="button"
            style={{ ...styles.button, marginTop: "12px", background: "#10b981" }}
            onClick={getSmartRecommendations}
            disabled={loading}
          >
            {loading ? "Thinking..." : "Get Smart AI Recommendations"}
          </button>
        </form>

        {error && <div style={styles.error}>{error}</div>}

        {plan && (
          <>
            <div style={styles.summaryCard}>
              <h2 style={styles.cardTitle}>📊 Plan Summary</h2>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Goal</span>
                  <span style={styles.summaryValue}>{plan.goal}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Level</span>
                  <span style={styles.summaryValue}>{plan.level}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Workout Days</span>
                  <span style={styles.summaryValue}>{plan.summary.workout_days}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Rest Days</span>
                  <span style={styles.summaryValue}>{plan.summary.rest_days}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Total Minutes</span>
                  <span style={styles.summaryValue}>{plan.summary.total_minutes}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Calories</span>
                  <span style={styles.summaryValue}>{plan.summary.total_calories}</span>
                </div>
              </div>

              {plan.message && (
                <p style={styles.notice}>{plan.message}</p>
              )}
            </div>

            <div style={styles.sectionCard}>
              <h2 style={styles.cardTitle}>🔥 Top Recommended Workouts</h2>
              <div style={styles.cardGrid}>
                {plan.top_workouts.map((workout, idx) => (
                  <div key={idx} style={styles.workoutCard}>
                    <h3 style={styles.workoutTitle}>{workout.name}</h3>
                    <p style={styles.cardText}><strong>Type:</strong> {workout.type}</p>
                    <p style={styles.cardText}><strong>Duration:</strong> {workout.duration} min</p>
                    <p style={styles.cardText}><strong>Calories:</strong> {workout.calories_burned}</p>
                    <p style={styles.cardText}><strong>Equipment:</strong> {workout.equipment}</p>
                    <p style={styles.cardText}><strong>Muscles:</strong> {workout.muscles}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.sectionCard}>
              <h2 style={styles.cardTitle}>📅 Weekly Plan</h2>
              <div style={styles.weekGrid}>
                {plan.weekly_plan.map((day, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.dayCard,
                      backgroundColor: day.type === "rest" ? "#1e293b" : "#2e1065",
                      borderColor: day.type === "rest" ? "#334155" : "#4c1d95"
                    }}
                  >
                    <h3 style={styles.dayTitle}>{day.day}</h3>
                    <p style={styles.cardText}><strong>{day.type === "rest" ? "Rest Day" : day.label}</strong></p>
                    <p style={styles.cardText}>{day.workout}</p>
                    {day.type !== "rest" && (
                      <>
                        <p style={styles.cardText}><strong>Duration:</strong> {day.duration} min</p>
                        <p style={styles.cardText}><strong>Calories:</strong> {day.calories}</p>
                        <p style={styles.cardText}><strong>Muscles:</strong> {day.muscles}</p>
                        <p style={styles.cardText}><strong>Note:</strong> {day.note}</p>
                      </>
                    )}
                    {day.type === "rest" && <p style={styles.cardText}>{day.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {tips && (
              <div style={styles.sectionCard}>
                <h2 style={styles.cardTitle}>🧠 Smart Training Tips</h2>
                <ul style={styles.tipList}>
                  {tips.goal_tips.map((tip, idx) => (
                    <li key={idx} style={styles.tipItem}>{tip}</li>
                  ))}
                </ul>
                <div style={styles.levelTip}>
                  <strong>Level Tip:</strong> {tips.level_tip}
                </div>
              </div>
            )}
          </>
        )}

        {smartRec && (
          <div style={styles.sectionCard}>
            <h2 style={styles.cardTitle}>🤖 Smart AI Recommendations</h2>

            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Consistency Score</span>
                <span style={styles.summaryValue}>{smartRec.user_insights.consistency_score}</span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Preferred Workout Time</span>
                <span style={styles.summaryValue}>{smartRec.user_insights.preferred_time}:00</span>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h3 style={styles.workoutTitle}>🏋️ Recommended Gyms</h3>
              <div style={styles.cardGrid}>
                {smartRec.recommended_gyms.map((gym, idx) => (
                  <div key={idx} style={styles.workoutCard}>
                    <h4 style={{...styles.workoutTitle, fontSize: '1.1rem'}}>{gym.name}</h4>
                    <p style={styles.cardText}><strong>Area:</strong> {gym.area}</p>
                    <p style={styles.cardText}><strong>Rating:</strong> {gym.rating}</p>
                    <p style={styles.cardText}><strong>Price:</strong> ₹{gym.price}/month</p>
                    <p style={styles.cardText}><strong>Type:</strong> {gym.type}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h3 style={styles.workoutTitle}>📅 Recommended Program</h3>
              <p style={styles.cardText}>{smartRec.recommended_program}</p>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h3 style={styles.workoutTitle}>🎯 Fitness Challenge</h3>
              <p style={styles.cardText}>{smartRec.challenge}</p>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h3 style={styles.workoutTitle}>🧠 Why this was recommended</h3>
              <p style={styles.cardText}>{smartRec.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a", // Deep Navy background
    padding: "30px 16px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#f8fafc", // Make global text light
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  heading: {
    fontSize: "2.2rem",
    marginBottom: "8px",
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "800"
  },
  subheading: {
    textAlign: "center",
    color: "#94a3b8", // Slate 400
    marginBottom: "24px",
    fontSize: "1.1rem"
  },
  formCard: {
    background: "#1e293b", // Slate 800
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    marginBottom: "24px",
    border: "1px solid #334155" // Slate 700
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "8px",
    fontWeight: "600",
    color: "#cbd5e1", // Slate 300
    fontSize: "0.9rem"
  },
  input: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #475569", // Slate 600
    background: "#0f172a", // Match page bg
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "#6366f1", // Indigo 500
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)", // Red tinted
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #7f1d1d"
  },
  summaryCard: {
    background: "#1e293b",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    marginBottom: "24px",
    border: "1px solid #334155"
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginTop: "16px",
  },
  summaryItem: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "14px",
    textAlign: "center",
    border: "1px solid #334155"
  },
  summaryLabel: {
    display: "block",
    color: "#94a3b8",
    marginBottom: "6px",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  summaryValue: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#a78bfa", // Purple accent
  },
  notice: {
    marginTop: "16px",
    color: "#818cf8", // Indigo 400
    fontWeight: "bold",
  },
  sectionCard: {
    background: "#1e293b",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    marginBottom: "24px",
    border: "1px solid #334155"
  },
  cardTitle: {
    fontSize: "1.4rem",
    marginBottom: "18px",
    color: "#ffffff",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },
  workoutCard: {
    background: "#0f172a",
    padding: "18px",
    borderRadius: "16px",
    border: "1px solid #334155",
  },
  workoutTitle: {
    marginBottom: "12px",
    color: "#818cf8", // Indigo accent
    fontSize: "1.2rem",
    fontWeight: "700"
  },
  weekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },
  dayCard: {
    padding: "18px",
    borderRadius: "16px",
    border: "1px solid",
  },
  dayTitle: {
    marginBottom: "10px",
    color: "#ffffff",
    fontSize: "1.2rem"
  },
  cardText: {
    color: "#cbd5e1",
    marginBottom: "6px",
    lineHeight: "1.5"
  },
  tipList: {
    paddingLeft: "20px",
    color: "#cbd5e1",
  },
  tipItem: {
    marginBottom: "10px",
    lineHeight: "1.6",
  },
  levelTip: {
    marginTop: "18px",
    background: "rgba(99, 102, 241, 0.1)", // Faded indigo
    padding: "14px",
    borderRadius: "12px",
    color: "#a5b4fc",
    border: "1px solid rgba(99, 102, 241, 0.2)"
  },
};