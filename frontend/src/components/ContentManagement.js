import React, { useState } from 'react';
import { 
  Typography, 
  Container,
  Box,
  Button,
  Stack
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import PostsTable from './PostsTable';
import PostEditor from './PostEditor';

const ContentManagement = () => {
  const [editorOpen, setEditorOpen] = useState(false);

  const handleNewPost = () => {
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
  };

  const handlePostSave = (result) => {
    // TODO: Refresh the posts table or add the new post to the list
    console.log('Post saved:', result);
    // You might want to trigger a refresh of the PostsTable here
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
      
      <Box>
        <PostsTable />
      </Box>

      <PostEditor
        open={editorOpen}
        onClose={handleEditorClose}
        onSave={handlePostSave}
        mode="create"
      />
    </Container>
  );
};

export default ContentManagement; 