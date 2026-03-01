from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import Portfolio, Stock
from .serializers import RegisterSerializer, PortfolioSerializer, StockSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
import yfinance as yf


# Register
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


# Portfolio List
class PortfolioListView(generics.ListCreateAPIView):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Stock Detail API
class StockDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, symbol):
        try:
            stock = yf.Ticker(symbol)

            history = stock.history(period="1y")

            if history.empty:
                return Response({"error": "Invalid stock symbol"}, status=400)

            info = stock.info

            current_price = info.get("currentPrice") or history["Close"].iloc[-1]
            pe_ratio = info.get("trailingPE")
            market_cap = info.get("marketCap")

            data = {
                "price": current_price,
                "pe_ratio": pe_ratio,
                "market_cap": market_cap,
                "close": history["Close"].tolist(),
                "high": history["High"].tolist(),
                "low": history["Low"].tolist(),
                "dates": history.index.strftime('%Y-%m-%d').tolist()
            }

            return Response(data)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # def get(self, request, symbol):
    #     stock = yf.Ticker(symbol)
    #     info = stock.info
    #     history = stock.history(period="1y")

    #     data = {
    #         "price": info.get("currentPrice"),
    #         "pe_ratio": info.get("trailingPE"),
    #         "market_cap": info.get("marketCap"),
    #         "history": history["Close"].tolist()
    #     }

        # return Response(data)