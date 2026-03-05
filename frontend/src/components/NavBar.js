import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function NavBar({ title = "Stock Verse", subtitle = "" }) {
  const nav = useNavigate();
  const loc = useLocation();

  const btn = (active) => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #222",
    background: active
      ? "linear-gradient(90deg, rgba(0,245,255,0.25), rgba(168,85,247,0.25))"
      : "#0b0b0b",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  });

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    nav("/login");
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #111",
      }}
    >
      <div
        style={{
          padding: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.2 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ opacity: 0.7, marginTop: 2 }}>{subtitle}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={btn(loc.pathname === "/")}
            onClick={() => nav("/")}
            type="button"
          >
            Dashboard
          </button>

          <button
            style={btn(loc.pathname.startsWith("/mystocks"))}
            onClick={() => nav("/mystocks")}
            type="button"
          >
            My Stocks
          </button>

          <button
            onClick={logout}
            type="button"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #222",
              background: "#0b0b0b",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              opacity: 0.95,
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}