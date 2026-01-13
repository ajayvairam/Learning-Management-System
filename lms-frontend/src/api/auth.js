import api from './index';

export const authService = {
    login: async (credentials) => {
        const response = await api.post('/token/', credentials);
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/users/', userData);
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/users/me/');
        return response.data;
    },
};