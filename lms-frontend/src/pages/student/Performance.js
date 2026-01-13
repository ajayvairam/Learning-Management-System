import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
} from '@mui/material';
import {
    LineChart,
    BarChart,
    PieChart,
} from '@mui/x-charts';
import api from '../../api';

const Performance = () => {
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState(0);

    useEffect(() => {
        fetchPerformanceData();
    }, []);

    const fetchPerformanceData = async () => {
        try {
            const response = await api.get('/student/performance/');
            setPerformance(response.data);
        } catch (error) {
            console.error('Error fetching performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!performance) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <Typography variant="h6" color="error">
                    Failed to load performance data.
                </Typography>
            </Box>
        );
    }

    const OverviewTab = () => (
        <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Overall Progress</Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress
                                variant="determinate"
                                value={performance?.overall_progress ?? 0}
                                size={100}
                            />
                            <Box
                                sx={{
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    right: 0,
                                    position: 'absolute',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography variant="h6">
                                    {Math.round(performance?.overall_progress ?? 0)}%
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Average Quiz Score</Typography>
                        <Typography variant="h3" color="primary">
                            {Math.round(performance?.average_quiz_score ?? 0)}%
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Completed Courses</Typography>
                        <Typography variant="h3" color="success.main">
                            {performance?.completed_courses_count ?? 0}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            {/* Progress Over Time Chart */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Learning Progress Over Time</Typography>
                    <LineChart
                        height={300}
                        series={[
                            {
                                data: performance?.progress_history?.map(item => item.progress) ?? [],
                                label: 'Progress',
                            },
                        ]}
                        xAxis={[{
                            data: performance?.progress_history?.map(item => new Date(item.date)) ?? [],
                            scaleType: 'time',
                        }]}
                    />
                </Paper>
            </Grid>
        </Grid>
    );

    const QuizPerformanceTab = () => (
        <Grid container spacing={3}>
            {/* Quiz Score Distribution */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Quiz Score Distribution</Typography>
                    <PieChart
                        height={300}
                        series={[
                            {
                                data: [
                                    { id: 0, value: performance?.quiz_stats?.excellent ?? 0, label: '90-100%' },
                                    { id: 1, value: performance?.quiz_stats?.good ?? 0, label: '70-89%' },
                                    { id: 2, value: performance?.quiz_stats?.average ?? 0, label: '50-69%' },
                                    { id: 3, value: performance?.quiz_stats?.poor ?? 0, label: '0-49%' },
                                ],
                            },
                        ]}
                    />
                </Paper>
            </Grid>

            {/* Quiz History */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Recent Quiz Attempts</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Quiz</TableCell>
                                    <TableCell>Score</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {performance?.recent_quizzes?.map((quiz) => (
                                    <TableRow key={quiz.id}>
                                        <TableCell>{quiz.title}</TableCell>
                                        <TableCell>{quiz.score}%</TableCell>
                                        <TableCell>
                                            <Typography
                                                color={quiz.passed ? 'success.main' : 'error.main'}
                                            >
                                                {quiz.passed ? 'Passed' : 'Failed'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(quiz.date).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                )) ?? null}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>
        </Grid>
    );

    const CourseProgressTab = () => (
        <Grid container spacing={3}>
            {/* Course Completion Status */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Course Progress Status</Typography>
                    <BarChart
                        height={300}
                        series={[
                            {
                                data: performance?.course_progress?.map(course => course.progress) ?? [],
                                label: 'Progress',
                            },
                        ]}
                        xAxis={[{
                            data: performance?.course_progress?.map(course => course.title) ?? [],
                            scaleType: 'band',
                        }]}
                    />
                </Paper>
            </Grid>

            {/* Detailed Course Progress */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Course Details</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Course</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell>Videos Completed</TableCell>
                                    <TableCell>Quizzes Passed</TableCell>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>Last Activity</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {performance?.course_details?.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell>{course.title}</TableCell>
                                        <TableCell>{course.progress}%</TableCell>
                                        <TableCell>
                                            {course.videos_completed}/{course.total_videos}
                                        </TableCell>
                                        <TableCell>
                                            {course.quizzes_passed}/{course.total_quizzes}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(course.start_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(course.last_activity).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                )) ?? null}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>
        </Grid>
    );

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                My Performance
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={selectedTab}
                    onChange={(e, newValue) => setSelectedTab(newValue)}
                    variant="fullWidth"
                >
                    <Tab label="Overview" />
                    <Tab label="Quiz Performance" />
                    <Tab label="Course Progress" />
                </Tabs>
            </Paper>

            {selectedTab === 0 && <OverviewTab />}
            {selectedTab === 1 && <QuizPerformanceTab />}
            {selectedTab === 2 && <CourseProgressTab />}
        </Box>
    );
};

export default Performance;
