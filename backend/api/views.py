import math
import yfinance as yf
import pandas as pd
import numpy as np

from django.http import JsonResponse
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from rest_framework_simplejwt.tokens import RefreshToken

from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from .models import MyStock
from .serializers import RegisterSerializer, MyStockSerializer


# ---------------------------
# Helpers
# ---------------------------

def _safe_float(x):
    try:
        if x is None:
            return None
        if isinstance(x, (int, float, np.number)):
            if np.isnan(x):
                return None
            return float(x)
        v = float(x)
        if np.isnan(v):
            return None
        return v
    except Exception:
        return None


def _round(x, n=2):
    x = _safe_float(x)
    if x is None:
        return None
    return round(x, n)


def _flatten_yf_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    yfinance can return MultiIndex columns like:
      ('Close','TCS.NS'), ('Volume','TCS.NS') ...
    This flattens to single level: Close, Volume, Open, High, Low, Adj Close
    (safe when only ONE symbol is requested).
    """
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
    return df


def _ensure_date_column(df: pd.DataFrame) -> pd.DataFrame:
    df = df.reset_index()
    if "Date" not in df.columns:
        if "Datetime" in df.columns:
            df.rename(columns={"Datetime": "Date"}, inplace=True)
        else:
            df.rename(columns={df.columns[0]: "Date"}, inplace=True)
    return df


def _get_latest_close(symbol: str):
    t = yf.Ticker(symbol)

    hist = t.history(period="5d", interval="1h")
    if hist is not None and not hist.empty:
        last_row = hist.dropna().tail(1)
        if not last_row.empty:
            return _safe_float(last_row["Close"].iloc[0])

    hist = t.history(period="1mo", interval="1d")
    if hist is not None and not hist.empty:
        last_row = hist.dropna().tail(1)
        if not last_row.empty:
            return _safe_float(last_row["Close"].iloc[0])

    return None


def _get_currency_symbol(currency_code: str):
    if not currency_code:
        return ""
    c = currency_code.upper()
    if c == "INR":
        return "₹"
    if c in ["USD", "USDT"]:
        return "$"
    if c == "EUR":
        return "€"
    if c == "GBP":
        return "£"
    if c == "JPY":
        return "¥"
    return c + " "


def _discount_level(current_price, high_52w, low_52w):
    p = _safe_float(current_price)
    hi = _safe_float(high_52w)
    lo = _safe_float(low_52w)

    discount_vs_high = None
    pos_in_range = None

    if p is not None and hi not in [None, 0]:
        discount_vs_high = (1 - (p / hi)) * 100

    if p is not None and hi is not None and lo is not None and hi != lo:
        pos_in_range = ((p - lo) / (hi - lo)) * 100

    return _round(discount_vs_high, 2), _round(pos_in_range, 2)


def _series_from_df_col(df: pd.DataFrame, col: str) -> pd.Series:
    """
    Always return a Series for a column, even if df[col] becomes a DataFrame.
    (This is the exact fix for: 'DataFrame' object has no attribute 'tolist')
    """
    obj = df[col]
    if isinstance(obj, pd.DataFrame):
        # single symbol => take first column
        obj = obj.iloc[:, 0]
    return obj


# ---------------------------
# AUTH
# ---------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def ping(request):
    return JsonResponse({"message": "Stock Verse backend is running ✅"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "Registered ✅", "username": user.username})
    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = (request.data.get("username") or "").strip()
    password = (request.data.get("password") or "").strip()

    if not username or not password:
        return Response({"error": "username and password required"}, status=400)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "Invalid credentials"}, status=401)

    if not user.check_password(password):
        return Response({"error": "Invalid credentials"}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({"username": request.user.username})


# ---------------------------
# UNIVERSAL STOCK DATA (public)
# ---------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def stock_overview(request):
    symbol = request.GET.get("symbol", "").strip()
    if not symbol:
        return JsonResponse({"error": "symbol is required"}, status=400)

    try:
        t = yf.Ticker(symbol)
        info = t.info or {}

        company = info.get("shortName") or info.get("longName") or symbol
        currency = info.get("currency") or ""
        currency_symbol = _get_currency_symbol(currency)

        live_price = _safe_float(info.get("regularMarketPrice"))
        if live_price is None:
            live_price = _get_latest_close(symbol)

        high_52w = _safe_float(info.get("fiftyTwoWeekHigh"))
        low_52w = _safe_float(info.get("fiftyTwoWeekLow"))
        pe = _safe_float(info.get("trailingPE")) or _safe_float(info.get("forwardPE"))

        debt_equity = _safe_float(info.get("debtToEquity"))
        ocf = _safe_float(info.get("operatingCashflow"))
        fcf = _safe_float(info.get("freeCashflow"))

        discount_vs_high, pos_in_range = _discount_level(live_price, high_52w, low_52w)

        payload = {
            "symbol": symbol,
            "company": company,
            "currency": currency,
            "currency_symbol": currency_symbol,
            "price": _round(live_price, 2),
            "pe_ratio": _round(pe, 2),
            "high_52w": _round(high_52w, 2),
            "low_52w": _round(low_52w, 2),
            "discount_vs_52w_high_percent": discount_vs_high,
            "position_in_52w_range_percent": pos_in_range,
            "debt_equity": _round(debt_equity, 2),
            "operating_cashflow": ocf,
            "free_cashflow": fcf,
        }

        if payload["price"] is None:
            return JsonResponse({"error": "Invalid or unsupported symbol"}, status=400)

        return JsonResponse(payload)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([AllowAny])
def stock_history(request):
    symbol = request.GET.get("symbol", "").strip()
    period = request.GET.get("period", "1y").strip()
    if not symbol:
        return JsonResponse({"error": "symbol is required"}, status=400)

    try:
        t = yf.Ticker(symbol)
        hist = t.history(period=period, interval="1d")

        if hist is None or hist.empty:
            return JsonResponse({"error": "No history found"}, status=400)

        df = hist.copy().dropna()
        ma_period = 10 if period == "1mo" else 20
        df["MA20"] = df["Close"].rolling(ma_period).mean()
        df["MA50"] = df["Close"].rolling(50).mean()

        dates = [d.strftime("%Y-%m-%d") for d in df.index]
        close = [float(x) for x in df["Close"].tolist()]
        open_price = [float(x) for x in df["Open"].tolist()]
        ma20 = [None if pd.isna(x) else float(x) for x in df["MA20"].tolist()]
        ma50 = [None if pd.isna(x) else float(x) for x in df["MA50"].tolist()]
        volume = [None if pd.isna(x) else float(x) for x in df["Volume"].tolist()]

        return JsonResponse(
            {
                "symbol": symbol,
                "period": period,
                "dates": dates,
                "close": close,
                "open": open_price,
                "ma20": ma20,
                "ma50": ma50,
                "volume": volume,
            }
        )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ---------------------------
# MY STOCKS (per user)
# ---------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_stocks_list(request):
    qs = MyStock.objects.filter(user=request.user).order_by("-added_at")
    return Response(MyStockSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def my_stocks_add(request):
    symbol = (request.data.get("symbol") or "").strip()
    quantity = request.data.get("quantity", 1)

    try:
        quantity = int(quantity)
        if quantity <= 0:
            return Response({"error": "quantity must be >= 1"}, status=400)
    except Exception:
        return Response({"error": "quantity must be a number"}, status=400)

    if not symbol:
        return Response({"error": "symbol is required"}, status=400)

    obj, created = MyStock.objects.get_or_create(
        user=request.user,
        symbol=symbol,
        defaults={"quantity": quantity},
    )

    if not created:
        obj.quantity = obj.quantity + quantity
        obj.save()

    return Response(
        {"id": obj.id, "symbol": obj.symbol, "quantity": obj.quantity, "created": created}
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def my_stocks_delete(request, stock_id):
    MyStock.objects.filter(user=request.user, id=stock_id).delete()
    return Response({"deleted": True})


class MyStockListCreateView(generics.ListCreateAPIView):
    serializer_class = MyStockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MyStock.objects.filter(user=self.request.user).order_by("-added_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyStockDeleteView(generics.DestroyAPIView):
    serializer_class = MyStockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MyStock.objects.filter(user=self.request.user)


# ---------------------------
# PREDICT (FIXED: MultiIndex + DataFrame->Series)
# ---------------------------

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ---------------------------
# Advanced TA Helpers
# ---------------------------

def _rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def _macd(series, slow=26, fast=12, signal=9):
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    return macd, signal_line

# ---------------------------
# PREDICT (ENHANCED: RandomForest + TA + Iterative Forecasting)
# ---------------------------

class PredictView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbol = (request.query_params.get("symbol") or "").strip()
        if not symbol:
            return Response({"error": "Symbol required"}, status=400)

        try:
            # -------- Download stock data (Fetch 2 years for enough history for TA/Training) --------
            df = yf.download(symbol, period="2y", progress=False)

            if df is None or df.empty:
                return Response({"error": "Invalid symbol or no data"}, status=400)

            df = _flatten_yf_columns(df)
            df = _ensure_date_column(df)

            for col in ["Close", "Volume", "High", "Low", "Open"]:
                if col not in df.columns:
                    # Some stocks might miss columns, handle gracefully
                    continue

            close_s = _series_from_df_col(df, "Close")
            mask = close_s.notna()
            df = df.loc[mask].copy()
            close_s = _series_from_df_col(df, "Close")

            # -------- Advanced Feature Engineering --------
            # 1. Lags (Captures short-term momentum)
            df["Lag_1"] = close_s.shift(1)
            df["Lag_2"] = close_s.shift(2)
            df["Lag_3"] = close_s.shift(3)
            
            # 2. Moving Averages
            df["MA10"] = close_s.rolling(10).mean()
            df["MA20"] = close_s.rolling(20).mean()
            df["MA50"] = close_s.rolling(50).mean()
            
            # 3. Volatility (Standard Deviation)
            df["Volatility"] = close_s.rolling(20).std()
            
            # 4. Returns (Daily percentage change)
            df["Returns"] = close_s.pct_change()
            
            # 5. Technical Indicators (RSI, MACD)
            df["RSI"] = _rsi(close_s)
            macd_val, macd_sig = _macd(close_s)
            df["MACD"] = macd_val
            df["MACD_Signal"] = macd_sig
            
            # 6. Volume Trend
            if "Volume" in df.columns:
                vol_s = _series_from_df_col(df, "Volume")
                df["Vol_MA10"] = vol_s.rolling(10).mean()

            # Clean up NaNs created by lagging/rolling
            df.dropna(inplace=True)

            if df.empty:
                return Response({"error": "Not enough data for feature engineering"}, status=400)

            # Features to use for training
            feature_cols = ["Lag_1", "Lag_2", "Lag_3", "MA10", "MA20", "MA50", "Volatility", "RSI", "MACD", "MACD_Signal"]
            if "Vol_MA10" in df.columns:
                feature_cols.append("Vol_MA10")

            # -------- Data Splitting (Time-Series Split) --------
            # Use last 30 days of available data for validation, the rest for training
            train_size = len(df) - 30
            train_df = df.iloc[:train_size]
            val_df = df.iloc[train_size:]

            X_train = train_df[feature_cols].values
            y_train = _series_from_df_col(train_df, "Close").values.astype(float)
            
            X_val = val_df[feature_cols].values
            y_val = _series_from_df_col(val_df, "Close").values.astype(float)

            # -------- Model Training (Random Forest) --------
            # RF is less prone to overfitting than a single tree and captures non-linearities better than Linear Regression
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)

            # -------- Evaluation --------
            y_pred_val = model.predict(X_val)
            mae = mean_absolute_error(y_val, y_pred_val)
            rmse = np.sqrt(mean_squared_error(y_val, y_pred_val))
            r2 = r2_score(y_val, y_pred_val)

            # -------- Iterative Future Prediction (30 Days) --------
            # We predict day by day, updating ALL features each time for realism
            future_preds = []
            
            # Maintain a sliding window of recent prices for indicator calculation
            # We need at least 50 days for MA50, and about 30 for RSI/MACD
            window_prices = close_s.tail(100).tolist() 
            
            # Calculate historical volatility for adding realistic market noise
            daily_returns = close_s.pct_change().dropna()
            hist_volatility = daily_returns.std()
            
            for _ in range(30):
                # 1. Convert window to Series for indicator functions
                s = pd.Series(window_prices)
                
                # 2. Recalculate indicators for the CURRENT "future" day
                lag1 = window_prices[-1]
                lag2 = window_prices[-2]
                lag3 = window_prices[-3]
                
                ma10 = s.tail(10).mean()
                ma20 = s.tail(20).mean()
                ma50 = s.tail(50).mean()
                
                vol = s.tail(20).std()
                
                # RSI
                delta = s.diff()
                gain = (delta.where(delta > 0, 0)).tail(14).mean()
                loss = (-delta.where(delta < 0, 0)).tail(14).mean()
                rs = gain / (loss if loss != 0 else 0.001)
                rsi_val = 100 - (100 / (1 + rs))
                
                # MACD (simplified for the loop)
                ema12 = s.ewm(span=12, adjust=False).mean().iloc[-1]
                ema26 = s.ewm(span=26, adjust=False).mean().iloc[-1]
                macd_val = ema12 - ema26
                # Signal line is usually EMA of MACD, we'll use a slightly simplified version for speed
                macd_sig = s.ewm(span=9, adjust=False).mean().iloc[-1] * 0.1 # proxy
                
                # 3. Assemble features
                features = [lag1, lag2, lag3, ma10, ma20, ma50, vol, rsi_val, macd_val, macd_sig]
                if "Vol_MA10" in feature_cols:
                    # Use last known volume MA as volume is hard to predict
                    features.append(df["Vol_MA10"].iloc[-1])
                
                # 4. Predict
                pred = model.predict([features])[0]
                
                # 5. Add a tiny bit of "Market Noise" (Realism)
                # This prevents the line from becoming a perfectly smooth curve
                noise = pred * np.random.normal(0, hist_volatility * 0.2) 
                pred_with_noise = pred + noise
                
                future_preds.append(pred_with_noise)
                
                # 6. Update sliding window
                window_prices.append(pred_with_noise)
                window_prices.pop(0)

            # Confidence Bands (Using RMSE as a proxy for prediction uncertainty)
            upper_band = [p + (rmse * 1.5) for p in future_preds]
            lower_band = [p - (rmse * 1.5) for p in future_preds]

            # -------- Response --------
            t = yf.Ticker(symbol)
            info = t.info or {}
            currency = info.get("currency") or ""
            currency_symbol = _get_currency_symbol(currency)

            last_date = pd.to_datetime(df["Date"].max())
            future_dates = [(last_date + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, 31)]

            # 30-day history for context
            hist_df = df.tail(30)
            hist_dates = pd.to_datetime(hist_df["Date"]).dt.strftime("%Y-%m-%d").tolist()
            hist_close = _series_from_df_col(hist_df, "Close").round(2).astype(float).tolist()

            # Connection point (Smooth the chart by including the last historical point in the prediction series)
            # This makes the line continuous in Chart.js
            final_future_dates = [hist_dates[-1]] + future_dates
            final_future_preds = [hist_close[-1]] + [round(p, 2) for p in future_preds]
            final_upper = [hist_close[-1]] + [round(p, 2) for p in upper_band]
            final_lower = [hist_close[-1]] + [round(p, 2) for p in lower_band]

            return Response(
                {
                    "company": symbol,
                    "currency_symbol": currency_symbol,
                    "history_30d": {"dates": hist_dates, "close": hist_close},
                    "prediction_30d": {
                        "dates": final_future_dates,
                        "pred": final_future_preds,
                        "upper": final_upper,
                        "lower": final_lower,
                    },
                    "metrics": {
                        "mae": round(mae, 2),
                        "rmse": round(rmse, 2),
                        "r2": round(r2, 4),
                    },
                    "next_day_prediction": round(future_preds[0], 2),
                    "insight": (
                        "Advanced Random Forest model with real-time technical indicator simulation (RSI, MACD, Volatility). "
                        "The prediction uses dynamic iterative forecasting and historical variance to simulate realistic market behavior."
                    ),
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)