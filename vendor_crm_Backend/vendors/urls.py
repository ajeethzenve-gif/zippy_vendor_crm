from django.urls import path
from .views import VendorRegistrationAPIView, VendorListAPIView, VendorDetailAPIView

from .portal_views import VendorPortalView, VendorNotificationsReadView, VendorAccountView

urlpatterns = [
    path("<int:pk>/portal-dashboard/", VendorPortalView.as_view()),
    path("<int:pk>/portal-dashboard/mark-read/", VendorNotificationsReadView.as_view()),
    path("<int:pk>/account-details/", VendorAccountView.as_view()),
    path("register/", VendorRegistrationAPIView.as_view(), name="vendor-register"),
    path("", VendorListAPIView.as_view(), name="vendor-list"),
    path("<int:pk>/", VendorDetailAPIView.as_view(), name="vendor-detail"),
]
