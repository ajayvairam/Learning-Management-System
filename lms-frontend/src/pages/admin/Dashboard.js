import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Avatar,
  Stack,
} from '@mui/material';
import { Person, School, Groups, Assignment } from '@mui/icons-material';
import api from '../../api';

const StatCard = ({ title, value, icon, color }) => (
  <Card 
    sx={{ 
      height: '100%',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4,
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          sx={{
            bgcolor: `${color}.main`,
            width: 56,
            height: 56,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            color="text.secondary" 
            variant="body2" 
            sx={{ fontWeight: 500, mb: 0.5 }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const ActivityItem = ({ user, course, date, type }) => (
  <Paper 
    variant="outlined" 
    sx={{ 
      p: 2, 
      mb: 2,
      borderRadius: 2,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        boxShadow: 2,
        borderColor: 'primary.main',
      },
    }}
  >
    <Stack spacing={1}>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
          {user}
        </Box>
        {' '}
        {type === 'enrollment' ? 'enrolled in' : 'completed'}
        {' '}
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {course}
        </Box>
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
        {new Date(date).toLocaleString()}
      </Typography>
    </Stack>
  </Paper>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get('/admin/dashboard-stats/');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
      >
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No data available
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            color: 'text.primary',
            mb: 1,
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your learning management system
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers ?? 0}
            icon={<Person sx={{ color: 'white' }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Courses"
            value={stats.activeCourses ?? 0}
            icon={<School sx={{ color: 'white' }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Teams"
            value={stats.totalTeams ?? 0}
            icon={<Groups sx={{ color: 'white' }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Enrollments"
            value={stats.totalEnrollments ?? 0}
            icon={<Assignment sx={{ color: 'white' }} />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Paper 
        sx={{ 
          p: 4,
          borderRadius: 3,
          boxShadow: 2,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
            }}
          >
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Latest enrollments and course completions
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={4}>
          <Grid item xs={12} lg={6}>
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <School color="primary" />
                Latest Enrollments
              </Typography>
            </Box>
            
            {stats.recentEnrollments && stats.recentEnrollments.length > 0 ? (
              <Box>
                {stats.recentEnrollments.map((enrollment) => (
                  <ActivityItem
                    key={enrollment.id}
                    user={enrollment.user?.username}
                    course={enrollment.course?.title}
                    date={enrollment.enrolled_on}
                    type="enrollment"
                  />
                ))}
              </Box>
            ) : (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No recent enrollments
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12} lg={6}>
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Assignment color="success" />
                Latest Course Completions
              </Typography>
            </Box>
            
            {stats.recentCompletions && stats.recentCompletions.length > 0 ? (
              <Box>
                {stats.recentCompletions.map((completion) => (
                  <ActivityItem
                    key={completion.id}
                    user={completion.user?.username}
                    course={completion.course?.title}
                    date={completion.completed_on}
                    type="completion"
                  />
                ))}
              </Box>
            ) : (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No recent course completions
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;