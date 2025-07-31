import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  Favorite,
  FavoriteBorder,
  Lock,
  Comment
} from '@mui/icons-material';

const PostCard = ({ post, onLike, onDislike, onFavorite }) => {
  const handleLike = () => {
    if (onLike) onLike(post.id);
  };

  const handleDislike = () => {
    if (onDislike) onDislike(post.id);
  };

  const handleFavorite = () => {
    if (onFavorite) onFavorite(post.id);
  };

  return (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        {/* Title and Premium Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
            {post.title}
          </Typography>
          {post.isPremium && (
            <Tooltip title="Premium content">
              <Lock color="warning" sx={{ ml: 1 }} />
            </Tooltip>
          )}
        </Box>

        {/* Post Image */}
        {post.image && (
          <CardMedia
            component="img"
            height="200"
            image={post.image}
            alt={post.title}
            sx={{ 
              mb: 2, 
              borderRadius: 1,
              objectFit: 'cover'
            }}
          />
        )}

        {/* Text Preview */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {post.preview}
        </Typography>

        {/* Labels */}
        {post.labels && post.labels.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {post.labels.map((label, index) => (
                <Chip
                  key={index}
                  label={label}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Action Buttons and Counters */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left side - Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              size="small" 
              onClick={handleLike}
              color={post.userReaction === 'like' ? 'primary' : 'default'}
            >
              <ThumbUp fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ mr: 2 }}>
              {post.numberOfLikes || 0}
            </Typography>

            <IconButton 
              size="small" 
              onClick={handleDislike}
              color={post.userReaction === 'dislike' ? 'error' : 'default'}
            >
              <ThumbDown fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ mr: 2 }}>
              {post.numberOfDislikes || 0}
            </Typography>

            <IconButton 
              size="small" 
              onClick={handleFavorite}
              color={post.isFavorite ? 'error' : 'default'}
            >
              {post.isFavorite ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
            </IconButton>
          </Box>

          {/* Right side - Comments counter */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Comment fontSize="small" color="action" sx={{ mr: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {post.numberOfComments || 0}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PostCard;