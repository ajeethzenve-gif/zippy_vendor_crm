from django.urls import path
from .views import (
    SettlementListCreateAPIView,
    SettlementDetailAPIView,
    SettlementStatsAPIView,
    SettlementTransitionAPIView,
    SettlementGenerateAPIView,
)

urlpatterns = [
    path("", SettlementListCreateAPIView.as_view(), name="settlement-list-create"),
    path("stats/", SettlementStatsAPIView.as_view(), name="settlement-stats"),
    path("generate/", SettlementGenerateAPIView.as_view(), name="settlement-generate"),
    path("<int:pk>/", SettlementDetailAPIView.as_view(), name="settlement-detail"),
    path("<int:pk>/transition/", SettlementTransitionAPIView.as_view(), name="settlement-transition"),
]
