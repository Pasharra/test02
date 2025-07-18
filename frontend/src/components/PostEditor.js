import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import MDEditor from '@uiw/react-md-editor';
import ImageUpload from './ImageUpload';
import LabelsSelector from './LabelsSelector';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const PostEditor = ({ 
  open, 
  onClose, 
  onSave,
  initialData = null,
  mode = 'create' // 'create' or 'edit'
}) => {
  const { getAccessTokenSilently } = useAuth0();
  
  // Form state
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    image: initialData?.image || null,
    labels: initialData?.labels || [],
    isPremium: initialData?.isPremium || false,
    status: initialData?.status || 'DRAFT',
    readingTime: initialData?.readingTime || ''
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 500) {
      newErrors.title = 'Title must be 500 characters or less';
    }

    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    // Reading time validation
    if (formData.readingTime && isNaN(parseInt(formData.readingTime))) {
      newErrors.readingTime = 'Reading time must be a number';
    }

    // Labels validation
    if (!formData.labels || formData.labels.length === 0) {
      newErrors.labels = 'At least one label is required';
    }

    // Banner image validation is now handled by the ImageUpload component
    // No additional validation needed here since upload happens during file selection

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const token = await getAccessTokenSilently();
      
      // Prepare data for API
      const postData = {
        title: formData.title.trim(),
        content: formData.content,
        isPremium: formData.isPremium,
        status: formData.status,
        readingTime: formData.readingTime ? parseInt(formData.readingTime) : null,
        // Use the uploaded image URL if available
        image: formData.image?.uploadedUrl || '',
        // Labels are now simple strings, backend will handle creation/association
        labels: formData.labels
      };

      // API call to create/update post
      const url = mode === 'create' 
        ? `${BACKEND_URI}/api/admin/posts`
        : `${BACKEND_URI}/api/admin/posts/${initialData.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save post');
      }

      const result = await response.json();
      
      // Call onSave callback before closing dialog
      if (onSave) {
        onSave(result);
      }

      // Small delay to ensure refresh completes before closing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Close dialog
      onClose();

    } catch (error) {
      console.error('Error saving post:', error);
      setSubmitError(error.message || 'Failed to save post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      // Convert image URL string to ImageUpload format for editing
      let imageData = null;
      if (initialData?.image && typeof initialData.image === 'string') {
        // If image is a URL string, convert it to the format expected by ImageUpload
        imageData = {
          previewUrl: initialData.image,
          uploadedUrl: initialData.image,
          name: 'Banner Image',
          size: 0,
          type: 'image/jpeg'
        };
      } else if (initialData?.image && typeof initialData.image === 'object') {
        // If image is already an object, use it as is
        imageData = initialData.image;
      }

      setFormData({
        title: initialData?.title || '',
        content: initialData?.content || '',
        image: imageData,
        labels: initialData?.labels || [],
        isPremium: initialData?.isPremium || false,
        status: initialData?.status || 'DRAFT',
        readingTime: initialData?.readingTime || ''
      });
      setErrors({});
      setSubmitError('');
    }
  }, [open, initialData]);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        {mode === 'create' ? 'Create New Post' : 'Edit Post'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3} direction="column">
          {/* Banner Image */}
          <Grid item>
            <ImageUpload
              value={formData.image}
              onChange={(value) => handleFieldChange('image', value)}
              error={errors.image}
            />
          </Grid>

          {/* Title */}
          <Grid item>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              placeholder="Enter post title..."
            />
          </Grid>

          {/* Content - Markdown Editor */}
          <Grid item>
            <Typography variant="subtitle1" gutterBottom>
              Content <span style={{ color: 'red' }}>*</span>
            </Typography>
            <Box sx={{ border: errors.content ? '1px solid #d32f2f' : 'none', borderRadius: 1 }}>
              <MDEditor
                value={formData.content}
                onChange={(value) => handleFieldChange('content', value || '')}
                height={300}
                preview="edit"
                hideToolbar={false}
                data-color-mode="light"
              />
            </Box>
            {errors.content && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {errors.content}
              </Typography>
            )}
          </Grid>

          {/* Reading Time */}
          <Grid item>
            <TextField
              fullWidth
              label="Approximate Reading Time"
              value={formData.readingTime}
              onChange={(e) => handleFieldChange('readingTime', e.target.value)}
              error={!!errors.readingTime}
              helperText={errors.readingTime || "Enter reading time in minutes (optional)"}
              placeholder="e.g., 5"
              type="number"
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Labels */}
          <Grid item>
            <LabelsSelector
              value={formData.labels}
              onChange={(value) => handleFieldChange('labels', value)}
              error={errors.labels}
              helperText="Add labels for your post. New labels will be created automatically."
              required
            />
          </Grid>

          {/* Visibility */}
          <Grid item>
            <FormControl component="fieldset">
              <FormLabel component="legend">Visibility</FormLabel>
              <RadioGroup
                value={formData.isPremium ? 'premium' : 'free'}
                onChange={(e) => handleFieldChange('isPremium', e.target.value === 'premium')}
                row
              >
                <FormControlLabel 
                  value="free" 
                  control={<Radio />} 
                  label="Free" 
                />
                <FormControlLabel 
                  value="premium" 
                  control={<Radio />} 
                  label="Premium" 
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Post Status */}
          <Grid item>
            <FormControl fullWidth>
              <InputLabel>Post Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                label="Post Status"
              >
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PUBLISHED">Published</MenuItem>
                <MenuItem value="ARCHIVED">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Submit Error */}
        {submitError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {submitError}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : (mode === 'create' ? 'Create Post' : 'Update Post')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PostEditor; 