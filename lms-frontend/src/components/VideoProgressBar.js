import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

const VideoProgressBar = ({ duration, watched }) => {
    const progress = duration > 0 ? Math.min((watched / duration) * 100, 100) : 0;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                        },
                    }}
                />
            </Box>
            <Typography variant="body2" color="textSecondary">
                {Math.round(progress)}%
            </Typography>
        </Box>
    );
};

export default VideoProgressBar;