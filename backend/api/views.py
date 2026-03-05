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
        df["MA20"] = df["Close"].rolling(20).mean()
        df["MA50"] = df["Close"].rolling(50).mean()

        dates = [d.strftime("%Y-%m-%d") for d in df.index]
        close = [float(x) for x in df["Close"].tolist()]
        ma20 = [None if pd.isna(x) else float(x) for x in df["MA20"].tolist()]
        ma50 = [None if pd.isna(x) else float(x) for x in df["MA50"].tolist()]
        volume = [None if pd.isna(x) else float(x) for x in df["Volume"].tolist()]

        return JsonResponse(
            {
                "symbol": symbol,
                "period": period,
                "dates": dates,
                "close": close,
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

class PredictView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbol = (request.query_params.get("symbol") or "").strip()
        if not symbol:
            return Response({"error": "Symbol required"}, status=400)

        try:
            # -------- Download stock data --------
            df = yf.download(symbol, period="1y", progress=False)

            if df is None or df.empty:
                return Response({"error": "Invalid symbol or no data"}, status=400)

            # FIX 1: flatten MultiIndex columns (prevents df["Close"] being a DataFrame)
            df = _flatten_yf_columns(df)

            # FIX 2: ensure Date column exists
            df = _ensure_date_column(df)

            # Make sure required columns exist
            for col in ["Close", "Volume"]:
                if col not in df.columns:
                    return Response({"error": f"Missing column from data: {col}"}, status=400)

            close_s = _series_from_df_col(df, "Close")
            vol_s = _series_from_df_col(df, "Volume")

            # Drop rows with no close
            mask = close_s.notna()
            df = df.loc[mask].copy()
            close_s = _series_from_df_col(df, "Close")
            vol_s = _series_from_df_col(df, "Volume")

            # -------- Linear Regression --------
            df["Day"] = np.arange(len(df), dtype=float)
            X = df[["Day"]].values
            y = close_s.values.astype(float)

            lr = LinearRegression()
            lr.fit(X, y)
            lr_pred = lr.predict(X)

            # -------- Logistic Regression --------
            # Predict whether next day close is higher than today
            df["Up"] = (close_s.shift(-1) > close_s).astype(int)

            # Remove last row because it has no "next day"
            df_log = df.iloc[:-1].copy()
            X_log = _series_from_df_col(df_log, "Close").values.reshape(-1, 1).astype(float)
            y_log = df_log["Up"].values.astype(int)

            log = LogisticRegression(max_iter=1000)
            log.fit(X_log, y_log)

            signal = log.predict(X_log)
            prob = log.predict_proba(X_log)[:, 1]

            # Pad last value so frontend lengths can match dates/close if needed
            signal_full = signal.tolist() + [signal.tolist()[-1] if len(signal) else 0]
            prob_full = prob.round(3).tolist() + [float(prob[-1]) if len(prob) else 0.0]

            # -------- KMeans Clustering --------
            X_cluster = np.column_stack(
                [
                    _series_from_df_col(df, "Close").fillna(0).values.astype(float),
                    _series_from_df_col(df, "Volume").fillna(0).values.astype(float),
                ]
            )

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_cluster)

            kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(X_scaled)

            points = [
                {"x": float(X_scaled[i, 0]), "y": float(X_scaled[i, 1]), "cluster": int(clusters[i])}
                for i in range(len(X_scaled))
            ]

            centers = [{"x": float(c[0]), "y": float(c[1])} for c in kmeans.cluster_centers_]

            # -------- Response --------
            dates = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d").tolist()
            close_list = _series_from_df_col(df, "Close").round(2).astype(float).tolist()
            lr_list = np.round(lr_pred, 2).astype(float).tolist()

            return Response(
                {
                    "company": symbol,
                    "dates": dates,
                    "close": close_list,
                    "linear_regression": {"pred": lr_list},
                    "logistic_regression": {"signal": signal_full, "prob": prob_full},
                    "kmeans": {"points": points, "centers": centers},
                    "insight": (
                        "AI Analysis: Market clusters detected. Logistic model shows probability of upward movement. "
                        "Linear regression indicates price trend direction."
                    ),
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)