import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Alert, 
  CircularProgress,
  Container
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

// Summary card component
const MetricCard = ({ label, value, isLoading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
          {value?.toLocaleString() || '0'}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Generate labels for the last 7 days
  const dayLabels = useMemo(() => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }));
    }
    return labels;
  }, []);

  // Chart data for user signups (last 7 days daily data)
  const userSignupData = useMemo(() => ({
    labels: dayLabels,
    datasets: [
      {
        label: 'New User Signups',
        data: metrics?.userSignups || [0, 1, 2, 3, 4, 5, 6],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  }), [dayLabels, metrics?.userSignups]);

  // Chart data for new posts (last 7 days daily data)
  const newPostsData = useMemo(() => ({
    labels: dayLabels,
    datasets: [
      {
        label: 'New Posts',
        data: metrics?.publishedPosts || [0, 1, 2, 3, 4, 5, 6],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  }), [dayLabels, metrics?.publishedPosts]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = await getAccessTokenSilently();
        const response = await fetch(`${BACKEND_URI}/api/admin/metrics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const data = await response.json();
        console.log(data);
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Unable to load metrics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [getAccessTokenSilently]);

  // Handle navigation to post detail view
  const handlePostClick = (postId) => {
    navigate(`/posts/${postId}`);
  };

  // Debug logging for chart data
  if (metrics) {
    console.log('User signups data:', metrics.userSignups);
    console.log('Published posts data:', metrics.publishedPosts);
    console.log('Chart userSignupData:', userSignupData.datasets[0].data);
    console.log('Chart newPostsData:', newPostsData.datasets[0].data);
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* User Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="Total Users" 
            value={metrics?.totalUsers} 
            isLoading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="New Users (7 days)" 
            value={metrics?.newUsersInLast7Days} 
            isLoading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="New Users (30 days)" 
            value={metrics?.newUsersInLast30Days} 
            isLoading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="Active Subscriptions" 
            value={metrics?.numberOfActiveSubscriptions} 
            isLoading={loading}
          />
        </Grid>
        
        {/* Post Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="Total Posts" 
            value={metrics?.totalPublishedPosts} 
            isLoading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="New Posts (7 days)" 
            value={metrics?.newPublishedPostsInLast7Days} 
            isLoading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            label="New Posts (30 days)" 
            value={metrics?.newPublishedPostsInLast30Days} 
            isLoading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {/* Empty slot for future metric or spacing */}
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Signups
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Line data={userSignupData} options={chartOptions} />
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                New Posts
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Bar data={newPostsData} options={chartOptions} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Most Liked and Commented Posts */}
      {metrics?.top5MostLikedPosts && metrics?.top5MostCommentedPosts && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Most Liked Posts
                </Typography>
                {metrics.top5MostLikedPosts.map((post, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: index < 4 ? '1px solid #eee' : 'none' }}>
                    <Typography 
                      variant="body2" 
                      noWrap
                      sx={{ 
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => handlePostClick(post.id)}
                    >
                      {post.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.numberOfLikes} likes
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Most Commented Posts
                </Typography>
                {metrics.top5MostCommentedPosts.map((post, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: index < 4 ? '1px solid #eee' : 'none' }}>
                    <Typography 
                      variant="body2" 
                      noWrap
                      sx={{ 
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => handlePostClick(post.id)}
                    >
                      {post.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.numberOfComments} comments
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AdminDashboard; 