from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # ManyToManyField for courses (Teams enrolled in courses)
    courses = models.ManyToManyField('Course', related_name='teams', blank=True)

    def __str__(self):
        return self.name

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('STUDENT', 'Student'),
    )

    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)

    def is_admin(self):
        return self.user_type == 'ADMIN'

    def is_student(self):
        return self.user_type == 'STUDENT'

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['-created_at']  # Show newest categories first

    def __str__(self):
        return self.name

    def clean(self):
        if not self.name:
            raise ValidationError('Name is required')
        if Category.objects.filter(name=self.name).exclude(id=self.id).exists():
            raise ValidationError('A category with this name already exists')

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ManyToManyField(Category,related_name="courses")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_on = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title

class Video(models.Model):
    course = models.ForeignKey(Course, related_name='videos', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    video_file = models.FileField(upload_to='course_videos/')
    order = models.PositiveIntegerField()
    duration = models.PositiveIntegerField(help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Quiz(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_final = models.BooleanField(default=False)
    passing_score = models.PositiveIntegerField(
        default=70,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Quizzes"
        constraints = [
            models.UniqueConstraint(
                fields=['course', 'is_final'],
                condition=models.Q(is_final=True),
                name='unique_final_quiz_per_course'
            )
        ]

    def __str__(self):
        if self.is_final:
            return f"{self.course.title} - Final Quiz"
        elif self.video:
            return f"{self.course.title} - Video {self.video.order} Quiz"
        else:
            return f"{self.course.title} - Quiz"

    def clean(self):
        if self.is_final and self.video:
            raise ValidationError("Final quizzes cannot be associated with a video")
        if not self.is_final and not self.video:
            raise ValidationError("Non-final quizzes must be associated with a video")
        # Check for existing final quiz
        if self.is_final:
            existing = Quiz.objects.filter(
                course=self.course,
                is_final=True
            ).exclude(id=self.id).exists()
            if existing:
                raise ValidationError("A final quiz already exists for this course")

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    question_text = models.TextField()
    choices = models.JSONField()  # Format: [{"text": "choice text", "is_correct": boolean}]
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quiz.title} - Question {self.id}"

class Enrollment(models.Model):
    PROGRESS_CHOICES = (
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    enrolled_on = models.DateTimeField(auto_now_add=True)
    completed_on = models.DateTimeField(null=True, blank=True)
    progress = models.CharField(
        max_length=20,
        choices=PROGRESS_CHOICES,
        default='NOT_STARTED'
    )

    class Meta:
        unique_together = ['user', 'course']

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"

class QuizAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    score = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    answers = models.JSONField()  # Format: {"question_id": selected_choice_index}
    is_passed = models.BooleanField(default=False)
    attempted_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.score}%"

class VideoProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    watched = models.BooleanField(default=False)
    quiz_completed = models.BooleanField(default=False)
    watched_duration = models.PositiveIntegerField(default=0)  # in seconds
    last_watched = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'video']

    def __str__(self):
        return f"{self.user.username} - {self.video.title}"