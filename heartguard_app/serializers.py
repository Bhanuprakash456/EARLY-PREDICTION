from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Assessment

class UserSerializer(serializers.ModelSerializer):
    profile_photo = serializers.SerializerMethodField()
    date_of_birth = serializers.SerializerMethodField()
    pref_units = serializers.SerializerMethodField()
    pref_notifications = serializers.SerializerMethodField()
    pref_sharing = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile_photo', 'date_of_birth', 'pref_units', 'pref_notifications', 'pref_sharing']

    def get_profile_photo(self, obj):
        return obj.profile.profile_photo if hasattr(obj, 'profile') else None

    def get_date_of_birth(self, obj):
        return obj.profile.date_of_birth if hasattr(obj, 'profile') else None

    def get_pref_units(self, obj):
        return obj.profile.pref_units if hasattr(obj, 'profile') else "Metric (mg/dL, mmHg)"

    def get_pref_notifications(self, obj):
        return obj.profile.pref_notifications if hasattr(obj, 'profile') else "Weekly summary + assessment reminders"

    def get_pref_sharing(self, obj):
        return obj.profile.pref_sharing if hasattr(obj, 'profile') else "Anonymized model improvement only"

class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = '__all__'
        read_only_fields = ['user', 'risk_score', 'created_at']
