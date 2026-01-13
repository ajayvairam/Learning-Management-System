import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Button,
    LinearProgress,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    School as SchoolIcon,
    PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const MyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchEnrolledCourses();
    }, []);

    const fetchEnrolledCourses = async () => {
        try {
            // Fetch only enrollments for the current logged-in user
            const response = await api.get('/enrollments/');
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching enrolled courses:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ px: { xs: 1, md: 4 }, py: 2, backgroundColor: 'background.default', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom fontWeight={800} letterSpacing={-1} sx={{ mb: 3 }}>
                My Courses
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                    <CircularProgress />
                </Box>
            ) : courses.length === 0 ? (
                <Alert severity="info">
                    You haven't enrolled in any courses yet. 
                    <Button
                        color="primary"
                        onClick={() => navigate('/catalog')}
                        sx={{ ml: 2 }}
                    >
                        Browse Courses
                    </Button>
                </Alert>
            ) : (
                <Grid
                    container
                    spacing={4}
                    sx={{
                        maxWidth: 1200,
                        mx: 'auto',
                    }}
                >
                    {courses.map((enrollment) => (
                        <Grid item xs={12} sm={6} md={4} key={enrollment.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 4,
                                    boxShadow: 3,
                                    transition: 'box-shadow 0.2s, transform 0.2s',
                                    '&:hover': {
                                        boxShadow: 10,
                                        transform: 'scale(1.03)'
                                    }
                                }}
                            >
                                <CardMedia
                                    component="div"
                                    sx={{
                                        pt: '56.25%',
                                        position: 'relative',
                                        backgroundColor: 'grey.200',
                                    }}
                                >
                                    <SchoolIcon
                                        sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            fontSize: 60,
                                            color: 'grey.400',
                                        }}
                                    />
                                </CardMedia>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography gutterBottom variant="h6" component="h2" sx={{
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {enrollment.course.title}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                        {enrollment.course.category?.name}
                                    </Typography>
                                    <Box sx={{ mt: 2 }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2">Progress</Typography>
                                            <Typography variant="body2">
                                                {enrollment.progress_percent ?? 0}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={enrollment.progress_percent ?? 0}
                                            sx={{
                                                height: 10,
                                                borderRadius: 5,
                                                backgroundColor: (theme) => theme.palette.grey[300],
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 5,
                                                    backgroundColor: (theme) =>
                                                        enrollment.progress_percent === 100
                                                            ? theme.palette.success.main
                                                            : theme.palette.primary.main,
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() => navigate(`/course/${enrollment.course.id}`)}
                                        sx={{ mt: 2, fontWeight: 600 }}
                                    >
                                        {enrollment.progress === 'NOT_STARTED'
                                            ? 'Start Course'
                                            : enrollment.progress === 'COMPLETED'
                                                ? 'Review Course'
                                                : 'Continue Learning'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default MyCourses;