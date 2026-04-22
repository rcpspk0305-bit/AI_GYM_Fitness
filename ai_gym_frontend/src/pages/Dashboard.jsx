import { useEffect, useState, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ─── Fade In Wrapper ──────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, y = 18 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : `translateY(${y}px)`,
        transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Mini sparkline using canvas ──────────────────────────────────────────────
function Sparkline({ data, color = "#7c3aed", height = 40 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !data || data.length < 2) return;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 8) - 4,
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, H);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H);
    ctx.closePath();
    ctx.fillStyle = color + "18";
    ctx.fill();

    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={ref}
      width={160}
      height={height}
      style={{ display: "block", width: "100%" }}
    />
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "", duration = 1200 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const finalTarget = Number(target) || 0;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(finalTarget * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return (
    <>
      {val.toLocaleString()}
      {suffix}
    </>
  );
}

// ─── Ring progress ────────────────────────────────────────────────────────────
function Ring({ pct = 0, size = 86, stroke = 9, color = "#7c3aed", label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        style={{
          position: "relative",
          filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.22))",
        }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border-tertiary)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 1.4s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color,
          }}
        >
          {pct}%
        </div>
      </div>

      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
    </div>
  );
}

// ─── Base section card ────────────────────────────────────────────────────────
function Panel({ children, style = {} }) {
  return (
    <div
      style={{
        background: "rgba(30,41,59,0.82)",
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: 20,
        padding: "20px 22px",
        boxShadow: "0 10px 32px rgba(0,0,0,0.20)",
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, suffix, sub, color, sparkData, onClick, active }) {
  const numeric = typeof value === "number";

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = active ? "translateY(-4px)" : "translateY(-6px)";
        e.currentTarget.style.boxShadow = `0 16px 36px ${color}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = active ? "translateY(-2px)" : "translateY(0)";
        e.currentTarget.style.boxShadow = active
          ? `0 12px 30px ${color}22`
          : "0 10px 28px rgba(0,0,0,0.18)";
      }}
      style={{
        background: active ? color + "18" : "rgba(30,41,59,0.82)",
        border: `1.5px solid ${active ? color : "var(--color-border-tertiary)"}`,
        borderRadius: 18,
        padding: "18px 20px",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease",
        position: "relative",
        overflow: "hidden",
        boxShadow: active ? `0 12px 30px ${color}22` : "0 10px 28px rgba(0,0,0,0.18)",
        transform: active ? "translateY(-2px)" : "translateY(0)",
        minHeight: 150,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}35, transparent 72%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
            {label}
          </p>

          <p style={{ fontSize: 30, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>
            {numeric ? <Counter target={value} suffix={suffix} /> : value}
          </p>

          {sub && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "6px 0 0" }}>
              {sub}
            </p>
          )}
        </div>

        <span
          style={{
            fontSize: 28,
            transform: active ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.22s ease",
          }}
        >
          {icon}
        </span>
      </div>

      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Habit history bar chart ──────────────────────────────────────────────────
function HabitBars({ history }) {
  if (!history || history.length === 0) {
    return (
      <p
        style={{
          fontSize: 13,
          color: "var(--color-text-tertiary)",
          textAlign: "center",
          padding: "20px 0",
          margin: 0,
        }}
      >
        No habit data yet — log entries in the Habit Tracker
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 92, paddingTop: 8 }}>
      {history.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${((h.mood || 0) / 5) * 100}%`,
                minHeight: 4,
                background: h.came_to_gym == 1
                  ? "linear-gradient(180deg, #8b5cf6, #6d28d9)"
                  : "#475569",
                borderRadius: "6px 6px 0 0",
                transition: "height 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
                opacity: h.came_to_gym == 1 ? 1 : 0.45,
                boxShadow: h.came_to_gym == 1 ? "0 6px 18px rgba(124,58,237,0.24)" : "none",
              }}
            />
          </div>

          <span
            style={{
              fontSize: 9,
              color: "var(--color-text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            {h.date?.slice(5) || ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sentiment pill ───────────────────────────────────────────────────────────
function SentimentPill({ trend }) {
  const map = {
    positive: { bg: "#052e16", color: "#86efac", label: "Positive mood" },
    negative: { bg: "#450a0a", color: "#fca5a5", label: "Needs support" },
    neutral: { bg: "#1e293b", color: "#cbd5e1", label: "Neutral" },
  };

  const s = map[trend] || map.neutral;

  return (
    <span
      style={{
        fontSize: 12,
        padding: "5px 12px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontWeight: 600,
        border: "1px solid var(--color-border-tertiary)",
        animation: "softPulse 2.8s ease-in-out infinite",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed({ workout, habit, diet, buddy }) {
  const items = [
    workout?.total_sessions > 0 && {
      icon: "💪",
      text: `${workout.total_sessions} workout sessions logged`,
      sub: `Favourite: ${workout.favourite_exercise || "—"}`,
      color: "#7c3aed",
    },
    habit?.current_streak > 0 && {
      icon: "🔥",
      text: `${habit.current_streak}-day streak active`,
      sub: `${habit.attendance_rate}% attendance rate`,
      color: "#ef4444",
    },
    diet?.total_plans > 0 && {
      icon: "🥗",
      text: `${diet.total_plans} diet plan${diet.total_plans > 1 ? "s" : ""} generated`,
      sub: `Latest target: ${diet.latest_calories || "—"} kcal`,
      color: "#16a34a",
    },
    buddy?.total_messages > 0 && {
      icon: "🤖",
      text: `${buddy.total_messages} messages with FitBot`,
      sub: `Mood trend: ${buddy.sentiment_trend || "neutral"}`,
      color: "#0284c7",
    },
  ].filter(Boolean);

  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", padding: "12px 0", margin: 0 }}>
        Start using the modules — activity will appear here
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.72)",
            border: `1px solid ${item.color}44`,
            boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
            animation: `slideIn 0.45s ease ${i * 0.06}s both`,
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {item.text}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
              {item.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Equipment Panel ─────────────────────────────────────────────────────────
function EquipmentPanel({ data }) {
  if (!data) return null;

  return (
    <Panel style={{ flex: 1, minWidth: 300 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>🏋️</span>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Smart Gym Assistant
        </p>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--color-text-secondary)",
          marginBottom: 14,
          lineHeight: 1.6,
        }}
      >
        {data.message}
      </p>

      {data.recommendations && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.recommendations.map((req, i) => (
            <span
              key={i}
              style={{
                padding: "7px 12px",
                background: "linear-gradient(180deg, #3b0764, #581c87)",
                color: "#e9d5ff",
                border: "1px solid #7e22ce",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                boxShadow: "0 6px 14px rgba(88,28,135,0.22)",
              }}
            >
              {req}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Performance Panel ───────────────────────────────────────────────────────
function PerformancePanel() {
  const [formAccuracy, setFormAccuracy] = useState(0.85);
  const [duration, setDuration] = useState(3.0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/performance/analyze`, {
        exercise: "Squat",
        reps_completed: 10,
        form_accuracy: formAccuracy,
        avg_rep_duration: duration,
        errors: formAccuracy < 0.7 ? ["Knees caving in"] : [],
      });
      setResult(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Panel style={{ flex: 1, minWidth: 300 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>📸</span>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Pose-to-Performance Analyzer
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 6,
            }}
          >
            <span>Form Accuracy</span>
            <span>{Math.round(formAccuracy * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={formAccuracy}
            onChange={(e) => setFormAccuracy(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#0d9488" }}
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 6,
            }}
          >
            <span>Avg Rep Duration</span>
            <span>{duration}s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="8"
            step="0.5"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#0d9488" }}
          />
        </div>

        <button
          onClick={analyze}
          disabled={loading}
          style={{
            background: loading
              ? "rgba(13,148,136,0.72)"
              : "linear-gradient(135deg, #0d9488, #0f766e)",
            color: "#fff",
            border: "none",
            padding: "11px 12px",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 10px 22px rgba(13,148,136,0.22)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
        >
          {loading ? "Analyzing..." : "Analyze Mock Data"}
        </button>
      </div>

      {result && (
        <div
          style={{
            background: "rgba(15,23,42,0.78)",
            padding: "12px",
            borderRadius: 12,
            border: "1px solid var(--color-border-tertiary)",
            animation: "fadeUp 0.45s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Score: {result.performance_score}/100
            </span>

            <span
              style={{
                fontSize: 11,
                background:
                  result.performance_score >= 90
                    ? "#14532d"
                    : result.performance_score >= 50
                      ? "#713f12"
                      : "#7f1d1d",
                color:
                  result.performance_score >= 90
                    ? "#bbf7d0"
                    : result.performance_score >= 50
                      ? "#fde68a"
                      : "#fecaca",
                padding: "4px 9px",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {result.efficiency_rating}
            </span>
          </div>

          {result.feedback && result.feedback.length > 0 && (
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                fontSize: 12,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {result.feedback.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [habit, setHabit] = useState(null);
  const [workoutSt, setWorkoutSt] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [dash, habitRes, wStats, equipRes] = await Promise.all([
        axios.get(`${API}/dashboard`),
        axios.get(`${API}/trainer/streak`).catch(() => ({ data: {} })),
        axios.get(`${API}/trainer/workout-stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/equipment/recommend`).catch(() => ({ data: {} })),
      ]);

      setData(dash.data);
      setHabit(habitRes.data);
      setWorkoutSt(wStats.data);
      setEquipment(equipRes.data);
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: "spin 1s linear infinite" }}>
            ⚙️
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15 }}>
            Loading dashboard...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const w = data?.workout || {};
  const h = data?.habit || {};
  const d = data?.diet || {};
  const b = data?.buddy || {};
  const r = data?.recommender || {};

  const historyData = (habit?.history || []).map((x) => x.came_to_gym || 0);
  const attendancePct = Math.round(h.attendance_rate || 0);
  const sentimentScore =
    typeof b.avg_sentiment === "number"
      ? Math.round(((b.avg_sentiment + 1) / 2) * 100)
      : 50;

  const grid3 = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 20,
  };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
    gap: 16,
    marginBottom: 20,
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: 1040,
        margin: "0 auto",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -90,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.22), transparent 68%)",
          filter: "blur(10px)",
          animation: "floatBlob 7s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 190,
          left: -90,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2,132,199,0.20), transparent 70%)",
          filter: "blur(8px)",
          animation: "floatBlob 9s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatBlob {
          0% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(-18px) translateX(10px) scale(1.04); }
          100% { transform: translateY(0) translateX(0) scale(1); }
        }
        @keyframes softPulse {
          0% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 0.95; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerBar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
      `}</style>

      <FadeIn delay={0}>
        <Panel
          style={{
            marginBottom: 22,
            padding: "24px 24px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(2,132,199,0.08) 55%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#a78bfa",
                }}
              >
                AI Gym Assistant
              </p>

              <h1
                style={{
                  fontSize: 30,
                  lineHeight: 1.1,
                  margin: "0 0 8px",
                  color: "var(--color-text-primary)",
                }}
              >
                Animated Fitness Dashboard
              </h1>

              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  maxWidth: 620,
                  lineHeight: 1.65,
                }}
              >
                Live overview of workouts, habits, mood, diet planning, recommendations, and performance analysis.
              </p>
            </div>

            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "1px solid var(--color-border-secondary)",
                background: refreshing
                  ? "rgba(124,58,237,0.18)"
                  : "rgba(15,23,42,0.78)",
                color: "var(--color-text-primary)",
                fontSize: 13,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: refreshing ? 0.92 : 1,
                transition: "all 0.22s ease",
                boxShadow: refreshing ? "0 0 0 8px rgba(124,58,237,0.06)" : "none",
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              position: "relative",
              zIndex: 1,
            }}
          >
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                color: "#c4b5fd",
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.26)",
              }}
            >
              Auto-refresh every 30s
            </span>

            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                color: "var(--color-text-secondary)",
                background: "rgba(15,23,42,0.72)",
                border: "1px solid var(--color-border-tertiary)",
              }}
            >
              {lastUpdated ? `Updated ${lastUpdated}` : "Live"}
            </span>
          </div>
        </Panel>
      </FadeIn>

      <FadeIn delay={100}>
        <div style={grid3}>
          <StatCard
            icon="💪"
            label="Total reps"
            value={w.total_reps || 0}
            color="#7c3aed"
            sub={`${w.total_sessions || 0} sessions`}
            sparkData={historyData}
            active={activeCard === "workout"}
            onClick={() => setActiveCard(activeCard === "workout" ? null : "workout")}
          />

          <StatCard
            icon="🔥"
            label="Current streak"
            value={h.current_streak || 0}
            suffix=" days"
            color="#ef4444"
            sub={`${h.attendance_rate || 0}% attendance`}
            sparkData={historyData}
            active={activeCard === "habit"}
            onClick={() => setActiveCard(activeCard === "habit" ? null : "habit")}
          />

          <StatCard
            icon="🥗"
            label="Diet plans"
            value={d.total_plans || 0}
            color="#16a34a"
            sub={d.latest_calories ? `Latest: ${d.latest_calories} kcal` : "No plans yet"}
            active={activeCard === "diet"}
            onClick={() => setActiveCard(activeCard === "diet" ? null : "diet")}
          />
        </div>
      </FadeIn>

      <FadeIn delay={180}>
        <div style={grid3}>
          <StatCard
            icon="🤖"
            label="Buddy messages"
            value={b.total_messages || 0}
            color="#0284c7"
            sub={`Mood: ${b.sentiment_trend || "neutral"}`}
            active={activeCard === "buddy"}
            onClick={() => setActiveCard(activeCard === "buddy" ? null : "buddy")}
          />

          <StatCard
            icon="📋"
            label="Plans generated"
            value={r.plans_generated || 0}
            color="#d97706"
            sub="Workout recommendations"
            active={activeCard === "plans"}
            onClick={() => setActiveCard(activeCard === "plans" ? null : "plans")}
          />

          <StatCard
            icon="🏅"
            label="Total sessions"
            value={typeof w.total_sessions === "number" ? w.total_sessions : 0}
            color="#0f766e"
            sub={`Best: ${workoutSt?.favourite_exercise || "—"}`}
            active={activeCard === "sessions"}
            onClick={() => setActiveCard(activeCard === "sessions" ? null : "sessions")}
          />
        </div>
      </FadeIn>

      <FadeIn delay={260}>
        <div style={grid2}>
          <Panel>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: "0 0 18px",
              }}
            >
              Performance rings
            </p>

            <div style={{ display: "flex", justifyContent: "space-around", gap: 16, flexWrap: "wrap" }}>
              <Ring pct={attendancePct} color="#7c3aed" label="Attendance" />
              <Ring pct={sentimentScore} color="#0284c7" label="Mood score" />
              <Ring pct={Math.min((w.total_reps || 0) / 10, 100)} color="#ef4444" label="Reps/1000" />
            </div>
          </Panel>

          <Panel>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: 0,
                }}
              >
                Habit history
              </p>

              <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--color-text-secondary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: "#7c3aed",
                      borderRadius: 3,
                      display: "inline-block",
                    }}
                  />
                  Went
                </span>

                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: "#475569",
                      borderRadius: 3,
                      display: "inline-block",
                    }}
                  />
                  Skipped
                </span>
              </div>
            </div>

            <HabitBars history={habit?.history || []} />
          </Panel>
        </div>
      </FadeIn>

      <FadeIn delay={340}>
        <div style={grid2}>
          <Panel>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: "0 0 14px",
              }}
            >
              Module activity
            </p>

            <ActivityFeed workout={workoutSt} habit={h} diet={d} buddy={b} />
          </Panel>

          <Panel>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: "0 0 14px",
              }}
            >
              FitBot sentiment analysis
            </p>

            {b.total_messages > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <SentimentPill trend={b.sentiment_trend} />
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    avg score: {b.avg_sentiment?.toFixed(3) || "0.000"}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                      marginBottom: 6,
                    }}
                  >
                    <span>Negative</span>
                    <span>Neutral</span>
                    <span>Positive</span>
                  </div>

                  <div
                    style={{
                      height: 11,
                      background: "var(--color-border-tertiary)",
                      borderRadius: 999,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: "35%",
                          height: "100%",
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                          animation: "shimmerBar 2.3s linear infinite",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: "var(--color-border-secondary)",
                        zIndex: 2,
                      }}
                    />

                    <div
                      style={{
                        height: "100%",
                        width: `${sentimentScore}%`,
                        background:
                          sentimentScore > 55 ? "#16a34a" : sentimentScore < 45 ? "#dc2626" : "#d97706",
                        borderRadius: 999,
                        transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
                        position: "relative",
                        zIndex: 3,
                        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(15,23,42,0.78)",
                    border: "1px solid var(--color-border-tertiary)",
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Based on <strong>{b.total_messages}</strong> messages using VADER compound scoring +
                  TextBlob analysis.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 8 }}>
                Chat with FitBot to see sentiment analysis here
              </p>
            )}
          </Panel>
        </div>
      </FadeIn>

      <FadeIn delay={420}>
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <EquipmentPanel data={equipment} />
          <PerformancePanel />
        </div>
      </FadeIn>

      <FadeIn delay={500}>
        <Panel>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 14px",
            }}
          >
            Quick navigation
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Trainer", icon: "💪", path: "/trainer", color: "#7c3aed" },
              { label: "Dietician", icon: "🥗", path: "/dietician", color: "#16a34a" },
              { label: "Habits", icon: "📊", path: "/habit", color: "#ef4444" },
              { label: "FitBot", icon: "🤖", path: "/buddy", color: "#0284c7" },
              { label: "Recommender", icon: "📋", path: "/recommender", color: "#d97706" },
            ].map((m, i) => (
              <a
                key={m.path}
                href={m.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 14,
                  textDecoration: "none",
                  border: `1.5px solid ${m.color}33`,
                  background: `${m.color}14`,
                  color: m.color,
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
                  animation: `slideIn 0.45s ease ${i * 0.06}s both`,
                }}
              >
                <span>{m.icon}</span>
                {m.label}
              </a>
            ))}
          </div>
        </Panel>
      </FadeIn>

      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          marginTop: 20,
        }}
      >
        Auto-refreshes every 30 seconds · SQLite + Gemini · Built with React + FastAPI
      </p>
    </div>
  );
}