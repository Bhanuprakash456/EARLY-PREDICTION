from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeView, AssessmentView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('assess/', AssessmentView.as_view(), name='assess'),
]
