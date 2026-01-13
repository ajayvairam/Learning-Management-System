import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Card, CardContent,
  Divider, Stack, Avatar, Badge
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  PersonAdd as PersonAddIcon, PersonRemove as PersonRemoveIcon,
  School as SchoolIcon, Groups as GroupsIcon, Assignment as AssignmentIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [openCourseDialog, setOpenCourseDialog] = useState(false);

  const [editTeam, setEditTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);

  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
    fetchCourses();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams/');
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/?user_type=STUDENT');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleOpenDialog = (team = null) => {
    if (team) {
      setEditTeam(team);
      setFormData({ name: team.name, description: team.description });
    } else {
      setEditTeam(null);
      setFormData({ name: '', description: '' });
    }
    setOpenDialog(true);
  };

  const handleOpenMemberDialog = async (team) => {
    try {
      const response = await api.get(`/teams/${team.id}/`);
      setEditTeam(response.data);
      setOpenMemberDialog(true);
    } catch (error) {
      console.error('Error fetching team details:', error);
    }
  };

  const handleOpenCourseDialog = async (team) => {
    try {
      const response = await api.get(`/teams/${team.id}/`);
      setEditTeam(response.data);
      setSelectedCourses(response.data.courses.map(c => c.id));
      setOpenCourseDialog(true);
    } catch (error) {
      console.error('Error fetching team courses:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditTeam(null);
  };

  const handleCloseMemberDialog = () => {
    setOpenMemberDialog(false);
    setSelectedUser('');
  };

  const handleCloseCourseDialog = () => {
    setOpenCourseDialog(false);
    setSelectedCourses([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTeam) {
        await api.put(`/teams/${editTeam.id}/`, formData);
      } else {
        await api.post('/teams/', formData);
      }
      fetchTeams();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const handleAddMember = async () => {
    try {
      await api.post(`/teams/${editTeam.id}/members/`, {
        user_id: selectedUser
      });
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      fetchTeams();
      setSelectedUser('');
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(`/teams/${editTeam.id}/members/${userId}/`);
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      fetchTeams();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleAssignCourses = async () => {
    try {
      await api.put(`/teams/${editTeam.id}/assign_courses/`, {
        course_ids: selectedCourses,
      });
      const response = await api.get(`/teams/${editTeam.id}/`);
      console.log('Updated team after assigning courses:', response.data);
      setEditTeam(response.data);
      fetchTeams();
      handleCloseCourseDialog();
    } catch (error) {
      console.error('Error assigning courses:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await api.delete(`/teams/${id}/`);
        fetchTeams();
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const columns = [
    { 
      field: 'name', 
      headerName: 'Team Name', 
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: 'primary.main',
              fontSize: '0.875rem'
            }}
          >
            {params.value.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'description', 
      headerName: 'Description', 
      flex: 2,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {params.value || 'No description'}
        </Typography>
      )
    },
    {
      field: 'members_count',
      headerName: 'Members',
      flex: 1,
      renderCell: (params) => (
        <Badge 
          badgeContent={params.row.members_count} 
          color="primary"
          sx={{ cursor: 'pointer' }}
          onClick={() => handleOpenMemberDialog(params.row)}
        >
          <Chip
            icon={<GroupsIcon />}
            label="Members"
            variant="outlined"
            color="primary"
            size="small"
            clickable
            sx={{ 
              borderRadius: '16px',
              '&:hover': {
                backgroundColor: 'primary.50'
              }
            }}
          />
        </Badge>
      ),
    },
    {
      field: 'courses',
      headerName: 'Assigned Courses',
      flex: 3,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const assignedCourses = params.row.courses || [];
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              flexWrap: 'wrap',
              width: '100%',
              py: 1
            }}
          >
            {assignedCourses.length > 0 ? (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {assignedCourses.slice(0, 2).map((course) => (
                  <Chip
                    key={course.id}
                    label={course.title}
                    icon={<SchoolIcon />}
                    size="small"
                    variant="filled"
                    color="secondary"
                    sx={{ 
                      maxWidth: 120,
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
                {assignedCourses.length > 2 && (
                  <Chip
                    label={`+${assignedCourses.length - 2} more`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderRadius: '12px',
                      fontSize: '0.7rem'
                    }}
                  />
                )}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No courses assigned
              </Typography>
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<AssignmentIcon />}
              onClick={() => handleOpenCourseDialog(params.row)}
              sx={{ 
                ml: 'auto',
                borderRadius: '16px',
                textTransform: 'none',
                fontSize: '0.75rem',
                minWidth: 'auto',
                px: 1.5
              }}
            >
              Manage
            </Button>
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit Team" arrow>
            <IconButton 
              size="small"
              onClick={() => handleOpenDialog(params.row)}
              sx={{ 
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'primary.50' }
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Manage Members" arrow>
            <IconButton 
              size="small"
              onClick={() => handleOpenMemberDialog(params.row)}
              sx={{ 
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'info.50' }
              }}
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Team" arrow>
            <IconButton 
              size="small"
              onClick={() => handleDelete(params.row.id)}
              sx={{ 
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'error.50' }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Card 
        elevation={0} 
        sx={{ 
          mb: 3, 
          bgcolor: 'primary.50',
          border: '1px solid',
          borderColor: 'primary.100'
        }}
      >
        <CardContent>
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center"
          >
            <Box>
              <Typography 
                variant="h4" 
                fontWeight="bold" 
                color="primary.main"
                gutterBottom
              >
                Team Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Details
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ 
                borderRadius: '12px',
                textTransform: 'none',
                px: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'medium'
              }}
            >
              Create Team
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper 
        elevation={0}
        sx={{ 
          height: 500, 
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        <DataGrid
          rows={teams}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          disableSelectionOnClick
          loading={loading}
          getRowId={(row) => row.id}
          autoHeight={false}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'grey.50',
              fontSize: '0.875rem',
              fontWeight: 'medium'
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                bgcolor: 'action.hover'
              }
            },
            '& .MuiDataGrid-cell': {
              border: 'none',
              py: 1
            }
          }}
        />
      </Paper>

      {/* Team Dialog - Enhanced Material Design */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight="medium">
            {editTeam ? 'Edit Team' : 'Create New Team'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {editTeam ? 'Update team details' : 'Add a new team to your organization'}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Team Name"
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px'
              }
            }}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Description"
            variant="outlined"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{ 
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            {editTeam ? 'Save Changes' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Dialog - Enhanced */}
      <Dialog 
        open={openMemberDialog} 
        onClose={handleCloseMemberDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight="medium">
            Manage Team Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add or remove members from {editTeam?.name}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Current Members
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              maxHeight: 200, 
              overflow: 'auto',
              borderRadius: '12px'
            }}
          >
            <List dense>
              {editTeam?.members?.map((member) => (
                <ListItem key={member.id} divider>
                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                    {member.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText 
                    primary={member.username}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Remove Member" arrow>
                      <IconButton 
                        edge="end" 
                        onClick={() => handleRemoveMember(member.id)}
                        size="small"
                        sx={{ color: 'error.main' }}
                      >
                        <PersonRemoveIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {(!editTeam?.members || editTeam.members.length === 0) && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No members in this team yet
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="medium">
              Add New Member
            </Typography>
            <Stack direction="row" spacing={2} alignItems="flex-end">
              <FormControl fullWidth>
                <InputLabel id="select-user-label">Select Student</InputLabel>
                <Select
                  labelId="select-user-label"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  input={<OutlinedInput label="Select Student" />}
                  sx={{
                    borderRadius: '12px'
                  }}
                >
                  {users
                    .filter((u) => !editTeam?.members?.some((m) => m.id === u.id))
                    .map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.username}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddMember}
                disabled={!selectedUser}
                startIcon={<PersonAddIcon />}
                sx={{ 
                  borderRadius: '12px',
                  textTransform: 'none',
                  px: 3
                }}
              >
                Add
              </Button>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCloseMemberDialog}
            variant="contained"
            sx={{ 
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Courses Dialog - Enhanced */}
      <Dialog 
        open={openCourseDialog} 
        onClose={handleCloseCourseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight="medium">
            Assign Courses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select courses for {editTeam?.name}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="assign-courses-label">Select Courses</InputLabel>
            <Select
              labelId="assign-courses-label"
              multiple
              value={selectedCourses}
              onChange={(e) => setSelectedCourses(e.target.value)}
              input={<OutlinedInput label="Select Courses" />}
              sx={{
                borderRadius: '12px'
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((courseId) => {
                    const course = courses.find(c => c.id === courseId);
                    return course ? (
                      <Chip 
                        key={course.id} 
                        label={course.title} 
                        icon={<SchoolIcon />}
                        size="small"
                        sx={{ borderRadius: '12px', '& .MuiChip-icon': {color: '#0000ff'}
                      }}
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon fontSize="small" />
                    {course.title}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCloseCourseDialog}
            variant="outlined"
            sx={{ 
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAssignCourses}
            startIcon={<AssignmentIcon />}
            sx={{ 
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            Assign Courses
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagement;