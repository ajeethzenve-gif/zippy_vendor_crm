from django.urls import path
from .media_views import MediaQueueView, MediaDetailView, MediaFileView

from .views import (
    ProductListCreateAPIView,
    ProductDetailAPIView,
    ProductStockAdjustmentAPIView,
)


urlpatterns = [
    path("media/", MediaQueueView.as_view(), name="media-queue"),
    path("<int:pk>/media/", MediaDetailView.as_view(), name="media-detail"),
    path("media-files/<str:kind>/<int:pk>/", MediaFileView.as_view(), name="media-file"),
    # GET  /api/products/
    # POST /api/products/
    path(
        "",
        ProductListCreateAPIView.as_view(),
        name="product-list-create",
    ),

    # GET    /api/products/<id>/
    # PUT    /api/products/<id>/
    # PATCH  /api/products/<id>/
    # DELETE /api/products/<id>/
    path(
        "<int:pk>/",
        ProductDetailAPIView.as_view(),
        name="product-detail",
    ),

    # POST /api/products/<id>/adjust_stock/
    path(
        "<int:pk>/adjust_stock/",
        ProductStockAdjustmentAPIView.as_view(),
        name="product-adjust-stock",
    ),
]
