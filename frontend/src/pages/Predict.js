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

  // For charts, we try multiple possible keys to avoid break:
  const dates = data?.dates || data?.history?.dates || [];
  const close = data?.close || data?.history?.close || [];

  // Linear regression predicted prices
  const lrPred = data?.linear_regression?.pred || data?.linear_regression_pred || [];
  // Logistic regression (0/1 signals) + probability
  const logLabel = data?.logistic_regression?.signal || data?.logistic_signal || [];
  const logProb = data?.logistic_regression?.prob || data?.logistic_prob || [];
  // KMeans scatter points
  const kmPoints = data?.kmeans?.points || data?.kmeans_points || []; // [{x,y,cluster}]
  const kmCenters = data?.kmeans?.centers || data?.kmeans_centers || []; // [{x,y}]

  // ---------- Neon chart defaults ----------
  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "white" } },
        tooltip: { enabled: true },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
          pan: { enabled: true, mode: "x" },
          limits: { x: { min: "original", max: "original" } },
        },
      },
      scales: {
        x: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.08)" } },
        y: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.08)" } },
      },
    }),
    []
  );

  // ---------- Charts ----------
  const priceVsLR = useMemo(() => {
    return {
      labels: dates,
      datasets: [
        {
          label: "Close Price",
          data: close,
          borderColor: "#00f5ff",
          backgroundColor: "rgba(0,245,255,0.10)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Linear Regression (Pred)",
          data: lrPred?.length ? lrPred : [],
          borderColor: "#a855f7",
          backgroundColor: "rgba(168,85,247,0.10)",
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [dates, close, lrPred]);

  const logisticSignals = useMemo(() => {
    return {
      labels: dates,
      datasets: [
        {
          label: "Logistic Signal (0=Down, 1=Up)",
          data: logLabel,
          borderColor: "#00ff9d",
          backgroundColor: "rgba(0,255,157,0.18)",
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [dates, logLabel]);

  const logisticProb = useMemo(() => {
    return {
      labels: dates,
      datasets: [
        {
          label: "Probability of Up (0→1)",
          data: logProb,
          borderColor: "#facc15",
          backgroundColor: "rgba(250,204,21,0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [dates, logProb]);

  const kmeansScatter = useMemo(() => {
    const clusters = {};
    (kmPoints || []).forEach((p) => {
      const c = p.cluster ?? 0;
      if (!clusters[c]) clusters[c] = [];
      clusters[c].push({ x: p.x, y: p.y });
    });

    const datasets = Object.keys(clusters).map((c) => ({
      label: `Cluster ${c}`,
      data: clusters[c],
      pointRadius: 4,
      pointHoverRadius: 6,
    }));

    if (kmCenters?.length) {
      datasets.push({
        label: "Centers",
        data: kmCenters.map((c) => ({ x: c.x, y: c.y })),
        pointRadius: 7,
        pointHoverRadius: 9,
      });
    }

    return { datasets };
  }, [kmPoints, kmCenters]);

  const scatterOptions = useMemo(
    () => ({
      ...commonOptions,
      scales: {
        x: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.08)" } },
        y: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.08)" } },
      },
    }),
    [commonOptions]
  );

  // ---------- Helpers ----------
  const hasLR = (lrPred || []).length > 0;
  const hasLog = (logLabel || []).length > 0 || (logProb || []).length > 0;
  const hasKM = (kmPoints || []).length > 0;

  return (
    <div style={page}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => nav(-1)} style={headerBtn}>
          ← Back
        </button>
        <div>
          <h1 style={title}>Prediction: {companyName}</h1>
          <div style={sub}>Symbol: {symbol} • Zoom: mouse-wheel • Pan: drag</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={loadPredict} style={headerBtn}>
          ↻ Refresh
        </button>
      </div>

      {msg && <div style={{ marginBottom: 14, opacity: 0.9, fontSize: 14 }}>{msg}</div>}

      {loading ? (
        <div style={{ opacity: 0.75 }}>Loading prediction...</div>
      ) : !data ? (
        <div style={{ opacity: 0.75 }}>No prediction data.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {/* 1) Linear Regression */}
          <div style={card}>
            <div style={{ fontWeight: 1000, fontSize: 18, marginBottom: 8 }}>
              1) Linear Regression — Close vs Predicted
            </div>
            {!hasLR ? (
              <div style={{ opacity: 0.75 }}>
                Backend didn’t return linear regression series yet.
              </div>
            ) : (
              <div style={{ height: 360 }}>
                <Line data={priceVsLR} options={commonOptions} />
              </div>
            )}
          </div>

          {/* 2) Logistic Regression */}
          <div style={card}>
            <div style={{ fontWeight: 1000, fontSize: 18, marginBottom: 8 }}>
              2) Logistic Regression — Up/Down Signal + Probability
            </div>

            {!hasLog ? (
              <div style={{ opacity: 0.75 }}>
                Backend didn’t return logistic regression series yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {(logLabel || []).length > 0 && (
                  <div style={{ height: 260 }}>
                    <Line data={logisticSignals} options={commonOptions} />
                  </div>
                )}
                {(logProb || []).length > 0 && (
                  <div style={{ height: 260 }}>
                    <Line data={logisticProb} options={commonOptions} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3) KMeans */}
          <div style={card}>
            <div style={{ fontWeight: 1000, fontSize: 18, marginBottom: 8 }}>
              3) KMeans Clustering — Market Regimes (Scatter)
            </div>
            {!hasKM ? (
              <div style={{ opacity: 0.75 }}>
                Backend didn’t return kmeans points yet.
              </div>
            ) : (
              <div style={{ height: 360 }}>
                <Scatter data={kmeansScatter} options={scatterOptions} />
              </div>
            )}
          </div>

          {/* AI insight */}
          <div style={card}>
            <div style={{ fontWeight: 1000, fontSize: 18, marginBottom: 8 }}>
              AI Final Insight
            </div>
            <div style={{ opacity: 0.9, lineHeight: 1.55 }}>
              {data?.insight ||
                "Backend insight not provided yet. Once backend returns 'insight', it will appear here."}
            </div>
          </div>

          {/* Reset zoom */}
          <button
            onClick={() => {
              try {
                // Reset zoom for all charts on page
                // Chart.js instances are managed internally; easiest is just refresh
                loadPredict();
              } catch {}
            }}
            style={{
              ...headerBtn,
              justifySelf: "start",
              boxShadow: "0 0 18px rgba(0,245,255,0.14)",
            }}
          >
            ⤾ Reset Zoom (Refresh)
          </button>
        </div>
      )}
    </div>
  );
}