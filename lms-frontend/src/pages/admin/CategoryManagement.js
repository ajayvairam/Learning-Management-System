import React, { useState, useEffect } from 'react';
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
    IconButton,
    Tooltip,
    Alert,
    Snackbar
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';

const CategoryManagement = () => {
    // State management
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [formErrors, setFormErrors] = useState({});

    // Fetch categories on component mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // API calls
    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/categories/');
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to fetch categories. Please try again.');
            showSnackbar('Error fetching categories', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Form handling
    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Dialog handling
    const handleOpenDialog = (category = null) => {
        if (category) {
            setEditCategory(category);
            setFormData({
                name: category.name,
                description: category.description || ''
            });
        } else {
            setEditCategory(null);
            setFormData({
                name: '',
                description: ''
            });
        }
        setFormErrors({});
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditCategory(null);
        setFormData({ name: '', description: '' });
        setFormErrors({});
    };

    // CRUD operations
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setLoading(true);
            if (editCategory) {
                await api.put(`/categories/${editCategory.id}/`, formData);
                showSnackbar('Category updated successfully');
            } else {
                await api.post('/categories/', formData);
                showSnackbar('Category created successfully');
            }
            await fetchCategories();
            handleCloseDialog();
        } catch (error) {
            console.error('Error saving category:', error);
            if (error.response?.data) {
                // Handle API validation errors
                setFormErrors(error.response.data);
            } else {
                showSnackbar('Failed to save category', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        try {
            setLoading(true);
            await api.delete(`/categories/${id}/`);
            showSnackbar('Category deleted successfully');
            await fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            showSnackbar('Failed to delete category', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Snackbar handling
    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({
            ...prev,
            open: false
        }));
    };

    // DataGrid columns configuration
    const columns = [
        { 
            field: 'name', 
            headerName: 'Name', 
            flex: 1,
            minWidth: 150 
        },
        { 
            field: 'description', 
            headerName: 'Description', 
            flex: 2,
            minWidth: 200,
            renderCell: (params) => (
                <Tooltip title={params.value || ''}>
                    <span>{params.value || ''}</span>
                </Tooltip>
            )
        },
        {
            field: 'course_count',
            headerName: 'Courses',
            flex: 1,
            minWidth: 100,
            type: 'number'
        },
        {
            field: 'created_at',
            headerName: 'Created At',
            flex: 1,
            minWidth: 150,
            valueFormatter: (params) => 
                params.value ? new Date(params.value).toLocaleString() : ''
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            minWidth: 120,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <Tooltip title="Edit">
                        <IconButton 
                            onClick={() => handleOpenDialog(params.row)}
                            size="small"
                            color="primary"
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton 
                            onClick={() => handleDelete(params.row.id)}
                            size="small"
                            color="error"
                            disabled={params.row.course_count > 0}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            {/* Header */}
            <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                mb={2}
            >
                <Typography variant="h4" component="h1">
                    Category Management
                </Typography>
                <Box>
                    <Tooltip title="Refresh">
                        <IconButton 
                            onClick={fetchCategories}
                            disabled={loading}
                            sx={{ mr: 1 }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        disabled={loading}
                    >
                        Add Category
                    </Button>
                </Box>
            </Box>

            {/* Error display */}
            {error && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Data Grid */}
            <Paper sx={{ height: 500, width: '100%' }}>
                <DataGrid
                    rows={categories}
                    columns={columns}
                    pageSize={10}
                    rowsPerPageOptions={[5, 10, 20]}
                    disableSelectionOnClick
                    loading={loading}
                    components={{
                        NoRowsOverlay: () => (
                            <Box 
                                display="flex" 
                                alignItems="center" 
                                justifyContent="center" 
                                height="100%"
                            >
                                <Typography color="text.secondary">
                                    {error ? 'Error loading data' : 'No categories found'}
                                </Typography>
                            </Box>
                        ),
                    }}
                    density="comfortable"
                    sx={{
                        '& .MuiDataGrid-cell': {
                            cursor: 'pointer'
                        }
                    }}
                />
            </Paper>

            {/* Add/Edit Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={handleCloseDialog} 
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle>
                    {editCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
                <DialogContent>
                    <Box 
                        component="form" 
                        noValidate 
                        sx={{ mt: 1 }}
                        onSubmit={handleSubmit}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            autoFocus
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Description"
                            name="description"
                            multiline
                            rows={4}
                            value={formData.description}
                            onChange={handleInputChange}
                            error={!!formErrors.description}
                            helperText={formErrors.description}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleCloseDialog}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        variant="contained"
                        disabled={loading}
                    >
                        {editCategory ? 'Save Changes' : 'Add Category'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CategoryManagement;