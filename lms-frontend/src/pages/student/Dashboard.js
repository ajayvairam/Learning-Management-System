import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    Button,
    LinearProgress,
    List,
    ListItem,
    Chip,
    CircularProgress,
    Divider,
    Tooltip,
    useTheme,
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Check as CheckIcon,
    Timeline as TimelineIcon,
    School as SchoolIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const StatCard = ({ title, value, icon, color }) => {
    const theme = useTheme();
    return (
        <Card
            elevation={4}
            sx={{
                borderRadius: 4,
                minHeight: 140,
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${theme.palette[color].light} 70%, ${theme.palette.background.paper})`,
                boxShadow: `0 4px 20px 0 ${theme.palette[color].main}22`,
                cursor: 'default',
                transition: 'transform 0.18s',
                '&:hover': {
                    transform: 'translateY(-4px) scale(1.018)',
                    boxShadow: `0 8px 28px 0 ${theme.palette[color].main}2a`,
                },
            }}
        >
            <CardContent sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center">
                    <Box
                        sx={{
                            backgroundColor: theme.palette[color].main,
                            borderRadius: 2,
                            p: 1.7,
                            mr: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 54,
                            minHeight: 54,
                            boxShadow: `0 2px 8px 0 ${theme.palette[color].main}33`,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                            {value}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

const StudentDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const theme = useTheme();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/student/dashboard/');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress thickness={5} size={72} color="primary"/>
            </Box>
        );
    }

    // Only show last 5 recent activities
    const recentActivities = (dashboardData?.recentActivity || []).slice(0, 5);

    return (
        <Box sx={{ px: { xs: 0.5, md: 4 }, py: 2, backgroundColor: 'background.default', minHeight: '100vh', width: '100%' }}>
            <Typography variant="h4" gutterBottom fontWeight={900} letterSpacing={-0.5} sx={{ mb: 3 }}>
                Welcome back, <span style={{ color: theme.palette.primary.main }}>{dashboardData?.user?.first_name}</span>!
            </Typography>

            {/* Stats Section */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Courses In Progress"
                        value={dashboardData?.stats?.inProgressCount || 0}
                        icon={<PlayIcon sx={{ color: 'white', fontSize: 32 }} />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Completed Courses"
                        value={dashboardData?.stats?.completedCount || 0}
                        icon={<CheckIcon sx={{ color: 'white', fontSize: 32 }} />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Average Score"
                        value={`${Math.round(dashboardData?.stats?.averageScore || 0)}%`}
                        icon={<TimelineIcon sx={{ color: 'white', fontSize: 32 }} />}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Enrollments"
                        value={dashboardData?.stats?.totalEnrollments || 0}
                        icon={<SchoolIcon sx={{ color: 'white', fontSize: 32 }} />}
                        color="info"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3} alignItems="stretch">
                {/* In Progress Courses */}
                <Grid item xs={12} md={6} lg={7}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: { xs: 1.5, md: 3 },
                            minHeight: 370,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 4,
                            background: `linear-gradient(120deg, ${theme.palette.background.paper} 85%, ${theme.palette.primary.light}11 100%)`,
                        }}
                    >
                        <Typography variant="h6" fontWeight={700} letterSpacing={-0.2} gutterBottom>
                            In Progress Courses
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <List dense disablePadding>
                                {dashboardData?.inProgressCourses?.length ? (
                                    dashboardData.inProgressCourses.map((course) => (
                                        <ListItem
                                            key={course.id}
                                            alignItems="flex-start"
                                            divider
                                            sx={{
                                                py: 2.5,
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                gap: { xs: 1.5, sm: 0 },
                                                '&:hover': {
                                                    backgroundColor: theme.palette.action.hover,
                                                },
                                            }}
                                        >
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Tooltip title={course.title} arrow disableInteractive={course.title.length < 38}>
                                                    <Typography fontWeight={600} fontSize={17} noWrap>
                                                        {course.title}
                                                    </Typography>
                                                </Tooltip>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                                                    {course.category.name}
                                                </Typography>
                                                <Box display="flex" alignItems="center" mt={1.2}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={course.progress}
                                                        sx={{
                                                            flexGrow: 1,
                                                            mr: 2,
                                                            height: 9,
                                                            borderRadius: 3,
                                                            background: theme.palette.grey[200],
                                                        }}
                                                        color="primary"
                                                    />
                                                    <Typography variant="body2" fontWeight={700} minWidth={36}>
                                                        {Math.round(course.progress)}%
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ mt: { xs: 1.5, sm: 0 }, ml: { sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
                                                <Button
                                                    variant="contained"
                                                    size="medium"
                                                    sx={{
                                                        borderRadius: 2,
                                                        fontWeight: 600,
                                                        width: { xs: '100%', sm: 120 },
                                                        mt: { xs: 0.5, sm: 0 },
                                                        boxShadow: '0 2px 8px 0 #0002',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    onClick={() => navigate(`/course/${course.id}`)}
                                                >
                                                    Continue
                                                </Button>
                                            </Box>
                                        </ListItem>
                                    ))
                                ) : (
                                    <Box py={4}>
                                        <Typography variant="body1" color="textSecondary" align="center">
                                            No courses in progress. Start learning today!
                                        </Typography>
                                    </Box>
                                )}
                            </List>
                        </Box>
                        <Box display="flex" justifyContent="center" mt={3}>
                            <Button
                                variant="outlined"
                                size="large"
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    px: 3,
                                    borderWidth: 2,
                                    color: 'primary.main',
                                    borderColor: 'primary.main',
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        backgroundColor: theme.palette.primary.light,
                                        borderColor: 'primary.dark',
                                        color: 'primary.dark',
                                    },
                                }}
                                onClick={() => navigate('/catalog')}
                            >
                                Browse More Courses
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} md={6} lg={5}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: { xs: 1.5, md: 3 },
                            minHeight: 370,
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            borderRadius: 4,
                            background: `linear-gradient(110deg, ${theme.palette.background.paper} 75%, ${theme.palette.info.light}12 100%)`,
                        }}
                    >
                        <Typography variant="h6" fontWeight={700} letterSpacing={-0.2} gutterBottom>
                            Recent Activity
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1, maxHeight: 330, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                            <List dense disablePadding>
                                {recentActivities.length > 0 ? (
                                    recentActivities.map((activity) => (
                                        <ListItem
                                            key={activity.id}
                                            alignItems="flex-start"
                                            divider
                                            sx={{
                                                py: 2.2,
                                                px: 0.5,
                                                alignItems: 'center',
                                                gap: 2,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.action.hover,
                                                },
                                            }}
                                        >
                                            <Box sx={{ flexGrow: 1, minWidth: 0, pr: 1 }}>
                                                <Tooltip title={activity.description} arrow disableInteractive={activity.description.length < 35}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            maxWidth: { xs: 170, sm: 250, md: 340, lg: 360 },
                                                        }}
                                                        title={activity.description}
                                                    >
                                                        {activity.description}
                                                    </Typography>
                                                </Tooltip>
                                                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                                    {new Date(activity.timestamp).toLocaleString()}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={activity.type}
                                                color={
                                                    activity.type === 'COMPLETED'
                                                        ? 'success'
                                                        : activity.type === 'ENROLLED'
                                                        ? 'primary'
                                                        : 'default'
                                                }
                                                variant="filled"
                                                sx={{
                                                    ml: 2,
                                                    flexShrink: 0,
                                                    minWidth: 92,
                                                    fontWeight: 600,
                                                    letterSpacing: 0.3,
                                                    justifyContent: 'center',
                                                    fontSize: 15,
                                                    textTransform: 'capitalize',
                                                    boxShadow: '0 1px 4px 0 #0001',
                                                }}
                                            />
                                        </ListItem>
                                    ))
                                ) : (
                                    <Box py={4}>
                                        <Typography variant="body1" color="textSecondary" align="center">
                                            No recent activity
                                        </Typography>
                                    </Box>
                                )}
                            </List>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StudentDashboard;