import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import theme from './theme';
import { useAuth } from './contexts/AuthContext';

// Layouts
import AdminLayout from './components/layouts/AdminLayout';
import StudentLayout from './components/layouts/StudentLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import CourseManagement from './pages/admin/CourseManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import TeamManagement from './pages/admin/TeamManagement';
import AdminAnalytics from './pages/admin/Analytics';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import CourseCatalog from './pages/student/CourseCatalog';
import MyCourses from './pages/student/MyCourses';
import CourseView from './pages/student/CourseView';
import StudentPerformance from './pages/student/Performance';


// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles && !allowedRoles.includes(user.user_type)) {
        return <Navigate to="/" />;
    }

    return children;
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <Router>
                    <Routes>
                        {/* Auth Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Admin Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute allowedRoles={['ADMIN']}>
                                    <AdminLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<UserManagement />} />
                            <Route path="courses" element={<CourseManagement />} />
                            <Route path="categories" element={<CategoryManagement />} />
                            <Route path="teams" element={<TeamManagement />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                        </Route>

                        {/* Student Routes */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute allowedRoles={['STUDENT']}>
                                    <StudentLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<StudentDashboard />} />
                            <Route path="catalog" element={<CourseCatalog />} />
                            <Route path="my-courses" element={<MyCourses />} />
                            <Route path="course/:id" element={<CourseView />} />
                            <Route path="performance" element={<StudentPerformance />} />
                        </Route>
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;