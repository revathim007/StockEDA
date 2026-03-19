from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    ping,
    register,
    login,
    me,
    stock_overview,
    stock_history,
    MyStockListCreateView,
    MyStockDeleteView,
    PredictView,
    SentimentView,
)
from .pro_prediction_views import ProPredictionView

urlpatterns = [
    path("ping/", ping),

    # Auth
    path("auth/register/", register),
    path("auth/login/", login),
    path("auth/me/", me),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Universal stock data
    path("stock/overview/", stock_overview),
    path("stock/history/", stock_history),

    # My Stocks
    path("mystocks/", MyStockListCreateView.as_view(), name="mystocks"),
    path("mystocks/<int:pk>/", MyStockDeleteView.as_view(), name="mystock-delete"),

    # Prediction
    path("predict/", PredictView.as_view(), name="predict"),
    path("pro-predict/", ProPredictionView.as_view(), name="pro-predict"),
    path("sentiment/", SentimentView.as_view(), name="sentiment"),
]