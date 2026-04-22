import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Trainer from "./pages/Trainer";
import Dietician from "./pages/Dietician";
import Habit from "./pages/Habit";
import Buddy from "./pages/Buddy";
import Recommender from "./pages/Recommender";
import Dashboard from "./pages/Dashboard";
import "./App.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/trainer", label: "Trainer", icon: "💪" },
  { to: "/dietician", label: "Dietician", icon: "🥗" },
  { to: "/habit", label: "Habits", icon: "🔥" },
  { to: "/buddy", label: "Buddy", icon: "🤖" },
  { to: "/recommender", label: "Recommender", icon: "📋" },
];

function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-bg-glow glow-one" />
      <div className="app-bg-glow glow-two" />

      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">💪</div>
          <div>
            <h1 className="brand-title">AI Gym Assistant</h1>
            <p className="brand-subtitle">Smart fitness dashboard with coaching, tracking, and insights</p>
          </div>
        </div>

        <nav className="nav-links">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trainer" element={<Trainer />} />
          <Route path="/dietician" element={<Dietician />} />
          <Route path="/habit" element={<Habit />} />
          <Route path="/buddy" element={<Buddy />} />
          <Route path="/recommender" element={<Recommender />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}