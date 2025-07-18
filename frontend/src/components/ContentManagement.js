import React, { useState, useRef } from 'react';
import { 
  Typography, 
  Container,
  Box,
  Button,
  Stack,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import PostsTable from './PostsTable';
import PostEditor from './PostEditor';
import LabelsSelector from './LabelsSelector';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const ContentManagement = () => {
  const { getAccessTokenSilently } = useAuth0();
  const postsTableRef = useRef();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingPost, setEditingPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter and sort state
  const [filters, setFilters] = useState({
    title: '',
    labels: [],
    status: '',
    sort: 'date'
  });

  // Temporary filter state (before applying)
  const [tempFilters, setTempFilters] = useState({
    title: '',
    labels: [],
    status: '',
    sort: 'date'
  });

  const handleNewPost = () => {
    setEditorMode('create');
    setEditingPost(null);
    setEditorOpen(true);
  };

  const handleEditPost = async (postId) => {
    setLoading(true);
    setError('');
    
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${BACKEND_URI}/api/admin/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch post data');
      }

      const data = await response.json();
      setEditingPost(data.post);
      setEditorMode('edit');
      setEditorOpen(true);
    } catch (err) {
      console.error('Error fetching post for edit:', err);
      setError('Failed to load post data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingPost(null);
    setError('');
  };

  const handlePostSave = (result) => {
    console.log('Post saved:', result);
    console.log('Refreshing posts table...');
    // Refresh the posts table to show the updated data
    if (postsTableRef.current) {
      postsTableRef.current.refresh();
      console.log('Posts table refresh called');
    } else {
      console.error('PostsTable ref is not available');
    }
  };

  // Handle temporary filter changes (before applying)
  const handleTempFilterChange = (filterType, value) => {
    setTempFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle sort changes (apply immediately)
  const handleSortChange = (value) => {
    setFilters(prev => ({
      ...prev,
      sort: value
    }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    setFilters(tempFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      title: '',
      labels: [],
      status: '',
      sort: 'date'
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = filters.title || filters.labels.length > 0 || filters.status || filters.sort !== 'date';

  // Check if temp filters are different from applied filters
  const hasUnappliedChanges = 
    tempFilters.title !== filters.title ||
    tempFilters.status !== filters.status ||
    JSON.stringify(tempFilters.labels) !== JSON.stringify(filters.labels);

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, px: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Content Management
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewPost}
          size="large"
        >
          New Post
        </Button>
      </Stack>

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

          {/* Second Row: Status, Labels */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth sx={{ minWidth: 150 }} size="small">
                <InputLabel shrink>Status</InputLabel>
                <Select
                  value={tempFilters.status}
                  onChange={(e) => handleTempFilterChange('status', e.target.value)}
                  label="Status"
                  notched
                  size="small"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={8}>
              <LabelsSelector
                value={tempFilters.labels}
                onChange={(value) => handleTempFilterChange('labels', value)}
                showTitle={false}
              />
            </Grid>
          </Grid>

          {/* Apply Filters Button */}
          {hasUnappliedChanges && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </Button>
            </Box>
          )}

          {/* Sort Selector - Below Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="subtitle2">
              Sort By:
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={filters.sort}
                onChange={(e) => handleSortChange(e.target.value)}
                displayEmpty
                variant="outlined"
                size="small"
              >
                <MenuItem value="date">Date (Latest First)</MenuItem>
                <MenuItem value="likes">Likes (Most First)</MenuItem>
                <MenuItem value="comments">Comments (Most First)</MenuItem>
                <MenuItem value="views">Views (Most First)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box>
        <PostsTable 
          ref={postsTableRef} 
          onEdit={handleEditPost}
          filters={filters}
        />
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography variant="body2">Loading post data...</Typography>
        </Box>
      )}

      <PostEditor
        open={editorOpen}
        onClose={handleEditorClose}
        onSave={handlePostSave}
        mode={editorMode}
        initialData={editingPost}
      />
    </Container>
  );
};

export default ContentManagement; 