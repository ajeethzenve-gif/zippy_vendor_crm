
from django.urls import path
from .views import (
    OfflineFashionListAPI,
    OnlineVendorCreditListAPIView,
    DesignerCreditsAPIView,
    BuyOfflineCreditPackAPIView,
)

urlpatterns = [
    path("vendor-plans/", OnlineVendorCreditListAPIView.as_view(), name="online-vendor-plans"),
    path('', OfflineFashionListAPI.as_view(), name='offline_fashion_list'),
    path('vendor/<int:designer_id>/', DesignerCreditsAPIView.as_view(), name='designer_credits'),
    path('buy-offline-pack/', BuyOfflineCreditPackAPIView.as_view(), name='buy_offline_pack'),
]

