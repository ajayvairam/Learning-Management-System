from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Q, F, Max
from django.db.models.functions import TruncMonth, TruncDate
from django.utils.timezone import now, timedelta
from django.db import transaction
from moviepy import VideoFileClip
import os
from tempfile import NamedTemporaryFile

from .models import (
    User, Team, Category, Course, Video, Quiz, Question,
    Enrollment, QuizAttempt, VideoProgress
)
from .serializers import (
    UserSerializer, TeamSerializer, CategorySerializer,
    CourseSerializer, VideoSerializer, QuizSerializer,
    QuestionSerializer, EnrollmentSerializer, QuizAttemptSerializer,
    VideoProgressSerializer, CourseListSerializer, TeamDetailSerializer, StudentDashboardSerializer, AdminDashboardSerializer
)
from .utils import (
    calculate_course_progress, get_user_analytics,
    get_course_analytics, get_team_analytics,
    check_course_completion, update_enrollment_progress
)

User = get_user_model()

# ==================== Analytics Endpoints ====================
@api_view(['GET', 'PUT', 'POST', 'DELETE'])
def assign_courses_team(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        course_ids = request.data.get('course_ids', [])
        if not isinstance(course_ids, list):
            return Response({"detail": "course_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)
        courses = Course.objects.filter(id__in=course_ids)
        if courses.count() != len(course_ids):
            return Response({"detail": "Some courses not found."}, status=status.HTTP_400_BAD_REQUEST)
        # Remove enrollments for courses being unassigned
        old_course_ids = set(team.courses.values_list('id', flat=True))
        new_course_ids = set(courses.values_list('id', flat=True))
        removed_course_ids = old_course_ids - new_course_ids
        if removed_course_ids:
            with transaction.atomic():
                Enrollment.objects.filter(
                    user__team=team,
                    course_id__in=removed_course_ids
                ).delete()
        team.courses.set(courses)
        team.save()
        return Response({"detail": "Courses assigned successfully."})

    elif request.method == 'DELETE':
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        team.courses.remove(course)
        team.save()
        # Remove enrollments for all team members
        Enrollment.objects.filter(user__team=team, course=course).delete()
        return Response({"detail": f"Course {course.title} removed from team and enrollments deleted."})
@api_view(['GET'])
def user_analytics(request):
    today = now().date()
    last_30_days = today - timedelta(days=30)
    registration_trend = (
        User.objects.filter(date_joined__date__gte=last_30_days)
        .annotate(date=TruncDate('date_joined'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    data = {
        'registrationTrend': [
            {'date': item['date'].strftime('%Y-%m-%d'), 'count': item['count']}
            for item in registration_trend
        ],
        'adminCount': User.objects.filter(user_type='ADMIN').count(),
        'studentCount': User.objects.filter(user_type='STUDENT').count(),
    }
    return Response(data)

@api_view(['GET'])
def course_analytics(request):
    top_courses_qs = (
        Course.objects.annotate(
            enrollments=Count('enrollment'),
            completions=Count('enrollment', filter=Q(enrollment__progress='COMPLETED'))
        )
        .order_by('-enrollments')[:5]
    )
    top_courses = [
        {
            'title': course.title,
            'enrollments': course.enrollments,
            'completions': course.completions,
        }
        for course in top_courses_qs
    ]

    completion_time = (
        Enrollment.objects.filter(progress='COMPLETED', completed_on__isnull=False)
        .annotate(month=TruncMonth('completed_on'))
        .values('month')
        .annotate(avgDays=Avg(F('completed_on') - F('enrolled_on')))
        .order_by('month')
    )
    completion_time_data = [
        {'month': item['month'].strftime('%Y-%m'), 'avgDays': item['avgDays'].days if item['avgDays'] else 0}
        for item in completion_time
    ]

    quiz_scores = QuizAttempt.objects.values_list('score', flat=True)
    quiz_stats = {
        'excellent': sum(1 for s in quiz_scores if s >= 90),
        'good': sum(1 for s in quiz_scores if 70 <= s < 90),
        'average': sum(1 for s in quiz_scores if 50 <= s < 70),
        'poor': sum(1 for s in quiz_scores if s < 50),
    }

    data = {
        'topCourses': top_courses,
        'completionTimeTrend': completion_time_data,
        'quizStats': quiz_stats,
    }
    return Response(data)

@api_view(['GET'])
def team_analytics(request):
    teams = Team.objects.all()
    performance_data = []
    completion_rates = []

    for team in teams:
        users = team.user_set.all()
        user_ids = users.values_list('id', flat=True)
        avg_score = QuizAttempt.objects.filter(user_id__in=user_ids).aggregate(avg=Avg('score'))['avg'] or 0
        total_enrollments = Enrollment.objects.filter(user_id__in=user_ids).count()
        completed = Enrollment.objects.filter(user_id__in=user_ids, progress='COMPLETED').count()
        completion_rate = (completed / total_enrollments) * 100 if total_enrollments else 0

        performance_data.append({
            'name': team.name,
            'avgScore': round(avg_score, 2),
        })
        completion_rates.append({
            'name': team.name,
            'completionRate': round(completion_rate, 2),
        })

    return Response({
        'teamPerformance': performance_data,
        'completionRates': completion_rates,
    })

# ==================== User Views ====================

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# ==================== Team Views ====================

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

    def get_serializer_class(self):
        if self.action in ['retrieve', 'list']:
            return TeamDetailSerializer
        return TeamSerializer

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        team = self.get_object()
        analytics = get_team_analytics(team)
        return Response(analytics)

# Add/Remove Team Member
@api_view(['POST'])
def add_team_member(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    user.team = team
    user.save()
    return Response({"detail": f"User {user.username} added to team {team.name}."}, status=status.HTTP_200_OK)

@api_view(['DELETE'])
def remove_team_member(request, team_id, user_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    if user.team_id != team.id:
        return Response({"detail": "User is not in this team."}, status=status.HTTP_400_BAD_REQUEST)
    user.team = None
    user.save()
    return Response({"detail": f"User {user.username} removed from team {team.name}."}, status=status.HTTP_200_OK)

# Update Team (PATCH/PUT, assign courses)
@api_view(['PUT', 'PATCH'])
def update_team(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({'error': 'Team not found'}, status=404)
    serializer = TeamDetailSerializer(team, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

# Assign Courses to Team
@api_view(['GET', 'PUT', 'POST', 'DELETE'])
def assign_courses_team(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = TeamDetailSerializer(team, context={'request': request})
        return Response(serializer.data)
    elif request.method == 'PUT':
        course_ids = request.data.get('course_ids', [])
        if not isinstance(course_ids, list):
            return Response({"detail": "course_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)
        courses = Course.objects.filter(id__in=course_ids)
        if courses.count() != len(course_ids):
            return Response({"detail": "Some courses not found."}, status=status.HTTP_400_BAD_REQUEST)
        team.courses.set(courses)
        team.save()
        return Response({"detail": "Courses assigned successfully."})
    elif request.method == 'POST':
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        team.courses.add(course)
        team.save()
        return Response({"detail": f"Course {course.title} added to team."})
    elif request.method == 'DELETE':
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        team.courses.remove(course)
        team.save()
        return Response({"detail": f"Course {course.title} removed from team."})

# ==================== Category Views ====================

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

# ==================== Course Views ====================

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.prefetch_related('videos', 'quiz_set', 'category').all()

        # Restrict for students
        if user.is_authenticated and hasattr(user, 'user_type') and user.user_type == 'STUDENT':
            if user.team:
                queryset = queryset.filter(teams=user.team)
            else:
                queryset = queryset.none()

        # Filtering logic (category, search, etc) as before
        category_id = self.request.query_params.get('category')
        if category_id:
            if "," in category_id:
                category_ids = [int(cid) for cid in category_id.split(",") if cid.isdigit()]
                queryset = queryset.filter(category__id__in=category_ids)
            else:
                queryset = queryset.filter(category__id=category_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        # Add sorting here as needed
        return queryset.distinct()
    @action(detail=True, methods=['get'])
    def enrollment_status(self, request, pk=None):
        course = self.get_object()
        user = request.user
        try:
            enrollment = Enrollment.objects.get(user=user, course=course)
            data = {
                'is_enrolled': True,
                'enrollment_id': enrollment.id,
                'progress': enrollment.progress,
                'enrolled_on': enrollment.enrolled_on,
                'completed_on': enrollment.completed_on,
                'course_progress': calculate_course_progress(user, course)
            }
        except Enrollment.DoesNotExist:
            data = {
                'is_enrolled': False,
                'enrollment_id': None,
                'progress': None,
                'enrolled_on': None,
                'completed_on': None,
                'course_progress': 0
            }
        return Response(data)

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        course = self.get_object()
        user = request.user

        # Restrict enrollment to assigned courses for students
        if hasattr(user, 'user_type') and user.user_type == 'STUDENT':
            if not user.team or not course.teams.filter(id=user.team.id).exists():
                return Response({'error': 'You are not allowed to enroll in this course.'}, status=status.HTTP_403_FORBIDDEN)

        enrollment, created = Enrollment.objects.get_or_create(
            user=user,
            course=course
        )
        if created:
            return Response({'message': 'Enrolled successfully'}, status=status.HTTP_201_CREATED)
        return Response({'message': 'Already enrolled'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        course = self.get_object()
        analytics = get_course_analytics(course)
        return Response(analytics)

    @action(detail=True, methods=['get'])
    def videos(self, request, pk=None):
        course = self.get_object()
        videos = course.videos.order_by('order').all()
        serializer = VideoSerializer(videos, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def progress(self, request, pk=None):
        course = self.get_object()
        user = request.user
        progress_data = {}
        for video in course.videos.all():
            vp = VideoProgress.objects.filter(user=user, video=video).first()
            progress_data[video.id] = {
                "watched": getattr(vp, "watched", False),
                "quiz_completed": getattr(vp, "quiz_completed", False),
            }
        total_videos = course.videos.count()
        completed_videos = sum(
            1 for v in progress_data.values() if v["watched"] and v["quiz_completed"]
        )
        overall_progress = (completed_videos / total_videos) * 100 if total_videos else 0
        final_quiz = course.quiz_set.filter(is_final=True).first()
        final_quiz_passed = False
        if final_quiz:
            final_quiz_passed = QuizAttempt.objects.filter(
                user=user, quiz=final_quiz, is_passed=True
            ).exists()
        return Response({
            **progress_data,
            "overall_progress": overall_progress,
            "final_quiz_passed": final_quiz_passed,
        })

    @action(detail=True, methods=['get'])
    def detailed_progress(self, request, pk=None):
        course = self.get_object()
        enrollment = get_object_or_404(
            Enrollment,
            user=request.user,
            course=course
        )
        video_progress = {}
        for video in course.videos.all():
            video_quiz = Quiz.objects.filter(video=video).first()
            progress = VideoProgress.objects.filter(
                user=request.user,
                video=video
            ).first()
            quiz_completed = False
            if video_quiz:
                quiz_completed = QuizAttempt.objects.filter(
                    user=request.user,
                    quiz=video_quiz,
                    is_passed=True
                ).exists()
            video_progress[video.id] = {
                'watched': progress.watched if progress else False,
                'watched_duration': progress.watched_duration if progress else 0,
                'has_quiz': bool(video_quiz),
                'quiz_id': video_quiz.id if video_quiz else None,
                'quiz_completed': quiz_completed
            }
        final_quiz = Quiz.objects.filter(course=course, is_final=True).first()
        final_quiz_passed = False
        if final_quiz:
            final_quiz_passed = QuizAttempt.objects.filter(
                user=request.user,
                quiz=final_quiz,
                is_passed=True
            ).exists()
        return Response({
            'enrollment_status': enrollment.progress,
            'completion_date': enrollment.completed_on,
            'video_progress': video_progress,
            'overall_progress': calculate_course_progress(request.user, course),
            'final_quiz_passed': final_quiz_passed,
            'has_final_quiz': bool(final_quiz),
            'total_video_quizzes': Quiz.objects.filter(video__course=course).count(),
            'passed_video_quizzes': QuizAttempt.objects.filter(
                user=request.user,
                quiz__video__course=course,
                is_passed=True
            ).count()
        })       

# ==================== Video Views ====================

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        video_file = request.FILES.get('video_file')
        if not video_file:
            return Response({'error': 'No video file provided'}, status=status.HTTP_400_BAD_REQUEST)
        with NamedTemporaryFile(suffix='.'+video_file.name.split('.')[-1], delete=False) as temp_file:
            for chunk in video_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        try:
            video_clip = VideoFileClip(temp_file_path)
            duration = int(video_clip.duration)
            video_clip.close()
            request.data._mutable = True
            request.data['duration'] = duration
            request.data._mutable = False
            response = super().create(request, *args, **kwargs)
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    def update(self, request, *args, **kwargs):
        video_file = request.FILES.get('video_file')
        if video_file:
            with NamedTemporaryFile(suffix='.'+video_file.name.split('.')[-1], delete=False) as temp_file:
                for chunk in video_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            try:
                video_clip = VideoFileClip(temp_file_path)
                duration = int(video_clip.duration)
                video_clip.close()
                request.data._mutable = True
                request.data['duration'] = duration
                request.data._mutable = False
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
        response = super().update(request, *args, **kwargs)
        return response

    @action(detail=True, methods=['post'], url_path='watch', permission_classes=[IsAuthenticated])
    def watch(self, request, pk=None):
        video = self.get_object()
        watched_duration = int(request.data.get('watched_duration', 0))
        progress, created = VideoProgress.objects.get_or_create(
            user=request.user,
            video=video
        )
        if watched_duration > progress.watched_duration:
            progress.watched_duration = watched_duration
            progress.save()
        return Response({'watched_duration': progress.watched_duration}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        video = self.get_object()
        progress = VideoProgress.objects.filter(
            user=request.user,
            video=video
        ).first()
        return Response({
            'watched': getattr(progress, 'watched', False),
            'watched_duration': getattr(progress, 'watched_duration', 0),
            'quiz_completed': getattr(progress, 'quiz_completed', False)
        })

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        video = self.get_object()
        progress, created = VideoProgress.objects.get_or_create(
            user=request.user,
            video=video
        )
        progress.watched = True
        progress.watched_duration = video.duration
        progress.save()
        quiz = Quiz.objects.filter(video=video).first()
        return Response({
            'watched': True,
            'has_quiz': bool(quiz),
            'quiz_id': quiz.id if quiz else None,
            'quiz_completed': progress.quiz_completed
        })

# ==================== Quiz Views ====================

class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course', None)
        if course_id is not None:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    @action(detail=True, methods=['get'])
    def can_attempt(self, request, pk=None):
        quiz = self.get_object()
        if quiz.video:
            progress = VideoProgress.objects.filter(
                user=request.user,
                video=quiz.video,
                watched=True
            ).exists()
            if not progress:
                return Response({
                    'can_attempt': False,
                    'reason': 'Must watch the video first'
                })
        if quiz.is_final:
            all_videos = quiz.course.videos.all()
            completed_videos = VideoProgress.objects.filter(
                user=request.user,
                video__in=all_videos,
                watched=True,
                quiz_completed=True
            ).count()
            if completed_videos < all_videos.count():
                return Response({
                    'can_attempt': False,
                    'reason': 'Must complete all videos and their quizzes first'
                })
        return Response({'can_attempt': True})

    @action(detail=True, methods=['post'])
    def attempt(self, request, pk=None):
        quiz = self.get_object()
        answers = request.data.get('answers', {})
        can_attempt = self.can_attempt(request, pk).data.get('can_attempt')
        if not can_attempt:
            return Response(
                {'error': 'Cannot attempt quiz yet'},
                status=status.HTTP_403_FORBIDDEN
            )
        total_questions = quiz.questions.count()
        correct_answers = 0
        for question_id, selected_choice in answers.items():
            question = quiz.questions.get(id=question_id)
            if question.choices[selected_choice].get('is_correct', False):
                correct_answers += 1
        score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        is_passed = score >= quiz.passing_score
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            score=score,
            answers=answers,
            is_passed=is_passed
        )
        if quiz.video and is_passed:
            progress = VideoProgress.objects.get(
                user=request.user,
                video=quiz.video
            )
            progress.quiz_completed = True
            progress.save()
        enrollment = Enrollment.objects.get(
            user=request.user,
            course=quiz.course
        )
        update_enrollment_progress(enrollment)
        return Response({
            'score': score,
            'is_passed': is_passed,
            'passing_score': quiz.passing_score,
            'attempt_id': attempt.id
        })

# ==================== Enrollment Views ====================

class EnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        # Only return enrollments for the logged-in user
        return Enrollment.objects.filter(user=self.request.user)

# ==================== Dashboard / Stats Views ====================

class UserAnalyticsView(generics.RetrieveAPIView):
    def get(self, request, *args, **kwargs):
        user_id = self.kwargs.get('user_id')
        user = get_object_or_404(User, id=user_id) if user_id else request.user
        analytics = get_user_analytics(user)
        return Response(analytics)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard(request):
    serializer = StudentDashboardSerializer(request.user)
    return Response(serializer.data)

@api_view(['GET'])
def admin_dashboard_stats(request):
    data = {
        "totalUsers": User.objects.count(),
        "activeCourses": Course.objects.filter(is_active=True).count(),
        "totalTeams": Team.objects.count(),
        "totalEnrollments": Enrollment.objects.count(),
        "recentEnrollments": [
            {
                "id": e.id,
                "user": {"username": e.user.username},
                "course": {"title": e.course.title},
                "enrolled_on": e.enrolled_on,
            }
            for e in Enrollment.objects.select_related('user', 'course').order_by('-enrolled_on')[:5]
        ],
        "recentCompletions": [
            {
                "id": e.id,
                "user": {"username": e.user.username},
                "course": {"title": e.course.title},
                "completed_on": e.completed_on,
            }
            for e in Enrollment.objects.filter(progress='COMPLETED', completed_on__isnull=False)
              .select_related('user', 'course')
              .order_by('-completed_on')[:5]
        ],
    }
    return Response(data)

# ==================== Student Performance ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_performance(request):
    user = request.user
    enrollments = Enrollment.objects.filter(user=user)
    def get_progress(e):
        if e.progress == "COMPLETED":
            return 100
        elif e.progress == "IN_PROGRESS":
            try:
                from .utils import calculate_course_progress
                return calculate_course_progress(user, e.course)
            except:
                return 0
        return 0

    overall_progress = (
        sum(get_progress(e) for e in enrollments) / enrollments.count()
        if enrollments.exists() else 0
    )

    avg_quiz_score = (
        QuizAttempt.objects.filter(user=user).aggregate(avg=Avg("score"))["avg"] or 0
    )

    completed_courses_count = enrollments.filter(progress="COMPLETED").count()

    progress_history = []
    for i in range(30, -1, -1):
        day = now().date() - timedelta(days=i)
        daily_enrollments = enrollments.filter(enrolled_on__date=day)
        progress = (
            sum(get_progress(e) for e in daily_enrollments) / daily_enrollments.count()
            if daily_enrollments.exists() else 0
        )
        progress_history.append({"date": str(day), "progress": progress})

    quiz_attempts = QuizAttempt.objects.filter(user=user)
    quiz_stats = {
        "excellent": quiz_attempts.filter(score__gte=90).count(),
        "good": quiz_attempts.filter(score__gte=70, score__lt=90).count(),
        "average": quiz_attempts.filter(score__gte=50, score__lt=70).count(),
        "poor": quiz_attempts.filter(score__lt=50).count(),
    }

    recent_quizzes = [
        {
            "id": qa.id,
            "title": qa.quiz.title if qa.quiz else "",
            "score": qa.score,
            "passed": qa.is_passed,
            "date": qa.attempted_on,
        }
        for qa in quiz_attempts.order_by("-attempted_on")[:5]
    ]

    course_progress = [
        {
            "title": e.course.title,
            "progress": get_progress(e),
        }
        for e in enrollments.select_related("course")
    ]

    course_details = []
    for e in enrollments.select_related("course"):
        course = e.course
        videos = course.videos.all()
        total_videos = videos.count()
        videos_completed = VideoProgress.objects.filter(
            user=user, video__in=videos, watched=True
        ).count()
        quizzes = course.quiz_set.all()
        total_quizzes = quizzes.count()
        quizzes_passed = QuizAttempt.objects.filter(
            user=user, quiz__in=quizzes, is_passed=True
        ).count()
        start_date = e.enrolled_on
        last_activity = (
            VideoProgress.objects.filter(user=user, video__in=videos)
            .aggregate(last=Max("last_watched"))["last"]
            or e.enrolled_on
        )
        course_details.append(
            {
                "id": course.id,
                "title": course.title,
                "progress": get_progress(e),
                "videos_completed": videos_completed,
                "total_videos": total_videos,
                "quizzes_passed": quizzes_passed,
                "total_quizzes": total_quizzes,
                "start_date": start_date,
                "last_activity": last_activity,
            }
        )

    return Response(
        {
            "overall_progress": overall_progress,
            "average_quiz_score": avg_quiz_score,
            "completed_courses_count": completed_courses_count,
            "progress_history": progress_history,
            "quiz_stats": quiz_stats,
            "recent_quizzes": recent_quizzes,
            "course_progress": course_progress,
            "course_details": course_details,
        }
    )