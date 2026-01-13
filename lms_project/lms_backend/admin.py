from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Team, Category, Course, Video, Quiz,
    Question, Enrollment, QuizAttempt, VideoProgress
)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 
                   'user_type', 'team')
    list_filter = ('user_type', 'team')
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('user_type', 'team')}),
    )

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_member_count', 'created_at')
    search_fields = ('name',)

    def get_member_count(self, obj):
        return obj.user_set.count()
    get_member_count.short_description = 'Members'

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'get_categories', 'created_by', 'created_on', 'is_active')
    list_filter = ('category', 'is_active', 'created_on')
    search_fields = ('title', 'description')

    def get_categories(self, obj):
        return ", ".join([c.name for c in obj.category.all()])
    get_categories.short_description = 'Categories'
    
@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order', 'duration', 'created_at')
    list_filter = ('course', 'created_at')
    search_fields = ('title', 'description')
    ordering = ('course', 'order')

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'video', 'is_final', 'passing_score')
    list_filter = ('course', 'is_final')
    search_fields = ('title', 'description')

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'question_text', 'created_at')
    list_filter = ('quiz', 'created_at')
    search_fields = ('question_text',)

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'progress', 'enrolled_on', 'completed_on')
    list_filter = ('progress', 'enrolled_on', 'completed_on')
    search_fields = ('user__username', 'course__title')

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz', 'score', 'is_passed', 'attempted_on')
    list_filter = ('is_passed', 'attempted_on')
    search_fields = ('user__username', 'quiz__title')

@admin.register(VideoProgress)
class VideoProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'watched', 'quiz_completed', 
                   'watched_duration', 'last_watched')
    list_filter = ('watched', 'quiz_completed', 'last_watched')
    search_fields = ('user__username', 'video__title')