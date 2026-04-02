import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
 
const LoadStateCard = ({
  icon,
  title,
  description,
  actionLabel = 'Try again',
  onAction,
  severity = 'neutral',
  minHeight = 220,
}) => {
  const accent = severity === 'error' ? '#dc2626' : severity === 'warning' ? '#b45309' : '#0c4a8a';
 
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Glassmorphism
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        border: '1px dashed rgba(203, 213, 225, 0.7)',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ maxWidth: 420 }}>
        <Box sx={{ color: accent, opacity: 0.85 }}>{icon}</Box>
        <Typography variant="h6" fontWeight={800} color="text.primary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {onAction && (
          <Button
            variant="outlined"
            startIcon={<AutorenewRoundedIcon />}
            onClick={onAction}
            sx={{ mt: 1, fontWeight: 700 }}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
 
export default LoadStateCard;
 