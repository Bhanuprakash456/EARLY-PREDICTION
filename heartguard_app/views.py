from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError
from .models import Profile, Assessment
from .serializers import UserSerializer, AssessmentSerializer
from django.conf import settings
import os
import joblib

# Try to load the trained model
MODEL_PATH = os.path.join(settings.BASE_DIR, 'ml_models', 'best_heart_model.pkl')
try:
    ml_model = joblib.load(MODEL_PATH)
except Exception as e:
    print("Warning: Could not load ML model. Ensure train_models.py has been run.", e)
    ml_model = None

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', '').strip()
        
        # Use name as username. If name is empty, fallback to the part before @ in email
        username = name if name else email.split('@')[0]

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # We must manually check email uniqueness since we no longer use it as the unique username
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = name.split(' ')[0] if name else ''
        last_name = ' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else ''

        # Ensure the username is unique to avoid IntegrityError if two users have the same name
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        try:
            user = User.objects.create_user(username=username, email=email, password=password, first_name=first_name, last_name=last_name)
            Profile.objects.create(user=user)
        except IntegrityError:
            return Response({'error': 'An error occurred during registration.'}, status=status.HTTP_400_BAD_REQUEST)
        
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Find the user by email first, since authenticate() requires the actual username
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Email is not registered.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = authenticate(request, username=user_obj.username, password=password)
        
        if user is not None:
            login(request, user)
            return Response(UserSerializer(user).data)
        
        return Response({'error': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Successfully logged out.'})

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        user = request.user
        data = request.data
        name = data.get('name', '').strip()
        if name:
            user.first_name = name.split(' ')[0]
            user.last_name = ' '.join(name.split(' ')[1:]) if len(name.split(' ')) > 1 else ''
            user.save()
            
        profile = user.profile
        if 'date_of_birth' in data:
            profile.date_of_birth = data['date_of_birth'] or None
        if 'pref_units' in data:
            profile.pref_units = data['pref_units']
        if 'pref_notifications' in data:
            profile.pref_notifications = data['pref_notifications']
        if 'pref_sharing' in data:
            profile.pref_sharing = data['pref_sharing']
        if 'profile_photo' in data:
            profile.profile_photo = data['profile_photo']
        profile.save()
            
        return Response(UserSerializer(user).data)

class AssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assessments = Assessment.objects.filter(user=request.user).order_by('created_at')
        serializer = AssessmentSerializer(assessments, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AssessmentSerializer(data=request.data)
        if serializer.is_valid():
            # Get the features in correct order for the ML model
            # ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
            features = [
                serializer.validated_data.get('age', 40),
                serializer.validated_data.get('sex', 1),
                serializer.validated_data.get('cp', 0),
                serializer.validated_data.get('trestbps', 120),
                serializer.validated_data.get('chol', 200),
                serializer.validated_data.get('fbs', 0),
                serializer.validated_data.get('restecg', 0),
                serializer.validated_data.get('thalach', 75),
                serializer.validated_data.get('exang', 0),
                serializer.validated_data.get('oldpeak', 0.0),
                serializer.validated_data.get('slope', 0),
                serializer.validated_data.get('ca', 0),
                serializer.validated_data.get('thal', 0),
            ]
            
            risk_score = 0
            if ml_model is not None:
                # Predict probability of class 1 (heart disease)
                import pandas as pd
                cols = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
                df_features = pd.DataFrame([features], columns=cols)
                
                # Try getting predict_proba
                if hasattr(ml_model, "predict_proba"):
                    probs = ml_model.predict_proba(df_features)
                    risk_score = int(probs[0][1] * 100)
                else:
                    # Fallback if model doesn't support probability
                    pred = ml_model.predict(df_features)
                    risk_score = 100 if pred[0] == 1 else 0
            else:
                # Fallback simple logic if ML model is missing
                risk_score = min(95, max(8, (features[0] - 20) * 0.6 + (features[3] - 110) * 0.3 + (features[4] - 180) * 0.08))

            serializer.save(user=request.user, risk_score=risk_score)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
