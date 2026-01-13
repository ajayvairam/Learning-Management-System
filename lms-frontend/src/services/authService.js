import api from './index';

export const authService = {
    login: async (credentials) => {
        try {
            const response = await api.post('/token/', credentials);
            if (response.data.access && response.data.refresh) {
                localStorage.setItem('token', response.data.access);
                localStorage.setItem('refreshToken', response.data.refresh);
            }
            return response.data;
        } catch (error) {
            if (error.response?.data) {
                throw error.response.data;
            }
            throw { message: 'An error occurred during login' };
        }
    },

    register: async (userData) => {
        try {
            const response = await api.post('/users/', userData);
            return response.data;
        } catch (error) {
            if (error.response?.data) {
                throw error.response.data;
            }
            throw { message: 'An error occurred during registration' };
        }
    },

    getCurrentUser: async () => {
        try {
            const response = await api.get('/users/me/');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to get current user' };
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
    }
};