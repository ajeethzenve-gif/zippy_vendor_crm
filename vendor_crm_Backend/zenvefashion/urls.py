from django.conf import settings
from django.conf.urls.static import static

from django.contrib import admin

from django.urls import (
    path,
    include,
)


urlpatterns = [
    path("api/vendors/", include("vendors.urls")),

    path(
        "admin/",
        admin.site.urls
    ),

    path(
        "api/",
        include("accounts.urls")
    ),



    path(
        "api/products/",
        include("products.urls")
    ),

    path(
        "api/orders/",
        include("orders.urls")
    ),

    path(
        "api/returns/",
        include("orders.return_urls")
    ),

    path(
        "api/settlements/",
        include("orders.settlement_urls")
    ),

    path(
        "api/analytics/",
        include("orders.analytics_urls")
    ),

    path(
        "api/command-centre/",
        include(
            "orders.command_centre_urls"
        )
    ),
    path("api/credits/",
        include("credits.urls")
    ),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
