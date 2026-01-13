import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../api/auth';
import { jwtDecode } from 'jwt-decode'; // Updated import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decodedToken = jwtDecode(token); // Updated usage
                    if (decodedToken.exp * 1000 > Date.now()) {
                        const userData = await authService.getCurrentUser();
                        setUser(userData);
                    } else {
                        localStorage.clear();
                    }
                } catch (error) {
                    localStorage.clear();
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        localStorage.setItem('token', response.access);
        localStorage.setItem('refreshToken', response.refresh);
        const userData = await authService.getCurrentUser();
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        return response;
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};