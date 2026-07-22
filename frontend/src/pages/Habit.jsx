import { useState, useEffect } from "react";
import axios from "axios";

const API = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/trainer`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── UI helpers ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, bg, color }) {
  return (
    <div style={{
      background: bg, borderRadius: 14, padding: "16px 14px",
      textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
    }}>
      <p style={{ fontSize: 30, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color, margin: "4px 0 0", opacity: 0.75 }}>{sub}</p>}
      <p style={{ fontSize: 12, color, margin: "6px 0 0", opacity: 0.9 }}>{label}</p>
    </div>
  );
}

function SliderField({ label, value, onChange, min = 1, max = 5, leftLabel, rightLabel }) {
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</label>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors[value - 1] }}>{value}/5</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: colors[value - 1] }} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: "#9ca3af", marginTop: 2
      }}>
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    </div>
  );
}

function ProbBar({ prob }) {
  const color =
    prob >= 0.75 ? "#ef4444" : prob >= 0.5 ? "#f97316" :
      prob >= 0.25 ? "#f59e0b" : "#22c55e";
  const label =
    prob >= 0.75 ? "High risk" : prob >= 0.5 ? "Moderate" :
      prob >= 0.25 ? "Low risk" : "Very likely going";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>Skip probability</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {Math.round(prob * 100)}% — {label}
        </span>
      </div>
      <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${prob * 100}%`, background: color,
          borderRadius: 6, transition: "width 0.6s ease"
        }} />
      </div>
    </div>
  );
}

