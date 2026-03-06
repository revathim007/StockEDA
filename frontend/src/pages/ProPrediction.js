import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function ProPrediction() {
  const nav = useNavigate();

  const [myStocks, setMyStocks] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [data, setData] = useState(null);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [msg, setMsg] = useState("");

  const loadMyStocks = async () => {
    setLoadingStocks(true);
    setMsg("");
    try {
      const res = await api.get("/mystocks/");
      const list = res.data || [];
      setMyStocks(list);

      if (list.length === 0) {
        setSelectedSymbol("");
        setData(null);
      } else {
        const stillExists = list.some(
          (x) => x.symbol?.toUpperCase() === selectedSymbol?.toUpperCase()
        );
        if (!selectedSymbol || !stillExists) {
          setSelectedSymbol(list[0].symbol);
          setQuery(list[0].symbol);
        }
      }
    } catch (e) {
      setMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to load My Stocks"
      );
    } finally {
      setLoadingStocks(false);
    }
  };

  const loadProPrediction = async (symbol) => {
    if (!symbol) return;
    setLoadingPrediction(true);
    setMsg("");
    try {
      const res = await api.get("/pro-predict/", {
        params: { symbol },
      });
      setData(res.data);
    } catch (e) {
      setData(null);
      setMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to load Pro Prediction"
      );
    } finally {
      setLoadingPrediction(false);
    }
  };

  useEffect(() => {
    loadMyStocks();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      loadProPrediction(selectedSymbol);
    }
    // eslint-disable-next-line
  }, [selectedSymbol]);

  const filteredStocks = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return myStocks;
    return myStocks.filter((item) =>
      item.symbol?.toUpperCase().includes(q)
    );
  }, [myStocks, query]);

  const page = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 10% 0%, rgba(0,245,255,0.12), transparent 35%), radial-gradient(circle at 90% 10%, rgba(168,85,247,0.12), transparent 35%), #000",
    color: "white",
    padding: 24,
  };

  const topRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
  };

  const card = {
    background: "rgba(8,8,8,0.92)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 0 28px rgba(0,245,255,0.08)",
  };

  const btn = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(90deg, rgba(0,245,255,0.20), rgba(168,85,247,0.20))",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  };

  const searchWrap = {
    ...card,
    width: 320,
    position: "relative",
  };

  const input = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#050505",
    color: "white",
    outline: "none",
  };

  const dropdown = {
    marginTop: 10,
    maxHeight: 220,
    overflowY: "auto",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#050505",
  };

  const option = {
    padding: "10px 12px",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontWeight: 800,
  };

  const title = {
    margin: 0,
    fontSize: 34,
    fontWeight: 1000,
    letterSpacing: 0.2,
  };

  const sub = {
    marginTop: 6,
    opacity: 0.76,
    fontWeight: 700,
  };

  const chartCard = {
    ...card,
    marginTop: 18,
  };

  const chartBox = {
    height: 420,
    marginTop: 14,
  };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginTop: 18,
  };

  const pill = {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(0,245,255,0.12)",
    border: "1px solid rgba(0,245,255,0.22)",
    fontWeight: 900,
    fontSize: 13,
  };

  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "white" },
        },
        tooltip: {
          enabled: true,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "xy",
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "xy",
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    }),
    []
  );

  const pcaData = useMemo(() => {
    const points = data?.pca?.points || [];
    return {
      datasets: [
        {
          label: "PCA Points",
          data: points.map((p) => ({ x: p.x, y: p.y })),
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const umapData = useMemo(() => {
    const points = data?.umap?.points || [];
    return {
      datasets: [
        {
          label: "UMAP Points",
          data: points.map((p) => ({ x: p.x, y: p.y })),
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const scatterOptions = useMemo(
    () => ({
      ...commonOptions,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    }),
    [commonOptions]
  );

  const tsData = useMemo(() => {
    const ts = data?.timeseries || {};
    return {
      labels: ts.dates || [],
      datasets: [
        {
          label: "Close Price",
          data: ts.close || [],
          borderColor: "#00f5ff",
          backgroundColor: "rgba(0,245,255,0.12)",
          fill: true,
          tension: 0.28,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "ARIMA",
          data: ts.arima_pred || [],
          borderColor: "#facc15",
          backgroundColor: "rgba(250,204,21,0.10)",
          fill: false,
          tension: 0.28,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "RNN",
          data: ts.rnn_pred || [],
          borderColor: "#a855f7",
          backgroundColor: "rgba(168,85,247,0.10)",
          fill: false,
          tension: 0.28,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const selectStock = (symbol) => {
    setSelectedSymbol(symbol);
    setQuery(symbol);
  };

  return (
    <div style={page}>
      <div style={topRow}>
        <div style={{ maxWidth: 700 }}>
          <button onClick={() => nav(-1)} style={btn}>
            ← Back
          </button>

          <h1 style={{ ...title, marginTop: 16 }}>Pro Prediction</h1>
          <div style={sub}>
            Search is limited to stocks inside <b>My Stocks</b> only.
            If you delete a stock from My Stocks, it will not appear here.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={pill}>PCA</span>
            <span style={pill}>UMAP</span>
            <span style={pill}>Time Series</span>
            <span style={pill}>ARIMA</span>
            <span style={pill}>RNN</span>
          </div>
        </div>

        <div style={searchWrap}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Search My Stocks</div>
          <input
            style={input}
            placeholder="Type stock symbol..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div style={dropdown}>
            {loadingStocks ? (
              <div style={{ padding: 12, opacity: 0.75 }}>Loading My Stocks...</div>
            ) : filteredStocks.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.75 }}>
                No matching stock in My Stocks.
              </div>
            ) : (
              filteredStocks.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...option,
                    background:
                      selectedSymbol === item.symbol
                        ? "rgba(0,245,255,0.10)"
                        : "transparent",
                  }}
                  onClick={() => selectStock(item.symbol)}
                >
                  {item.symbol}
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button style={btn} onClick={loadMyStocks}>
              ↻ Refresh Stocks
            </button>
            {selectedSymbol && (
              <button style={btn} onClick={() => loadProPrediction(selectedSymbol)}>
                ↻ Refresh Charts
              </button>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div
          style={{
            ...card,
            marginTop: 18,
            border: "1px solid rgba(239,68,68,0.30)",
            background: "rgba(127,29,29,0.20)",
          }}
        >
          {msg}
        </div>
      )}

      {!selectedSymbol && !loadingStocks && myStocks.length === 0 && (
        <div style={{ ...card, marginTop: 18 }}>
          No stocks in My Stocks. Add stocks first from Dashboard or Stock page.
        </div>
      )}

      {selectedSymbol && (
        <>
          <div style={{ ...card, marginTop: 18 }}>
            <h2 style={{ margin: 0 }}>
              {data?.company || selectedSymbol} ({selectedSymbol})
            </h2>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              {loadingPrediction
                ? "Loading pro prediction..."
                : data?.insight || "Advanced stock intelligence ready."}
            </div>
          </div>

          <div style={grid2}>
            <div style={chartCard}>
              <h3 style={{ margin: 0 }}>PCA Analysis</h3>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                Explained variance:{" "}
                {data?.pca?.explained_variance_ratio?.length
                  ? data.pca.explained_variance_ratio
                      .map((v) => (v * 100).toFixed(1) + "%")
                      .join(" , ")
                  : "—"}
              </div>
              <div style={chartBox}>
                <Scatter data={pcaData} options={scatterOptions} />
              </div>
            </div>

            <div style={chartCard}>
              <h3 style={{ margin: 0 }}>UMAP Analysis</h3>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                Status: {data?.umap?.status || "—"}
              </div>
              <div style={chartBox}>
                <Scatter data={umapData} options={scatterOptions} />
              </div>
            </div>
          </div>

          <div style={chartCard}>
            <h3 style={{ margin: 0 }}>Time Series + ARIMA + RNN</h3>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              ARIMA: {data?.timeseries?.arima_status || "—"} | RNN:{" "}
              {data?.timeseries?.rnn_status || "—"}
            </div>

            <div style={chartBox}>
              <Line data={tsData} options={commonOptions} />
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <b>ARIMA Next 5:</b>{" "}
                {data?.timeseries?.arima_next5?.length
                  ? data.timeseries.arima_next5.join(" , ")
                  : "—"}
              </div>
              <div>
                <b>RNN Next 1:</b> {data?.timeseries?.rnn_next1 ?? "—"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}