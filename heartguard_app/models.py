from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_photo = models.TextField(null=True, blank=True)
    pref_units = models.CharField(max_length=50, default="Metric (mg/dL, mmHg)")
    pref_notifications = models.CharField(max_length=100, default="Weekly summary + assessment reminders")
    pref_sharing = models.CharField(max_length=100, default="Anonymized model improvement only")
    
    def __str__(self):
        return f"{self.user.username}'s Profile"

class Assessment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessments')
    age = models.IntegerField()
    sex = models.IntegerField()
    cp = models.IntegerField()
    trestbps = models.IntegerField()
    chol = models.IntegerField()
    fbs = models.IntegerField()
    restecg = models.IntegerField()
    thalach = models.IntegerField()
    exang = models.IntegerField()
    oldpeak = models.FloatField()
    slope = models.IntegerField()
    ca = models.IntegerField()
    thal = models.IntegerField()
    risk_score = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Assessment for {self.user.username} on {self.created_at.strftime('%Y-%m-%d')}"
