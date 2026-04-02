import React, { lazy, Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from './shared/api/client';
import { decryptEvaluation } from './shared/api/adminApi';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Stack,
    Typography,
    Rating,
    Avatar
} from '@mui/material';
import Fade from '@mui/material/Fade';
import Skeleton from '@mui/material/Skeleton';
import Zoom from '@mui/material/Zoom';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import uaLogo from './assets/UA-Logo.png';
import LoadStateCard from './components/shared/LoadStateCard';

const FacultyAnalyticsCharts = lazy(() => import('./components/faculty/FacultyAnalyticsCharts'));

const computeMetricAverage = (scores = []) => {
    if (!Array.isArray(scores) || scores.length === 0) return 0;
    const total = scores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
    return total / scores.length;
};

const FacultyDashboard = ({ facultyEmail, facultyAvatar, previewMode = false, onExitPreview }) => {
    const [evals, setEvals] = useState([]);
    const [criteriaLookup, setCriteriaLookup] = useState({});
    const [loading, setLoading] = useState(false);
    const [decrypting, setDecrypting] = useState(false);
    const [error, setError] = useState('');

    // UA Branding Colors
    const UA_BLUE = '#003366';
    const UA_GOLD = '#FFCC00';

    // ✅ ONLY UI UPDATED (Glassmorphism)
    // ✅ NO LOGIC CHANGED


    const fetchAndDecryptEvaluations = useCallback(async () => {
        if (!facultyEmail) {
            setError('Faculty email is unavailable. Please log in again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Fetch evaluations and criteria metadata in parallel.
            const [res, criteriaRes] = await Promise.all([
                apiClient.get('/api/evaluations', {
                    params: { facultyEmail: facultyEmail }
                }),
                apiClient.get('/api/public/criteria'),
            ]);

            const criteriaList = Array.isArray(criteriaRes?.data) ? criteriaRes.data : [];
            const nextLookup = criteriaList.reduce((acc, item) => {
                if (item?.id != null && item?.title) {
                    acc[item.id] = item.title;
                }
                return acc;
            }, {});
            setCriteriaLookup(nextLookup);

            const rawEvals = Array.isArray(res.data) ? res.data : [];
            setEvals(rawEvals);
            setLoading(false);

            // 2. Automatically trigger decryption for all messages
            if (rawEvals.length > 0) {
                setDecrypting(true);
                const decryptedResults = await Promise.all(
                    rawEvals.map(async (ev) => {
                        try {
                            // Call the same decryption service used by Admin
                            const decryptedText = await decryptEvaluation(ev.id, facultyEmail);
                            return { ...ev, decryptedComment: decryptedText };
                        } catch (err) {
                            console.error(`Failed to decrypt ID ${ev.id}:`, err);
                            return { ...ev, decryptedComment: "[Decryption Error]" };
                        }
                    })
                );
                setEvals(decryptedResults);
                setDecrypting(false);
            }
        } catch (err) {
            console.error("Evaluation fetch error:", err);
            setError('Unable to load evaluations. Please check your connection.');
            setLoading(false);
        }
    }, [facultyEmail]);

    useEffect(() => {
        fetchAndDecryptEvaluations();
    }, [fetchAndDecryptEvaluations]);

    const stats = useMemo(() => {
        if (evals.length === 0) return { avg: 0, count: 0 };
        const sum = evals.reduce((acc, curr) => acc + computeMetricAverage(curr.scores), 0);
        return {
            avg: (sum / evals.length).toFixed(1),
            count: evals.length
        };
    }, [evals]);

    return (
        <Box sx={{ py: 2 }}>
            {previewMode && typeof onExitPreview === 'function' && (
                <Paper
                    elevation={0}
                    sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid rgba(0, 51, 102, 0.15)',
                        bgcolor: 'rgba(255, 204, 0, 0.08)',
                    }}
                >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} color={UA_BLUE}>
                                Admin preview mode
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                You are inspecting the faculty dashboard for <b>{facultyEmail}</b>.
                            </Typography>
                        </Box>
                        <Button variant="outlined" onClick={onExitPreview} sx={{ fontWeight: 800 }}>
                            Return to admin panel
                        </Button>
                    </Stack>
                </Paper>
            )}

            {/* UA Header with Logo Placeholder */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: 4,
                    mb: 4,
                    background: `linear-gradient(135deg, ${UA_BLUE} 0%, #001a33 100%)`,
                    color: 'white',
                    borderBottom: `4px solid ${UA_GOLD}`,
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Decorative Pattern Background */}
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)' }}>
                    <AssessmentIcon sx={{ fontSize: 200 }} />
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={3}>
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'white',
                                p: 1,
                                border: `2px solid ${UA_GOLD}`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                            src={facultyAvatar || uaLogo}
                        >
                            UA
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
                                Faculty Portal
                            </Typography>
                            <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                                University of the Assumption
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                                Logged in as: <b>{facultyEmail}</b>
                            </Typography>
                        </Box>
                    </Stack>

                    <Button
                        startIcon={<RefreshIcon />}
                        variant="contained"
                        onClick={fetchAndDecryptEvaluations}
                        disabled={loading || decrypting}
                        aria-label="Refresh faculty evaluation results"
                        sx={{
                            borderRadius: 2,
                            fontWeight: 800,
                            bgcolor: UA_GOLD,
                            color: UA_BLUE,
                            '&:hover': { bgcolor: '#e6b800' },
                            px: 3
                        }}
                    >
                        {loading || decrypting ? 'Refreshing...' : 'Refresh Results'}
                    </Button>
                </Stack>
            </Paper>

            {/* KPI Cards */}
            <Fade in timeout={260}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderRadius: 4, height: '100%', border: '1px solid #e2e8f0', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' } }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                    <Box sx={{ p: 1, bgcolor: 'rgba(0, 51, 102, 0.08)', borderRadius: 2 }}>
                                        <AssessmentIcon color="primary" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={700}>Performance Score</Typography>
                                </Stack>
                                <Typography variant="h2" fontWeight={900} color={UA_BLUE}>
                                    {stats.avg} <Typography component="span" variant="h5" color="text.secondary">/ 10</Typography>
                                </Typography>
                                <Rating value={parseFloat(stats.avg) / 2} precision={0.1} readOnly sx={{ mt: 1 }} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderRadius: 4, height: '100%', border: '1px solid #e2e8f0', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' } }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                    <Box sx={{ p: 1, bgcolor: 'rgba(217, 119, 6, 0.08)', borderRadius: 2 }}>
                                        <ChatBubbleOutlineIcon color="secondary" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={700}>Student Participation</Typography>
                                </Stack>
                                <Typography variant="h2" fontWeight={900} color="secondary.main">
                                    {stats.count}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Validated evaluations submitted this semester
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ borderRadius: 4, height: '100%', bgcolor: '#f8fafc', border: `1px dashed ${UA_BLUE}` }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                    <SecurityIcon color="success" />
                                    <Typography variant="subtitle2" fontWeight={800} color="success.main">
                                        Privacy Policy Enabled
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    Diffie-Hellman Shared Secret is used to automatically decrypt student feedback for your viewing.
                                    <b> Student identities remain hidden to ensure honest feedback.</b>
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Fade>

            {!loading && evals.length > 0 && (
                <Suspense
                    fallback={
                        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                            <Skeleton variant="text" width="35%" height={34} />
                            <Skeleton variant="rounded" height={260} sx={{ mt: 1.5 }} />
                        </Paper>
                    }
                >
                    <FacultyAnalyticsCharts evaluations={evals} criteriaLookup={criteriaLookup} />
                </Suspense>
            )}

            {/* Feedback Feed */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3, px: 1 }}>
                <VisibilityIcon sx={{ color: UA_BLUE }} />
                <Typography variant="h5" fontWeight={800} sx={{ color: UA_BLUE }}>
                    Detailed Student Feedback
                </Typography>
                {decrypting && <CircularProgress size={20} sx={{ ml: 2 }} />}
            </Stack>

            {error && (
                <Box sx={{ mb: 3 }}>
                    <LoadStateCard
                        icon={<SecurityIcon sx={{ fontSize: 54 }} />}
                        title="We hit a secure loading issue"
                        description={`We could not load or decrypt feedback right now. ${error}`}
                        severity="error"
                        actionLabel="Retry now"
                        onAction={fetchAndDecryptEvaluations}
                        minHeight={190}
                    />
                </Box>
            )}

            {loading ? (
                <Box sx={{ py: 2 }}>
                    {/* UI Update: Skeleton loading for smoother perceived performance */}
                    <Stack spacing={2}>
                        {[1, 2].map((placeholder) => (
                            <Card key={placeholder} sx={{ borderRadius: 4, border: '1px solid #f1f5f9' }}>
                                <Box sx={{ p: 3 }}>
                                    <Skeleton variant="text" width="40%" height={28} />
                                    <Skeleton variant="text" width="22%" height={20} />
                                    <Skeleton variant="rounded" width="100%" height={90} sx={{ mt: 2 }} />
                                </Box>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            ) : evals.length === 0 ? (
                <Zoom in timeout={220}>
                    <Box>
                        <LoadStateCard
                            icon={<ChatBubbleOutlineIcon sx={{ fontSize: 80 }} />}
                            title="No evaluations yet"
                            description="Your students have not submitted feedback yet. Use Refresh Results to check for new responses."
                            actionLabel="Refresh results"
                            onAction={fetchAndDecryptEvaluations}
                            minHeight={260}
                        />
                    </Box>
                </Zoom>
            ) : (
                <Fade in timeout={220}>
                    <Stack spacing={2.5}>
                        {evals.map((ev, index) => {
                            const metricAverage = computeMetricAverage(ev.scores);
                            return (
                                <Card key={ev.id || index} sx={{ borderRadius: 4, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                                    <Box sx={{ p: 3 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: '#f1f5f9', color: UA_BLUE }}>
                                                    <LockIcon size="small" />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight={800} color={UA_BLUE}>
                                                        Anonymous Participant
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ bgcolor: 'rgba(0, 51, 102, 0.05)', px: 1, py: 0.3, borderRadius: 1, fontWeight: 700 }}>
                                                        Section: {ev.section}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="h5" fontWeight={900} color={UA_BLUE}>
                                                    {metricAverage.toFixed(1)}
                                                    <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>/10</Typography>
                                                </Typography>
                                                <Rating value={metricAverage / 2} size="small" readOnly />
                                            </Box>
                                        </Stack>

                                        <Paper
                                            elevation={0}
                                            sx={{
                                                mt: 2.5,
                                                p: 2.5,
                                                bgcolor: '#f8fafc',
                                                borderRadius: 3,
                                                borderLeft: `5px solid ${UA_GOLD}`,
                                                position: 'relative'
                                            }}
                                        >
                                            <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#1e293b', lineHeight: 1.7, fontSize: '1.05rem' }}>
                                                "{ev.decryptedComment || (decrypting ? "Decrypting message..." : ev.ciphertext) || 'No comment provided.'}"
                                            </Typography>
                                        </Paper>
                                    </Box>
                                </Card>
                            );
                        })}
                    </Stack>
                </Fade>
            )}
        </Box>
    );
};

export default FacultyDashboard;
