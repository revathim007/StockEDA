import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import { Line, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(0,255,170,0.12), transparent 25%), #050505",
  color: "white",
  padding: "24px",
};

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(0,255,170,0.18)",
  borderRadius: "18px",
  padding: "20px",
  marginBottom: "24px",
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "white" } },
    zoom: {
      pan: { enabled: true, mode: "x" },
      zoom: { wheel: { enabled: true }, mode: "x" },
    },
  },
  scales: {
    x: { ticks: { color: "white" } },
    y: { ticks: { color: "white" } },
  },
};

export default function ProPrediction() {
  const { symbol } = useParams();
  const nav = useNavigate();

  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const ranges = [
    { label: "7 Days", value: "7d" },
    { label: "1 Month", value: "1mo" },
    { label: "3 Months", value: "3mo" },
    { label: "6 Months", value: "6mo" },
    { label: "1 Year", value: "1y" },
  ];

  useEffect(() => {
    fetchPrediction();
  }, [symbol, range]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const res = await api.get("/pro-predict/", {
        params: { symbol, range },
      });
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.error || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const pcaData = useMemo(() => {
    if (!data?.pca?.points) return null;
    return {
      datasets: [
        {
          label: "PCA",
          data: data.pca.points.map((p) => ({ x: p.x, y: p.y })),
          backgroundColor: "#00ffaa",
        },
      ],
    };
  }, [data]);

  const umapData = useMemo(() => {
    if (!data?.umap?.points) return null;
    return {
      datasets: [
        {
          label: "UMAP",
          data: data.umap.points.map((p) => ({ x: p.x, y: p.y })),
          backgroundColor: "#00e5ff",
        },
      ],
    };
  }, [data]);

  const lineData = useMemo(() => {
    if (!data?.timeseries) return null;
    return {
      labels: data.timeseries.dates,
      datasets: [
        {
          label: "Actual Close",
          data: data.timeseries.close,
          borderColor: "white",
        },
        {
          label: "ARIMA",
          data: data.timeseries.arima_pred,
          borderColor: "#00ff88",
        },
        {
          label: "RNN",
          data: data.timeseries.rnn_pred,
          borderColor: "#00e5ff",
        },
      ],
    };
  }, [data]);

  return (
    <div style={pageStyle}>
      <button onClick={() => nav(-1)}>← Back</button>

      <div style={cardStyle}>
        <h2>{symbol} Pro Prediction</h2>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          style={{ padding: 10, marginTop: 10 }}
        >
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={cardStyle}>Loading...</div>}
      {err && <div style={cardStyle}>{err}</div>}

      {data && (
        <>
          <div style={cardStyle}>
            <h3>Insight</h3>
            <p>{data.insight}</p>
          </div>

          <div style={cardStyle}>
            <h3>PCA</h3>
            <div style={{ height: 400 }}>
              <Scatter data={pcaData} options={chartOptions} />
            </div>
          </div>

          <div style={cardStyle}>
            <h3>UMAP</h3>
            <div style={{ height: 400 }}>
              <Scatter data={umapData} options={chartOptions} />
            </div>
          </div>

          <div style={cardStyle}>
            <h3>Time Series</h3>
            <div style={{ height: 400 }}>
              <Line data={lineData} options={chartOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}