import warnings
import numpy as np
import pandas as pd
import yfinance as yf

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
from statsmodels.tsa.arima.model import ARIMA

from .models import MyStock

warnings.filterwarnings("ignore")


def _safe_float(x):
    try:
        if x is None:
            return None
        if isinstance(x, (np.floating, np.integer)):
            return float(x)
        if pd.isna(x):
            return None
        return float(x)
    except Exception:
        return None


def _clean_price_df(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.copy()
    df.columns = [str(c).lower() for c in df.columns]
    df = df.reset_index()

    # yfinance sometimes returns Date or Datetime
    date_col = None
    for c in df.columns:
        if c.lower() in ["date", "datetime"]:
            date_col = c
            break

    if date_col is None:
        return pd.DataFrame()

    df.rename(columns={date_col: "date"}, inplace=True)

    needed = ["date", "open", "high", "low", "close", "volume"]
    for col in needed:
        if col not in df.columns:
            df[col] = np.nan

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["close"]).reset_index(drop=True)
    return df


def _build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()

    x["return_1d"] = x["close"].pct_change()
    x["range_pct"] = (x["high"] - x["low"]) / x["close"]
    x["oc_pct"] = (x["close"] - x["open"]) / x["open"]
    x["ma5"] = x["close"].rolling(5).mean()
    x["ma10"] = x["close"].rolling(10).mean()
    x["ma20"] = x["close"].rolling(20).mean()
    x["ma5_gap"] = (x["close"] - x["ma5"]) / x["ma5"]
    x["ma10_gap"] = (x["close"] - x["ma10"]) / x["ma10"]
    x["ma20_gap"] = (x["close"] - x["ma20"]) / x["ma20"]
    x["volatility_5"] = x["return_1d"].rolling(5).std()
    x["volume_chg"] = x["volume"].pct_change()

    x = x.dropna().reset_index(drop=True)
    return x


def _make_sequences(series_2d, window=20):
    X, y = [], []
    for i in range(window, len(series_2d)):
        X.append(series_2d[i - window:i])
        y.append(series_2d[i])
    return np.array(X), np.array(y)


class ProPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbol = (request.GET.get("symbol") or "").strip().upper()
        if not symbol:
            return Response({"error": "symbol is required"}, status=400)

        allowed = MyStock.objects.filter(user=request.user, symbol__iexact=symbol).exists()
        if not allowed:
            return Response(
                {"error": "This stock is not in your My Stocks list."},
                status=403,
            )

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}
            company = info.get("shortName") or info.get("longName") or symbol
        except Exception:
            company = symbol

        raw = yf.download(symbol, period="2y", auto_adjust=True, progress=False)
        df = _clean_price_df(raw)

        if df.empty or len(df) < 80:
            return Response(
                {"error": "Not enough stock data to run Pro Prediction."},
                status=400,
            )

        feat_df = _build_feature_frame(df)
        if feat_df.empty or len(feat_df) < 40:
            return Response(
                {"error": "Not enough processed feature rows for PCA/UMAP/RNN."},
                status=400,
            )

        # -------------------------
        # PCA
        # -------------------------
        feature_cols = [
            "close",
            "volume",
            "return_1d",
            "range_pct",
            "oc_pct",
            "ma5_gap",
            "ma10_gap",
            "ma20_gap",
            "volatility_5",
            "volume_chg",
        ]

        X = feat_df[feature_cols].replace([np.inf, -np.inf], np.nan).dropna()
        feat_df = feat_df.loc[X.index].reset_index(drop=True)
        X = X.reset_index(drop=True)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        pca = PCA(n_components=2, random_state=42)
        pca_2d = pca.fit_transform(X_scaled)

        pca_points = []
        for i in range(len(feat_df)):
            pca_points.append({
                "x": _safe_float(pca_2d[i, 0]),
                "y": _safe_float(pca_2d[i, 1]),
                "date": feat_df.loc[i, "date"],
                "close": _safe_float(feat_df.loc[i, "close"]),
            })

        # -------------------------
        # UMAP
        # -------------------------
        umap_points = []
        umap_status = "ok"

        try:
            import umap.umap_ as umap

            reducer = umap.UMAP(
                n_components=2,
                n_neighbors=15,
                min_dist=0.1,
                random_state=42,
            )
            umap_2d = reducer.fit_transform(X_scaled)

            for i in range(len(feat_df)):
                umap_points.append({
                    "x": _safe_float(umap_2d[i, 0]),
                    "y": _safe_float(umap_2d[i, 1]),
                    "date": feat_df.loc[i, "date"],
                    "close": _safe_float(feat_df.loc[i, "close"]),
                })

        except Exception as e:
            # fallback to PCA projection so page still works
            umap_status = f"fallback: {str(e)}"
            for i in range(len(feat_df)):
                umap_points.append({
                    "x": _safe_float(pca_2d[i, 0]),
                    "y": _safe_float(pca_2d[i, 1]),
                    "date": feat_df.loc[i, "date"],
                    "close": _safe_float(feat_df.loc[i, "close"]),
                })

        # -------------------------
        # Time series
        # -------------------------
        dates = feat_df["date"].tolist()
        close_list = [_safe_float(v) for v in feat_df["close"].tolist()]

        # ARIMA
        arima_pred = [None] * len(close_list)
        arima_forecast_next5 = []
        arima_status = "ok"

        try:
            close_series = pd.Series(feat_df["close"].astype(float).values)
            arima_model = ARIMA(close_series, order=(5, 1, 0))
            arima_fit = arima_model.fit()

            # aligned in-sample predictions
            fitted = arima_fit.predict(start=1, end=len(close_series) - 1, typ="levels")
            for idx, val in enumerate(fitted, start=1):
                arima_pred[idx] = _safe_float(val)

            forecast = arima_fit.forecast(steps=5)
            arima_forecast_next5 = [_safe_float(v) for v in forecast.tolist()]

        except Exception as e:
            arima_status = f"error: {str(e)}"

        # RNN
        rnn_pred = [None] * len(close_list)
        rnn_next1 = None
        rnn_status = "ok"

        try:
            import tensorflow as tf
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.layers import SimpleRNN, Dense

            tf.random.set_seed(42)
            np.random.seed(42)

            values = np.array(close_list, dtype=np.float32).reshape(-1, 1)
            ts_scaler = MinMaxScaler()
            scaled = ts_scaler.fit_transform(values)

            window = 20
            X_seq, y_seq = _make_sequences(scaled, window=window)

            if len(X_seq) < 20:
                raise ValueError("Not enough sequence rows for RNN.")

            split = max(int(len(X_seq) * 0.8), 1)
            X_train, y_train = X_seq[:split], y_seq[:split]

            model = Sequential([
                SimpleRNN(32, activation="tanh", input_shape=(window, 1)),
                Dense(16, activation="relu"),
                Dense(1),
            ])
            model.compile(optimizer="adam", loss="mse")
            model.fit(X_train, y_train, epochs=8, batch_size=16, verbose=0)

            pred_scaled = model.predict(X_seq, verbose=0)
            pred_real = ts_scaler.inverse_transform(pred_scaled).flatten()

            for i, val in enumerate(pred_real, start=window):
                if i < len(rnn_pred):
                    rnn_pred[i] = _safe_float(val)

            # next day prediction
            last_window = scaled[-window:].reshape(1, window, 1)
            next_scaled = model.predict(last_window, verbose=0)
            next_real = ts_scaler.inverse_transform(next_scaled).flatten()[0]
            rnn_next1 = _safe_float(next_real)

        except Exception as e:
            rnn_status = f"error: {str(e)}"

        # -------------------------
        # Insight
        # -------------------------
        latest_close = close_list[-1] if close_list else None
        latest_arima = next((x for x in reversed(arima_pred) if x is not None), None)
        latest_rnn = next((x for x in reversed(rnn_pred) if x is not None), None)

        insight_parts = []
        if latest_close is not None:
            insight_parts.append(f"Latest close: {latest_close:.2f}")
        if latest_arima is not None:
            insight_parts.append(f"ARIMA trend estimate: {latest_arima:.2f}")
        if latest_rnn is not None:
            insight_parts.append(f"RNN pattern estimate: {latest_rnn:.2f}")

        insight = " | ".join(insight_parts) if insight_parts else "Pro prediction generated."

        return Response({
            "symbol": symbol,
            "company": company,
            "search_scope": "My Stocks only",
            "pca": {
                "points": pca_points,
                "explained_variance_ratio": [
                    _safe_float(v) for v in pca.explained_variance_ratio_.tolist()
                ],
            },
            "umap": {
                "points": umap_points,
                "status": umap_status,
            },
            "timeseries": {
                "dates": dates,
                "close": close_list,
                "arima_pred": arima_pred,
                "rnn_pred": rnn_pred,
                "arima_next5": arima_forecast_next5,
                "rnn_next1": rnn_next1,
                "arima_status": arima_status,
                "rnn_status": rnn_status,
            },
            "insight": insight,
        })