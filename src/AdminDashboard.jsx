import React, { lazy, Suspense, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Fade,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  Zoom,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Key, User, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchCriteria,
  fetchEvaluationsAdmin,
  fetchProfessors,
} from './shared/api/adminApi';
import { getApiErrorMessage } from './shared/api/client';
 
import EvaluationTable from './components/admin/EvaluationTable';
import ProfessorManager from './components/admin/ProfessorManager';
import CriteriaManager from './components/admin/CriteriaManager';
 
const AdminOverview = lazy(() => import('./components/admin/AdminOverview'));
 
const TAB_INDEX = {
  OVERVIEW: 0,
  EVALUATIONS: 1,
  PROFESSORS: 2,
  CRITERIA: 3,
};
 
// ─── Animation variants ───────────────────────────────────────────────────────
const tabPanelVariants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } },
};
 
const statCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.38, ease: [0.4, 0, 0.2, 1] },
  }),
};
 
const headerVariants = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } },
};
 
const AdminDashboard = ({ adminToken }) => {
  const token = adminToken || sessionStorage.getItem('adminToken');
 
  const [activeTab, setActiveTab] = useState(TAB_INDEX.OVERVIEW);
  const [error, setError] = useState('');
 
  const {
    data: evaluations = [],
    isLoading: evaluationsLoading,
    isError: evaluationsError,
    refetch: refetchEvaluations,
  } = useQuery({
    queryKey: ['admin-evaluations'],
    queryFn: fetchEvaluationsAdmin,
    enabled: Boolean(token),
    retry: 1,
    onError: (err) => setError(getApiErrorMessage(err, 'Unable to load evaluations.')),
  });
 
  const {
    data: professors = [],
    isLoading: professorsLoading,
    isError: professorsError,
    refetch: refetchProfessors,
  } = useQuery({
    queryKey: ['admin-professors'],
    queryFn: fetchProfessors,
    enabled: Boolean(token),
    retry: 1,
    onError: (err) => setError(getApiErrorMessage(err, 'Unable to load professors.')),
  });
 
  const {
    data: criteria = [],
    isLoading: criteriaLoading,
    isError: criteriaError,
    refetch: refetchCriteria,
  } = useQuery({
    queryKey: ['admin-criteria'],
    queryFn: fetchCriteria,
    enabled: Boolean(token),
    retry: 1,
    onError: (err) => setError(getApiErrorMessage(err, 'Unable to load criteria.')),
  });
 
  const withStableRowIds = (rows, prefix) => {
    if (!Array.isArray(rows)) return [];
    return rows.map((row, index) => ({
      ...row,
      _rowId: row?.id ?? row?._id ?? `${prefix}-${index}`,
      id: row?.id ?? row?._id ?? `${prefix}-${index}`,
    }));
  };
 
  const evaluationRows = useMemo(() => withStableRowIds(evaluations, 'evaluation'), [evaluations]);
  const professorRows = useMemo(() => withStableRowIds(professors, 'professor'), [professors]);
  const criteriaRows = useMemo(() => withStableRowIds(criteria, 'criterion'), [criteria]);
 
  const summaryStats = useMemo(
    () => [
      { label: 'Encrypted Feedback', value: evaluationRows.length, detail: 'Stored submissions' },
      { label: 'Faculty Accounts', value: professorRows.length, detail: 'Managed professors' },
      { label: 'Evaluation Criteria', value: criteriaRows.length, detail: 'Active metrics' },
    ],
    [evaluationRows.length, professorRows.length, criteriaRows.length]
  );
 
  const sharedGridSx = {
    backgroundColor: '#fff',
    borderRadius: 2.5,
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: '#f4f6fb',
      borderBottom: '1px solid #e2e8f0',
      color: '#1e293b',
    },
    '& .MuiDataGrid-cell': {
      borderBottom: '1px solid #edf2f7',
    },
    '& .MuiDataGrid-row:hover': {
      backgroundColor: 'rgba(15, 23, 42, 0.04)',
    },
    '& .MuiDataGrid-footerContainer': {
      borderTop: '1px solid #e2e8f0',
      backgroundColor: '#fff',
    },
  };
 
  const cardSurfaceSx = {
    borderRadius: 3,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    backgroundColor: '#fff',
    boxShadow: '0 32px 60px rgba(15, 23, 42, 0.08)',
  };
 
  const isRefreshing =
    activeTab === TAB_INDEX.OVERVIEW
      ? evaluationsLoading || professorsLoading || criteriaLoading
      : activeTab === TAB_INDEX.EVALUATIONS
      ? evaluationsLoading
      : activeTab === TAB_INDEX.PROFESSORS
      ? professorsLoading
      : criteriaLoading;
 
  const refreshButtonLabel = isRefreshing ? 'Refreshing...' : 'Refresh';
  const isBootstrapping = evaluationsLoading && professorsLoading && criteriaLoading;
 
  const handleRefresh = () => {
    if (activeTab === TAB_INDEX.OVERVIEW) {
      refetchEvaluations();
      refetchProfessors();
      refetchCriteria();
      return;
    }
    if (activeTab === TAB_INDEX.EVALUATIONS) return refetchEvaluations();
    if (activeTab === TAB_INDEX.PROFESSORS) return refetchProfessors();
    if (activeTab === TAB_INDEX.CRITERIA) return refetchCriteria();
  };
 
  return (
    <Container maxWidth="lg" sx={{ mt: 3 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #dfe3ec' }}>
        {/* Header */}
        <motion.div variants={headerVariants} initial="hidden" animate="visible">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h4" fontWeight={800} color="primary.main">Admin Control Center</Typography>
              <Typography variant="body2" color="text.secondary">Manage encrypted evaluations, professors, criteria, and analytics.</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<ShieldCheck size={16} />}
                label="Encrypted by default"
                color="success"
                variant="outlined"
              />

              {/* Security-related quick actions: Key (rotate/manage keys) and User (manage admins) */}
              <Tooltip title="Manage keys" placement="bottom">
                <span>
                  <IconButton size="small" aria-label="manage-keys">
                    <Key size={16} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Manage admins" placement="bottom">
                <span>
                  <IconButton size="small" aria-label="manage-admins">
                    <User size={16} />
                  </IconButton>
                </span>
              </Tooltip>

              <Button
                startIcon={<RefreshCw size={16} />}
                endIcon={isRefreshing ? <CircularProgress size={16} color="inherit" /> : null}
                variant="outlined"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {refreshButtonLabel}
              </Button>
            </Stack>
          </Stack>
        </motion.div>
 
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} aria-live="polite">
            We hit a temporary loading issue. {error} Please tap Refresh to try again.
          </Alert>
        )}
 
        <Fade in timeout={260}>
          <Stack spacing={3} sx={{ mb: 3 }}>
            {/* Summary Stat Cards */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" justifyContent="space-between">
              {isBootstrapping
                ? [1, 2, 3].map((placeholder) => (
                    <Paper key={placeholder} elevation={0} sx={{ ...cardSurfaceSx, flex: '1 1 180px', minWidth: 180, p: 2.25 }}>
                      <Skeleton variant="text" width="60%" height={18} />
                      <Skeleton variant="text" width="35%" height={44} />
                      <Skeleton variant="text" width="70%" height={18} />
                    </Paper>
                  ))
                : summaryStats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      custom={i}
                      variants={statCardVariants}
                      initial="hidden"
                      animate="visible"
                      style={{ flex: '1 1 180px', minWidth: 180 }}
                    >
                      <Paper elevation={0} sx={{ ...cardSurfaceSx, p: 2.25, height: '100%' }}>
                        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
                          {stat.label}
                        </Typography>
                        <Typography variant="h4" fontWeight={800} sx={{ mt: 0.25 }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.detail}
                        </Typography>
                      </Paper>
                    </motion.div>
                  ))}
            </Stack>
 
            <Tabs
              value={activeTab}
              onChange={(_event, value) => setActiveTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              TabIndicatorProps={{ sx: { backgroundColor: 'secondary.main', height: 3, borderRadius: 2 } }}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                },
              }}
            >
              <Tab label="Overall" />
              <Tab label="Evaluations" />
              <Tab label="Professors" />
              <Tab label="Criteria" />
            </Tabs>
          </Stack>
        </Fade>
 
        {/* Tab Panels with AnimatePresence */}
        <AnimatePresence mode="wait">
          {activeTab === TAB_INDEX.OVERVIEW && (
            <motion.div
              key="tab-overview"
              variants={tabPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Suspense
                fallback={
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                    <Skeleton variant="text" width="30%" height={30} />
                    <Skeleton variant="rounded" height={280} sx={{ mt: 1.5 }} />
                  </Paper>
                }
              >
                <AdminOverview
                  evaluations={evaluationRows}
                  criteria={criteriaRows}
                  professors={professorRows}
                />
              </Suspense>
            </motion.div>
          )}
 
          {activeTab === TAB_INDEX.EVALUATIONS && (
            <motion.div
              key="tab-evaluations"
              variants={tabPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Zoom in timeout={220}>
                <Box>
                  <EvaluationTable
                    evaluations={evaluationRows}
                    loading={evaluationsLoading}
                    error={evaluationsError}
                    onRetry={refetchEvaluations}
                    sharedGridSx={sharedGridSx}
                    cardSurfaceSx={cardSurfaceSx}
                  />
                </Box>
              </Zoom>
            </motion.div>
          )}
 
          {activeTab === TAB_INDEX.PROFESSORS && (
            <motion.div
              key="tab-professors"
              variants={tabPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Zoom in timeout={220}>
                <Box>
                  <ProfessorManager
                    professors={professorRows}
                    loading={professorsLoading}
                    error={professorsError}
                    onRetry={refetchProfessors}
                    sharedGridSx={sharedGridSx}
                    cardSurfaceSx={cardSurfaceSx}
                  />
                </Box>
              </Zoom>
            </motion.div>
          )}
 
          {activeTab === TAB_INDEX.CRITERIA && (
            <motion.div
              key="tab-criteria"
              variants={tabPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Zoom in timeout={220}>
                <Box>
                  <CriteriaManager
                    criteria={criteriaRows}
                    loading={criteriaLoading}
                    error={criteriaError}
                    onRetry={refetchCriteria}
                    sharedGridSx={sharedGridSx}
                    cardSurfaceSx={cardSurfaceSx}
                  />
                </Box>
              </Zoom>
            </motion.div>
          )}
        </AnimatePresence>
      </Paper>
    </Container>
  );
};
 
export default AdminDashboard;