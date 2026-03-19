import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Filler,
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import { Line, Bar, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export default function Predict() {
  const nav = useNavigate();
  const { symbol } = useParams();

  const [data, setData] = useState(null); // backend response
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // ✅ CHANGE THIS if your endpoint name differs
  const loadPredict = async () => {
    setLoading(true);
    setMsg("");
    try {
      // expecting backend like: GET /api/predict/?symbol=TCS.NS
      const res = await api.get(`/predict/`, { params: { symbol } });
      setData(res.data);
    } catch (e) {
      setMsg(e?.response?.data?.detail || e?.response?.data?.error || "Prediction load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredict();
    // eslint-disable-next-line
  }, [symbol]);

  // ---------- UI styles ----------
  const page = {
    minHeight: "100vh",
    background: "radial-gradient(circle at 20% 0%, rgba(0,245,255,0.15), transparent 45%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.18), transparent 50%), #000",
    color: "white",
    padding: 24,
  };

  const headerBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: "linear-gradient(90deg, rgba(0,245,255,0.22), rgba(168,85,247,0.22))",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  };

  const card = {
    background: "rgba(5,5,5,0.88)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 0 25px rgba(0,245,255,0.08)",
  };

  const title = {
    margin: 0,
    fontSize: 34,
    fontWeight: 1000,
    letterSpacing: 0.2,
    textShadow: "0 0 12px rgba(0,245,255,0.18), 0 0 18px rgba(168,85,247,0.12)",
  };

  const sub = { opacity: 0.75, marginTop: 6, fontWeight: 700 };

  // ---------- Safe extractors (works even if some keys missing) ----------
  const companyName = data?.company || symbol;
  const nextDayPrediction = data?.next_day_prediction;
  const metrics = data?.metrics;
  const currencySymbol = data?.currency_symbol || (symbol.endsWith(".NS") || symbol.endsWith(".BO") ? "₹" : "$");

  // Chart combines 30d history + 30d prediction
  const histDates = data?.history_30d?.dates || [];
  const histClose = data?.history_30d?.close || [];
  
  const predDates = data?.prediction_30d?.dates || [];
  const predClose = data?.prediction_30d?.pred || [];
  const predUpper = data?.prediction_30d?.upper || [];
  const predLower = data?.prediction_30d?.lower || [];

  // We need to create a unified label set for the chart
  // histDates and predDates overlap by 1 day for a smooth connection
  const chartDates = [...histDates, ...predDates.slice(1)];
  
  // Align datasets
  // History ends where prediction starts
  const chartClose = [...histClose, ...Array(Math.max(0, predDates.length - 1)).fill(null)];
  
  // Prediction starts exactly at the end of history (the backend already included it)
  const chartPred = [...Array(Math.max(0, histDates.length - 1)).fill(null), ...predClose];
  const chartUpper = [...Array(Math.max(0, histDates.length - 1)).fill(null), ...predUpper];
  const chartLower = [...Array(Math.max(0, histDates.length - 1)).fill(null), ...predLower];

  // ---------- Neon chart defaults ----------
  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { labels: { color: "white" } },
        tooltip: { 
          enabled: true,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#00f5ff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
          pan: { enabled: true, mode: "x" },
        },
      },
      scales: {
        x: { 
          ticks: { color: "rgba(255,255,255,0.6)", maxRotation: 45, minRotation: 45 }, 
          grid: { color: "rgba(255,255,255,0.05)" } 
        },
        y: { 
          ticks: { color: "rgba(255,255,255,0.6)" }, 
          grid: { color: "rgba(255,255,255,0.05)" } 
        },
      },
    }),
    []
  );

  // ---------- Charts ----------
  const priceVsPrediction = useMemo(() => {
    return {
      labels: chartDates,
      datasets: [
        {
          label: "Historical Price",
          data: chartClose,
          borderColor: "#00f5ff",
          backgroundColor: "rgba(0,245,255,0.10)",
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 3,
        },
        {
          label: "Predicted Price",
          data: chartPred,
          borderColor: "#a855f7",
          backgroundColor: "rgba(168,85,247,0.10)",
          borderDash: [6, 4],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 3,
        },
        {
          label: "Upper Range",
          data: chartUpper,
          borderColor: "rgba(168,85,247,0.2)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        {
          label: "Lower Range",
          data: chartLower,
          borderColor: "rgba(168,85,247,0.2)",
          backgroundColor: "rgba(168,85,247,0.05)",
          borderWidth: 1,
          pointRadius: 0,
          fill: '-1', // Fill the area between upper and lower
          tension: 0.3,
        },
      ],
    };
  }, [chartDates, chartClose, chartPred, chartUpper, chartLower]);

  return (
    <div style={page}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => nav(-1)} style={headerBtn}>
          ← Back
        </button>
        <div>
          <h1 style={title}>AI Price Analytics: {companyName}</h1>
          <div style={sub}>Symbol: {symbol}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={loadPredict} style={headerBtn}>
          ↻ Refresh Analysis
        </button>
      </div>

      {msg && <div style={{ marginBottom: 14, background: "rgba(255,0,0,0.1)", padding: 10, borderRadius: 8, color: "#ff4444" }}>{msg}</div>}

      {loading ? (
        <div style={{ opacity: 0.75, display: "flex", alignItems: "center", gap: 10 }}>
          <div className="spinner" style={{ width: 20, height: 20, border: "2px solid #00f5ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          Calculating deep analytics...
        </div>
      ) : !data ? (
        <div style={{ opacity: 0.75 }}>No prediction data available.</div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          
          {/* Metrics Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div style={card}>
              <div style={{ opacity: 0.6, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Next Day Forecast</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#00f5ff", marginTop: 4 }}>
                {nextDayPrediction ? `${currencySymbol}${nextDayPrediction}` : "N/A"}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>
                30-Day Predictive Trajectory
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Includes 95% Confidence Intervals
              </div>
            </div>
            <div style={{ height: 450 }}>
              <Line data={priceVsPrediction} options={commonOptions} />
            </div>
          </div>

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </div>
  );
}