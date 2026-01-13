import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Alert,
  Divider,
  Chip,
  CircularProgress
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Quiz as QuizIcon,
  ArrowUpward,
  ArrowDownward
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../api";

// Constants
const DEFAULT_PAGE_SIZE = 5;

const emptyQuiz = {
  title: "",
  description: "",
  passing_score: 70,
  questions: [],
  is_final: false,
  course: null
};

const emptyQuestion = {
  question_text: "",
  choices: [{ text: "", is_correct: false }]
};

// Utility Functions
const formatUTCDateTime = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "";
  }
};

const reorderArray = (arr, fromIdx, toIdx) => {
  const copy = [...arr];
  const [removed] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, removed);
  return copy.map((item, idx) => ({ ...item, order: idx + 1 }));
};

const DataGridErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => setHasError(false)}>
            Retry
          </Button>
        }
      >
        An error occurred while loading the data grid. Please try refreshing the page.
      </Alert>
    );
  }

  return children;
};

const CourseManagement = () => {
  // State Management
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoFormData, setVideoFormData] = useState({
    title: "",
    description: "",
    video_files: [],
    order: 1
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: [],
    is_active: true
  });
  const [videoQuizzes, setVideoQuizzes] = useState({});
  const [finalQuiz, setFinalQuiz] = useState(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initial Data Loading
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCourses(),
        fetchCategories()
      ]);
    } catch (error) {
      setError("Failed to load initial data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // API Calls
  const fetchCourses = async () => {
    try {
      const response = await api.get("/courses/");
      const coursesData = Array.isArray(response.data) ? response.data : [];
      const validCourses = coursesData.filter(course =>
        course && typeof course === 'object' && course.id
      );
      setCourses(validCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories/");
      const categoriesData = Array.isArray(response.data) ? response.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  };

  const fetchCourseVideos = async (courseId) => {
    if (!courseId) {
      setVideos([]);
      return;
    }
    try {
      const response = await api.get(`/courses/${courseId}/videos/`);
      const vids = Array.isArray(response.data) ? response.data : [];
      setVideos(vids.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error("Error fetching videos:", error);
      setVideos([]);
    }
  };

  const fetchVideoQuizzes = async (courseId) => {
    if (!courseId) return;
    try {
      const response = await api.get(`/quizzes/?course=${courseId}`);
      const quizzes = Array.isArray(response.data) ? response.data : [];
      const vidQuizzes = {};
      let currentFinalQuiz = null;

      quizzes.forEach(quiz => {
        if (quiz.is_final) {
          currentFinalQuiz = quiz;
        } else if (quiz.video) {
          vidQuizzes[quiz.video] = quiz;
        }
      });

      setVideoQuizzes(vidQuizzes);
      setFinalQuiz(currentFinalQuiz || { ...emptyQuiz, is_final: true, course: courseId });
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      setVideoQuizzes({});
      setFinalQuiz({ ...emptyQuiz, is_final: true, course: courseId });
    }
  };

  // Dialog Handlers
  const handleOpenDialog = async (course = null) => {
    setError(null);
    if (course) {
      setEditCourse(course);
      setFormData({
        title: course.title || "",
        description: course.description || "",
        category: Array.isArray(course.category)
          ? course.category.map(c => String(c.id || c))
          : course.category
            ? (course.category.id
              ? [String(course.category.id)]
              : typeof course.category === "number"
                ? [String(course.category)]
                : [])
            : [],
        is_active: course.is_active ?? true,
      });
      await fetchCourseVideos(course.id);
      await fetchVideoQuizzes(course.id);
    } else {
      setEditCourse(null);
      setFormData({
        title: "",
        description: "",
        category: [],
        is_active: true,
      });
      setVideos([]);
      setVideoQuizzes({});
      setFinalQuiz(null);
    }
    setOpenDialog(true);
    setSelectedTab(0);
  };

  const handleCloseDialog = () => {
    if (saving) return;

    setOpenDialog(false);
    setEditCourse(null);
    setSelectedVideo(null);
    setVideoFormData({
      title: "",
      description: "",
      video_files: [],
      order: 1
    });
    setVideoQuizzes({});
    setFinalQuiz(null);
    setError(null);
  };

  // Course Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.category.length) {
      setError("At least one category is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const submissionData = {
        ...formData,
        category: formData.category.map(id => parseInt(id, 10)),
        is_active: Boolean(formData.is_active),
      };

      let response;
      if (editCourse) {
        response = await api.put(`/courses/${editCourse.id}/`, submissionData);
        setEditCourse(response.data);
      } else {
        response = await api.post("/courses/", submissionData);
        setEditCourse(response.data);
      }

      await fetchCourses();

      if (!editCourse) {
        setSelectedTab(1); // Switch to videos tab after creating course
      } else {
        handleCloseDialog();
      }
    } catch (error) {
      console.error("Error saving course:", error);
      setError("Failed to save course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Video Handlers
  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!videoFormData.title || (!selectedVideo && videoFormData.video_files.length === 0)) {
      setError("Please provide a title and at least one video file");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (!editCourse) throw new Error("Please save the course first");

      if (selectedVideo) {
        const formDataObj = new FormData();
        formDataObj.append('title', videoFormData.title);
        formDataObj.append('description', videoFormData.description);
        formDataObj.append('order', videoFormData.order);
        formDataObj.append("course", editCourse.id);

        if (videoFormData.video_files[0]) {
          formDataObj.append('video_file', videoFormData.video_files[0]);
        }

        await api.put(`/videos/${selectedVideo.id}/`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const baseOrder = videos.length + 1;
        for (let i = 0; i < videoFormData.video_files.length; i++) {
          const formDataObj = new FormData();
          const videoTitle = videoFormData.video_files.length === 1
            ? videoFormData.title
            : `${videoFormData.title} ${i + 1}`;

          formDataObj.append('title', videoTitle);
          formDataObj.append('description', videoFormData.description);
          formDataObj.append('order', baseOrder + i);
          formDataObj.append('video_file', videoFormData.video_files[i]);
          formDataObj.append("course", editCourse.id);

          await api.post("/videos/", formDataObj, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      await fetchCourseVideos(editCourse.id);
      setSelectedVideo(null);
      setVideoFormData({
        title: "",
        description: "",
        video_files: [],
        order: videos.length + 1
      });
    } catch (error) {
      console.error("Error saving video(s):", error);
      setError("Failed to save video(s). Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/videos/${videoId}/`);
      await fetchCourseVideos(editCourse.id);
    } catch (error) {
      console.error("Error deleting video:", error);
      setError("Failed to delete video. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReorderVideo = async (videoIdx, direction) => {
    const newIdx = direction === "up" ? videoIdx - 1 : videoIdx + 1;
    if (videoIdx < 0 || newIdx < 0 || videoIdx >= videos.length || newIdx >= videos.length) return;

    const reorderedVideos = reorderArray(videos, videoIdx, newIdx);
    setVideos(reorderedVideos);

    setSaving(true);
    setError(null);
    try {
      for (const video of reorderedVideos) {
        await api.patch(`/videos/${video.id}/`, { order: video.order });
      }
      await fetchCourseVideos(editCourse.id);
    } catch (error) {
      console.error("Error reordering videos:", error);
      setError("Failed to reorder videos. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Quiz Handlers
  const handleOpenQuizDialog = (videoId = null, quiz = null) => {
    setEditingQuiz({
      videoId,
      quiz: quiz ? { ...quiz } : {
        ...emptyQuiz,
        video: videoId,
        is_final: !videoId,
        course: editCourse.id
      }
    });
    setQuizDialogOpen(true);
    setError(null);
  };

  const handleCloseQuizDialog = () => {
    if (saving) return;
    setQuizDialogOpen(false);
    setEditingQuiz(null);
    setError(null);
  };

  const handleDeleteQuiz = async (quizId, isFinal = false, videoId = null) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/quizzes/${quizId}/`);
      if (isFinal) {
        setFinalQuiz({ ...emptyQuiz, is_final: true, course: editCourse.id });
      } else {
        setVideoQuizzes(prev => {
          const updated = { ...prev };
          delete updated[videoId];
          return updated;
        });
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
      setError("Failed to delete quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuizSave = async () => {
    if (saving) return;

    const { videoId, quiz } = editingQuiz;
    if (!editCourse?.id) {
      setError("Please save the course first");
      return;
    }

    if (!quiz.title.trim()) {
      setError("Quiz title is required");
      return;
    }

    if (!quiz.questions?.length) {
      setError("At least one question is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const quizData = {
        ...quiz,
        course: editCourse.id,
        is_final: !videoId,
        video: videoId || null
      };

      let savedQuiz;
      if (quiz.id) {
        const response = await api.put(`/quizzes/${quiz.id}/`, quizData);
        savedQuiz = response.data;
      } else {
        const response = await api.post("/quizzes/", quizData);
        savedQuiz = response.data;
      }

      if (videoId) {
        setVideoQuizzes(prev => ({ ...prev, [videoId]: savedQuiz }));
      } else {
        setFinalQuiz(savedQuiz);
      }

      await fetchVideoQuizzes(editCourse.id);
      handleCloseQuizDialog();
    } catch (error) {
      console.error("Error saving quiz:", error);
      setError("Failed to save quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Question Handlers
  const handleOpenQuestionDialog = (qIdx, question = null) => {
    setEditingQuestion({
      qIdx,
      question: question ? { ...question } : { ...emptyQuestion }
    });
    setQuestionDialogOpen(true);
    setError(null);
  };

  const handleCloseQuestionDialog = () => {
    if (saving) return;
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
    setError(null);
  };

  const handleDeleteQuestion = (qIdx) => {
    const { quiz } = editingQuiz;
    const newQuestions = [...(quiz.questions || [])];
    newQuestions.splice(qIdx, 1);
    setEditingQuiz({
      ...editingQuiz,
      quiz: { ...quiz, questions: newQuestions }
    });
  };

  const handleQuestionSave = () => {
    const { qIdx, question } = editingQuestion;
    if (!question.question_text.trim()) {
      setError("Question text is required");
      return;
    }

    if (!question.choices?.length || question.choices.some(c => !c.text.trim())) {
      setError("All choices must have text");
      return;
    }

    if (!question.choices.some(c => c.is_correct)) {
      setError("At least one choice must be marked as correct");
      return;
    }

    const { quiz } = editingQuiz;
    const newQuestions = [...(quiz.questions || [])];

    if (qIdx < newQuestions.length) {
      newQuestions[qIdx] = { ...question };
    } else {
      newQuestions.push({ ...question });
    }

    setEditingQuiz({
      ...editingQuiz,
      quiz: { ...quiz, questions: newQuestions }
    });
    handleCloseQuestionDialog();
  };

  // DataGrid Columns
  const columns = useMemo(
    () => [
      {
        field: "title",
        headerName: "Title",
        flex: 1,
      },
      {
        field: "category",
        headerName: "Categories",
        flex: 1,
        renderCell: (params) => {
          if (Array.isArray(params.row.category)) {
            return params.row.category
              .map(cat =>
                (typeof cat === "object" && cat !== null && cat.name)
                  ? cat.name
                  : typeof cat === "string"
                    ? cat
                    : ""
              )
              .filter(Boolean)
              .join(", ");
          }
          return params.row.category?.name || "";
        }
      },
      {
        field: "created_on",
        headerName: "Created On",
        flex: 1,
        renderCell: (params) => formatUTCDateTime(params.row.created_on)
      },
      {
        field: "is_active",
        headerName: "Status",
        flex: 1,
        renderCell: (params) => params.row.is_active ? "Active" : "Inactive"
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        renderCell: (params) => (
          <Box>
            <Tooltip title="Edit">
              <IconButton
                onClick={() => params?.row?.id && handleOpenDialog(params.row)}
                disabled={!params?.row?.id || saving}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  params?.row?.id && handleDelete(params.row.id);
                }}
                disabled={!params?.row?.id || saving}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [saving]
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/courses/${id}/`);
      setCourses(courses.filter(course => course.id !== id));
    } catch (error) {
      console.error("Error deleting course:", error);
      setError("Failed to delete course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Course Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={saving}
        >
          Add Course
        </Button>
      </Box>

      <Paper sx={{ height: 400, width: "100%" }}>
        <DataGridErrorBoundary>
          <DataGrid
            rows={courses}
            columns={columns}
            pageSize={DEFAULT_PAGE_SIZE}
            rowsPerPageOptions={[DEFAULT_PAGE_SIZE]}
            disableSelectionOnClick
            loading={loading}
            getRowId={(row) => row?.id || Math.random()}
            components={{
              NoRowsOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography>No courses available</Typography>
                </Box>
              ),
              LoadingOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <CircularProgress />
                </Box>
              ),
            }}
          />
        </DataGridErrorBoundary>
      </Paper>

      {/* Course Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle>
          {editCourse ? "Edit Course" : "Add New Course"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Tabs
            value={selectedTab}
            onChange={(e, v) => setSelectedTab(v)}
          >
            <Tab label="Course Details" />
            {editCourse && <Tab label="Videos" />}
            {editCourse && <Tab label="Final Quiz" />}
          </Tabs>

          {/* Course Details Tab */}
          {selectedTab === 0 && (
            <Box component="form" noValidate sx={{ mt: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={saving}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={saving}
              />
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={formData.category}
                  label="Categories"
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      category: typeof value === "string" ? value.split(",") : value
                    });
                  }}
                  disabled={saving}
                  renderValue={(selected) =>
                    categories
                      .filter(cat => selected.includes(String(cat.id)))
                      .map(cat => cat.name)
                      .join(", ")
                  }
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.is_active}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                  disabled={saving}
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Videos Tab */}
          {selectedTab === 1 && editCourse && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Course Videos</Typography>
              {videos.length === 0 ? (
                <Alert severity="info">No videos added yet</Alert>
              ) : (
                <List>
                  {videos.map((video, idx) => (
                    <ListItem key={video.id} divider>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <Typography variant="subtitle1">
                              {video.title}
                            </Typography>
                            <Chip
                              label={videoQuizzes[video.id] ? "Has Quiz" : "No Quiz"}
                              color={videoQuizzes[video.id] ? "success" : "default"}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2">
                              Order: {video.order}
                            </Typography>
                            <Typography variant="body2">
                              Duration: {video.duration} seconds
                            </Typography>
                            {video.description && (
                              <Typography variant="body2">
                                {video.description}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Box>
                        <Tooltip title="Move Up">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleReorderVideo(idx, "up")}
                              disabled={idx === 0 || saving}
                            >
                              <ArrowUpward />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move Down">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleReorderVideo(idx, "down")}
                              disabled={idx === videos.length - 1 || saving}
                            >
                              <ArrowDownward />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={videoQuizzes[video.id] ? "Edit Quiz" : "Add Quiz"}>
                          <IconButton
                            onClick={() => handleOpenQuizDialog(video.id, videoQuizzes[video.id])}
                            disabled={saving}
                          >
                            <QuizIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Video">
                          <IconButton
                            onClick={() => {
                              setSelectedVideo(video);
                              setVideoFormData({
                                title: video.title,
                                description: video.description || "",
                                video_files: [],
                                order: video.order
                              });
                            }}
                            disabled={saving}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Video">
                          <IconButton
                            onClick={() => handleDeleteVideo(video.id)}
                            disabled={saving}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Video Form */}
              <Box component="form" noValidate sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {selectedVideo ? "Edit Video" : "Add New Video"}
                </Typography>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Title"
                  value={videoFormData.title}
                  onChange={(e) => setVideoFormData({
                    ...videoFormData,
                    title: e.target.value
                  })}
                  disabled={saving}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={videoFormData.description}
                  onChange={(e) => setVideoFormData({
                    ...videoFormData,
                    description: e.target.value
                  })}
                  disabled={saving}
                />
                <TextField
                  margin="normal"
                  required
                  type="number"
                  label="Order"
                  value={videoFormData.order}
                  onChange={(e) => setVideoFormData({
                    ...videoFormData,
                    order: parseInt(e.target.value) || 1
                  })}
                  disabled={saving}
                />
                <input
                  accept="video/*"
                  style={{ display: "none" }}
                  id="video-file"
                  type="file"
                  multiple={!selectedVideo}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setVideoFormData({
                      ...videoFormData,
                      video_files: files
                    });
                  }}
                  disabled={saving}
                />
                <label htmlFor="video-file">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    sx={{ mt: 1 }}
                    disabled={saving}
                  >
                    {videoFormData.video_files.length
                      ? `${videoFormData.video_files.length} file(s) selected`
                      : "Upload Video"}
                  </Button>
                </label>

                {videoFormData.video_files.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      Selected files:
                    </Typography>
                    {videoFormData.video_files.map((file, index) => (
                      <Typography key={index} variant="caption" display="block" sx={{ ml: 1 }}>
                        {file.name}
                      </Typography>
                    ))}
                  </Box>
                )}

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleVideoSubmit}
                    disabled={
                      saving ||
                      !videoFormData.title ||
                      (!selectedVideo && !videoFormData.video_files.length)
                    }
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {selectedVideo ? "Update Video" : "Add Video"}
                  </Button>
                  {selectedVideo && (
                    <Button
                      sx={{ ml: 1 }}
                      onClick={() => {
                        setSelectedVideo(null);
                        setVideoFormData({
                          title: "",
                          description: "",
                          video_files: [],
                          order: videos.length + 1
                        });
                      }}
                      disabled={saving}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Final Quiz Tab */}
          {selectedTab === 2 && editCourse && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Final Course Quiz</Typography>
              {finalQuiz?.id ? (
                <Box>
                  <Typography variant="subtitle1">{finalQuiz.title}</Typography>
                  <Typography variant="body2">{finalQuiz.description}</Typography>
                  <Typography variant="body2">
                    Passing Score: {finalQuiz.passing_score}%
                  </Typography>
                  <Typography variant="body2">
                    Questions: {finalQuiz.questions?.length || 0}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenQuizDialog(null, finalQuiz)}
                      disabled={saving}
                    >
                      Edit Quiz
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      sx={{ ml: 1 }}
                      onClick={() => handleDeleteQuiz(finalQuiz.id, true)}
                      disabled={saving}
                    >
                      Delete Quiz
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<QuizIcon />}
                  onClick={() => handleOpenQuizDialog(null)}
                  disabled={saving}
                >
                  Add Final Quiz
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          {selectedTab === 0 && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving || !formData.title || !formData.category.length}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {editCourse ? "Save Changes" : "Create Course"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog
        open={quizDialogOpen}
        onClose={handleCloseQuizDialog}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle>
          {editingQuiz?.quiz?.id ? "Edit Quiz" : "Add Quiz"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Quiz Title"
            value={editingQuiz?.quiz?.title || ""}
            onChange={(e) => setEditingQuiz({
              ...editingQuiz,
              quiz: { ...editingQuiz.quiz, title: e.target.value }
            })}
            disabled={saving}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={editingQuiz?.quiz?.description || ""}
            onChange={(e) => setEditingQuiz({
              ...editingQuiz,
              quiz: { ...editingQuiz.quiz, description: e.target.value }
            })}
            disabled={saving}
          />
          <TextField
            margin="normal"
            required
            type="number"
            label="Passing Score (%)"
            value={editingQuiz?.quiz?.passing_score || 70}
            onChange={(e) => setEditingQuiz({
              ...editingQuiz,
              quiz: {
                ...editingQuiz.quiz,
                passing_score: Math.max(0, Math.min(100, parseInt(e.target.value) || 70))
              }
            })}
            inputProps={{ min: 0, max: 100 }}
            disabled={saving}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Questions
            <Typography variant="caption" sx={{ ml: 1 }}>
              ({editingQuiz?.quiz?.questions?.length || 0})
            </Typography>
          </Typography>

          <List>
            {(editingQuiz?.quiz?.questions || []).map((question, idx) => (
              <ListItem key={idx} divider>
                <ListItemText
                  primary={question.question_text}
                  secondary={
                    <>
                      <Typography variant="body2">
                        Choices: {question.choices.length}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        Correct: {
                          question.choices.find(c => c.is_correct)?.text ||
                          "No correct answer selected"
                        }
                      </Typography>
                    </>
                  }
                />
                <Button
                  size="small"
                  onClick={() => handleOpenQuestionDialog(idx, question)}
                  disabled={saving}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteQuestion(idx)}
                  disabled={saving}
                >
                  Delete
                </Button>
              </ListItem>
            ))}
          </List>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenQuestionDialog(editingQuiz?.quiz?.questions?.length || 0)}
            sx={{ mt: 2 }}
            disabled={saving}
          >
            Add Question
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuizDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleQuizSave}
            disabled={
              saving ||
              !editingQuiz?.quiz?.title ||
              !editingQuiz?.quiz?.questions?.length ||
              editingQuiz.quiz.questions.some(q =>
                !q.question_text ||
                !q.choices?.length ||
                !q.choices.some(c => c.is_correct)
              )
            }
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            Save Quiz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Question Dialog */}
      <Dialog
        open={questionDialogOpen}
        onClose={handleCloseQuestionDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle>
          {editingQuestion?.question?.id ? "Edit Question" : "Add Question"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Question Text"
            multiline
            rows={2}
            value={editingQuestion?.question?.question_text || ""}
            onChange={(e) => setEditingQuestion({
              ...editingQuestion,
              question: {
                ...editingQuestion.question,
                question_text: e.target.value
              }
            })}
            disabled={saving}
          />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Answer Choices
            <Typography variant="caption" sx={{ ml: 1 }}>
              (at least one must be marked as correct)
            </Typography>
          </Typography>

          {(editingQuestion?.question?.choices || []).map((choice, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                mb: 1
              }}
            >
              <TextField
                required
                fullWidth
                label={`Choice ${idx + 1}`}
                value={choice.text}
                onChange={(e) => {
                  const newChoices = [...editingQuestion.question.choices];
                  newChoices[idx] = {
                    ...newChoices[idx],
                    text: e.target.value
                  };
                  setEditingQuestion({
                    ...editingQuestion,
                    question: {
                      ...editingQuestion.question,
                      choices: newChoices
                    }
                  });
                }}
                disabled={saving}
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Correct?</InputLabel>
                <Select
                  value={choice.is_correct ? "yes" : "no"}
                  label="Correct?"
                  onChange={(e) => {
                    const newChoices = [...editingQuestion.question.choices];
                    if (e.target.value === "yes") {
                      newChoices.forEach(c => c.is_correct = false);
                    }
                    newChoices[idx] = {
                      ...newChoices[idx],
                      is_correct: e.target.value === "yes"
                    };
                    setEditingQuestion({
                      ...editingQuestion,
                      question: {
                        ...editingQuestion.question,
                        choices: newChoices
                      }
                    });
                  }}
                  disabled={saving}
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                color="error"
                onClick={() => {
                  const newChoices = editingQuestion.question.choices.filter(
                    (_, cidx) => cidx !== idx
                  );
                  setEditingQuestion({
                    ...editingQuestion,
                    question: {
                      ...editingQuestion.question,
                      choices: newChoices
                    }
                  });
                }}
                disabled={saving}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newChoices = [
                ...(editingQuestion?.question?.choices || []),
                { text: "", is_correct: false }
              ];
              setEditingQuestion({
                ...editingQuestion,
                question: {
                  ...editingQuestion.question,
                  choices: newChoices
                }
              });
            }}
            sx={{ mt: 1 }}
            disabled={saving}
          >
            Add Choice
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleQuestionSave}
            disabled={
              saving ||
              !editingQuestion?.question?.question_text ||
              !editingQuestion?.question?.choices?.length ||
              !editingQuestion?.question?.choices?.some(c => c.is_correct) ||
              editingQuestion?.question?.choices?.some(c => !c.text)
            }
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            Save Question
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseManagement;