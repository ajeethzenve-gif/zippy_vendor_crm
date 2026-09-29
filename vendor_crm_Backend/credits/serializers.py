from rest_framework import serializers

from .models import (
    OfflineFashionCredit,
    OnlineFashionCredit,
    DesignerCreditWallet,
    DesignerCreditStatement,
)


class OfflineFashionCreditSerializer(serializers.ModelSerializer):
    savings_amount = serializers.ReadOnlyField()

    class Meta:
        model = OfflineFashionCredit
        fields = "__all__"


# Backwards compatibility alias
offlinecreditsSerializer = OfflineFashionCreditSerializer


class OnlineFashionCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlineFashionCredit
        fields = "__all__"


class DesignerCreditStatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignerCreditStatement
        fields = "__all__"


class DesignerCreditWalletSerializer(serializers.ModelSerializer):
    total_balance = serializers.ReadOnlyField()

    class Meta:
        model = DesignerCreditWallet
        fields = "__all__"


from .models import OnlineVendorCredit


class OnlineVendorCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlineVendorCredit
        fields = ["id", "code", "name", "credit_points", "sku_limit"]
