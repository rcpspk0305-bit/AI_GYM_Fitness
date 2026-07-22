import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/buddy/chat`;

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Customizable states
  const [botName, setBotName] = useState(() => localStorage.getItem("floating_bot_name") || "FitBot");
  const [botGender, setBotGender] = useState(() => localStorage.getItem("floating_bot_gender") || "neutral");
  const [tempName, setTempName] = useState(botName);
  const [tempGender, setTempGender] = useState(botGender);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const username = "Cherry"; // Default username matching the app's logged user

  // Resolve avatar based on gender configuration
  const getAvatar = (gender) => {
    if (gender === "male") return "👨‍💪";
    if (gender === "female") return "👩‍💪";
    return "🤖";
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  // Load welcome message when chatbot name changes or initially
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "bot",
          text: `Hey Cherry! I'm ${botName} ${getAvatar(botGender)} — your personal gym buddy. I'm ready to keep you motivated and analyze your workout sessions. How's it going?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [botName, botGender]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { role: "user", text, time: userMsgTime }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(API, {
        message: text,
        username,
        bot_name: botName,
        bot_gender: botGender
      });

      const { reply, recap, session_analysis, suggested_activities, workout_plan } = res.data;
      const botMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: reply,
          recap,
          sessionAnalysis: session_analysis,
          suggestedActivities: suggested_activities,
          workoutPlan: workout_plan,
          time: botMsgTime
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Lost connection to the gym network. Make sure your server is online!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const cleanName = tempName.trim() || "FitBot";
    setBotName(cleanName);
    setBotGender(tempGender);
    localStorage.setItem("floating_bot_name", cleanName);
    localStorage.setItem("floating_bot_gender", tempGender);
    
    // Add system message about the personality change
    setMessages((prev) => [
      ...prev,
      {
        role: "bot",
        text: `Settings updated! I am now ${cleanName} ${getAvatar(tempGender)}, ready to guide you.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setShowSettings(false);
  };

  return (
    <div className="floating-chatbot-container">
      {/* Floating Action Button */}
      <button 
        className={`floating-chatbot-button ${isOpen ? "active" : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="Open Fitness Buddy"
      >
        <span className="chatbot-btn-avatar">{getAvatar(botGender)}</span>
        <span className="chatbot-btn-badge">●</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="floating-chatbot-window">
          {/* Header */}
          <div className="floating-chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-header-avatar">{getAvatar(botGender)}</span>
              <div>
                <h4>{botName}</h4>
                <p className="chatbot-header-status">online buddy</p>
              </div>
            </div>
            <button 
              className="chatbot-header-settings-btn"
              onClick={() => {
                setTempName(botName);
                setTempGender(botGender);
                setShowSettings(!showSettings);
              }}
              title="Personalize Buddy"
            >
              ⚙️
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings ? (
            <form onSubmit={handleSaveSettings} className="floating-chatbot-settings">
              <h5>Personalize Chatbot</h5>
              <div className="chatbot-form-group">
                <label>Buddy Name</label>
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={(e) => setTempName(e.target.value)} 
                  placeholder="e.g. FitBot" 
                  maxLength={15}
                  required
                />
              </div>
              <div className="chatbot-form-group">
                <label>Buddy Gender / Voice</label>
                <select 
                  value={tempGender} 
                  onChange={(e) => setTempGender(e.target.value)}
                >
                  <option value="neutral">Neutral / Robot</option>
                  <option value="male">Male (Brotherly & Motivating)</option>
                  <option value="female">Female (Sisterly & Supportive)</option>
                </select>
              </div>
              <div className="chatbot-settings-actions">
                <button type="submit" className="chatbot-save-btn">Save Changes</button>
                <button type="button" className="chatbot-cancel-btn" onClick={() => setShowSettings(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              {/* Messages Body */}
              <div className="floating-chatbot-body">
                {messages.map((msg, index) => (
                  <div key={index} className={`chatbot-bubble-wrapper ${msg.role}`}>
                    <div className="chatbot-bubble">
                      <p className="chatbot-bubble-main-text">{msg.text}</p>
                      
                      {msg.recap && (
                        <div className="chatbot-recap-box">
                          <span className="chatbot-box-icon">🔄</span>
                          <div className="chatbot-box-content">
                            <strong>Recap:</strong> {msg.recap}
                          </div>
                        </div>
                      )}

                      {msg.sessionAnalysis && (
                        <div className="chatbot-analysis-box">
                          <span className="chatbot-box-icon">📊</span>
                          <div className="chatbot-box-content">
                            <strong>Session Analysis:</strong> {msg.sessionAnalysis}
                          </div>
                        </div>
                      )}

                      {msg.suggestedActivities && msg.suggestedActivities.length > 0 && (
                        <div className="chatbot-suggestions-box">
                          <span className="chatbot-box-icon">⚡</span>
                          <div className="chatbot-box-content">
                            <strong>Suggested Activities:</strong>
                            <div className="chatbot-suggestions-tags">
                              {msg.suggestedActivities.map((act, i) => (
                                <span key={i} className="chatbot-suggestion-tag">{act}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {msg.workoutPlan && (
                        <div className="chatbot-plan-box">
                          <span className="chatbot-box-icon">🗓️</span>
                          <div className="chatbot-box-content">
                            <strong>Workout Plan:</strong>
                            <pre className="chatbot-plan-pre">{msg.workoutPlan}</pre>
                          </div>
                        </div>
                      )}

                      <span className="chatbot-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="chatbot-bubble-wrapper bot loading">
                    <div className="chatbot-bubble">
                      <div className="chatbot-loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Footer */}
              <form onSubmit={handleSendMessage} className="floating-chatbot-footer">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder={`Message ${botName}...`}
                  maxLength={150}
                  disabled={loading}
                />
                <button type="submit" disabled={!input.trim() || loading}>
                  ➤
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
