from django.db import models
from django.contrib.auth.models import User

class MyStock(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="my_stocks")
    symbol = models.CharField(max_length=20)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.symbol}"