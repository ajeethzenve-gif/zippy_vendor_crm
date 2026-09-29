from django.urls import path
from .analytics_views import (
    AnalyticsOverviewAPIView,
    AnalyticsExportAPIView,
)

urlpatterns = [
    path("overview/", AnalyticsOverviewAPIView.as_view(), name="analytics-overview"),
    path("export/", AnalyticsExportAPIView.as_view(), name="analytics-export"),
]
