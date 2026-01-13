import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Tab,
    Tabs,
    CircularProgress,
} from '@mui/material';
import {
    BarChart,
    LineChart,
    PieChart,
} from '@mui/x-charts';
import api from '../../api';

const Analytics = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({
        users: {},
        courses: {},
        teams: {},
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [usersResponse, coursesResponse, teamsResponse] = await Promise.all([
                api.get('/analytics/users/'),
                api.get('/analytics/courses/'),
                api.get('/analytics/teams/'),
            ]);

            setAnalytics({
                users: usersResponse.data,
                courses: coursesResponse.data,
                teams: teamsResponse.data,
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const UserAnalytics = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="User Registration Trends" />
                    <CardContent>
                        <LineChart
                            height={300}
                            series={[
                                {
                                    data: analytics.users.registrationTrend?.map(item => item.count) || [],
                                    label: 'New Users',
                                },
                            ]}
                            xAxis={[{
                                data: analytics.users.registrationTrend?.map(item => item.date) || [],
                                scaleType: 'band',
                            }]}
                        />
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="User Type Distribution" />
                    <CardContent>
                        <PieChart
                            height={300}
                            series={[
                                {
                                    data: [
                                        { id: 0, value: analytics.users.adminCount, label: 'Admins' },
                                        { id: 1, value: analytics.users.studentCount, label: 'Students' },
                                    ],
                                },
                            ]}
                        />
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    const CourseAnalytics = () => (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Card>
                    <CardHeader title="Course Enrollment Statistics" />
                    <CardContent>
                        <BarChart
                            height={300}
                            series={[
                                {
                                    data: analytics.courses.topCourses?.map(course => course.enrollments) || [],
                                    label: 'Enrollments',
                                },
                                {
                                    data: analytics.courses.topCourses?.map(course => course.completions) || [],
                                    label: 'Completions',
                                },
                            ]}
                            xAxis={[{
                                data: analytics.courses.topCourses?.map(course => course.title) || [],
                                scaleType: 'band',
                            }]}
                        />
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="Average Course Completion Time" />
                    <CardContent>
                        <LineChart
                            height={300}
                            series={[
                                {
                                    data: analytics.courses.completionTimeTrend?.map(item => item.avgDays) || [],
                                    label: 'Days',
                                },
                            ]}
                            xAxis={[{
                                data: analytics.courses.completionTimeTrend?.map(item => item.month) || [],
                                scaleType: 'band',
                            }]}
                        />
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="Quiz Performance Distribution" />
                    <CardContent>
                        <PieChart
                            height={300}
                            series={[
                                {
                                    data: [
                                        { id: 0, value: analytics.courses.quizStats?.excellent || 0, label: 'Excellent (90-100%)' },
                                        { id: 1, value: analytics.courses.quizStats?.good || 0, label: 'Good (70-89%)' },
                                        { id: 2, value: analytics.courses.quizStats?.average || 0, label: 'Average (50-69%)' },
                                        { id: 3, value: analytics.courses.quizStats?.poor || 0, label: 'Poor (0-49%)' },
                                    ],
                                },
                            ]}
                        />
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    const TeamAnalytics = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="Team Performance" />
                    <CardContent>
                        <BarChart
                            height={300}
                            series={[
                                {
                                    data: analytics.teams.teamPerformance?.map(team => team.avgScore) || [],
                                    label: 'Average Score',
                                },
                            ]}
                            xAxis={[{
                                data: analytics.teams.teamPerformance?.map(team => team.name) || [],
                                scaleType: 'band',
                            }]}
                        />
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="Team Course Completion Rates" />
                    <CardContent>
                        <BarChart
                            height={300}
                            series={[
                                {
                                    data: analytics.teams.completionRates?.map(team => team.completionRate) || [],
                                    label: 'Completion Rate (%)',
                                },
                            ]}
                            xAxis={[{
                                data: analytics.teams.completionRates?.map(team => team.name) || [],
                                scaleType: 'band',
                            }]}
                        />
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Analytics Dashboard
            </Typography>
            
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={selectedTab}
                    onChange={(e, newValue) => setSelectedTab(newValue)}
                    variant="fullWidth"
                >
                    <Tab label="User Analytics" />
                    <Tab label="Course Analytics" />
                    <Tab label="Team Analytics" />
                </Tabs>
            </Paper>

            {selectedTab === 0 && <UserAnalytics />}
            {selectedTab === 1 && <CourseAnalytics />}
            {selectedTab === 2 && <TeamAnalytics />}
        </Box>
    );
};

export default Analytics;