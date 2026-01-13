from django.db.models import Avg, Count
from datetime import datetime
from .models import Enrollment, QuizAttempt, VideoProgress

def calculate_course_progress(user, course):
    """Calculate user's progress percentage in a course"""
    total_videos = course.videos.count()
    if total_videos == 0:
        return 0
    
    completed_videos = VideoProgress.objects.filter(
        user=user,
        video__course=course,
        watched=True,
        quiz_completed=True
    ).count()
    
    return (completed_videos / total_videos) * 100

def get_user_analytics(user):
    """Get comprehensive analytics for a user"""
    enrollments = Enrollment.objects.filter(user=user)
    
    return {
        'total_courses_enrolled': enrollments.count(),
        'courses_completed': enrollments.filter(progress='COMPLETED').count(),
        'courses_in_progress': enrollments.filter(progress='IN_PROGRESS').count(),
        'average_quiz_score': QuizAttempt.objects.filter(user=user).aggregate(
            Avg('score')
        )['score__avg'] or 0,
    }

def get_course_analytics(course):
    """Get comprehensive analytics for a course"""
    return {
        'total_enrollments': Enrollment.objects.filter(course=course).count(),
        'completed_count': Enrollment.objects.filter(
            course=course,
            progress='COMPLETED'
        ).count(),
        'in_progress_count': Enrollment.objects.filter(
            course=course,
            progress='IN_PROGRESS'
        ).count(),
        'average_quiz_score': QuizAttempt.objects.filter(
            quiz__course=course
        ).aggregate(Avg('score'))['score__avg'] or 0,
    }

def get_team_analytics(team):
    """Get comprehensive analytics for a team"""
    team_users = team.user_set.all()
    
    return {
        'member_count': team_users.count(),
        'total_enrollments': Enrollment.objects.filter(
            user__in=team_users
        ).count(),
        'total_completions': Enrollment.objects.filter(
            user__in=team_users,
            progress='COMPLETED'
        ).count(),
        'average_quiz_score': QuizAttempt.objects.filter(
            user__in=team_users
        ).aggregate(Avg('score'))['score__avg'] or 0,
    }

def check_course_completion(user, course):
    """Check if a user has completed all requirements for a course"""
    # Check if all videos are watched and their quizzes completed
    total_videos = course.videos.count()
    completed_videos = VideoProgress.objects.filter(
        user=user,
        video__course=course,
        watched=True,
        quiz_completed=True
    ).count()
    
    # Check if final quiz is passed
    final_quiz = course.quiz_set.filter(is_final=True).first()
    final_quiz_passed = False
    if final_quiz:
        final_quiz_passed = QuizAttempt.objects.filter(
            user=user,
            quiz=final_quiz,
            is_passed=True
        ).exists()
    
    return total_videos == completed_videos and final_quiz_passed

def update_enrollment_progress(enrollment):
    """Update enrollment progress based on user's activity"""
    progress = calculate_course_progress(enrollment.user, enrollment.course)
    
    if progress == 0:
        enrollment.progress = 'NOT_STARTED'
    elif progress == 100 and check_course_completion(enrollment.user, enrollment.course):
        enrollment.progress = 'COMPLETED'
        enrollment.completed_on = datetime.now()
    else:
        enrollment.progress = 'IN_PROGRESS'
    
    enrollment.save()