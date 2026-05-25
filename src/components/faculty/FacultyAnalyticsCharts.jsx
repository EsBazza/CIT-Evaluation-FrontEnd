import React, { useMemo } from 'react';
import { Box, Paper, Stack, Typography, Grid, Chip } from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

const COLORS = ['#0c4a8a', '#d97706', '#0f766e', '#0369a1', '#64748b'];

const FacultyAnalyticsCharts = ({ evaluations = [], criteriaLookup = {} }) => {
  const analytics = useMemo(() => {
    const criteriaStats = new Map();
    const sectionStats = new Map();
    const checkboxStats = new Map();

    evaluations.forEach((evaluation) => {
      const section = evaluation?.section || 'Unknown';
      const answers = Array.isArray(evaluation?.answers) ? evaluation.answers : [];
      
      const numericAnswers = answers.filter(a => a?.score !== null && a?.score !== undefined);
      const submissionAverage = numericAnswers.length
        ? numericAnswers.reduce((sum, item) => sum + Number(item.score), 0) / numericAnswers.length
        : 0;

      if (!sectionStats.has(section)) {
        sectionStats.set(section, { section, avgScore: 0, responses: 0 });
      }
      const existingSection = sectionStats.get(section);
      existingSection.avgScore += submissionAverage;
      existingSection.responses += 1;

      answers.forEach((a) => {
        const criterionId = a?.criterionId;
        const criterionName = a?.criterionTitle || criteriaLookup?.[criterionId] || `Criterion ${criterionId || ''}`.trim();

        if (a.score !== null && a.score !== undefined) {
            if (!criteriaStats.has(criterionName)) {
              criteriaStats.set(criterionName, { criterion: criterionName, average: 0, count: 0 });
            }
            const existingCriterion = criteriaStats.get(criterionName);
            existingCriterion.average += Number(a.score);
            existingCriterion.count += 1;
        }

        if (a.choiceResponse && a.choiceResponse !== '[]') {
            try {
                const choices = JSON.parse(a.choiceResponse);
                if (!checkboxStats.has(criterionName)) checkboxStats.set(criterionName, {});
                const options = checkboxStats.get(criterionName);
                choices.forEach(c => { options[c] = (options[c] || 0) + 1; });
            } catch {}
        }
      });
    });

    const criteriaAverages = Array.from(criteriaStats.values())
      .map((item) => ({
        criterion: item.criterion.length > 20 ? `${item.criterion.slice(0, 20)}...` : item.criterion,
        average: Number((item.average / Math.max(item.count, 1)).toFixed(2)),
      }))
      .sort((a, b) => b.average - a.average);

    const sectionTrend = Array.from(sectionStats.values())
      .map((item) => ({
        section: item.section,
        avgScore: Number((item.avgScore / Math.max(item.responses, 1)).toFixed(2)),
        responses: item.responses,
      }))
      .sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));

    const choiceAnalysis = Array.from(checkboxStats.entries()).map(([title, options]) => ({
        title,
        data: Object.entries(options).map(([name, value]) => ({ name, value }))
    }));

    return { criteriaAverages, sectionTrend, choiceAnalysis };
  }, [evaluations, criteriaLookup]);

  return (
    <Stack spacing={3} sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={900} color="primary.main">Analytics Overview</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', minHeight: 400 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <TrackChangesRoundedIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={800}>Criterion Competency Radar</Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 320, minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height={320}>
                        <RadarChart data={analytics.criteriaAverages}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10, fontWeight: 700 }} />
                            <PolarRadiusAxis domain={[0, 10]} />
                            <Radar name="Average Score" dataKey="average" stroke="#0c4a8a" fill="#0c4a8a" fillOpacity={0.4} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', minHeight: 400 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <TrendingUpRoundedIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={800}>Section Performance Distribution</Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 320, minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={analytics.sectionTrend} margin={{ left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="section" tick={{ fontSize: 11, fontWeight: 700 }} />
                            <YAxis domain={[0, 10]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avgScore" name="Avg Score" fill="#0c4a8a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="responses" name="Total Responses" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>
        </Grid>
      </Grid>

      {analytics.choiceAnalysis.map((choice, idx) => (
          <Paper key={idx} elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', minHeight: 320 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <BarChartIcon sx={{ color: COLORS[idx % COLORS.length] }} />
                  <Typography variant="subtitle1" fontWeight={800}>{choice.title} - Choice Distribution</Typography>
              </Stack>
              <Box sx={{ width: '100%', height: 250, minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={choice.data} layout="vertical" margin={{ left: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="value" name="Selections" fill={COLORS[idx % COLORS.length]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </Box>
          </Paper>
      ))}
    </Stack>
  );
};

export default FacultyAnalyticsCharts;
