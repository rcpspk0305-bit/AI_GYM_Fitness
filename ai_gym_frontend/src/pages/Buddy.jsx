import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000/buddy/chat";

const QUICK_PROMPTS = [
  "I'm feeling really tired today",
  "I skipped the gym again and feel guilty",
  "I'm super stressed with exams",
  "I just crushed my workout!",
  "I don't see any progress, feeling stuck",
  "Motivate me to go right now",
  "I got injured and I'm frustrated",
  "I'm thinking of quitting",
];

function SentimentBadge({ sentiment }) {
  if (!sentiment || !sentiment.emotion) return null;
  const map = {
    "very positive": { bg: "#dcfce7", color: "#15803d" },
    "positive":      { bg: "#f0fdf4", color: "#16a34a" },
    "neutral":       { bg: "#f3f4f6", color: "#6b7280" },
    "negative":      { bg: "#fff7ed", color: "#c2410c" },
    "very negative": { bg: "#fef2f2", color: "#b91c1c" },
  };
  const s = map[sentiment.emotion] || map["neutral"];
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
        background: s.bg, color: s.color, fontWeight: 500 }}>
        {sentiment.emotion}
      </span>
      {(sentiment.struggles || []).map((st) => (
        <span key={st} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
          background: "#fef9c3", color: "#854d0e", fontWeight: 500 }}>
          {st.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "#7c3aed" : "#0f766e",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 15 }}>
        {isUser ? "U" : "F"}
      </div>
      <div style={{ maxWidth: "75%" }}>
        <div style={{ padding: "12px 16px",
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          background: isUser ? "#7c3aed" : "#ffffff",
          color:      isUser ? "#ffffff" : "#1f2937",
          border:     isUser ? "none"    : "1px solid #e5e7eb",
          fontSize: 14, lineHeight: 1.65 }}>
          {msg.text}
        </div>
        {isUser && <SentimentBadge sentiment={msg.sentiment} />}
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0",
          textAlign: isUser ? "right" : "left" }}>{msg.time}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0f766e",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700 }}>F</div>
      <div style={{ padding: "14px 18px", borderRadius: "4px 18px 18px 18px",
        background: "#fff", border: "1px solid #e5e7eb",
        display: "flex", gap: 5, alignItems: "center" }}>
        {[0,1,2].map((i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af",
            animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

export default function Buddy() {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [username,  setUsername]  = useState("");
  const [nameSet,   setNameSet]   = useState(false);
  const [nameInput, setNameInput] = useState("");
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const now = () =>
    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const startChat = () => {
    const name = nameInput.trim() || "friend";
    setUsername(name);
    setNameSet(true);
    setMessages([{
      role: "bot", time: now(),
      text: `Hey ${name}! I'm FitBot 💪 — your personal gym buddy. I'm here to motivate you, help you push through tough days, and celebrate every win with you. How are you feeling today?`,
    }]);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: msg, time: now(), sentiment: null }]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(API, {
      message: msg,
      username,
      });
      const { reply, sentiment } = res.data;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], sentiment };
        return updated;
      });
      setMessages((prev) => [...prev, { role: "bot", text: reply, time: now() }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "bot", time: now(),
        text: "Oops — lost connection! Make sure the backend is running and try again.",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Name screen ──────────────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center",
          background: "#fff", borderRadius: 20, padding: "40px 32px",
          border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>💪</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937", marginBottom: 10 }}>
            Meet FitBot
          </h1>
          <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>
            Your AI gym buddy — here to keep you motivated, support you through hard days, and celebrate every win.
          </p>
          <input autoFocus placeholder="What's your name?"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startChat()}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10,
              border: "1.5px solid #d1d5db", fontSize: 15, marginBottom: 14,
              boxSizing: "border-box" }} />
          <button onClick={startChat} style={{ width: "100%", padding: "13px",
            borderRadius: 10, border: "none", background: "#7c3aed",
            color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>
            Start chatting
          </button>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
            Leave blank to chat as "friend"
          </p>
        </div>
      </div>
    );
  }

  // ── Chat screen ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "sans-serif",
        display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>

        {/* Header */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #e5e7eb",
          background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%",
            background: "#0f766e", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 22 }}>💪</div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: "#1f2937" }}>FitBot</p>
            <p style={{ margin: 0, fontSize: 12, color: "#22c55e" }}>● Online — always here for you</p>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 13, color: "#9ca3af" }}>
            Chatting as <strong style={{ color: "#7c3aed" }}>{username}</strong>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px",
          background: "#f9fafb" }}>
          {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts — shown until user sends 2+ messages */}
        {messages.length <= 2 && (
          <div style={{ padding: "10px 24px", background: "#f9fafb",
            borderTop: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 8px" }}>
              Not sure what to say? Try:
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {QUICK_PROMPTS.slice(0, 5).map((q) => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding: "6px 13px", borderRadius: 20, border: "1px solid #ddd6fe",
                  background: "#f5f3ff", color: "#6d28d9", fontSize: 12, cursor: "pointer",
                }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "14px 24px", background: "#fff",
          borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, alignItems: "center" }}>
          <input ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={`Talk to FitBot, ${username}...`}
            style={{ flex: 1, padding: "11px 16px", borderRadius: 24,
              border: "1.5px solid #e5e7eb", fontSize: 14,
              background: "#f9fafb", outline: "none" }} />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: 44, height: 44, borderRadius: "50%", border: "none",
              background: loading || !input.trim() ? "#e5e7eb" : "#7c3aed",
              color: "#fff", fontSize: 18, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ➤
          </button>
        </div>
      </div>
    </>
  );
}