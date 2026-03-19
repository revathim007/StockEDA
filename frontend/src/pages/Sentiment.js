import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

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

  const chartData = useMemo(() => {
    if (!data) return null;
    return {
      labels: ['Positive', 'Negative', 'Neutral'],
      datasets: [
        {
          data: [data.positive_count, data.negative_count, data.neutral_count],
          backgroundColor: [
            'rgba(34, 197, 94, 0.6)', // Green
            'rgba(239, 68, 68, 0.6)', // Red
            'rgba(156, 163, 175, 0.6)', // Gray
          ],
          borderColor: [
            '#22c55e',
            '#ef4444',
            '#9ca3af',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

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
        <div style={{ opacity: 0.75, fontSize: 18 }}>Analyzing market news...</div>
      ) : error ? (
        <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: 16, borderRadius: 12 }}>{error}</div>
      ) : !data || data.total_articles === 0 ? (
        <div style={card}>No recent news found for this stock.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Summary Stats */}
          <div style={{ display: "grid", gap: 20 }}>
            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>News Coverage Overview</h2>
              <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                <div>
                  <div style={{ opacity: 0.6, fontSize: 14 }}>Total Articles</div>
                  <div style={{ fontSize: 28, fontWeight: 900 }}>{data.total_articles}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6, fontSize: 14, color: "#22c55e" }}>Positive</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e" }}>{data.positive_count}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6, fontSize: 14, color: "#ef4444" }}>Negative</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444" }}>{data.negative_count}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6, fontSize: 14, color: "#9ca3af" }}>Neutral</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#9ca3af" }}>{data.neutral_count}</div>
                </div>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: 20, color: "#a855f7" }}>✦ AI Market Suggestion</h2>
              <div style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.9 }}>
                {data.ai_suggestion}
              </div>
            </div>

            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Latest Headlines</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {data.articles.map((art, idx) => (
                  <a 
                    key={idx} 
                    href={art.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      textDecoration: "none", 
                      color: "inherit",
                      padding: "10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      display: "block",
                      borderLeft: `4px solid ${art.sentiment === 1 ? '#22c55e' : art.sentiment === -1 ? '#ef4444' : '#9ca3af'}`
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{art.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>{art.source}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <h2 style={{ marginTop: 0, fontSize: 20, width: "100%", textAlign: "left" }}>Sentiment Distribution</h2>
            <div style={{ height: 350, width: "100%", marginTop: 20 }}>
              <Pie 
                data={chartData} 
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: 'white', padding: 20, font: { size: 14 } }
                    }
                  },
                  maintainAspectRatio: false
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
