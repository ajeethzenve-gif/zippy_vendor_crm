from django.urls import path
from .views import VendorRegistrationAPIView, VendorListAPIView, VendorDetailAPIView
from .workspace_api import VendorKYCLinkView, VendorLoginDetailsView

from .portal_views import VendorPortalView, VendorNotificationsReadView, VendorAccountView, VendorProfileView

from .workspace_api import WorkspaceVendors, SocialPostList, SocialPostDetail, VendorKYCList, VendorKYCDetail, VendorKYCRequestView, VendorKYCSubmissionView

urlpatterns = [
    path("<int:pk>/login-details/", VendorLoginDetailsView.as_view()),
    path("kyc-link/", VendorKYCLinkView.as_view()),
    path("<int:pk>/kyc-request/", VendorKYCRequestView.as_view()),
    path("<int:pk>/kyc-submission/", VendorKYCSubmissionView.as_view()),
    path("workspace-vendors/", WorkspaceVendors.as_view()),
    path("social-posts/", SocialPostList.as_view()),
    path("social-posts/<int:pk>/", SocialPostDetail.as_view()),
    path("kyc/", VendorKYCList.as_view()),
    path("<int:pk>/kyc/", VendorKYCDetail.as_view()),
    path("<int:pk>/profile/", VendorProfileView.as_view(), name="vendor-profile"),
    path("<int:pk>/portal-dashboard/", VendorPortalView.as_view()),
    path("<int:pk>/portal-dashboard/mark-read/", VendorNotificationsReadView.as_view()),
    path("<int:pk>/account-details/", VendorAccountView.as_view()),
    path("register/", VendorRegistrationAPIView.as_view(), name="vendor-register"),
    path("", VendorListAPIView.as_view(), name="vendor-list"),
    path("<int:pk>/", VendorDetailAPIView.as_view(), name="vendor-detail"),
]
