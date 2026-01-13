import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Grid,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Button,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    Alert,
    LinearProgress,
    Divider,
    Card,
    CardContent,
    useTheme,
    Tooltip,
} from '@mui/material';
import {
    PlayCircle as PlayIcon,
    Lock as LockIcon,
    CheckCircle as CheckIcon,
    Quiz as QuizIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import ReactPlayer from 'react-player';
import api from '../../api';

const PLAYER_WIDTH = 720;
const PLAYER_HEIGHT = 405;
const VIDEO_COMPLETION_THRESHOLD = 0.9;

const CourseView = () => {
    const { id } = useParams();
    const theme = useTheme();
    const [course, setCourse] = useState(null);
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
    const [showQuizDialog, setShowQuizDialog] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [debugInfo, setDebugInfo] = useState({});
    const playerRef = useRef(null);
    const [maxSeekPerVideo, setMaxSeekPerVideo] = useState({});
    // Track last posted duration to prevent duplicate POSTs
    const lastPostedDuration = useRef({});

    // Always prefer the backend duration on reload
    const getMaxSeek = useCallback((videoId) => {
        const serverDuration = progress?.video_progress?.[videoId]?.watched_duration || 0;
        const localMax = maxSeekPerVideo[videoId] || 0;
        return Math.max(serverDuration, localMax);
    }, [maxSeekPerVideo, progress]);

    const getTotalQuizCount = useCallback(() => {
        if (!course?.videos) return 0;
        const videoQuizzesCount = course.videos.reduce((count, video) => {
            return count + (video.has_quiz ? 1 : 0);
        }, 0);
        const finalQuizCount = course.final_quiz ? 1 : 0;
        return videoQuizzesCount + finalQuizCount;
    }, [course]);

    const getPassedQuizCount = useCallback(() => {
        if (!progress?.video_progress) return 0;
        const passedVideoQuizzes = Object.values(progress.video_progress)
            .filter(vp => vp.has_quiz && vp.quiz_completed)
            .length;
        const passedFinalQuiz = progress.final_quiz_passed ? 1 : 0;
        return passedVideoQuizzes + passedFinalQuiz;
    }, [progress]);

    const canTakeFinalQuiz = useCallback(() => {
        if (!course?.videos || !progress?.video_progress) {
            return false;
        }
        return course.videos.every(video => {
            const videoProgress = progress.video_progress[video.id];
            return videoProgress?.watched &&
                   (!videoProgress?.has_quiz || videoProgress?.quiz_completed);
        });
    }, [course, progress]);

    // On every fetch, update maxSeekPerVideo from backend values
    const fetchCourseData = useCallback(async () => {
        setLoading(true);
        try {
            const courseResponse = await api.get(`/courses/${id}/`);
            setCourse(courseResponse.data);

            const progressResponse = await api.get(`/courses/${id}/detailed_progress/`);
            setProgress(progressResponse.data);

            if (courseResponse.data.videos) {
                const tempMaxSeek = {};
                courseResponse.data.videos.forEach(video => {
                    // Always use the backend value on reload
                    const watched_duration = progressResponse.data?.video_progress?.[video.id]?.watched_duration || 0;
                    tempMaxSeek[video.id] = watched_duration;
                });
                setMaxSeekPerVideo(tempMaxSeek);

                const firstIncompleteIdx = courseResponse.data.videos.findIndex(video => {
                    const videoProgress = progressResponse.data.video_progress[video.id];
                    return !(videoProgress?.watched &&
                             (!videoProgress?.has_quiz || videoProgress?.quiz_completed));
                });
                setCurrentVideoIdx(firstIncompleteIdx === -1 ? 0 : firstIncompleteIdx);
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCourseData();
    }, [fetchCourseData]);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            setDebugInfo({
                quizCounts: {
                    total: getTotalQuizCount(),
                    passed: getPassedQuizCount(),
                    videoQuizzes: course?.videos?.filter(v => v.has_quiz).length || 0,
                    finalQuiz: course?.final_quiz ? 1 : 0
                },
                progress: {
                    canTakeFinalQuiz: canTakeFinalQuiz(),
                    finalQuizPassed: progress?.final_quiz_passed,
                    overallProgress: progress?.overall_progress
                },
                currentState: {
                    currentVideoIdx,
                    showingQuiz: showQuizDialog,
                    hasCurrentQuiz: !!currentQuiz
                },
                videoProgress: course?.videos?.reduce((acc, video) => ({
                    ...acc,
                    [video.id]: {
                        watched: progress?.video_progress?.[video.id]?.watched,
                        hasQuiz: progress?.video_progress?.[video.id]?.has_quiz,
                        quizCompleted: progress?.video_progress?.[video.id]?.quiz_completed
                    }
                }), {})
            });
        }
    }, [
        course,
        progress,
        currentVideoIdx,
        showQuizDialog,
        currentQuiz,
        getTotalQuizCount,
        getPassedQuizCount,
        canTakeFinalQuiz
    ]);

    // Use fetch here to guarantee JSON and credentials if needed
    const postWatchedDuration = useCallback(async (videoId, watched_duration) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                window.location.href = '/login';
                return;
            }
    
            const response = await fetch(
                `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/videos/${videoId}/watch/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        watched_duration: Math.floor(watched_duration)
                    })
                }
            );
    
            if (response.status === 401) {
                // Try to refresh token
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    try {
                        const refreshResponse = await fetch(
                            `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/token/refresh/`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    refresh: refreshToken
                                })
                            }
                        );
    
                        if (refreshResponse.ok) {
                            const { access } = await refreshResponse.json();
                            localStorage.setItem('access_token', access);
                            
                            // Retry the original request with new token
                            return await postWatchedDuration(videoId, watched_duration);
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                    }
                }
                
                // If refresh failed or no refresh token, redirect to login
                window.location.href = '/login';
                return;
            }
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error posting watched duration:', error);
            // Show error message to user
        }
    }, []);

    // Only update local maxSeekPerVideo and POST if the user actually watches further
    const handleVideoProgress = useCallback((progressObj) => {
        if (!course?.videos?.[currentVideoIdx]) return;
        const videoId = course.videos[currentVideoIdx].id;
        const played = progressObj.playedSeconds || 0;
        const allowed = getMaxSeek(videoId);

        // Prevent forward skip: if current playhead is beyond allowed, snap back
        if (played > allowed + 1.2) {
            if (playerRef.current) {
                playerRef.current.seekTo(allowed, 'seconds');
            }
            return;
        }

        setMaxSeekPerVideo(prev => {
            // Always start with backend value, never let it drop below backend value
            const backendWatched = progress?.video_progress?.[videoId]?.watched_duration || 0;
            const prevMax = Math.max(prev[videoId] || 0, backendWatched);
            if (played > prevMax) {
                // Debounce logic: only POST if >1s since last post, and only if different value
                if (
                    !lastPostedDuration.current[videoId] ||
                    played - lastPostedDuration.current[videoId] >= 1
                ) {
                    lastPostedDuration.current[videoId] = played;
                    postWatchedDuration(videoId, played);
                }
                return { ...prev, [videoId]: played };
            }
            return prev;
        });
    }, [course, currentVideoIdx, progress, postWatchedDuration, getMaxSeek]);

    // Always allow backward seeking, but prevent forward seeking beyond watched duration
    const onSeek = (seconds) => {
        if (!course?.videos?.[currentVideoIdx]) return;
        const videoId = course.videos[currentVideoIdx].id;
        const maxAllowed = getMaxSeek(videoId);

        // If user seeks forward beyond allowed, snap back
        if (seconds > maxAllowed + 0.5) {
            if (playerRef.current) {
                playerRef.current.seekTo(maxAllowed, 'seconds');
            }
        }
        // Otherwise, allow
    };

    const handleVideoEnd = async () => {
        if (!course?.videos?.[currentVideoIdx]) return;
        const video = course.videos[currentVideoIdx];

        try {
            const completeResponse = await api.post(`/videos/${video.id}/mark_complete/`);

            if (completeResponse.data.has_quiz) {
                const canAttemptResponse = await api.get(`/quizzes/${completeResponse.data.quiz_id}/can_attempt/`);
                if (canAttemptResponse.data.can_attempt) {
                    const quizResponse = await api.get(`/quizzes/${completeResponse.data.quiz_id}/`);
                    setCurrentQuiz({
                        ...quizResponse.data,
                        title: `Quiz for ${video.title}`
                    });
                    setShowQuizDialog(true);
                } else {
                    console.warn('Cannot attempt quiz:', canAttemptResponse.data.reason);
                }
            } else {
                await handleVideoCompletion();
            }
        } catch (error) {
            console.error('Error handling video completion:', error);
        }
    };

    const handleVideoCompletion = async () => {
        const isLastVideo = currentVideoIdx === course.videos.length - 1;
        const allVideosCompleted = course.videos.every(video => {
            const videoProgress = progress.video_progress?.[video.id];
            return videoProgress?.watched &&
                   (!videoProgress?.has_quiz || videoProgress?.quiz_completed);
        });

        if (isLastVideo && allVideosCompleted && course.final_quiz && !progress.final_quiz_passed) {
            try {
                const finalQuizResponse = await api.get(`/quizzes/${course.final_quiz.id}/`);
                const canAttemptResponse = await api.get(`/quizzes/${course.final_quiz.id}/can_attempt/`);
                if (canAttemptResponse.data.can_attempt) {
                    setCurrentQuiz({
                        ...finalQuizResponse.data,
                        is_final: true
                    });
                    setShowQuizDialog(true);
                }
            } catch (error) {
                console.error('Error handling final quiz:', error);
            }
        } else if (!isLastVideo) {
            setCurrentVideoIdx(prev => prev + 1);
        }

        await fetchCourseData();
    };

    const handleStartFinalQuiz = async () => {
        if (!course.final_quiz) return;
        try {
            const canAttemptResponse = await api.get(`/quizzes/${course.final_quiz.id}/can_attempt/`);
            if (canAttemptResponse.data.can_attempt) {
                const finalQuizResponse = await api.get(`/quizzes/${course.final_quiz.id}/`);
                setCurrentQuiz({
                    ...finalQuizResponse.data,
                    is_final: true
                });
                setShowQuizDialog(true);
            } else {
                console.warn('Cannot attempt final quiz:', canAttemptResponse.data.reason);
            }
        } catch (error) {
            console.error('Error starting final quiz:', error);
        }
    };

    const handleQuizSubmit = async () => {
        if (!currentQuiz) return;
        try {
            const canAttemptResponse = await api.get(`/quizzes/${currentQuiz.id}/can_attempt/`);
            if (!canAttemptResponse.data.can_attempt) {
                console.error('Cannot attempt quiz:', canAttemptResponse.data.reason);
                return;
            }

            const response = await api.post(`/quizzes/${currentQuiz.id}/attempt/`, {
                answers: quizAnswers
            });

            setQuizResult(response.data);

            if (response.data.is_passed) {
                await fetchCourseData();
                if (currentQuiz.is_final) {
                    closeQuizDialog();
                } else {
                    closeQuizDialog();
                    await handleVideoCompletion();
                }
            }
        } catch (error) {
            console.error('Error submitting quiz:', error);
        }
    };

    const closeQuizDialog = () => {
        setShowQuizDialog(false);
        setQuizAnswers({});
        setCurrentQuiz(null);
        setQuizResult(null);
    };

    const canAccessVideo = useCallback((videoIndex) => {
        if (videoIndex === 0) return true;
        const prevVideo = course?.videos?.[videoIndex - 1];
        const prevProgress = progress?.video_progress?.[prevVideo?.id];
        return prevProgress?.watched &&
               (!prevProgress?.has_quiz || prevProgress?.quiz_completed);
    }, [course, progress]);

    const handleVideoSelect = useCallback((index) => {
        if (canAccessVideo(index)) {
            setCurrentVideoIdx(index);
        }
    }, [canAccessVideo]);

    const getVideoUrl = useCallback((video) => {
        if (!video?.video_file) return '';
        return video.video_file.startsWith('http')
            ? video.video_file
            : `${process.env.REACT_APP_BACKEND_URL || ''}${video.video_file}`;
    }, []);

    const QuizDialog = () => (
        <Dialog
            open={showQuizDialog}
            maxWidth="md"
            fullWidth
            disableEscapeKeyDown
        >
            <DialogTitle>
                {currentQuiz?.is_final ? 'Final Course Quiz' : 'Video Quiz'}
            </DialogTitle>
            <DialogContent>
                {quizResult && (
                    <Alert
                        severity={quizResult.is_passed ? "success" : "error"}
                        sx={{ mb: 2 }}
                    >
                        {quizResult.is_passed
                            ? `Congratulations! You passed with ${quizResult.score}%`
                            : `You scored ${quizResult.score}%. Required: ${quizResult.passing_score}%`}
                    </Alert>
                )}

                {currentQuiz?.questions.map((question, index) => (
                    <Box key={question.id} mb={3}>
                        <Typography variant="subtitle1" gutterBottom>
                            {index + 1}. {question.question_text}
                        </Typography>
                        <FormControl component="fieldset">
                            <RadioGroup
                                value={quizAnswers[question.id]?.toString() || ''}
                                onChange={(e) => setQuizAnswers(prev => ({
                                    ...prev,
                                    [question.id]: parseInt(e.target.value, 10)
                                }))}
                            >
                                {question.choices.map((choice, choiceIndex) => (
                                    <FormControlLabel
                                        key={choiceIndex}
                                        value={choiceIndex.toString()}
                                        control={<Radio />}
                                        label={choice.text}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                {!currentQuiz?.is_final && (
                    <Button onClick={closeQuizDialog}>
                        Review Video
                    </Button>
                )}
                <Button
                    variant="contained"
                    onClick={handleQuizSubmit}
                    disabled={
                        !currentQuiz?.questions ||
                        Object.keys(quizAnswers).length !== currentQuiz.questions.length
                    }
                >
                    Submit Quiz
                </Button>
            </DialogActions>
        </Dialog>
    );

    if (loading || !course) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    const currentVideo = course.videos?.[currentVideoIdx];
    const currentVideoId = currentVideo?.id;
    const allowedSeek = getMaxSeek(currentVideoId);

    return (
        <Box sx={{
            px: { xs: 0, md: 2 },
            py: { xs: 0, md: 2 },
            background: theme.palette.background.default,
            minHeight: "100vh",
            width: "100%",
        }}>
            <Box sx={{ maxWidth: 1400, mx: "auto", mb: 3, display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                <Box sx={{ width: { xs: '100%', md: 320 }, mr: { xs: 0, md: 4 } }}>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                        {course.title}
                    </Typography>
                    <Typography variant="h6" fontWeight={600} mb={0.5}>
                        Course Progress
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress.overall_progress || 0}
                        sx={{
                            height: 12,
                            borderRadius: 6,
                            background: theme.palette.grey[200]
                        }}
                    />
                    <Typography variant="body2" color="text.secondary" mt={1} textAlign="right">
                        {Math.round(progress.overall_progress || 0)}%
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={4} sx={{ maxWidth: 1400, mx: "auto" }}>
                <Grid item xs={12} md={4} lg={4}>
                    <Paper elevation={3} sx={{
                        p: { xs: 1.5, md: 2 },
                        borderRadius: 3,
                        mb: 2,
                        minHeight: 350
                    }}>
                        <Typography variant="h6" gutterBottom>
                            Course Content
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <List dense>
                            {course.videos?.map((video, idx) => {
                                const videoProgress = progress.video_progress?.[video.id];
                                const isLocked = !canAccessVideo(idx);
                                const isCompleted = videoProgress?.watched &&
                                                  (!videoProgress?.has_quiz || videoProgress?.quiz_completed);
                                const isCurrent = idx === currentVideoIdx;

                                return (
                                    <ListItem
                                        key={video.id}
                                        disablePadding
                                        divider
                                        sx={{
                                            borderRadius: 2,
                                            mb: 1,
                                            background: isCurrent ? theme.palette.action.selected : 'inherit'
                                        }}
                                    >
                                        <ListItemButton
                                            onClick={() => handleVideoSelect(idx)}
                                            disabled={isLocked}
                                            sx={{
                                                borderRadius: 2,
                                                '&:hover': { background: theme.palette.action.hover }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                {isCompleted ? (
                                                    <CheckIcon color="success" />
                                                ) : isLocked ? (
                                                    <LockIcon color="disabled" />
                                                ) : (
                                                    <PlayIcon color={isCurrent ? "primary" : "action"} />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body1"
                                                        fontWeight={isCompleted ? 600 : 500}
                                                        color={isCompleted ? "success.main" : "text.primary"}
                                                        sx={{
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis"
                                                        }}
                                                    >
                                                        {video.title}
                                                    </Typography>
                                                }
                                                secondary={`Video ${idx + 1}`}
                                            />
                                            {video.has_quiz && (
                                                <Tooltip title={
                                                    videoProgress?.quiz_completed
                                                        ? "Quiz completed"
                                                        : "Quiz required"
                                                }>
                                                    <QuizIcon
                                                        fontSize="small"
                                                        color={videoProgress?.quiz_completed ? "success" : "action"}
                                                        sx={{ ml: 1 }}
                                                    />
                                                </Tooltip>
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>

                    <Card elevation={0} sx={{
                        borderRadius: 3,
                        background: theme.palette.grey[50],
                        p: 1
                    }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Your Progress
                            </Typography>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" color="text.secondary">
                                    Videos Completed:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {Object.values(progress.video_progress || {})
                                        .filter(vp => vp.watched && (!vp.has_quiz || vp.quiz_completed))
                                        .length} / {course.videos?.length || 0}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Box display="flex" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                        Quizzes Passed:
                                    </Typography>
                                    <Tooltip title="Includes video quizzes and final quiz">
                                        <InfoIcon
                                            fontSize="small"
                                            color="action"
                                            sx={{ ml: 0.5, width: 16, height: 16 }}
                                        />
                                    </Tooltip>
                                </Box>
                                <Typography variant="body2" fontWeight="bold">
                                    {getPassedQuizCount()} / {getTotalQuizCount()}
                                </Typography>
                            </Box>

                            {course.final_quiz && !progress.final_quiz_passed && canTakeFinalQuiz() && (
                                <Box sx={{ mt: 2, mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary" mb={1}>
                                        You've completed all videos and quizzes! Ready for the final test?
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        startIcon={<QuizIcon />}
                                        onClick={handleStartFinalQuiz}
                                    >
                                        Take Final Course Quiz
                                    </Button>
                                </Box>
                            )}

                            {progress.final_quiz_passed && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    Course Completed! 🎉
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8} lg={8}>
                    <Paper elevation={3} sx={{
                        p: { xs: 1.5, md: 3 },
                        borderRadius: 3,
                        minHeight: 550,
                        width: '100%',
                        display: "flex",
                        flexDirection: "column",
                        alignItems: 'center'
                    }}>
                        {currentVideo ? (
                            <>
                                <Box sx={{
                                    width: PLAYER_WIDTH,
                                    height: PLAYER_HEIGHT,
                                    maxWidth: '100%',
                                    background: "#191f27",
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                    mb: 2,
                                    boxShadow: theme.shadows[1],
                                    position: "relative"
                                }}>
                                    <ReactPlayer
                                        ref={playerRef}
                                        url={getVideoUrl(currentVideo)}
                                        controls
                                        width="100%"
                                        height="100%"
                                        onEnded={handleVideoEnd}
                                        onProgress={handleVideoProgress}
                                        onSeek={onSeek}
                                        progressInterval={1000}
                                        config={{
                                            file: {
                                                attributes: {}
                                            }
                                        }}
                                    />
                                    {currentVideo.duration && allowedSeek < currentVideo.duration - 2 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0, left: 0, right: 0, height: 24,
                                                background: 'rgba(0,0,0,0.7)',
                                                color: '#fff', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                pointerEvents: 'none', fontSize: 13,
                                            }}
                                        >
                                            {"You can only watch up to "}
                                            {Math.floor(allowedSeek)}s / {currentVideo.duration}s.
                                            Forward seeking is disabled.
                                        </Box>
                                    )}
                                </Box>
                                <Box sx={{ width: '100%', maxWidth: PLAYER_WIDTH }}>
                                    <Typography variant="h6" gutterBottom fontWeight={600}>
                                        {currentVideo.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {currentVideo.description}
                                    </Typography>
                                </Box>
                            </>
                        ) : (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                                <Typography variant="h6" color="text.secondary">
                                    No videos available
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            <QuizDialog />
        </Box>
    );
};

export default CourseView;