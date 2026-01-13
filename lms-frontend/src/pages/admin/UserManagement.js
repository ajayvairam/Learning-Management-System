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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        user_type: 'STUDENT',
        team: '',
        password: '',
        password2: '',
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        fetchUsers();
        fetchTeams();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showSnackbar('Failed to fetch users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeams = async () => {
        try {
            const response = await api.get('/teams/');
            setTeams(response.data);
        } catch (error) {
            console.error('Error fetching teams:', error);
            showSnackbar('Failed to fetch teams', 'error');
        }
    };

    const handleOpenDialog = (user = null) => {
        if (user) {
            setEditUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type,
                team: user.team && user.team.id ? String(user.team.id) : '',
                password: '',
                password2: '',
            });
        } else {
            setEditUser(null);
            setFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                user_type: 'STUDENT',
                team: '',
                password: '',
                password2: '',
            });
        }
        setFormErrors({});
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditUser(null);
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.email) errors.email = 'Email is required';
        if (!formData.first_name) errors.first_name = 'First name is required';
        if (!formData.last_name) errors.last_name = 'Last name is required';
        if (!editUser && !formData.username) errors.username = 'Username is required';
        if (!editUser || (formData.password || formData.password2)) {
            if (!formData.password) errors.password = 'Password is required';
            if (!formData.password2) errors.password2 = 'Password confirmation is required';
            if (formData.password !== formData.password2) {
                errors.password2 = 'Passwords do not match';
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const apiData = {
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                user_type: formData.user_type,
                username: formData.username,
            };

            // Always send team_id as a number or null to backend
            if (formData.team === '' || formData.team === null) {
                apiData.team_id = null;
            } else {
                apiData.team_id = Number(formData.team);
            }

            if (!editUser) {
                apiData.password = formData.password;
                apiData.password2 = formData.password2;
                await api.post('/users/', apiData);
                showSnackbar('User created successfully', 'success');
            } else {
                if (formData.password && formData.password2) {
                    apiData.password = formData.password;
                    apiData.password2 = formData.password2;
                }
                await api.put(`/users/${editUser.id}/`, apiData);
                showSnackbar('User updated successfully', 'success');
            }

            fetchUsers();
            handleCloseDialog();
        } catch (error) {
            console.error('Error saving user:', error);
            const errorMessage = error.response?.data
                ? Object.values(error.response.data).flat().join(', ')
                : 'An error occurred while saving the user';
            showSnackbar(errorMessage, 'error');
            if (error.response?.data) {
                setFormErrors(error.response.data);
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/users/${id}/`);
                showSnackbar('User deleted successfully', 'success');
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                showSnackbar('Failed to delete user', 'error');
            }
        }
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const columns = [
        { field: 'username', headerName: 'Username', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1 },
        { field: 'first_name', headerName: 'First Name', flex: 1 },
        { field: 'last_name', headerName: 'Last Name', flex: 1 },
        { field: 'user_type', headerName: 'Type', flex: 1 },
        {
            field: 'team',
            headerName: 'Team',
            flex: 1,
            // Use renderCell to show team name correctly
            renderCell: (params) => {
                if (!params || !params.row) return 'No Team';
                if (params.row.team && typeof params.row.team === 'object') {
                    return params.row.team.name || 'No Team';
                }
                return 'No Team';
            },
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            renderCell: (params) => (
                <Box>
                    <Tooltip title="Edit">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleOpenDialog(params.row); }}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(params.row.id); }}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4">User Management</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    Add User
                </Button>
            </Box>

            <Paper sx={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                    getRowId={(row) => row.id}
                />
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogContent>
                    <Box component="form" noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={editUser}
                            error={!!formErrors.username}
                            helperText={formErrors.username}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            error={!!formErrors.first_name}
                            helperText={formErrors.first_name}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            error={!!formErrors.last_name}
                            helperText={formErrors.last_name}
                        />

                        {editUser ? (
                            <>
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    label="New Password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    error={!!formErrors.password}
                                    helperText={formErrors.password}
                                />
                                <TextField
                                    margin="normal"
                                    fullWidth
                                    label="Confirm New Password"
                                    name="password2"
                                    type="password"
                                    value={formData.password2}
                                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                    error={!!formErrors.password2}
                                    helperText={formErrors.password2}
                                />
                            </>
                        ) : (
                            <>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    label="Password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    error={!!formErrors.password}
                                    helperText={formErrors.password}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    label="Confirm Password"
                                    name="password2"
                                    type="password"
                                    value={formData.password2}
                                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                    error={!!formErrors.password2}
                                    helperText={formErrors.password2}
                                />
                            </>
                        )}

                        <FormControl fullWidth margin="normal">
                            <InputLabel>User Type</InputLabel>
                            <Select
                                value={formData.user_type}
                                label="User Type"
                                onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                            >
                                <MenuItem value="STUDENT">Student</MenuItem>
                                <MenuItem value="ADMIN">Admin</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Team</InputLabel>
                            <Select
                                value={formData.team}
                                label="Team"
                                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                            >
                                <MenuItem value="">No Team</MenuItem>
                                {teams.map((team) => (
                                    <MenuItem key={team.id} value={String(team.id)}>
                                        {team.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editUser ? 'Save Changes' : 'Add User'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement;