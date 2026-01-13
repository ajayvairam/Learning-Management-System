from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from lms_backend.views import (
    student_dashboard,
    UserViewSet,
    TeamViewSet,
    CategoryViewSet,
    CourseViewSet,
    VideoViewSet,
    QuizViewSet,
    EnrollmentViewSet,
    UserAnalyticsView,
    admin_dashboard_stats,
    add_team_member,
    remove_team_member,
    assign_courses_team,
    user_analytics,
    course_analytics,
    team_analytics,
    student_performance,
)

# Initialize the router
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'videos', VideoViewSet)
router.register(r'quizzes', QuizViewSet)
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API Routes
    path('api/', include(router.urls)),
    path('api/student/dashboard/', student_dashboard, name='student-dashboard'),

    # Authentication
    path(
        'api/token/',
        TokenObtainPairView.as_view(permission_classes=[AllowAny]),
        name='token_obtain_pair'
    ),
    path(
        'api/token/refresh/',
        TokenRefreshView.as_view(permission_classes=[AllowAny]),
        name='token_refresh'
    ),

    # Analytics and Dashboards
    path('api/analytics/users/<int:user_id>/', UserAnalyticsView.as_view(), name='user-analytics'),
    path('api/admin/dashboard-stats/', admin_dashboard_stats),

    # Team member management
    path('api/teams/<int:team_id>/members/', add_team_member, name='add_team_member'),
    path('api/teams/<int:team_id>/members/<int:user_id>/', remove_team_member, name='remove_team_member'),
    path('api/teams/<int:team_id>/assign_courses/', assign_courses_team, name='assign_courses_to_team'),

    # Analytics endpoints
    path('api/analytics/users/', user_analytics),
    path('api/analytics/courses/', course_analytics),
    path('api/analytics/teams/', team_analytics),

    # Student performance
    path('api/student/performance/', student_performance, name='student-performance'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)