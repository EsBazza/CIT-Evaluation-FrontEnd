import React, { lazy, Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from './shared/api/client';
import {
    decryptEvaluation,
    exportFacultyEvaluationsCsv,
    exportFacultyEvaluationsPdf,
    exportSingleEvaluationCsv,
    exportSingleEvaluationPdf,
} from './shared/api/adminApi';
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
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import uaLogo from './assets/UA-Logo.png';
import LoadStateCard from './components/shared/LoadStateCard';
import { toast } from 'sonner';
import { getApiErrorMessage } from './shared/api/client';

const FacultyAnalyticsCharts = lazy(() => import('./components/faculty/FacultyAnalyticsCharts'));

const computeMetricAverage = (answers = []) => {
    if (!Array.isArray(answers) || answers.length === 0) return 0;
    const numericAnswers = answers.filter(a => a?.score !== null && a?.score !== undefined);
    if (numericAnswers.length === 0) return 0;
    const total = numericAnswers.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
    return total / numericAnswers.length;
};

const FacultyDashboard = ({ facultyEmail, facultyAvatar, previewMode = false, onExitPreview }) => {
    const [evals, setEvals] = useState([]);
    const [criteriaLookup, setCriteriaLookup] = useState({});
    const [loading, setLoading] = useState(false);
    const [decrypting, setDecrypting] = useState(false);
    const [error, setError] = useState('');
    const [exportingAllFormat, setExportingAllFormat] = useState('');
    const [exportingEvaluation, setExportingEvaluation] = useState({});

    const UA_BLUE = '#003366';
    const UA_GOLD = '#FFCC00';

    const fetchAndDecryptEvaluations = useCallback(async () => {
        if (!facultyEmail) {
            setError('Faculty email is unavailable. Please log in again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const [res, criteriaRes] = await Promise.all([
                apiClient.get('/api/evaluations', { params: { facultyEmail: facultyEmail } }),
                apiClient.get('/api/public/criteria'),
            ]);

            const criteriaList = Array.isArray(criteriaRes?.data) ? criteriaRes.data : [];
            const nextLookup = criteriaList.reduce((acc, item) => {
                if (item?.id != null && item?.title) acc[item.id] = item.title;
                return acc;
            }, {});
            setCriteriaLookup(nextLookup);

            const rawEvals = Array.isArray(res.data) ? res.data : [];
            setEvals(rawEvals);
            setLoading(false);

            if (rawEvals.length > 0) {
                setDecrypting(true);
                const decryptedResults = await Promise.all(
                    rawEvals.map(async (ev) => {
                        try {
                            const decryptedVal = await decryptEvaluation(ev.id, facultyEmail);
                            let finalComment = '';

                            if (typeof decryptedVal === 'object' && decryptedVal !== null) {
                                finalComment = decryptedVal.generalComment || '';
                                if (decryptedVal.textResponses?.length > 0) {
                                    finalComment += "\n\nSpecific Item Feedback:\n" + 
                                        decryptedVal.textResponses.map(r => `${r.title}: ${r.value}`).join("\n");
                                }
                            } else if (typeof decryptedVal === 'string' && decryptedVal.startsWith('{')) {
                                try {
                                    const data = JSON.parse(decryptedVal);
                                    finalComment = data.generalComment || decryptedVal;
                                    if (data.textResponses?.length > 0) {
                                        finalComment += "\n\nSpecific Item Feedback:\n" + 
                                            data.textResponses.map(r => `${r.title}: ${r.value}`).join("\n");
                                    }
                                } catch {
                                    finalComment = decryptedVal;
                                }
                            } else {
                                finalComment = String(decryptedVal);
                            }
                            
                            return { ...ev, decryptedComment: finalComment };
                        } catch (err) {
                            return { ...ev, decryptedComment: "[Decryption Error]" };
                        }
                    })
                );
                setEvals(decryptedResults);
                setDecrypting(false);
            }
        } catch (err) {
            setError('Unable to load evaluations.');
            setLoading(false);
        }
    }, [facultyEmail]);

    useEffect(() => {
        fetchAndDecryptEvaluations();
    }, [fetchAndDecryptEvaluations]);

    const handleExportAll = async (format) => {
        if (!facultyEmail) return;
        setExportingAllFormat(format);
        try {
            if (format === 'csv') await exportFacultyEvaluationsCsv(facultyEmail);
            else await exportFacultyEvaluationsPdf(facultyEmail);
            toast.success(`Exported as ${format.toUpperCase()}.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Export failed.'));
        } finally {
            setExportingAllFormat('');
        }
    };

    const handleExportSingle = async (evaluationId, format) => {
        const key = `${evaluationId}-${format}`;
        setExportingEvaluation(prev => ({ ...prev, [key]: true }));
        try {
            if (format === 'csv') await exportSingleEvaluationCsv(evaluationId);
            else await exportSingleEvaluationPdf(evaluationId);
            toast.success(`Exported Evaluation #${evaluationId}.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Export failed.'));
        } finally {
            setExportingEvaluation(prev => ({ ...prev, [key]: false }));
        }
    };

    const stats = useMemo(() => {
        if (evals.length === 0) return { avg: 0, count: 0 };
        const sum = evals.reduce((acc, curr) => acc + computeMetricAverage(curr.answers), 0);
        return { avg: (sum / evals.length).toFixed(1), count: evals.length };
    }, [evals]);

    const formatFeedback = (decrypted) => {
        if (!decrypted || !decrypted.startsWith('{')) return decrypted;
        try {
            const data = JSON.parse(decrypted);
            const items = [];
            
            if (data.generalComment && data.generalComment.trim()) {
                items.push(
                    <Box key="gen-comment" sx={{ mb: 1 }}>
                        <Typography variant="body1" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
                            "{data.generalComment}"
                        </Typography>
                    </Box>
                );
            }

            // Support both textResponses (new) and dynamicResponses (legacy/alternative)
            const textParts = data.textResponses || data.dynamicResponses || [];
            textParts.forEach((r, i) => {
                if (r.value && r.value.trim()) {
                    items.push(
                        <Box key={i} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', display: 'inline' }}>
                                {r.title}: 
                            </Typography>
                            <Typography variant="body2" sx={{ display: 'inline', ml: 0.5 }}>
                                {r.value}
                            </Typography>
                        </Box>
                    );
                }
            });

            return items.length > 0 ? <Stack spacing={0.5}>{items}</Stack> : <Typography variant="body2" color="text.secondary">No qualitative feedback provided.</Typography>;
        } catch { return decrypted; }
    };

    return (
        <Box sx={{ py: 2, maxWidth: 1000, mx: 'auto' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, mb: 4, background: `linear-gradient(135deg, ${UA_BLUE} 0%, #001a33 100%)`, color: 'white', borderBottom: `4px solid ${UA_GOLD}`, position: 'relative', overflow: 'hidden' }}>
                {/* Decorative background element */}
                <Box sx={{ position: 'absolute', top: -20, right: -20, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255, 204, 0, 0.1)', zIndex: 0 }} />
                
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Avatar sx={{ width: 80, height: 80, border: `3px solid ${UA_GOLD}`, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }} src={facultyAvatar || uaLogo} />
                        <Box>
                            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>Faculty Dashboard</Typography>
                            <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 600 }}>University of the Assumption</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAndDecryptEvaluations} disabled={loading || decrypting} sx={{ bgcolor: UA_GOLD, color: UA_BLUE, fontWeight: 800, '&:hover': { bgcolor: '#e6b800' }, px: 3 }}>Refresh</Button>
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportAll('csv')} disabled={Boolean(exportingAllFormat)} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>CSV</Button>
                        <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => handleExportAll('pdf')} disabled={Boolean(exportingAllFormat)} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>PDF</Button>
                    </Stack>
                </Stack>
            </Paper>

            {previewMode && (
                <Alert 
                    severity="warning" 
                    icon={<SecurityIcon />}
                    action={<Button color="inherit" size="small" onClick={onExitPreview} sx={{ fontWeight: 800 }}>Exit Preview</Button>}
                    sx={{ mb: 4, borderRadius: 3, fontWeight: 700, border: '1px solid rgba(217, 119, 6, 0.2)' }}
                >
                    Admin Preview Mode: Viewing evaluations for {facultyEmail}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6 }}><SummaryCard title="Overall Score" value={stats.avg} detail="Out of 10.0" icon={<AssessmentIcon color="primary" />} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><SummaryCard title="Total Responses" value={stats.count} detail="This semester" icon={<ChatBubbleOutlineIcon color="secondary" />} /></Grid>
            </Grid>

            {!loading && evals.length > 0 && (
                <Suspense fallback={<Skeleton variant="rounded" height={300} />}>
                    <FacultyAnalyticsCharts evaluations={evals} criteriaLookup={criteriaLookup} />
                </Suspense>
            )}

            <Typography variant="h5" fontWeight={900} color={UA_BLUE} sx={{ mb: 3, mt: 5 }}>Detailed Feedback</Typography>

            {loading ? <Skeleton variant="rounded" height={400} /> : evals.map((ev, idx) => (
                <Card key={ev.id || idx} sx={{ mb: 2, borderRadius: 3, border: '1px solid #f1f5f9', transition: '0.2s', '&:hover': { boxShadow: '0 8px 16px rgba(0,0,0,0.05)' } }}>
                    <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" justifyContent="space-between">
                            <Box>
                                <Typography fontWeight={800} color={UA_BLUE}>Anonymous Participant</Typography>
                                <Chip label={`Section: ${ev.section}`} size="small" sx={{ mt: 0.5, fontWeight: 600 }} />
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h5" fontWeight={900}>{computeMetricAverage(ev.answers).toFixed(1)}</Typography>
                                <Rating value={computeMetricAverage(ev.answers) / 2} size="small" readOnly />
                            </Box>
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                            {formatFeedback(ev.decryptedComment || (decrypting ? "Decrypting..." : ev.ciphertext))}
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
};

const SummaryCard = ({ title, value, detail, icon }) => (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
        <Stack direction="row" justifyContent="space-between">
            <Box>
                <Typography variant="overline" fontWeight={700} color="text.secondary">{title}</Typography>
                <Typography variant="h3" fontWeight={900} color="#003366">{value}</Typography>
                <Typography variant="body2" color="text.secondary">{detail}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>{icon}</Box>
        </Stack>
    </Paper>
);

export default FacultyDashboard;