function AttendanceChart({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 10 }}>
        Last {history.length} sessions
      </p>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 70 }}>
        {history.map((h, i) => (
          <div key={i} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4
          }}>
            <div style={{
              width: "100%", height: h.came_to_gym == 1 ? 52 : 26,
              background: h.came_to_gym == 1 ? "#7c3aed" : "#e5e7eb",
              borderRadius: 6, opacity: h.came_to_gym == 1 ? 1 : 0.6,
              transition: "all 0.3s ease",
            }} />
            <span style={{ fontSize: 9, color: "#9ca3af" }}>
              {h.date ? h.date.slice(5) : ""}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "#6b7280" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            width: 10, height: 10, background: "#7c3aed",
            borderRadius: 2, display: "inline-block"
          }} />Went to gym
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            width: 10, height: 10, background: "#e5e7eb",
            borderRadius: 2, display: "inline-block"
          }} />Skipped
        </span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Habit() {
  const [tab, setTab] = useState("log");

  // Log form
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [hour, setHour] = useState(7);
  const [cameToGym, setCameToGym] = useState(true);
  const [logMsg, setLogMsg] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  // Predict form
  const [pDay, setPDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [pHour, setPHour] = useState(7);
  const [pMood, setPMood] = useState(3);
  const [pStress, setPStress] = useState(3);
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  // Stats — insights is built locally from streak + stats data
  const [streak, setStreak] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, []);

  // Build insights locally from streak + stats — no separate API call needed
  const buildInsights = (streakData, statsData) => {
    if (!streakData || !statsData) return null;
    const attendance = statsData.attendance_rate || 0;
    const streak_val = streakData.streak || 0;
    const total = streakData.total_logged || 0;

    let habit_summary = "";
    if (streak_val >= 7) habit_summary = "Incredible streak! You're unstoppable.";
    else if (streak_val >= 3) habit_summary = "Strong momentum — keep the streak alive!";
    else if (attendance >= 70) habit_summary = "Great attendance rate. Consistency is your superpower.";
    else if (attendance >= 50) habit_summary = "Above average — push for 70%+ this week!";
    else if (total === 0) habit_summary = "Start logging to unlock your AI insights.";
    else habit_summary = "Every entry makes the prediction smarter. Keep logging!";

    const consistency_score = Math.min(
      100, Math.round((attendance * 0.6) + (Math.min(streak_val, 14) / 14 * 40))
    );

    return {
      habit_summary,
      best_day: statsData.best_day || "N/A",
      worst_day: "N/A",
      best_hour: statsData.best_hour || "N/A",
      biggest_factor: streak_val > 3 ? "Momentum" : attendance > 50 ? "Mood" : "Consistency",
      consistency_score,
    };
  };

  const fetchStats = async () => {
    try {
      const [streakRes, statsRes] = await Promise.all([
        axios.get(`${API}/streak`).catch(() => null),
        axios.get(`${API}/habit-stats`).catch(() => null),
      ]);

      const streakData = streakRes?.data || null;
      const statsData = statsRes?.data || null;

      if (streakData) {
        setStreak(streakData);
        setHistory(streakData.history || []);
      }
      if (statsData) {
        setStats(statsData);
      }
      if (streakData && statsData) {
        setInsights(buildInsights(streakData, statsData));
      }
    } catch (err) {
      console.error("fetchStats error:", err);
    }
  };

  const handleLog = async () => {
    setLogLoading(true); setLogMsg("");
    try {
      await axios.post(`${API}/log`, { mood, stress, hour, came_to_gym: cameToGym });
      setLogMsg(cameToGym
        ? "Logged! Great job showing up today."
        : "Logged. Tomorrow is a new day — your habit is still alive.");
      fetchStats();
    } catch {
      setLogMsg("Error logging — check if backend is running.");
    } finally { setLogLoading(false); }
  };

  const handlePredict = async () => {
    setPredLoading(true); setPrediction(null);
    try {
      const res = await axios.post(`${API}/predict`, {
        day_of_week: pDay, hour: pHour, mood: pMood, stress: pStress,
      });
      // Enrich prediction with locally computed fields if backend doesn't return them
      const data = res.data;
      setPrediction({
        ...data,
        risk_reason: data.risk_reason || (data.skip_probability >= 0.5 ? "High stress + low mood detected" : "You tend to show up on days like this"),
        best_action: data.best_action || (data.skip_probability >= 0.5 ? "Start with just 15 minutes" : "Go as planned — you've got this!"),
        best_workout_window: data.best_workout_window || (pHour < 12 ? "Morning session — optimal" : pHour < 17 ? "Afternoon — good energy window" : "Evening — stay consistent"),
        consistency_score: data.consistency_score || (insights?.consistency_score ?? 50),
      });
    } catch {
      setPrediction({ error: "Prediction failed — check backend." });
    } finally { setPredLoading(false); }
  };

  const tabStyle = (t) => ({
    padding: "8px 20px", borderRadius: 20, cursor: "pointer", border: "2px solid",
    borderColor: tab === t ? "#7c3aed" : "#e5e7eb",
    background: tab === t ? "#7c3aed" : "#f9fafb",
    color: tab === t ? "#fff" : "#374151",
    fontWeight: tab === t ? 600 : 400, fontSize: 14,
  });

  return (
    <div style={{
      padding: "28px", maxWidth: 840, margin: "0 auto",
      fontFamily: "sans-serif", color: "#111827"
    }}>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>AI Habit Coach</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Log workouts → Predict skip risk → Learn your patterns → Stay consistent
      </p>

      {/* AI Insight Card — only show when insights exist */}
      {insights && insights.habit_summary && (
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b, #4c1d95)",
          color: "#fff", borderRadius: 18, padding: "22px 24px",
          marginBottom: 24, boxShadow: "0 12px 30px rgba(76,29,149,0.25)",
        }}>
          <p style={{ fontSize: 13, opacity: 0.8, margin: "0 0 8px" }}>AI Weekly Insight</p>
          <h2 style={{ fontSize: 20, margin: "0 0 10px", fontWeight: 700 }}>
            {insights.habit_summary}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {[
              `Best Day: ${insights.best_day}`,
              `Best Hour: ${insights.best_hour}`,
              `Biggest Factor: ${insights.biggest_factor}`,
              `Consistency: ${insights.consistency_score}/100`,
            ].map((text) => (
              <span key={text} style={{
                background: "rgba(255,255,255,0.12)",
                padding: "8px 12px", borderRadius: 999, fontSize: 13
              }}>
                {text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {streak && stats && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 12, marginBottom: 26
        }}>
          <StatCard label="Streak" value={`${streak.streak}d`} sub="consecutive" bg="#f5f3ff" color="#6d28d9" />
          <StatCard label="Sessions" value={streak.total_sessions} sub="total" bg="#f0fdf4" color="#15803d" />
          <StatCard label="Attendance" value={`${stats.attendance_rate}%`} sub="all time" bg="#eff6ff" color="#1d4ed8" />
          <StatCard label="Avg Mood" value={`${stats.avg_mood}/5`} sub="when logging" bg="#fff7ed" color="#c2410c" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={tabStyle("log")} onClick={() => setTab("log")}>Log Today</button>
        <button style={tabStyle("predict")} onClick={() => setTab("predict")}>Predict</button>
        <button style={tabStyle("stats")} onClick={() => setTab("stats")}>History</button>
      </div>

      {/* ── LOG TAB ── */}
      {tab === "log" && (
        <div style={{
          background: "#faf5ff", border: "1px solid #e9d5ff",
          borderRadius: 16, padding: "22px 24px",
          boxShadow: "0 10px 25px rgba(124,58,237,0.08)"
        }}>
          <h2 style={{
            fontSize: 17, fontWeight: 700, color: "#4c1d95",
            marginTop: 0, marginBottom: 20
          }}>Log today's workout</h2>

          <SliderField label="How's your mood today?" value={mood} onChange={setMood}
            leftLabel="Terrible" rightLabel="Amazing" />
          <SliderField label="Stress level" value={stress} onChange={setStress}
            leftLabel="No stress" rightLabel="Very stressed" />

          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "#374151",
              display: "block", marginBottom: 6
            }}>Planned workout time</label>
            <select value={hour} onChange={(e) => setHour(parseInt(e.target.value))}
              style={{
                padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db",
                fontSize: 14, background: "#fff", width: "100%"
              }}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "#374151",
              display: "block", marginBottom: 10
            }}>Did you go to the gym today?</label>
            <div style={{ display: "flex", gap: 12 }}>
              {[true, false].map((val) => (
                <button key={String(val)} onClick={() => setCameToGym(val)} style={{
                  flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer",
                  border: "2px solid",
                  borderColor: cameToGym === val ? (val ? "#16a34a" : "#dc2626") : "#e5e7eb",
                  background: cameToGym === val ? (val ? "#f0fdf4" : "#fef2f2") : "#fff",
                  color: cameToGym === val ? (val ? "#15803d" : "#b91c1c") : "#6b7280",
                  fontWeight: 700, fontSize: 15,
                }}>
                  {val ? "Yes, I went!" : "No, I skipped"}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleLog} disabled={logLoading} style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: logLoading ? "#a78bfa" : "#7c3aed",
            color: "#fff", fontWeight: 700, fontSize: 15,
            cursor: logLoading ? "not-allowed" : "pointer",
          }}>
            {logLoading ? "Saving..." : "Save Entry"}
          </button>

          {logMsg && (
            <div style={{
              marginTop: 14, padding: "11px 14px", borderRadius: 10,
              background: logMsg.includes("Error") ? "#fef2f2" : "#f0fdf4",
              color: logMsg.includes("Error") ? "#b91c1c" : "#15803d",
              border: `1px solid ${logMsg.includes("Error") ? "#fecaca" : "#bbf7d0"}`,
              fontSize: 14, fontWeight: 500,
            }}>
              {logMsg}
            </div>
          )}
        </div>
      )}

      {/* ── PREDICT TAB ── */}
      {tab === "predict" && (
        <div style={{
          background: "#f0f9ff", border: "1px solid #bae6fd",
          borderRadius: 16, padding: "22px 24px",
          boxShadow: "0 10px 25px rgba(2,132,199,0.08)"
        }}>
          <h2 style={{
            fontSize: 17, fontWeight: 700, color: "#0c4a6e",
            marginTop: 0, marginBottom: 20
          }}>Will you go to the gym?</h2>

          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "#374151",
              display: "block", marginBottom: 8
            }}>Which day?</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => setPDay(i)} style={{
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer", border: "2px solid",
                  borderColor: pDay === i ? "#7c3aed" : "#e5e7eb",
                  background: pDay === i ? "#7c3aed" : "#fff",
                  color: pDay === i ? "#fff" : "#374151",
                  fontSize: 13, fontWeight: pDay === i ? 600 : 400,
                }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "#374151",
              display: "block", marginBottom: 6
            }}>Planned time</label>
            <select value={pHour} onChange={(e) => setPHour(parseInt(e.target.value))}
              style={{
                padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db",
                fontSize: 14, background: "#fff", width: "100%"
              }}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
          </div>

          <SliderField label="Expected mood on that day" value={pMood} onChange={setPMood}
            leftLabel="Low" rightLabel="High" />
          <SliderField label="Expected stress level" value={pStress} onChange={setPStress}
            leftLabel="Calm" rightLabel="Stressed" />

          <button onClick={handlePredict} disabled={predLoading} style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: predLoading ? "#7dd3fc" : "#0284c7",
            color: "#fff", fontWeight: 700, fontSize: 15,
            cursor: predLoading ? "not-allowed" : "pointer", marginBottom: 20,
          }}>
            {predLoading ? "Predicting..." : "Predict My Attendance"}
          </button>

          {prediction && !prediction.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProbBar prob={prediction.skip_probability} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "14px 16px",
                  border: "1px solid #e5e7eb"
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280" }}>AI Reason</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.6 }}>
                    {prediction.risk_reason}
                  </p>
                </div>
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "14px 16px",
                  border: "1px solid #e5e7eb"
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280" }}>Best Action</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.6 }}>
                    {prediction.best_action}
                  </p>
                </div>
              </div>

              <div style={{
                padding: "14px 16px", borderRadius: 12,
                background: prediction.skip_probability >= 0.5 ? "#fef9c3" : "#f0fdf4",
                border: `1px solid ${prediction.skip_probability >= 0.5 ? "#fde68a" : "#bbf7d0"}`,
                fontSize: 14, color: "#1f2937", lineHeight: 1.8,
              }}>
                <strong>Coach Nudge:</strong> {prediction.nudge}<br />
                <strong>Best Workout Window:</strong> {prediction.best_workout_window}<br />
                <strong>Consistency Score:</strong> {prediction.consistency_score}/100
              </div>

              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Model: {prediction.model} · Based on {prediction.data_count} logged entries
              </div>

              {prediction.feature_importance && (
                <div>
                  <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>
                    What matters most for your attendance:
                  </p>
                  {Object.entries(prediction.feature_importance)
                    .sort(([, a], [, b]) => b - a)
                    .map(([feat, imp]) => (
                      <div key={feat} style={{
                        display: "flex", alignItems: "center",
                        gap: 10, marginBottom: 8
                      }}>
                        <span style={{ fontSize: 12, color: "#374151", width: 100 }}>
                          {feat.replace("_", " ")}
                        </span>
                        <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 4 }}>
                          <div style={{
                            height: "100%", width: `${imp * 100}%`,
                            background: "#7c3aed", borderRadius: 4
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#6b7280", width: 36 }}>
                          {Math.round(imp * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {prediction?.error && (
            <div style={{
              padding: "11px 14px", borderRadius: 8,
              background: "#fef2f2", color: "#b91c1c", fontSize: 14
            }}>
              {prediction.error}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {stats && (
            <div style={{
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 16, padding: "18px 20px"
            }}>
              <h2 style={{
                fontSize: 16, fontWeight: 700, color: "#374151",
                marginTop: 0, marginBottom: 14
              }}>Your patterns</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Best day", value: insights?.best_day || stats.best_day || "N/A", color: "#7c3aed" },
                  { label: "Best hour", value: insights?.best_hour || stats.best_hour || "N/A", color: "#0f766e" },
                  { label: "Main factor", value: insights?.biggest_factor || "Consistency", color: "#c2410c" },
                ].map((item) => (
                  <div key={item.label} style={{
                    background: "#fff", borderRadius: 10,
                    padding: "12px 14px", border: "1px solid #e5e7eb"
                  }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>{item.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 ? (
            <div style={{
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 16, padding: "18px 20px"
            }}>
              <AttendanceChart history={history} />
            </div>
          ) : (
            <div style={{
              padding: "32px", textAlign: "center", color: "#9ca3af",
              background: "#f9fafb", borderRadius: 16, border: "1px solid #e5e7eb"
            }}>
              No data yet — log at least one session in the Log tab first.
            </div>
          )}

          <button onClick={fetchStats} style={{
            padding: "10px 20px", borderRadius: 10, border: "1px solid #d1d5db",
            background: "#f9fafb", color: "#374151", cursor: "pointer",
            fontSize: 14, fontWeight: 600,
          }}>
            Refresh stats
          </button>
        </div>
      )}
    </div>
  );
}