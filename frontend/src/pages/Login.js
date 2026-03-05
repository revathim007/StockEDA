import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      // clear old tokens
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      const res = await api.post("/auth/login/", {
        username,
        password,
      });

      // store tokens
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      localStorage.setItem("username", res.data.username);

      // go to dashboard
      nav("/");
    } catch (e2) {
      if (e2.response && e2.response.data) {
        setErr(e2.response.data.error || "Login failed");
      } else {
        setErr("Server error. Try again.");
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white", padding: 24 }}>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>Stock Verse</h1>
      <p style={{ opacity: 0.75, marginBottom: 20 }}>Login to your account</p>

      <form onSubmit={submit} style={{ maxWidth: 420, display: "grid", gap: 12 }}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#0b0b0b",
            color: "white",
            outline: "none",
            fontSize: 16,
          }}
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#0b0b0b",
            color: "white",
            outline: "none",
            fontSize: 16,
          }}
        />

        <button
          type="submit"
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid #222",
            background: "linear-gradient(90deg, #00f5ff, #8b5cf6)",
            color: "black",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>

      {err && (
        <div style={{ marginTop: 14, color: "#ff6b6b" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 18, opacity: 0.8 }}>
        New user?{" "}
        <Link to="/register" style={{ color: "#00f5ff" }}>
          Register
        </Link>
      </div>
    </div>
  );
}