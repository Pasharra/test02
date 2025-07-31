import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Alert,
  TextField,
  Button,
  Stack
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import PostCard from './PostCard';
import LabelsSelector from './LabelsSelector';

const Posts = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef();

  // Filter states
  const [filters, setFilters] = useState({
    title: '',
    labels: []
  });
  const [tempFilters, setTempFilters] = useState({
    title: '',
    labels: []
  });

  const limit = 10;

  const fetchPosts = useCallback(async (reset = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAccessTokenSilently();
      const currentOffset = reset ? 0 : offset;
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString()
      });
      
      if (filters.title) {
        params.append('title', filters.title);
      }
      
      if (filters.labels && filters.labels.length > 0) {
        filters.labels.forEach(label => params.append('labels', label));
      }
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URI}/api/content/posts?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newPosts = data.posts || [];

      if (reset) {
        setPosts(newPosts);
        setOffset(newPosts.length);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setOffset(prev => prev + newPosts.length);
      }

      setHasMore(newPosts.length === limit);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, offset, loading, limit, filters]);

  const loadMorePosts = useCallback(() => {
    if (!loading && hasMore && posts.length > 0) {
      fetchPosts(false);
    }
  }, [fetchPosts, loading, hasMore, posts.length]);

  // Filter handling functions
  const handleTempFilterChange = (field, value) => {
    setTempFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters });
    setPosts([]);
    setOffset(0);
    setHasMore(true);
  };

  const hasFilterChanges = () => {
    return tempFilters.title !== filters.title || 
           JSON.stringify(tempFilters.labels) !== JSON.stringify(filters.labels);
  };

  // Initial load
  useEffect(() => {
    if (hasMore) {
      fetchPosts(true);
    }
  }, []);

  // Handle filter changes
  useEffect(() => {
    // Reset pagination when filters change
    setPosts([]);
    setOffset(0);
    setHasMore(true);
    fetchPosts(true);
  }, [filters.title, JSON.stringify(filters.labels)]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Don't set up observer if we don't have posts or no more posts to load
    if (!hasMore || posts.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 1.0 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [hasMore, loading, loadMorePosts, posts.length]);

  const handleLike = async (postId) => {
    // TODO: Implement like functionality
    console.log('Like post:', postId);
  };

  const handleDislike = async (postId) => {
    // TODO: Implement dislike functionality
    console.log('Dislike post:', postId);
  };

  const handleFavorite = async (postId) => {
    // TODO: Implement favorite functionality
    console.log('Favorite post:', postId);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Posts
      </Typography>

      {/* Filters Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          {/* First Row: Title Search - Full Width */}
          <TextField
            fullWidth
            size="small"
            label="Search by Title"
            value={tempFilters.title}
            onChange={(e) => handleTempFilterChange('title', e.target.value)}
            placeholder="Enter title..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ width: '100%', minWidth: '100%' }}
          />

          {/* Second Row: Labels */}
          <LabelsSelector
            value={tempFilters.labels}
            onChange={(labels) => handleTempFilterChange('labels', labels)}
            showTitle={false}
          />

          {/* Apply Filters Button */}
          {hasFilterChanges() && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading posts: {error}
        </Alert>
      )}

      {/* Handle initial loading state */}
      {posts.length === 0 && loading && (
        <Box>
          <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading posts...
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Handle empty state when no posts and not loading */}
      {posts.length === 0 && !loading && !error && (
        <Box>
          <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Posts Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There are no posts to display. Check back later for new content!
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Posts Feed */}
      {posts.length > 0 && (
        <Box>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onFavorite={handleFavorite}
            />
          ))}
        </Box>
      )}

      {/* Loading indicator for infinite scroll - only show when we have posts */}
      {posts.length > 0 && (
        <Box 
          ref={loadingRef}
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          py={3}
        >
          {loading && (
            <Box display="flex" alignItems="center">
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Loading more posts...
              </Typography>
            </Box>
          )}
          
          {!hasMore && !loading && (
            <Typography variant="body2" color="text.secondary">
              No more posts to load
            </Typography>
          )}
        </Box>
      )}
    </Container>
  );
};

export default Posts;