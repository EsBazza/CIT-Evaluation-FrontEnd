import React, { memo, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  Divider,
  Skeleton
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
} from 'recharts';
import { fetchDashboardStats } from '../../shared/api/adminApi';

// ── fix 1: uniform padding p: 2.5 (was 2.2) ──────────────────────────────────
const SummaryCard = ({ title, value, detail, icon, color = 'primary.main' }) => (
  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em', fontWeight: 700 }}>{title}</Typography>
        <Typography variant="h4" fontWeight={900} sx={{ color, my: 0.5 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{detail}</Typography>
      </Box>
      <Box sx={{ color, opacity: 0.85, p: 1, borderRadius: 2, bgcolor: `${color}11` }}>{icon}</Box>
    </Stack>
  </Paper>
);

const AdminOverview = ({ evaluations = [] }) => {
  const [selectedSection, setSelectedSection] = useState('ALL');

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats', selectedSection],
    queryFn: () => fetchDashboardStats(selectedSection),
    placeholderData: (prev) => prev
  });

  const sections = useMemo(() => {
    const unique = new Set(evaluations.map((item) => item?.section).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [evaluations]);

  const radarData = useMemo(() => (stats?.criterionAverages || []).map(c => {
      const title = c.title || 'Unknown Criterion';
      return {
          subject: title.length > 20 ? title.slice(0, 20) + '...' : title,
          average: Number((c.average || 0).toFixed(2)),
          fullMark: 10
      };
  }), [stats]);

  const frequencyData = useMemo(() => (stats?.choiceFrequencies || []).flatMap(cf => 
      Object.entries(cf.optionCounts || {}).map(([name, value]) => {
          const displayName = (name || 'Unknown').length > 15 ? (name || 'Unknown').slice(0, 15) + '...' : (name || 'Unknown');
          return {
              name: displayName,
              value: value || 0,
              group: cf.criterionTitle || 'Unknown'
          };
      })
  ).slice(0, 10), [stats]);

  if (isLoading && !stats) {
    return <Skeleton variant="rounded" height={600} />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
            <Typography variant="h5" fontWeight={900} color="primary.main">Dashboard Analytics</Typography>
            <Typography variant="body2" color="text.secondary">Server-side processed insights for evaluation scoring.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Section</InputLabel>
            <Select value={selectedSection} label="Filter by Section" onChange={e => setSelectedSection(e.target.value)}>
                <MenuItem value="ALL">All Sections</MenuItem>
                {sections.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
        </FormControl>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><SummaryCard title="Total Submissions" value={stats?.totalEvaluations || 0} detail="Across all sections" icon={<TrendingUpRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><SummaryCard title="Avg. Score" value={Number(stats?.globalAverage || 0).toFixed(2)} detail="Global performance" icon={<StarRoundedIcon />} color="#0f766e" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><SummaryCard title="Ranked Faculty" value={stats?.totalFaculty || 0} detail="With responses" icon={<InsightsRoundedIcon />} color="#0369a1" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><SummaryCard title="Top Performing" value={Number(stats?.topFacultyScore || 0).toFixed(1)} detail={stats?.topFacultyName || 'N/A'} icon={<EmojiEventsRoundedIcon />} color="#b45309" /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', minHeight: 450 }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>Competency Matrix</Typography>
                <Box sx={{ width: '100%', height: 350, minHeight: 350 }}>
                    {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis domain={[0, 10]} />
                                <Radar name="Avg. Score" dataKey="average" stroke="#0c4a8a" fill="#0c4a8a" fillOpacity={0.6} />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                            <Typography color="text.secondary">No metric data available for this section.</Typography>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', minHeight: 450, maxHeight: 450, overflowY: 'auto' }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>Faculty Ranking</Typography>
                <List disablePadding>
                    {(stats?.facultyRanking || []).slice(0, 10).map((t, i) => (
                        <ListItem key={t.name} divider={i !== 9} sx={{ px: 0 }}>
                            <ListItemAvatar><Avatar sx={{ bgcolor: i === 0 ? '#d97706' : '#0c4a8a', width: 32, height: 32 }}>{i+1}</Avatar></ListItemAvatar>
                            <ListItemText primary={t.name} secondary={`${t.responses} responses`} />
                            <Chip label={t.average.toFixed(2)} color={i === 0 ? 'warning' : 'default'} size="small" />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Grid>
      </Grid>

      {frequencyData.length > 0 && (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', minHeight: 380 }}>
                    <Typography variant="h6" fontWeight={800} gutterBottom>Choice Frequency Analysis</Typography>
                    <Box sx={{ width: '100%', height: 300, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={frequencyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Legend />
                                <Bar dataKey="value" name="Frequency" fill="#0369a1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
      )}
    </Stack>
  );
};

export default memo(AdminOverview);
