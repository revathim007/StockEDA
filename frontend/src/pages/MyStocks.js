import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function MyStocks() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadMyStocks = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get("/mystocks/");
      setItems(res.data || []);
    } catch (e) {
      setMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to load My Stocks"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOverviews = async (list) => {
    try {
      const promises = list.map((it) =>
        api
          .get("/stock/overview/", { params: { symbol: it.symbol } })
          .then((r) => ({ symbol: it.symbol, data: r.data }))
          .catch(() => ({ symbol: it.symbol, data: null }))
      );

      const results = await Promise.all(promises);
      const map = {};
      results.forEach((x) => {
        map[x.symbol] = x.data;
      });
      setDetails(map);
    } catch {
      setDetails({});
    }
  };

  useEffect(() => {
    (async () => {
      await loadMyStocks();
    })();
  }, []);

  useEffect(() => {
    if (items && items.length > 0) loadOverviews(items);
    else setDetails({});
  }, [items]);

  const deleteStock = async (id) => {
    setMsg("");
    try {
      await api.delete(`/mystocks/${id}/`);
      setMsg("✅ Deleted!");
      loadMyStocks();
    } catch (e) {
      setMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "❌ Delete failed"
      );
    }
  };

  const page = {
    minHeight: "100vh",
    background: "black",
    color: "white",
    padding: 24,
  };

  const headerBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background:
      "linear-gradient(90deg, rgba(0,245,255,0.22), rgba(168,85,247,0.22))",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  };

  const card = {
    background: "#0b0b0b",
    border: "1px solid #222",
    borderRadius: 18,
    padding: 16,
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
    gap: 12,
    alignItems: "center",
  };

  const pill = {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#050505",
    fontWeight: 900,
    display: "inline-block",
    minWidth: 90,
    textAlign: "center",
  };

  const greenBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  };

  const blueBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  };

  const redBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  };

  const proBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,255,204,0.35)",
    background: "rgba(0,255,204,0.12)",
    color: "#00ffcc",
    cursor: "pointer",
    fontWeight: 900,
  };

  const small = { opacity: 0.75, fontSize: 13 };

  return (
    <div style={page}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}
      >
        <button onClick={() => nav("/")} style={headerBtn}>
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 28 }}>My Stocks</h1>
        <div style={{ flex: 1 }} />
        <button onClick={loadMyStocks} style={headerBtn}>
          ↻ Refresh
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: 14, opacity: 0.9, fontSize: 14 }}>{msg}</div>
      )}

      <div
        style={{
          ...card,
          marginBottom: 12,
          background: "#070707",
        }}
      >
        <div style={{ ...grid, fontWeight: 900, opacity: 0.85 }}>
          <div>Stock</div>
          <div style={{ textAlign: "center" }}>Qty</div>
          <div style={{ textAlign: "center" }}>Current Price</div>
          <div style={{ textAlign: "center" }}>P/E</div>
          <div style={{ textAlign: "center" }}>Discount vs 52W High</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>
      </div>

      {loading ? (
        <div style={{ opacity: 0.75 }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ opacity: 0.75 }}>
          No stocks added yet. Go to Dashboard → open a stock → add it.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((it) => {
            const ov = details[it.symbol];
            const company = ov?.company || it.symbol;
            const currencySymbol = ov?.currency_symbol || "";
            const price = ov?.price ?? null;
            const pe = ov?.pe_ratio ?? null;
            const disc = ov?.discount_vs_52w_high_percent ?? null;

            return (
              <div key={it.id} style={card}>
                <div style={grid}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {company}{" "}
                      <span style={{ opacity: 0.65, fontWeight: 800 }}>
                        ({it.symbol})
                      </span>
                    </div>
                    <div style={{ ...small, color: "#00ff9d", fontWeight: "bold" }}>
                      ✔ Saved
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={pill}>{it.quantity}</span>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={pill}>
                      {price === null ? "—" : `${currencySymbol}${price}`}
                    </span>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={pill}>{pe === null ? "—" : pe}</span>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={pill}>{disc === null ? "—" : `${disc}%`}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                    <button
                      style={greenBtn}
                      onClick={() => nav(`/predict/${it.symbol}`)}
                    >
                      Predict
                    </button>

                    <button
                      style={proBtn}
                      onClick={() => nav(`/pro-predict/${it.symbol}`)}
                    >
                      ✦ Pro Prediction
                    </button>

                    <button
                      style={blueBtn}
                      onClick={() => nav(`/sentiment/${it.symbol}`)}
                    >
                      Sentiment Analysis
                    </button>

                    <button style={redBtn} onClick={() => deleteStock(it.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}