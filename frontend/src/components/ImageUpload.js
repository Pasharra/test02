import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const ImageUpload = ({ 
  value, 
  onChange, 
  error, 
  helperText,
  required = false,
  maxSize = 2 * 1024 * 1024, // 2MB default
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const errors = [];
    
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`File type not supported. Please use: ${acceptedTypes.join(', ')}`);
    }
    
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      errors.push(`File size too large. Maximum size: ${maxSizeMB}MB`);
    }
    
    return errors;
  };

  const handleFileSelect = async (file) => {
    const validationErrors = validateFile(file);
    
    if (validationErrors.length > 0) {
      // You could show these errors in a snackbar or pass them up
      console.error('File validation errors:', validationErrors);
      return;
    }

    setUploading(true);
    
          try {
        setUploadError('');
        const token = await getAccessTokenSilently();
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${BACKEND_URI}/api/admin/image/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const data = await response.json();
        const imageData = {
          file,
          previewUrl: data.url,
          uploadedUrl: data.url,
          name: file.name,
          size: file.size,
          type: file.type
        };
        
        onChange(imageData);
        
      } catch (error) {
        setUploadError(error.message);
        console.error('Error uploading image:', error);
      } finally {
        setUploading(false);
      }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleRemove = () => {
    if (value?.previewUrl && !value?.uploadedUrl) {
      // Only revoke object URL if it's a local preview, not an uploaded image
      URL.revokeObjectURL(value.previewUrl);
    }
    setUploadError('');
    onChange(null);
  };

  const handleReplace = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Header Banner Image {required && <span style={{ color: 'red' }}>*</span>}
      </Typography>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
      />

      {!value ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            border: dragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
            backgroundColor: dragOver ? '#f5f5f5' : 'transparent',
            '&:hover': {
              backgroundColor: '#f9f9f9',
              borderColor: '#1976d2'
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Box>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Processing image...
              </Typography>
            </Box>
          ) : (
            <Box>
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload Banner Image
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Drag and drop an image here, or click to select
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported formats: {acceptedTypes.join(', ').toUpperCase()}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary">
                Maximum size: {(maxSize / (1024 * 1024)).toFixed(1)}MB
              </Typography>
            </Box>
          )}
        </Paper>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <img
                src={value.previewUrl}
                alt="Banner preview"
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 1
                }}
              >
                <IconButton
                  size="small"
                  onClick={handleReplace}
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleRemove}
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>{value.name}</strong> ({formatFileSize(value.size)})
            </Typography>
          </Paper>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={handleReplace}
            >
              Replace
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleRemove}
            >
              Remove
            </Button>
          </Box>
        </Box>
      )}

      {(error || uploadError) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error || uploadError}
        </Alert>
      )}
      
      {helperText && !error && !uploadError && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default ImageUpload; 