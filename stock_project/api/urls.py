from django.urls import path
from .views import RegisterView, PortfolioListView, StockDetailView
from rest_framework_simplejwt.views import TokenObtainPairView

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', TokenObtainPairView.as_view()),
    path('portfolio/', PortfolioListView.as_view()),
    path('stock/<str:symbol>/', StockDetailView.as_view()),
]