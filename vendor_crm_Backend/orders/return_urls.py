from django.urls import path
from .views import (
    ReturnListCreateAPIView,
    ReturnDetailAPIView,
    ReturnStatsAPIView,
    ReturnTransitionAPIView,
)

urlpatterns = [
    path("", ReturnListCreateAPIView.as_view(), name="returns-list-create"),
    path("stats/", ReturnStatsAPIView.as_view(), name="returns-stats"),
    path("<int:pk>/", ReturnDetailAPIView.as_view(), name="returns-detail"),
    path("<int:pk>/transition/", ReturnTransitionAPIView.as_view(), name="returns-transition"),
]
