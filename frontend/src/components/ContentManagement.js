import React, { useState, useRef } from 'react';
import { 
  Typography, 
  Container,
  Box,
  Button,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import PostsTable from './PostsTable';
import PostEditor from './PostEditor';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const ContentManagement = () => {
  const { getAccessTokenSilently } = useAuth0();
  const postsTableRef = useRef();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingPost, setEditingPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    // Refresh the posts table to show the updated data
    if (postsTableRef.current) {
      postsTableRef.current.refresh();
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Content Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all posts in your content library. Edit, archive, or delete posts as needed.
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
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box>
        <PostsTable ref={postsTableRef} onEdit={handleEditPost} />
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