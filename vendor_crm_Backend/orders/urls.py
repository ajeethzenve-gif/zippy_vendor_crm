from django.urls import path
from .views import (
    OrderListCreateAPIView,
    OrderDetailAPIView,
    OrderStatsAPIView,
    OrderTransitionAPIView,
    ReturnListCreateAPIView,
    ReturnDetailAPIView,
    ReturnStatsAPIView,
    ReturnTransitionAPIView,
    SettlementListCreateAPIView,
    SettlementDetailAPIView,
    SettlementStatsAPIView,
    SettlementTransitionAPIView,
    SettlementGenerateAPIView,
)

urlpatterns = [
    path("returns/", ReturnListCreateAPIView.as_view(), name="return-list-create"),
    path("returns/stats/", ReturnStatsAPIView.as_view(), name="return-stats"),
    path("returns/<int:pk>/", ReturnDetailAPIView.as_view(), name="return-detail"),
    path("returns/<int:pk>/transition/", ReturnTransitionAPIView.as_view(), name="return-transition"),
    path("settlements/", SettlementListCreateAPIView.as_view(), name="order-settlement-list-create"),
    path("settlements/stats/", SettlementStatsAPIView.as_view(), name="order-settlement-stats"),
    path("settlements/generate/", SettlementGenerateAPIView.as_view(), name="order-settlement-generate"),
    path("settlements/<int:pk>/", SettlementDetailAPIView.as_view(), name="order-settlement-detail"),
    path("settlements/<int:pk>/transition/", SettlementTransitionAPIView.as_view(), name="order-settlement-transition"),
    path("", OrderListCreateAPIView.as_view(), name="order-list-create"),
    path("stats/", OrderStatsAPIView.as_view(), name="order-stats"),
    path("<int:pk>/", OrderDetailAPIView.as_view(), name="order-detail"),
    path("<int:pk>/transition/", OrderTransitionAPIView.as_view(), name="order-transition"),
]

