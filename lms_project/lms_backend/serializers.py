from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import (
    Team, Category, Course, Video, Quiz, Question,
    Enrollment, QuizAttempt, VideoProgress
)
from .utils import (
    calculate_course_progress, get_user_analytics,
    get_team_analytics
)

User = get_user_model()

# ============================
# Team Serializers
# ============================
class TeamSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'members_count', 'created_at')
        read_only_fields = ('created_at',)
    
    def get_members_count(self, obj):
        return obj.user_set.count()

class TeamDetailSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    courses = serializers.SerializerMethodField()
    course_ids = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), many=True, write_only=True, source='courses', required=False)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'members', 'members_count', 'courses', 'course_ids', 'created_at')
        read_only_fields = ('created_at',)

    def get_members(self, obj):
        users = obj.user_set.all()
        return UserSerializer(users, many=True).data

    def get_courses(self, obj):
        return CourseSerializer(obj.courses.all(), many=True).data

    def get_members_count(self, obj):
        return obj.user_set.count()

# ============================
# Category Serializer
# ============================
class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'created_at', 'course_count')
        read_only_fields = ('created_at',)

    def get_course_count(self, obj):
        return obj.courses.count()

# ============================
# User Serializer
# ============================
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=False)
    team = TeamSerializer(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all(), allow_null=True, required=False, source='team', write_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'password', 'password2', 'email',
            'first_name', 'last_name', 'user_type', 'team', 'team_id'
        )
        extra_kwargs = {
            'user_type': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.get('password2')
        if password or password2:
            if password != password2:
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        team = validated_data.pop('team', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if team:
            user.team = team
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        if 'team' in validated_data or 'team' in self.initial_data:
            instance.team = validated_data.get('team', None)
        for attr, value in validated_data.items():
            if attr != 'team':
                setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

# ============================
# Question/Quiz Serializers
# ============================
class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ('id', 'question_text', 'choices')

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Quiz
        fields = (
            'id', 'title', 'description', 'is_final', 'passing_score',
            'questions', 'created_at', 'course', 'video'
        )
        read_only_fields = ('created_at',)

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        for question_data in questions_data:
            Question.objects.create(quiz=quiz, **question_data)
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.questions.all().delete()
        for question_data in questions_data:
            Question.objects.create(quiz=instance, **question_data)
        return instance

    def validate(self, data):
        if data.get('is_final') and data.get('video'):
            raise serializers.ValidationError(
                "Final quizzes cannot be associated with a video"
            )
        if not data.get('is_final') and not data.get('video'):
            raise serializers.ValidationError(
                "Non-final quizzes must be associated with a video"
            )
        # Validate unique final quiz per course
        if data.get('is_final'):
            existing = Quiz.objects.filter(
                course=data['course'],
                is_final=True
            )
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            if existing.exists():
                raise serializers.ValidationError(
                    "A final quiz already exists for this course"
                )
        return data

# ============================
# Video Serializer
# ============================
class VideoSerializer(serializers.ModelSerializer):
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    has_quiz = serializers.SerializerMethodField()
    quiz_id = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = (
            'id', 'title', 'description', 'video_file', 'order',
            'duration', 'has_quiz', 'quiz_id', 'created_at', 'course'
        )
        read_only_fields = ('created_at',)

    def get_has_quiz(self, obj):
        return Quiz.objects.filter(video=obj).exists()
    
    def get_quiz_id(self, obj):
        quiz = Quiz.objects.filter(video=obj).first()
        return quiz.id if quiz else None

# ============================
# Course Serializer
# ============================
class CourseSerializer(serializers.ModelSerializer):
    videos = VideoSerializer(many=True, read_only=True)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True)
    created_by = UserSerializer(read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    final_quiz = serializers.SerializerMethodField()
    total_quizzes = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'description', 'category', 'created_by',
            'videos', 'enrolled_count', 'created_on', 'is_active',
            'final_quiz', 'total_quizzes'
        )
        read_only_fields = ('created_on', 'created_by')
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    def get_enrolled_count(self, obj):
        return obj.enrollment_set.count()

    def get_total_quizzes(self, obj):
        video_quizzes = Quiz.objects.filter(video__course=obj).count()
        final_quiz = Quiz.objects.filter(course=obj, is_final=True).exists()
        return video_quizzes + (1 if final_quiz else 0)

    def get_final_quiz(self, obj):
        final_quiz = obj.quiz_set.filter(is_final=True).first()
        if final_quiz:
            return {
                'id': final_quiz.id,
                'title': final_quiz.title,
                'description': final_quiz.description
            }
        return None

class CourseListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True, many=True)

    class Meta:
        model = Course
        fields = ('id', 'title', 'description', 'category', 'created_on', 'is_active')

