import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/auth/register/", { username, password, first_name: fullName, email });
      setMsg(`Welcome, ${fullName}! You are now registered. Please login.`);
      setTimeout(() => nav("/login"), 800);
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.response?.data?.username || JSON.stringify(e2?.response?.data) || e2.message);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "black", 
      color: "white", 
      padding: 24,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>Stock Verse</h1>
      <p style={{ opacity: 0.75, marginBottom: 20 }}>Create your account</p>

      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, display: "grid", gap: 12 }}>
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
            textAlign: "left"
          }}
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#0b0b0b",
            color: "white",
            outline: "none",
            fontSize: 16,
            textAlign: "left"
          }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email ID"
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#0b0b0b",
            color: "white",
            outline: "none",
            fontSize: 16,
            textAlign: "left"
          }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 chars)"
          type="password"
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#0b0b0b",
            color: "white",
            outline: "none",
            fontSize: 16,
            textAlign: "left"
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
          Register
        </button>
      </form>

      {msg && <div style={{ marginTop: 14, color: "#00f5ff" }}>{msg}</div>}
      {err && <div style={{ marginTop: 14, color: "#ff6b6b" }}>{err}</div>}

      <div style={{ marginTop: 18, opacity: 0.8 }}>
        Already have an account? <Link to="/login" style={{ color: "#00f5ff" }}>Login</Link>
      </div>
    </div>
  );
}