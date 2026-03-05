from django.urls import path
from .views import (
    ping,
    register,
    login,
    me,
    stock_overview,
    stock_history,
    MyStockListCreateView,
    MyStockDeleteView,
)
from .views import PredictView

urlpatterns = [
    path("ping/", ping),

    # Auth
    path("auth/register/", register),
    path("auth/login/", login),
    path("auth/me/", me),

    # Universal stock data
    path("stock/overview/", stock_overview),
    path("stock/history/", stock_history),

    # My Stocks (user-specific)
    path("mystocks/", MyStockListCreateView.as_view(), name="mystocks"),
    path("mystocks/<int:pk>/", MyStockDeleteView.as_view(), name="mystock-delete"),
    path("predict/", PredictView.as_view(), name="predict"),
]