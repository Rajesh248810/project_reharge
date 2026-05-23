from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from core.views import PlanViewSet, CustomerViewSet, SystemSettingViewSet, WhatsAppLogViewSet, VillageViewSet, auth_login, auth_change_password

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'settings', SystemSettingViewSet, basename='setting')
router.register(r'logs', WhatsAppLogViewSet, basename='log')
router.register(r'villages', VillageViewSet, basename='village')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', auth_login, name='auth_login'),
    path('api/auth/change_password/', auth_change_password, name='auth_change_password'),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
