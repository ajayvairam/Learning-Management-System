import api from './index';

export const courseService = {
    getAllCourses: async () => {
        const response = await api.get('/courses/');
        return response.data;
    },

    getCourse: async (id) => {
        const response = await api.get(`/courses/${id}/`);
        return response.data;
    },

    createCourse: async (courseData) => {
        const response = await api.post('/courses/', courseData);
        return response.data;
    },

    updateCourse: async (id, courseData) => {
        const response = await api.put(`/courses/${id}/`, courseData);
        return response.data;
    },

    deleteCourse: async (id) => {
        await api.delete(`/courses/${id}/`);
    },

    enrollCourse: async (courseId) => {
        const response = await api.post(`/courses/${courseId}/enroll/`);
        return response.data;
    },

    getCourseAnalytics: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/analytics/`);
        return response.data;
    }
};