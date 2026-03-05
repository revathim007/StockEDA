from django.contrib.auth.models import User
from rest_framework import serializers
from .models import MyStock


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user


class MyStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyStock
        fields = ["id", "symbol", "quantity", "added_at"]