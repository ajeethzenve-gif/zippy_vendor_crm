from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from .models import Vendor
from .serializers import VendorSerializer, VendorRegistrationSerializer
from django.shortcuts import get_object_or_404



class RegistrationThrottle(AnonRateThrottle):
    rate = "10/hour"


class VendorRegistrationAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegistrationThrottle]

    def post(self, request, *args, **kwargs):
        serializer = VendorRegistrationSerializer(
            data=request.data,
            context={"request": request, "format": self.format_kwarg, "view": self},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class VendorListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(VendorSerializer(Vendor.objects.all(), many=True, context={"request": request}).data)

    def post(self, request):
        serializer = VendorSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VendorDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        return Response(VendorSerializer(get_object_or_404(Vendor, pk=pk), context={"request": request}).data)

    def patch(self, request, pk):
        serializer = VendorSerializer(get_object_or_404(Vendor, pk=pk), data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
