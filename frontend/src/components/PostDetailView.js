import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  Favorite,
  FavoriteBorder,
  ArrowBack,
  AccessTime,
  Send,
  Person
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import ReactMarkdown from 'react-markdown';

const PostDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, getAccessTokenSilently, isLoading: authLoading } = useAuth0();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentRestricted, setContentRestricted] = useState(false);
  const [actionLoading, setActionLoading] = useState({ like: false, dislike: false, favorite: false });
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        
        let headers = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if user is authenticated
        if (isAuthenticated) {
          try {
            const token = await getAccessTokenSilently();
            headers['Authorization'] = `Bearer ${token}`;
          } catch (authError) {
            console.warn('Failed to get access token:', authError);
          }
        }

        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URI}/api/content/posts/${id}`,
          { headers }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          setPost(data.post);
          setContentRestricted(data.contentRestricted || false);
        } else {
          setError('Failed to load post');
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    // Wait for Auth0 to finish loading before fetching post
    if (id && !authLoading) {
      fetchPost();
    }
  }, [id, isAuthenticated, getAccessTokenSilently, authLoading]);

  // Determine user's current reaction
  const userReaction = post?.reaction;
  const hasLiked = userReaction === 1;
  const hasDisliked = userReaction === 2;

  // Handle reaction (like/dislike)
  const handleReaction = async (action, reactionValue) => {
    if (!isAuthenticated) return;
    
    setActionLoading(prev => ({ ...prev, [action]: true }));
    
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
      setActionLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  // Handle favorite toggle
  const handleFavorite = async () => {
    if (!isAuthenticated) return;
    
    setActionLoading(prev => ({ ...prev, favorite: true }));
    
    try {
      const token = await getAccessTokenSilently();
      const action = post.isFavorite ? 'unfavorite' : 'favorite';
      
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
      
      // Update post data with new favorite status
      setPost(prev => ({
        ...prev,
        isFavorite: data.isFavorite
      }));

    } catch (error) {
      console.error(`Error ${post.isFavorite ? 'unfavoriting' : 'favoriting'} post:`, error);
      // TODO: Show error message to user
    } finally {
      setActionLoading(prev => ({ ...prev, favorite: false }));
    }
  };

  // Fetch comments for the post
  const fetchComments = async (offset = 0, limit = 20) => {
    try {
      setCommentsLoading(true);
      setCommentsError(null);

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URI}/api/content/posts/${id}/comments?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      if (data.success) {
        if (offset === 0) {
          setComments(data.comments);
        } else {
          setComments(prev => [...prev, ...data.comments]);
        }
        setHasMoreComments(data.comments.length === limit);
      } else {
        throw new Error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setCommentsError('Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  // Load comments when post is loaded
  useEffect(() => {
    if (post && id) {
      fetchComments();
    }
  }, [post, id]);

  // Add a new comment
  const handleAddComment = async () => {
    if (!isAuthenticated || !newComment.trim() || addingComment) return;

    try {
      setAddingComment(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URI}/api/content/posts/${id}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: newComment.trim() })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      if (data.success) {
        // Add new comment to the top of the list
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // TODO: Show error message to user
    } finally {
      setAddingComment(false);
    }
  };

  // Load more comments (infinite scroll)
  const loadMoreComments = () => {
    if (!commentsLoading && hasMoreComments) {
      fetchComments(comments.length);
    }
  };

  const handleLike = () => handleReaction('like', 1);
  const handleDislike = () => handleReaction('dislike', 2);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <IconButton onClick={() => navigate('/posts')} sx={{ mb: 2 }}>
          <ArrowBack />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Back to Posts
          </Typography>
        </IconButton>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Post not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back Button */}
      <IconButton onClick={() => navigate('/posts')} sx={{ mb: 2 }}>
        <ArrowBack />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Back to Posts
        </Typography>
      </IconButton>

      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        {/* Header Image */}
        {post.image && (
          <Box
            component="img"
            src={post.image}
            alt={post.title}
            sx={{
              width: '100%',
              height: 300,
              objectFit: 'cover',
              display: 'block'
            }}
          />
        )}

        <Box sx={{ p: 4 }}>
          {/* Title */}
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            {post.title}
          </Typography>

          {/* Labels and Reading Time */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* Labels */}
            {post.labels && post.labels.length > 0 && (
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
            )}

            {/* Reading Time */}
            {post.readingTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <AccessTime fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">
                  {post.readingTime} min read
                </Typography>
              </Box>
            )}
          </Box>

          {/* Content Restriction Warning */}
          {contentRestricted && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              This is a premium post. Subscribe to read the full content.
            </Alert>
          )}

          {/* Post Content */}
          <Box sx={{ mb: 4, '& img': { maxWidth: '100%', height: 'auto' } }}>
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Interaction Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Like Button */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={!isAuthenticated ? 'Login to like posts' : hasLiked ? 'Unlike this post' : 'Like this post'}>
                <span>
                  <IconButton 
                    onClick={handleLike}
                    disabled={!isAuthenticated || actionLoading.like}
                    color={hasLiked ? 'primary' : 'default'}
                    sx={{ 
                      opacity: !isAuthenticated ? 0.5 : 1,
                      '&.Mui-disabled': {
                        color: hasLiked ? 'primary.main' : 'inherit'
                      }
                    }}
                  >
                    {actionLoading.like ? (
                      <CircularProgress size={24} />
                    ) : (
                      <ThumbUp />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
                {post.numberOfLikes || 0}
              </Typography>
            </Box>

            {/* Dislike Button */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={!isAuthenticated ? 'Login to dislike posts' : hasDisliked ? 'Remove dislike' : 'Dislike this post'}>
                <span>
                  <IconButton 
                    onClick={handleDislike}
                    disabled={!isAuthenticated || actionLoading.dislike}
                    color={hasDisliked ? 'error' : 'default'}
                    sx={{ 
                      opacity: !isAuthenticated ? 0.5 : 1,
                      '&.Mui-disabled': {
                        color: hasDisliked ? 'error.main' : 'inherit'
                      }
                    }}
                  >
                    {actionLoading.dislike ? (
                      <CircularProgress size={24} />
                    ) : (
                      <ThumbDown />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
                {post.numberOfDislikes || 0}
              </Typography>
            </Box>

            {/* Favorite Button - Only show for authenticated users */}
            {isAuthenticated && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={post.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <IconButton 
                    onClick={handleFavorite}
                    disabled={actionLoading.favorite}
                    color={post.isFavorite ? 'error' : 'default'}
                  >
                    {actionLoading.favorite ? (
                      <CircularProgress size={24} />
                    ) : post.isFavorite ? (
                      <Favorite />
                    ) : (
                      <FavoriteBorder />
                    )}
                  </IconButton>
                </Tooltip>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {post.isFavorite ? 'Favorited' : 'Favorite'}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Comments Section */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Comments
            </Typography>

            {/* Add Comment Form - Only for authenticated users */}
            {isAuthenticated && (
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={addingComment}
                  inputProps={{ maxLength: 500 }}
                  helperText={`${newComment.length}/500 characters`}
                />
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={addingComment ? <CircularProgress size={16} /> : <Send />}
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                  >
                    {addingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Comments List */}
            {commentsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {commentsError}
              </Alert>
            )}

            {comments.length === 0 && !commentsLoading ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No comments yet. Be the first to comment!
              </Typography>
            ) : (
              <List sx={{ width: '100%' }}>
                {comments.map((comment, index) => (
                  <React.Fragment key={comment.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        {comment.userAvatar ? (
                          <Avatar src={comment.userAvatar} alt={`${comment.userFirstName} ${comment.userLastName}`} />
                        ) : (
                          <Avatar>
                            <Person />
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="subtitle2" component="span">
                              {comment.userFirstName} {comment.userLastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.createdOn).toLocaleDateString()} {new Date(comment.createdOn).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                            {comment.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}

            {/* Load More Comments Button */}
            {hasMoreComments && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={loadMoreComments}
                  disabled={commentsLoading}
                  startIcon={commentsLoading ? <CircularProgress size={16} /> : null}
                >
                  {commentsLoading ? 'Loading...' : 'Load More Comments'}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PostDetailView;