import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider,
    InputAdornment,
} from '@mui/material';
import {
    Search as SearchIcon,
    School as SchoolIcon,
    PlayArrow as PlayArrowIcon,
    Quiz as QuizIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        sort: 'newest',
    });
    const [enrollmentStatus, setEnrollmentStatus] = useState({});
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedCourseFull, setSelectedCourseFull] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchCourses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const response = await api.get('/courses/', {
                params: {
                    search: filters.search,
                    category: filters.category || undefined,
                    sort: filters.sort,
                },
            });
            setCourses(response.data);

            const enrollmentPromises = response.data.map(course =>
                api.get(`/courses/${course.id}/enrollment_status/`)
            );
            const enrollmentResponses = await Promise.all(enrollmentPromises);
            const statusMap = {};
            enrollmentResponses.forEach((res, index) => {
                statusMap[response.data[index].id] = res.data;
            });
            setEnrollmentStatus(statusMap);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories/');
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleEnroll = async (courseId) => {
        try {
            await api.post(`/courses/${courseId}/enroll/`);
            const response = await api.get(`/courses/${courseId}/enrollment_status/`);
            setEnrollmentStatus(prev => ({
                ...prev,
                [courseId]: response.data
            }));
        } catch (error) {
            console.error('Error enrolling in course:', error);
        }
    };

    const openDetails = async (course) => {
        setSelectedCourse(course);
        setDetailsLoading(true);
        setDetailsOpen(true);
        try {
            const response = await api.get(`/courses/${course.id}/`);
            setSelectedCourseFull(response.data);
        } catch (error) {
            setSelectedCourseFull(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setSelectedCourse(null);
        setSelectedCourseFull(null);
    };

    const CourseDetailsDialog = ({ course }) => (
        <Dialog
            open={detailsOpen}
            onClose={closeDetails}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                {selectedCourseFull ? selectedCourseFull.title : 'Course Details'}
            </DialogTitle>
            <DialogContent dividers>
                {detailsLoading && (
                    <Box display="flex" justifyContent="center" my={3}>
                        <CircularProgress />
                    </Box>
                )}
                {!detailsLoading && selectedCourseFull && (
                    <>
                        
                        <Typography variant="body1" mb={2}>
                            {selectedCourseFull.description}
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6">Course Content</Typography>
                        <List>
                            {selectedCourseFull.videos && selectedCourseFull.videos.map((video, i) => (
                                <ListItem key={video.id}>
                                    <PlayArrowIcon sx={{ mr: 1 }} color="action" />
                                    <ListItemText
                                        primary={video.title}
                                        secondary={video.description}
                                    />
                                    {video.quiz && <QuizIcon sx={{ ml: 2 }} color="primary" />}
                                </ListItem>
                            ))}
                        </List>
                        <Divider sx={{ my: 2 }} />
                        {selectedCourseFull.final_quiz && (
                            <>
                                <Typography variant="h6" mt={1}>
                                    Final Quiz
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {selectedCourseFull.final_quiz.title}: {selectedCourseFull.final_quiz.description}
                                </Typography>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={closeDetails}>Close</Button>
                {selectedCourse && !enrollmentStatus[selectedCourse.id]?.is_enrolled && (
                    <Button
                        variant="contained"
                        onClick={async () => {
                            await handleEnroll(selectedCourse.id);
                            closeDetails();
                        }}
                    >
                        Enroll Now
                    </Button>
                )}
                {selectedCourse && enrollmentStatus[selectedCourse.id]?.is_enrolled && (
                    <Button
                        variant="contained"
                        onClick={() => {
                            navigate(`/course/${selectedCourse.id}`);
                            closeDetails();
                        }}
                    >
                        Go to Course
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );

    const CourseCard = ({ course }) => {
        const status = enrollmentStatus[course.id];

        return (
            <Card sx={{
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
            }}>
                <CardMedia
                    component="div"
                    sx={{
                        pt: '56.25%',
                        position: 'relative',
                        backgroundColor: 'grey.100',
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
                    <Typography
                        gutterBottom
                        variant="h6"
                        component="h2"
                        sx={{
                            cursor: 'pointer',
                            '&:hover': {
                                color: 'primary.main',
                                textDecoration: 'underline',
                            }
                        }}
                        onClick={() => openDetails(course)}
                    >
                        {course.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                        {course.description.slice(0, 100)}...
                    </Typography>
                    <Box display="flex" alignItems="center" flexWrap="wrap" mb={1}>
                        {(Array.isArray(course.category)
                            ? course.category
                            : [course.category]
                        ).filter(Boolean).map((cat, idx) => (
                            <Chip
                                key={cat?.id || idx}
                                label={cat?.name || ''}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                            />
                        ))}
                    </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Button
                        fullWidth
                        variant="text"
                        onClick={() => openDetails(course)}
                        sx={{ fontWeight: 600, color: 'primary.main' }}
                    >
                        Details
                    </Button>
                    {status?.is_enrolled ? (
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={() => navigate(`/course/${course.id}`)}
                            sx={{ fontWeight: 600 }}
                        >
                            {status.completed_on ? 'Review Course' : 'Continue Learning'}
                        </Button>
                    ) : (
                        <Button
                            fullWidth
                            variant="outlined"
                            color="primary"
                            onClick={() => handleEnroll(course.id)}
                            sx={{ fontWeight: 600 }}
                        >
                            Enroll Now
                        </Button>
                    )}
                </CardActions>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ px: { xs: 1, md: 4 }, py: 2, backgroundColor: 'background.default', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom fontWeight={800} letterSpacing={-1} sx={{ mb: 3 }}>
                Course Catalog
            </Typography>

            {/* Filters */}
            <Grid
                container
                spacing={2}
                mb={4}
                alignItems="center"
                sx={{
                    maxWidth: 1200,
                    mx: 'auto',
                }}
            >
                <Grid item xs={12} sm={4} md={4}>
                    <TextField
                        fullWidth
                        label="Search Courses"
                        variant="outlined"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            sx: {
                                fontSize: '1.1rem',
                                height: 56
                            }
                        }}
                        sx={{
                            background: '#fff',
                            borderRadius: 2,
                            '& .MuiOutlinedInput-root': {
                                height: 56,
                                fontSize: '1.1rem',
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={4} md={4}>
                    <FormControl fullWidth variant="outlined"
                        sx={{
                            background: '#fff',
                            borderRadius: 2,
                            '& .MuiOutlinedInput-root': {
                                height: 56,
                                fontSize: '1.1rem',
                            }
                        }}
                    >
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            label="Category"
                        >
                            <MenuItem value="">All Categories</MenuItem>
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={String(category.id)}>
                                    {category.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={4}>
                    <FormControl fullWidth variant="outlined"
                        sx={{
                            background: '#fff',
                            borderRadius: 2,
                            '& .MuiOutlinedInput-root': {
                                height: 56,
                                fontSize: '1.1rem',
                            }
                        }}
                    >
                    </FormControl>
                </Grid>
            </Grid>

            {/* Course Grid */}
            {courses.length > 0 ? (
                <Grid
                    container
                    spacing={4}
                    sx={{
                        maxWidth: 1200,
                        mx: 'auto',
                    }}
                >
                    {courses.map((course) => (
                        <Grid item key={course.id} xs={12} sm={6} md={4}>
                            <CourseCard course={course} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Alert severity="info">
                    No courses found matching your criteria. Try adjusting your filters.
                </Alert>
            )}

            <CourseDetailsDialog />
        </Box>
    );
};

export default CourseCatalog;