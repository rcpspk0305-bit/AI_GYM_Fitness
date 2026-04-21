import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Trainer from "./pages/Trainer";
import Dietician from "./pages/Dietician";
import Habit from "./pages/Habit";
import Buddy from "./pages/Buddy";
import Recommender from "./pages/Recommender";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function Navbar() {
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/trainer", label: "Trainer" },
    { to: "/dietician", label: "Dietician" },
    { to: "/habit", label: "Habits" },
    { to: "/buddy", label: "Buddy" },
    { to: "/recommender", label: "Recommender" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px 20px",
        borderBottom: "1px solid var(--color-border-secondary)",
        flexWrap: "wrap",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginRight: 12,
          color: "var(--color-text-primary)",
          fontSize: "18px",
        }}
      >
        💪 AI Gym
      </div>

      {navItems.map(({ to, label }) => {
        const active = location.pathname === to;

        return (
          <Link
            key={to}
            to={to}
            style={{
              color: active ? "#ffffff" : "var(--color-text-secondary)",
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${active ? "#7c3aed" : "var(--color-border-tertiary)"}`,
              background: active ? "rgba(124, 58, 237, 0.18)" : "transparent",
              transition: "all 0.2s ease",
              fontWeight: active ? 600 : 500,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", background: "var(--color-background-primary)" }}>
        <Navbar />

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trainer" element={<Trainer />} />
          <Route path="/dietician" element={<Dietician />} />
          <Route path="/habit" element={<Habit />} />
          <Route path="/buddy" element={<Buddy />} />
          <Route path="/recommender" element={<Recommender />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}