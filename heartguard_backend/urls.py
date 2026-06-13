from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.views.decorators.csrf import ensure_csrf_cookie

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('heartguard_app.urls')),
    
    # Frontend Routes
    path('', TemplateView.as_view(template_name='index.html'), name='index'),
    path('index.html', TemplateView.as_view(template_name='index.html')),
    path('login.html', ensure_csrf_cookie(TemplateView.as_view(template_name='login.html'))),
    path('register.html', ensure_csrf_cookie(TemplateView.as_view(template_name='register.html'))),
    path('dashboard.html', TemplateView.as_view(template_name='dashboard.html')),
    path('assessment.html', TemplateView.as_view(template_name='assessment.html')),
    path('result.html', TemplateView.as_view(template_name='result.html')),
    path('reports.html', TemplateView.as_view(template_name='reports.html')),
    path('profile.html', TemplateView.as_view(template_name='profile.html')),
]