# ============================
# Enrollment and Progress Serializers
# ============================
class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = (
            'id', 'user', 'course', 'enrolled_on', 'completed_on',
            'progress', 'progress_percent'
        )
        read_only_fields = ('enrolled_on', 'completed_on')

    def get_progress_percent(self, obj):
        return round(calculate_course_progress(obj.user, obj.course))

class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ('id', 'user', 'quiz', 'score', 'answers', 'is_passed', 'attempted_on')
        read_only_fields = ('is_passed', 'attempted_on')

class VideoProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoProgress
        fields = ('id', 'user', 'video', 'watched', 'quiz_completed', 'watched_duration', 'last_watched', 'created_at')
        read_only_fields = ('last_watched', 'created_at')

# ============================
# Dashboard Serializers
# ============================
class StudentDashboardSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    stats = serializers.SerializerMethodField()
    inProgressCourses = serializers.SerializerMethodField()
    recentActivity = serializers.SerializerMethodField()
    teamData = serializers.SerializerMethodField()

    def get_stats(self, obj):
        analytics = get_user_analytics(obj)
        return {
            'inProgressCount': analytics['courses_in_progress'],
            'completedCount': analytics['courses_completed'],
            'averageScore': analytics['average_quiz_score'],
            'totalEnrollments': analytics['total_courses_enrolled']
        }

    def get_inProgressCourses(self, obj):
        enrollments = Enrollment.objects.filter(
            user=obj,
            progress='IN_PROGRESS'
        ).select_related('course').prefetch_related('course__category')
        courses = []
        for enrollment in enrollments:
            progress = calculate_course_progress(obj, enrollment.course)
            course_data = CourseListSerializer(enrollment.course).data
            course_data['progress'] = progress
            courses.append(course_data)
        return courses

    def get_recentActivity(self, obj):
        recent_activities = []
        quiz_attempts = QuizAttempt.objects.filter(user=obj).order_by('-attempted_on')[:5]
        for attempt in quiz_attempts:
            recent_activities.append({
                'id': f'quiz_{attempt.id}',
                'type': 'COMPLETED' if attempt.is_passed else 'ATTEMPTED',
                'description': f"Quiz attempt for {attempt.quiz.title}",
                'timestamp': attempt.attempted_on
            })
        video_progress = VideoProgress.objects.filter(user=obj).order_by('-last_watched')[:5]
        for progress in video_progress:
            recent_activities.append({
                'id': f'video_{progress.id}',
                'type': 'COMPLETED' if progress.watched else 'IN_PROGRESS',
                'description': f"Watched {progress.video.title}",
                'timestamp': progress.last_watched
            })
        recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return recent_activities[:10]

    def get_teamData(self, obj):
        if not obj.team:
            return None
        team_analytics = get_team_analytics(obj.team)
        total_teams = Team.objects.count()
        # Calculate team ranking based on completion percentage
        all_teams = Team.objects.all()
        team_scores = []
        for team in all_teams:
            team_stats = get_team_analytics(team)
            completion_rate = (team_stats['total_completions'] / team_stats['total_enrollments']) if team_stats['total_enrollments'] > 0 else 0
            team_scores.append((team.id, completion_rate))
        team_scores.sort(key=lambda x: x[1], reverse=True)
        team_ranking = next(i for i, (team_id, _) in enumerate(team_scores, 1) if team_id == obj.team.id)
        return {
            'name': obj.team.name,
            'ranking': team_ranking,
            'totalTeams': total_teams,
            'completedCourses': team_analytics['total_completions'],
            'totalCourses': team_analytics['total_enrollments']
        }

class AdminDashboardSerializer(serializers.Serializer):
    total_users = serializers.SerializerMethodField()
    total_teams = serializers.SerializerMethodField()
    total_courses = serializers.SerializerMethodField()
    users_analytics = serializers.SerializerMethodField()

    def get_total_users(self, obj=None):
        return User.objects.count()

    def get_total_teams(self, obj=None):
        return Team.objects.count()

    def get_total_courses(self, obj=None):
        return Course.objects.count()

    def get_users_analytics(self, obj=None):
        return [
            {
                "id": user.id,
                "name": user.get_full_name(),
                "email": user.email,
                "team": user.team.name if user.team else None,
                "analytics": get_user_analytics(user)
            }
            for user in User.objects.all()
        ]