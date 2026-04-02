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
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import LoadStateCard from '../shared/LoadStateCard';

const PIE_COLORS = ['#0c4a8a', '#0369a1', '#0f766e', '#d97706', '#64748b'];

const calcAverage = (scores = []) => {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const total = scores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
  return total / scores.length;
};

const SummaryCard = ({ title, value, detail, icon, color = 'primary.main' }) => (
  <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={900} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Box>
      <Box sx={{ color, opacity: 0.85 }}>{icon}</Box>
    </Stack>
  </Paper>
);

const AdminOverview = ({ evaluations = [], professors = [] }) => {
  const [selectedSection, setSelectedSection] = useState('ALL');

  const professorNameByEmail = useMemo(() => {
    const map = new Map();
    professors.forEach((professor) => {
      if (professor?.email) {
        map.set(professor.email, professor?.name || professor.email);
      }
    });
    return map;
  }, [professors]);

  const sections = useMemo(() => {
    const unique = new Set(evaluations.map((item) => item?.section).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [evaluations]);

  const filteredEvaluations = useMemo(() => {
    if (selectedSection === 'ALL') return evaluations;
    return evaluations.filter((item) => item?.section === selectedSection);
  }, [evaluations, selectedSection]);

  const sectionTrendData = useMemo(() => {
    const source = selectedSection === 'ALL' ? evaluations : filteredEvaluations;
    const sectionMap = new Map();

    source.forEach((ev) => {
      const section = ev?.section || 'Unknown';
      const avg = calcAverage(ev?.scores);
      if (!sectionMap.has(section)) {
        sectionMap.set(section, { section, scoreTotal: 0, responses: 0 });
      }
      const entry = sectionMap.get(section);
      entry.scoreTotal += avg;
      entry.responses += 1;
    });

    return Array.from(sectionMap.values())
      .map((item) => ({
        section: item.section,
        avgScore: Number((item.scoreTotal / Math.max(item.responses, 1)).toFixed(2)),
        responses: item.responses,
      }))
      .sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));
  }, [evaluations, filteredEvaluations, selectedSection]);

  const teacherRanking = useMemo(() => {
    const map = new Map();

    filteredEvaluations.forEach((ev) => {
      const email = ev?.facultyEmail || 'unknown@ua.edu.ph';
      const displayName = professorNameByEmail.get(email) || email;
      const avg = calcAverage(ev?.scores);

      if (!map.has(email)) {
        map.set(email, { email, name: displayName, scoreTotal: 0, responses: 0 });
      }

      const entry = map.get(email);
      entry.scoreTotal += avg;
      entry.responses += 1;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avgScore: Number((item.scoreTotal / Math.max(item.responses, 1)).toFixed(2)),
      }))
      .sort((a, b) => {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        return b.responses - a.responses;
      });
  }, [filteredEvaluations, professorNameByEmail]);

  // NEW: Logical data for the Radar Chart
  const performanceCriteriaData = useMemo(() => {
    const criteriaMap = {};
    
    filteredEvaluations.forEach(ev => {
        ev.scores?.forEach(s => {
            if (!criteriaMap[s.criterion]) {
                criteriaMap[s.criterion] = { subject: s.criterion, fullMark: 10, total: 0, count: 0 };
            }
            criteriaMap[s.criterion].total += Number(s.score) || 0;
            criteriaMap[s.criterion].count += 1;
        });
    });

    return Object.values(criteriaMap).map(c => ({
        subject: c.subject,
        A: Number((c.total / c.count).toFixed(2)),
        fullMark: 10
    }));
  }, [filteredEvaluations]);

  const pieData = useMemo(() => {
    const topFive = teacherRanking.slice(0, 5).map((item) => ({
      name: item.name,
      value: item.responses,
    }));

    const othersTotal = teacherRanking.slice(5).reduce((sum, item) => sum + item.responses, 0);
    if (othersTotal > 0) {
      topFive.push({ name: 'Others', value: othersTotal });
    }
    return topFive;
  }, [teacherRanking]);

  const overallAverage = useMemo(() => {
    if (filteredEvaluations.length === 0) return 0;
    const total = filteredEvaluations.reduce((sum, ev) => sum + calcAverage(ev?.scores), 0);
    return Number((total / filteredEvaluations.length).toFixed(2));
  }, [filteredEvaluations]);

  const bestTeacher = teacherRanking[0] || null;

  if (!evaluations.length) {
    return (
      <LoadStateCard
        icon={<InsightsRoundedIcon sx={{ fontSize: 58 }} />}
        title="No evaluation data yet"
        description="Overall analytics will appear as soon as students submit feedback."
        minHeight={280}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={850} color="primary.main">
            Overall Evaluation Insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track section performance and faculty ranking in one responsive view.
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 160, maxWidth: 240 }}>
          <InputLabel id="admin-overview-section-filter">Section</InputLabel>
          <Select
            labelId="admin-overview-section-filter"
            value={selectedSection}
            label="Section"
            onChange={(event) => setSelectedSection(event.target.value)}
          >
            <MenuItem value="ALL">All Sections</MenuItem>
            {sections.map((section) => (
              <MenuItem key={section} value={section}>
                {section}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Submissions"
            value={filteredEvaluations.length}
            detail={selectedSection === 'ALL' ? 'Across all sections' : `For section ${selectedSection}`}
            icon={<TrendingUpRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Average Score"
            value={overallAverage}
            detail="Across selected scope"
            icon={<StarRoundedIcon />}
            color="#0f766e"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Ranked Teachers"
            value={teacherRanking.length}
            detail="With at least one response"
            icon={<InsightsRoundedIcon />}
            color="#0369a1"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Best Teacher"
            value={bestTeacher ? bestTeacher.avgScore : '-'}
            detail={bestTeacher ? bestTeacher.name : 'No ranking yet'}
            icon={<EmojiEventsRoundedIcon />}
            color="#b45309"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: 360 }}>
            <Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1 }}>
              Section Score Trend
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Line chart of average teacher scores per section.
            </Typography>
            <Box sx={{ width: '100%', height: 270 }}>
              <ResponsiveContainer>
                <LineChart data={sectionTrendData} margin={{ top: 6, right: 14, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    name="Average Score"
                    stroke="#0c4a8a"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: 360 }}>
            <Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1 }}>
              Teacher Evaluation Share
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Pie chart of response share among top-ranked teachers.
            </Typography>
            <Box sx={{ width: '100%', height: 270 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={44}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* New Visual Section: Radar Chart and Ranking List */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: 460 }}>
                <Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1 }}>
                    Performance competency
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Spider chart showing average scores across evaluation criteria.
                </Typography>
                <Box sx={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceCriteriaData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} />
                            <Radar
                                name="Average Competency"
                                dataKey="A"
                                stroke="#0c4a8a"
                                fill="#0c4a8a"
                                fillOpacity={0.5}
                            />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: 460, overflowY: 'auto' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.2} sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                    Faculty Ranking
                </Typography>
                <Chip
                    color="secondary"
                    variant="outlined"
                    icon={<EmojiEventsRoundedIcon />}
                    size="small"
                    label={bestTeacher ? `Top: ${bestTeacher.name}` : 'No ranked teacher'}
                />
                </Stack>

                <List disablePadding>
                {teacherRanking.slice(0, 8).map((teacher, index) => (
                    <ListItem
                    key={teacher.email}
                    sx={{
                        px: 0,
                        py: 1,
                        borderTop: index === 0 ? 'none' : '1px solid #f1f5f9',
                    }}
                    >
                    <ListItemAvatar>
                        <Avatar sx={{ bgcolor: index === 0 ? '#d97706' : '#0c4a8a', width: 32, height: 32, fontSize: '0.875rem' }}>{index + 1}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={teacher.name}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        secondary={`${teacher.responses} response${teacher.responses === 1 ? '' : 's'}`}
                    />
                    <Chip label={`${teacher.avgScore.toFixed(2)}`} color={index === 0 ? 'warning' : 'default'} size="small" />
                    </ListItem>
                ))}
                </List>
            </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default memo(AdminOverview);