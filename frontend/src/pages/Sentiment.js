import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Custom Gauge Component
const Gauge = ({ value }) => {
  const percentage = (value / 10) * 100;
  let color = "#9ca3af"; // Neutral
  if (value >= 7) color = "#22c55e"; // Positive
  if (value <= 4) color = "#ef4444"; // Negative

  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
      <div 
        style={{
          width: `${percentage}%`,
          background: color,
          height: 20,
          transition: "width 0.5s ease-in-out",
          boxShadow: `0 0 15px ${color}`
        }}
      />
    </div>
  );
};

export default function Sentiment() {
  const { symbol } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSentiment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/sentiment/", { params: { symbol } });
      setData(res.data);
    } catch (e) {
      console.error("Sentiment Fetch Error:", e);
      setError(e?.response?.data?.error || e?.response?.data?.detail || "Failed to fetch sentiment analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
  }, [symbol]);

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
    padding: 20,
    boxShadow: "0 0 25px rgba(0,245,255,0.08)",
  };

  const peerChartData = useMemo(() => {
    if (!data || !data.peer_comparison) return null;
    const labels = data.peer_comparison.map(p => p.symbol);
    const ratings = data.peer_comparison.map(p => p.rating);
    
    const peerColors = ['rgba(34, 197, 94, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(245, 158, 11, 0.6)', 'rgba(239, 68, 68, 0.6)'];

    const backgroundColors = data.peer_comparison.map((p, index) => {
      if (p.symbol.toUpperCase() === symbol.toUpperCase()) return '#a855f7'; // Highlight main symbol
      return peerColors[index % peerColors.length];
    });

    return {
      labels,
      datasets: [
        {
          label: 'Sentiment Rating',
          data: ratings,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(c => c.replace("0.6", "1")),
          borderWidth: 1,
        },
      ],
    };
  }, [data, symbol]);

  return (
    <div style={page}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => nav(-1)} style={headerBtn}>
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 1000 }}>AI Sentiment Analysis</h1>
          <div style={{ opacity: 0.7, fontWeight: 700 }}>Symbol: {symbol} • {data?.company}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={fetchSentiment} style={headerBtn}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ opacity: 0.75, fontSize: 18 }}>Analyzing market and peer news...</div>
      ) : error ? (
        <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: 16, borderRadius: 12 }}>{error}</div>
      ) : !data ? (
        <div style={card}>No data found for this stock.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left Column */}
          <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Overall Sentiment Rating</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                <div style={{ fontSize: 48, fontWeight: 900 }}>{data.sentiment_rating}</div>
                <div style={{ flex: 1 }}>
                  <Gauge value={data.sentiment_rating} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    <span>0 (Negative)</span>
                    <span>10 (Positive)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: 20, color: "#a855f7" }}>✦ AI Market Suggestion</h2>
              <div style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.9 }}>
                {data.ai_suggestion}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ ...card, alignContent: "start" }}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Peer Sentiment Comparison</h2>
            <div style={{ height: 350, marginTop: 16 }}>
              {peerChartData && <Bar 
                data={peerChartData} 
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Sentiment Rating (0-10)', color: 'white' }
                  },
                  scales: {
                    x: { min: 0, max: 10, ticks: { color: 'white' } },
                    y: { ticks: { color: 'white' } }
                  }
                }}
              />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
