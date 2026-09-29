from django.urls import path
from .command_centre_views import CommandCentreOverviewAPIView

urlpatterns = [
    path("overview/", CommandCentreOverviewAPIView.as_view(), name="command-centre-overview"),
]
