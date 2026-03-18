import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function StockPage() {
  const { symbol } = useParams();
  const nav = useNavigate();

  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ STEP 1: added
  const [qty, setQty] = useState(1);
  const [addMsg, setAddMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const ov = await api.get(`/stock/overview/`, { params: { symbol } });
        const hi = await api.get(`/stock/history/`, {
          params: { symbol, period: "1mo" },
        });
        setOverview(ov.data);
        setHistory(hi.data);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [symbol]);

  // ✅ STEP 1: add function (NEW)
  const addToMyStocks = async () => {
    setAddMsg("");
    try {
      await api.post(`/mystocks/`, {
        symbol: symbol,
        quantity: Number(qty) || 1,
      });
      setAddMsg("✅ Added to My Stocks!");
    } catch (e) {
      setAddMsg(e?.response?.data?.error || "❌ Failed to add stock");
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: "white" } },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: "white" }, grid: { color: "#1f2937" } },
      y: { ticks: { color: "white" }, grid: { color: "#1f2937" } },
    },
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "black",
          color: "white",
          padding: 24,
        }}
      >
        Loading {symbol}...
      </div>
    );
  }

  if (err) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "black",
          color: "white",
          padding: 24,
        }}
      >
        <button onClick={() => nav("/")} style={{ marginBottom: 16 }}>
          ← Back
        </button>
        <h2>Error</h2>
        <div style={{ opacity: 0.8 }}>{err}</div>
      </div>
    );
  }

  const priceLine = {
    labels: history?.dates || [],
    datasets: [
      {
        label: "Close",
        data: history?.close || [],
        borderColor: "#00f5ff",
        backgroundColor: "rgba(0,245,255,0.15)",
        pointBackgroundColor: "#00f5ff",
        pointRadius: 1,
        borderWidth: 3,
        tension: 0.25,
        fill: true,
      },
      {
        label: "Open",
        data: history?.open || [],
        borderColor: "#f43f5e",
        backgroundColor: "rgba(244,63,94,0.15)",
        pointBackgroundColor: "#f43f5e",
        pointRadius: 1,
        borderWidth: 3,
        tension: 0.25,
      },
      {
        label: "1-Month MA",
        data: history?.ma20 || [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.1)",
        pointRadius: 0,
        borderWidth: 4,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const fundamentals = {
    labels: ["Debt/Equity", "Operating Cash Flow", "Free Cash Flow"],
    datasets: [
      {
        label: "Value",
        data: [
          overview?.debt_equity || 0,
          overview?.operating_cashflow || 0,
          overview?.free_cashflow || 0,
        ],
        backgroundColor: ["#00f5ff", "#a855f7", "#facc15"],
        borderColor: "#111827",
        borderWidth: 1,
      },
    ],
  };

  const cardStyle = {
    background: "#0b0b0b",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 16,
  };

  const actionCard = {
    ...cardStyle,
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const inputStyle = {
    width: 90,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "#050505",
    color: "white",
    outline: "none",
  };

  const btnStyle = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "linear-gradient(90deg, rgba(0,245,255,0.25), rgba(168,85,247,0.25))",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div
      style={{ minHeight: "100vh", background: "black", color: "white", padding: 24 }}
    >
      <button onClick={() => nav("/")} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <h1 style={{ fontSize: 30, marginBottom: 4 }}>
        {overview.company}{" "}
        <span style={{ opacity: 0.75 }}>({overview.symbol})</span>
      </h1>

      {/* ✅ STEP 1: UI block (NEW) */}
      <div style={actionCard}>
        <div>
          <div style={{ opacity: 0.75, marginBottom: 6 }}>Add to My Stocks</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={inputStyle}
            />
            <button onClick={addToMyStocks} style={btnStyle}>
              + Add
            </button>
          </div>
          {addMsg && (
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
              {addMsg}
            </div>
          )}
        </div>

        <div style={{ opacity: 0.7, fontSize: 13 }}>
          Tip: Add it here → manage it later in <b>My Stocks</b>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginTop: 16,
        }}
      >
        <div style={cardStyle}>
          <div style={{ opacity: 0.75 }}>Current Price</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {overview.currency_symbol}
            {overview.price}
          </div>
          <div style={{ opacity: 0.6 }}>{overview.currency}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ opacity: 0.75 }}>P/E Ratio</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {overview.pe_ratio ?? "N/A"}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ opacity: 0.75 }}>Discount vs 52W High</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {overview.discount_vs_52w_high_percent ?? "N/A"}%
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ opacity: 0.75 }}>Position in 52W Range</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {overview.position_in_52w_range_percent ?? "N/A"}%
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginTop: 18 }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Price + Moving Averages (1mo)</h3>
          <div style={{ height: 380 }}>
            <Line data={priceLine} options={chartOptions} />
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Debt/Equity + Cash Flows</h3>
          <div style={{ height: 320 }}>
            <Bar data={fundamentals} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}