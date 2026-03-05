import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function Dashboard() {
  const nav = useNavigate();
  const username = localStorage.getItem("username") || "there";

  const [symbol, setSymbol] = useState("");
  const [msg, setMsg] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Suggestions list
  const suggestions = useMemo(
    () => [
      "TCS.NS",
      "RELIANCE.NS",
      "INFY.NS",
      "HDFCBANK.NS",
      "ICICIBANK.NS",
      "SBIN.NS",
      "ITC.NS",
      "AAPL",
      "MSFT",
      "GOOGL",
      "TSLA",
      "AMZN",
      "NVDA",
      "BTC-USD",
      "ETH-USD",
      "SOL-USD",
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = symbol.trim().toUpperCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toUpperCase().includes(q)).slice(0, 8);
  }, [symbol, suggestions]);

  const viewStock = () => {
    setMsg("");
    const s = symbol.trim().toUpperCase();
    if (!s) return setMsg("Enter a symbol like TCS.NS / AAPL / BTC-USD");
    setIsOpen(false);
    nav(`/stock/${encodeURIComponent(s)}`);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const inputStyle = {
    width: "100%",
    padding: "18px 18px",
    borderRadius: 18,
    border: "1px solid #222",
    background: "#050505",
    color: "white",
    outline: "none",
    fontSize: 18,
    letterSpacing: 1,
  };

  const btnStyle = {
    padding: "16px 18px",
    borderRadius: 18,
    border: "1px solid #222",
    background: "linear-gradient(90deg, #00f5ff, #8b5cf6)",
    color: "black",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: 120,
    fontSize: 16,
  };

  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white" }}>
      <NavBar title="Stock Verse" subtitle={`Hi, ${username} 👋`} />

      {/* Center layout */}
      <div
        style={{
          minHeight: "calc(100vh - 84px)",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 900, textAlign: "center" }}>
          <h1 style={{ fontSize: 42, margin: "0 0 10px 0" }}>
            Powering the Future of Trading
          </h1>
          <div style={{ opacity: 0.75, marginBottom: 22 }}>
            Search any stock: India (TCS.NS), US (AAPL), Crypto (BTC-USD)
          </div>

          {/* Search box */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase()); // ✅ auto capital
                  setMsg("");
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") viewStock();
                }}
                placeholder="TYPE SYMBOL (EX: TCS.NS / AAPL / BTC-USD)"
                style={inputStyle}
              />

              <button onClick={viewStock} style={btnStyle} type="button">
                View
              </button>
            </div>

            {/* Dropdown */}
            {isOpen && filtered.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  left: 0,
                  right: 0,
                  margin: "0 auto",
                  background: "#050505",
                  border: "1px solid #222",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                  zIndex: 20,
                  textAlign: "left",
                }}
              >
                {filtered.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSymbol(item.toUpperCase());
                      setIsOpen(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "14px 16px",
                      border: "none",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 15,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {item}
                    <span style={{ opacity: 0.6, marginLeft: 10, fontWeight: 700 }}>
                      {item.endsWith(".NS")
                        ? "India"
                        : item.includes("-USD")
                        ? "Crypto"
                        : "US"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {msg && <div style={{ marginTop: 14, color: "#ff6b6b" }}>{msg}</div>}

          <div style={{ marginTop: 18, opacity: 0.7, fontSize: 13 }}>
            Tip: Open a stock → use <b>Add to My Stocks</b> on the stock details page.
          </div>
        </div>
      </div>
    </div>
  );
}