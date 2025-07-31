import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  Favorite,
  FavoriteBorder,
  Lock,
  Comment
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';

const PostCard = ({ post: initialPost, onFavorite }) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [post, setPost] = useState(initialPost);
  const [loading, setLoading] = useState({ like: false, dislike: false });

  // Determine user's current reaction: 1 = like, 2 = dislike, null = no reaction
  const userReaction = post.reaction;
  const hasLiked = userReaction === 1;
  const hasDisliked = userReaction === 2;

  const handleReaction = async (action, reactionValue) => {
    if (!isAuthenticated) return;
    
    setLoading(prev => ({ ...prev, [action]: true }));
    
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URI}/api/content/posts/${post.id}/${action}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} post`);
      }

      const data = await response.json();
      
      // Update post data with new counts and user reaction
      setPost(prev => ({
        ...prev,
        numberOfLikes: data.likes,
        numberOfDislikes: data.dislikes,
        reaction: data.reaction
      }));

    } catch (error) {
      console.error(`Error ${action}ing post:`, error);
      // TODO: Show error message to user
    } finally {
      setLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const handleLike = () => handleReaction('like', 1);
  const handleDislike = () => handleReaction('dislike', 2);

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
            {/* Like Button */}
            <Tooltip title={!isAuthenticated ? 'Login to like posts' : hasLiked ? 'You liked this post' : 'Like this post'}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={handleLike}
                  disabled={!isAuthenticated || hasLiked || loading.like}
                  color={hasLiked ? 'primary' : 'default'}
                  sx={{ 
                    opacity: !isAuthenticated ? 0.5 : 1,
                    '&.Mui-disabled': {
                      color: hasLiked ? 'primary.main' : 'inherit'
                    }
                  }}
                >
                  {loading.like ? (
                    <CircularProgress size={16} />
                  ) : (
                    <ThumbUp fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ mr: 2 }}>
              {post.numberOfLikes || 0}
            </Typography>

            {/* Dislike Button */}
            <Tooltip title={!isAuthenticated ? 'Login to dislike posts' : hasDisliked ? 'You disliked this post' : 'Dislike this post'}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={handleDislike}
                  disabled={!isAuthenticated || hasDisliked || loading.dislike}
                  color={hasDisliked ? 'error' : 'default'}
                  sx={{ 
                    opacity: !isAuthenticated ? 0.5 : 1,
                    '&.Mui-disabled': {
                      color: hasDisliked ? 'error.main' : 'inherit'
                    }
                  }}
                >
                  {loading.dislike ? (
                    <CircularProgress size={16} />
                  ) : (
                    <ThumbDown fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ mr: 2 }}>
              {post.numberOfDislikes || 0}
            </Typography>

            {/* Favorite Button */}
            <Tooltip title={!isAuthenticated ? 'Login to favorite posts' : post.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={handleFavorite}
                  disabled={!isAuthenticated}
                  color={post.isFavorite ? 'error' : 'default'}
                  sx={{ opacity: !isAuthenticated ? 0.5 : 1 }}
                >
                  {post.isFavorite ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
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