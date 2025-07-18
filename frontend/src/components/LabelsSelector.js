import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Stack,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const LabelsSelector = ({ 
  value = [], 
  onChange, 
  error, 
  required = false,
  showTitle = true
}) => {
  const [newLabelInput, setNewLabelInput] = useState('');
  const [inputError, setInputError] = useState('');

  // Handle adding a new label
  const handleAddLabel = () => {
    if (!newLabelInput.trim()) return;
    
    const trimmedInput = newLabelInput.trim();
    
    // Check if label already exists
    const exists = value.some(label => 
      label.toLowerCase() === trimmedInput.toLowerCase()
    );
    
    if (exists) {
      setInputError('Label already exists');
      return;
    }
    
    // Validate label format
    if (trimmedInput.length < 2) {
      setInputError('Label must be at least 2 characters long');
      return;
    }
    
    if (trimmedInput.length > 50) {
      setInputError('Label must be 50 characters or less');
      return;
    }
    
    // Add the new label
    onChange([...value, trimmedInput]);
    setNewLabelInput('');
    setInputError('');
  };

  // Handle removing a label
  const handleRemoveLabel = (labelToRemove) => {
    onChange(value.filter(label => label !== labelToRemove));
  };

  // Handle key press in input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddLabel();
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setNewLabelInput(e.target.value);
    setInputError('');
  };

  return (
    <Box>
      {showTitle && (
        <Typography variant="subtitle1" gutterBottom>
          Labels {required && <span style={{ color: 'red' }}>*</span>}
        </Typography>
      )}
      
      {/* Add New Label */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={newLabelInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Enter label name and press Enter or click Add"
          error={!!inputError}
          helperText={inputError}
          label="Add Label"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddLabel}
          disabled={!newLabelInput.trim()}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          Add
        </Button>
      </Box>

      {/* Current Labels */}
      {value.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {value.map((label, index) => (
              <Chip
                key={index}
                label={label}
                onDelete={() => handleRemoveLabel(label)}
                deleteIcon={<CloseIcon />}
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Validation Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      
      {/* Requirement Notice */}
      {required && value.length === 0 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          At least one label is required
        </Typography>
      )}
    </Box>
  );
};

export default LabelsSelector; 