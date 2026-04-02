import React, { useMemo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
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
} from 'recharts';

const FacultyAnalyticsCharts = ({ evaluations, criteriaLookup = {} }) => {
  const { criteriaAverages, sectionTrend } = useMemo(() => {
    const criteriaStats = new Map();
    const sectionStats = new Map();

    evaluations.forEach((evaluation) => {
      const section = evaluation?.section || 'Unknown';
      const scores = Array.isArray(evaluation?.scores) ? evaluation.scores : [];
      const submissionAverage = scores.length
        ? scores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0) / scores.length
        : 0;

      if (!sectionStats.has(section)) {
        sectionStats.set(section, { section, avgScore: 0, responses: 0 });
      }
      const existingSection = sectionStats.get(section);
      existingSection.avgScore += submissionAverage;
      existingSection.responses += 1;

      scores.forEach((scoreItem) => {
        const criterionId = scoreItem?.criterionId;
        const criterionName =
          scoreItem?.criterionTitle ||
          criteriaLookup?.[criterionId] ||
          `Criterion ${criterionId || ''}`.trim();
        if (!criteriaStats.has(criterionName)) {
          criteriaStats.set(criterionName, { criterion: criterionName, average: 0, count: 0 });
        }
        const existingCriterion = criteriaStats.get(criterionName);
        existingCriterion.average += Number(scoreItem?.score) || 0;
        existingCriterion.count += 1;
      });
    });

    Object.values(criteriaLookup || {}).forEach((title) => {
      if (title && !criteriaStats.has(title)) {
        criteriaStats.set(title, { criterion: title, average: 0, count: 0 });
      }
    });

    const criteriaAveragesData = Array.from(criteriaStats.values())
      .map((item) => ({
        criterion: item.criterion.length > 22 ? `${item.criterion.slice(0, 22)}...` : item.criterion,
        average: Number((item.average / Math.max(item.count, 1)).toFixed(2)),
      }))
      .sort((a, b) => b.average - a.average);

    const sectionTrendData = Array.from(sectionStats.values())
      .map((item) => ({
        section: item.section,
        avgScore: Number((item.avgScore / Math.max(item.responses, 1)).toFixed(2)),
        responses: item.responses,
      }))
      .sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));

    return { criteriaAverages: criteriaAveragesData, sectionTrend: sectionTrendData };
  }, [evaluations, criteriaLookup]);

  return (
    <Stack spacing={2.5} sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={800} color="primary.main">
        Per-Criterion Analytics
      </Typography>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>

        {/* 🔥 RADAR CHART */}
        <Paper 
          elevation={0} 
          className="glass-card"
          sx={{ 
            p: 2.5, 
            borderRadius: 3,
            flex: 1
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <TrackChangesRoundedIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Criteria Average Radar
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Highlights strengths and weak criteria to guide coaching actions.
          </Typography>

          <Box sx={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <RadarChart data={criteriaAverages} outerRadius="75%">
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 10 }} />
                <Radar 
                  dataKey="average" 
                  stroke="#0c4a8a" 
                  fill="#0c4a8a" 
                  fillOpacity={0.25} 
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '10px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* 🔥 BAR CHART */}
        <Paper 
          elevation={0} 
          className="glass-card"
          sx={{ 
            p: 2.5, 
            borderRadius: 3,
            flex: 1
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <TrendingUpRoundedIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Section Trends
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Compares average performance and response volume by section.
          </Typography>

          <Box sx={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={sectionTrend} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '10px'
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="avgScore" name="Avg Score" fill="#0c4a8a" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="responses" name="Responses" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

      </Stack>
    </Stack>
  );
};

export default FacultyAnalyticsCharts;