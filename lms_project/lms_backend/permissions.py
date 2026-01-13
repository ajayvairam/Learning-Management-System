from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'ADMIN'

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'STUDENT'

class IsEnrolled(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # obj could be Video, Quiz, or Course
        if hasattr(obj, 'course'):
            course = obj.course
        else:
            course = obj
        
        return request.user.enrollment_set.filter(course=course).exists()

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.user_type == 'ADMIN':
            return True
        
        # Check if obj has user attribute or created_by
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False