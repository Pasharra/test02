import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Visibility as ViewsIcon,
  ThumbUp as LikesIcon,
  Comment as CommentsIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const AdminPostTable = forwardRef(({ onEdit, filters = {} }, ref) => {
  const { getAccessTokenSilently } = useAuth0();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef();
  const loadingRef = useRef();

  const POSTS_PER_PAGE = 20;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch posts from API
  const fetchPosts = useCallback(async (pageNum = 0, append = false) => {
    console.log('fetchPosts called', pageNum, append, hasMore);
    
    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('Already loading, skipping request');
      return;
    }
    
    try {
      setLoading(true);
      setError('');

      const token = await getAccessTokenSilently();
      const offset = pageNum * POSTS_PER_PAGE;
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: POSTS_PER_PAGE,
        offset: offset,
        sort: filters.sort || 'date'
      });

      // Add filter parameters if they exist
      if (filters.title && filters.title.trim()) {
        params.append('title', filters.title.trim());
      }
      if (filters.status && filters.status.trim()) {
        params.append('status', filters.status.trim());
      }
      if (filters.labels && filters.labels.length > 0) {
        params.append('labels', filters.labels.join(','));
      }
      
      const response = await fetch(
        `${BACKEND_URI}/api/admin/posts?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      
      if (append) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }

      // Check if we have more posts to load
      // If we got fewer posts than requested, there are no more posts
      setHasMore(data.posts && data.posts.length === POSTS_PER_PAGE);
      
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
      // On error, stop trying to load more
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, filters]);

  // Initial load
  useEffect(() => {
    console.log('Initial load useEffect triggered');
    fetchPosts(0, false);
  }, []);

  // Filter changes - only when filters are actually applied
  useEffect(() => {
    console.log('Applied filters changed');
    // Reset pagination when filters change
    setPage(0);
    setHasMore(true);
    fetchPosts(0, false);
  }, [filters.title, filters.status, filters.sort, JSON.stringify(filters.labels)]);

  // Refresh function to reload posts from the beginning
  const refreshPosts = useCallback(() => {
    console.log('refreshPosts called');
    setPage(0);
    setHasMore(true);
    // Force a refresh by calling fetchPosts directly
    fetchPosts(0, false);
  }, [fetchPosts]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: refreshPosts
  }));

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(() => {
    if (hasMore && !loading && posts.length > 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  }, [hasMore, loading, page, fetchPosts, posts.length]);

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

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMorePosts, posts.length]);

  // Action handlers
  const handleEdit = (postId) => {
    if (onEdit) {
      onEdit(postId);
    }
  };

  const handleArchive = async (postId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${BACKEND_URI}/api/admin/posts/${postId}/ARCHIVED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to archive post');
      }

      // Refresh the table after successful archive
      refreshPosts();
    } catch (err) {
      console.error('Error archiving post:', err);
      setError('Failed to archive post. Please try again.');
    }
  };

  const handleUnarchive = async (postId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${BACKEND_URI}/api/admin/posts/${postId}/PUBLISHED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unarchive post');
      }

      // Refresh the table after successful unarchive
      refreshPosts();
    } catch (err) {
      console.error('Error unarchiving post:', err);
      setError('Failed to unarchive post. Please try again.');
    }
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Handle empty state when no posts and not loading
  if (posts.length === 0 && !loading) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Posts Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no posts to display. Posts will appear here once they are created.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Handle initial loading state
  if (posts.length === 0 && loading) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading posts...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Labels</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell><strong>Updated</strong></TableCell>
              <TableCell align="center"><strong>Views</strong></TableCell>
              <TableCell align="center"><strong>Likes</strong></TableCell>
              <TableCell align="center"><strong>Comments</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {post.title}
                  </Typography>
                  {post.isPremium && (
                    <Chip 
                      label="Premium" 
                      size="small" 
                      color="warning" 
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </TableCell>
                
                <TableCell>
                  <Chip 
                    label={post.status || 'DRAFT'} 
                    size="small" 
                    color={
                      post.status === 'PUBLISHED' ? 'success' : 
                      post.status === 'DRAFT' ? 'warning' : 
                      'default'
                    }
                    variant="outlined"
                  />
                </TableCell>
                
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {post.labels && post.labels.length > 0 ? (
                      post.labels.map((label, index) => (
                        <Chip 
                          key={index}
                          label={label} 
                          size="small" 
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No labels
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(post.createdOn)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {/* Note: updatedOn is not available in PostListData, showing createdOn as fallback */}
                    {formatDate(post.createdOn)}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <ViewsIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {/* Views not tracked in current schema */}
                      0
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <LikesIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {post.numberOfLikes || 0}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <CommentsIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {post.numberOfComments || 0}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="Edit Post">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEdit(post.id)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Show Archive button for DRAFT and PUBLISHED posts */}
                    {(post.status === 'DRAFT' || post.status === 'PUBLISHED') && (
                      <Tooltip title="Archive Post">
                        <IconButton 
                          size="small" 
                          color="secondary"
                          onClick={() => handleArchive(post.id)}
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* Show Unarchive button only for ARCHIVED posts */}
                    {post.status === 'ARCHIVED' && (
                      <Tooltip title="Unarchive Post">
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => handleUnarchive(post.id)}
                        >
                          <UnarchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          
          {!hasMore && (
            <Typography variant="body2" color="text.secondary">
              No more posts to load
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
});

export default AdminPostTable; 