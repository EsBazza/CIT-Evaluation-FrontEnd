import React, { useMemo, useState, useEffect } from 'react';
import {
  TextField, MenuItem, Box, Typography, Button, Paper,
  Stack, Chip, Divider, Alert, Stepper, Step, StepLabel,
  Card, CardContent, CircularProgress,
  Fade, Tabs, Tab, Slider, Zoom
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DEFAULT_CRITERIA,
  fetchHandshakeKey,
  fetchPublicCriteria,
  fetchPublicProfessors,
  submitEvaluation,
} from './shared/api/evaluationApi';
import { getApiErrorMessage } from './shared/api/client';

const UA_BLUE = '#003366';
const UA_GOLD = '#FFCC00';

const SECTIONS = ['1-A', '1-B', '1-C', '2-A', '2-B', '2-C', '3-A', '3-B', '4-A'];
const STEPS = ['Student Info', 'Assigned Faculty Evaluations', 'Review'];
const STUDENT_NUMBER_REGEX = /^\d{6,20}$/;

// ─── Animation variants ───────────────────────────────────────────────────────
const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }),
};

const glassStyle = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.2)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
};

const lockPulse = {
  idle: { scale: 1, opacity: 0.7 },
  performing: {
    scale: [1, 1.18, 1],
    opacity: [0.7, 1, 0.7],
    filter: ['drop-shadow(0 0 0px #FFCC00)', 'drop-shadow(0 0 10px #FFCC00)', 'drop-shadow(0 0 0px #FFCC00)'],
    transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
  },
  completed: {
    scale: 1.12,
    opacity: 1,
    filter: 'drop-shadow(0 0 8px #16a34a)',
    transition: { duration: 0.35 },
  },
};

const cardFadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.36, ease: [0.4, 0, 0.2, 1] },
  }),
};

const EvaluationForm = ({ studentEmail, onSubmitted }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [stepDir, setStepDir] = useState(1); // 1 = forward, -1 = backward
  const [formData, setFormData] = useState({
    studentNumber: '',
    section: '',
  });
  const [facultyEvaluations, setFacultyEvaluations] = useState({});
  const [activeFacultyTab, setActiveFacultyTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const [handshakeStatus, setHandshakeStatus] = useState('idle'); // idle, performing, completed

  const normalizedSection = formData.section.trim().toUpperCase();
  const normalizedStudentNumber = formData.studentNumber.trim();

  const { data: professorsData = [], isFetching: professorsLoading } = useQuery({
    queryKey: ['public-professors', normalizedSection],
    queryFn: () => fetchPublicProfessors(normalizedSection),
    enabled: Boolean(normalizedSection),
    retry: 0,
  });

  const { data: criteriaData } = useQuery({
    queryKey: ['public-criteria'],
    queryFn: fetchPublicCriteria,
    retry: 0,
  });

  const professors = useMemo(() => Array.isArray(professorsData) ? professorsData : [], [professorsData]);
  const criteria = useMemo(() => Array.isArray(criteriaData) && criteriaData.length > 0 ? criteriaData : DEFAULT_CRITERIA, [criteriaData]);

  const isFacultyComplete = (facultyEmail) => {
    const touched = facultyEvaluations[facultyEmail]?.touched || {};
    return criteria.every((criterion) => touched[criterion.id] === true);
  };

  const isAllFacultyComplete = useMemo(() => {
    if (!professors.length || !criteria.length) return false;
    return professors.every((professor) => isFacultyComplete(professor.email));
  }, [professors, criteria, facultyEvaluations]);

  const reviewRows = useMemo(() => {
    return professors.map((professor) => {
      const facultyState = facultyEvaluations[professor.email] || { scores: {}, touched: {}, comment: '' };
      const total = criteria.reduce((sum, criterion) => sum + (facultyState.scores?.[criterion.id] ?? 5), 0);
      const average = criteria.length ? (total / criteria.length).toFixed(1) : '0.0';
      const completion = criteria.length
        ? criteria.filter((criterion) => facultyState.touched?.[criterion.id] === true).length
        : 0;

      return {
        professor,
        average,
        completion,
        criteriaCount: criteria.length,
        comment: facultyState.comment || '',
      };
    });
  }, [professors, facultyEvaluations, criteria]);

  useEffect(() => {
    setActiveFacultyTab(0);
  }, [normalizedSection]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (typeof onSubmitted === 'function') {
            onSubmitted();
          } else {
            window.location.href = '/';
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showSuccess, onSubmitted]);

  useEffect(() => {
    if (!professors.length) {
      setFacultyEvaluations({});
      return;
    }

    setFacultyEvaluations((prev) => {
      const next = {};
      professors.forEach((professor) => {
        const existing = prev[professor.email];
        const defaultScores = criteria.reduce((acc, c) => {
          acc[c.id] = Number.isFinite(existing?.scores?.[c.id]) ? existing.scores[c.id] : 5;
          return acc;
        }, {});
        const touchedScores = criteria.reduce((acc, c) => {
          acc[c.id] = existing?.touched?.[c.id] === true;
          return acc;
        }, {});

        next[professor.email] = {
          scores: defaultScores,
          touched: touchedScores,
          comment: existing?.comment ?? '',
        };
      });
      return next;
    });
  }, [professors, criteria]);

  // Crypto Helpers (Preserving your existing logic)
  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const arrayBufferToBase64 = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  };

  const handleNext = () => {
    setStepDir(1);
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => {
    setStepDir(-1);
    setActiveStep((prev) => prev - 1);
  };

  const handleSend = async () => {
    setIsSubmitting(true);
    setHandshakeStatus('performing');

    try {
      // 1. Fetch Server Public Key (Handshake Start)
      const keyData = await fetchHandshakeKey();
      const serverKeyData = base64ToArrayBuffer(keyData);

      // 2. Generate Student Key Pair (ECDH)
      const studentKeyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey']
      );

      // 3. Import Server Public Key
      const serverPubKey = await window.crypto.subtle.importKey(
        'spki',
        serverKeyData,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // 4. Derive Shared Secret
      const sharedSecret = await window.crypto.subtle.deriveKey(
        { name: 'ECDH', public: serverPubKey },
        studentKeyPair.privateKey,
        { name: 'AES-GCM', length: 128 },
        false,
        ['encrypt']
      );

      const studentPubKeyExport = await window.crypto.subtle.exportKey('spki', studentKeyPair.publicKey);

      const submissions = professors.map(async (professor) => {
        const facultyState = facultyEvaluations[professor.email] || { scores: {}, comment: '' };
        const scores = criteria.map((c) => ({
          criterionId: c.id,
          score: Math.round(facultyState.scores?.[c.id]),
        }));

        const commentText = facultyState.comment?.trim() || 'No comment provided.';
        const messageIv = window.crypto.getRandomValues(new Uint8Array(12));
        const messageCiphertext = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: messageIv },
          sharedSecret,
          new TextEncoder().encode(commentText)
        );

        const payload = {
          studentNumber: normalizedStudentNumber,
          facultyEmail: professor.email,
          section: normalizedSection,
          studentEmail: studentEmail || '',
          ciphertext: arrayBufferToBase64(messageCiphertext),
          studentPublicKey: arrayBufferToBase64(studentPubKeyExport),
          iv: arrayBufferToBase64(messageIv),
          scores,
        };

        return submitEvaluation(payload);
      });

      await Promise.all(submissions);
  setHandshakeStatus('completed');
  toast.success('Success! Assigned faculty evaluations submitted securely.');
      setIsSubmitting(false);
      setShowSuccess(true);

    } catch (err) {
      setIsSubmitting(false);
      setHandshakeStatus('idle');
      const status = err?.response?.status;
      const fallbackMessage =
        status === 409
          ? 'It looks like this evaluation was already submitted. Duplicate submissions are blocked.'
          : 'Submission failed.';
      toast.error(getApiErrorMessage(err, fallbackMessage));
    }
  };

  const isStudentNumberValid = STUDENT_NUMBER_REGEX.test(normalizedStudentNumber);
  const isProfileStepValid = isStudentNumberValid && Boolean(normalizedSection);
  const hasAssignedFaculty = professors.length > 0;

  const activeProfessor = professors[activeFacultyTab] || null;
  const activeFacultyState = activeProfessor ? facultyEvaluations[activeProfessor.email] : null;

  const updateFacultyScore = (facultyEmail, criterionId, value, markTouched = false) => {
    if (!Number.isFinite(value)) return;
    setFacultyEvaluations((prev) => ({
      ...prev,
      [facultyEmail]: {
        ...(prev[facultyEmail] || { scores: {}, touched: {}, comment: '' }),
        scores: {
          ...((prev[facultyEmail] || {}).scores || {}),
          [criterionId]: value,
        },
        touched: {
          ...((prev[facultyEmail] || {}).touched || {}),
          [criterionId]: markTouched ? true : ((prev[facultyEmail] || {}).touched || {})[criterionId] === true,
        },
      },
    }));
  };

  const updateFacultyComment = (facultyEmail, comment) => {
    setFacultyEvaluations((prev) => ({
      ...prev,
      [facultyEmail]: {
        ...(prev[facultyEmail] || { scores: {}, touched: {}, comment: '' }),
        comment,
      },
    }));
  };

  if (showSuccess) {
    return (
      <Zoom in timeout={280}>
        <Box sx={{ maxWidth: 760, mx: 'auto', py: 2 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                textAlign: 'center',
                color: 'white',
                background: `radial-gradient(circle at top, ${UA_GOLD}22 0%, transparent 45%), linear-gradient(135deg, ${UA_BLUE} 0%, #001a33 100%)`,
                borderBottom: `6px solid ${UA_GOLD}`,
                boxShadow: '0 24px 50px rgba(0,0,0,0.2)',
              }}
            >
              <motion.div
                initial={{ rotate: -15, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
              >
                <CelebrationIcon sx={{ fontSize: 72, color: UA_GOLD, mb: 1 }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35 }}
              >
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>
                  Thank You!
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                  Your section evaluations were submitted securely.
                </Typography>
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Submission Complete"
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 800, mb: 2 }}
                />
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Redirecting to main page in {redirectCountdown} second{redirectCountdown === 1 ? '' : 's'}...
                </Typography>
              </motion.div>
            </Paper>
          </motion.div>
        </Box>
      </Zoom>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 2 }}>
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
      >
        <Paper
          elevation={0}
          className="glass-dark"
          sx={{
            p: 4,
            borderRadius: 4,
            mb: 4,
            background: `linear-gradient(135deg, ${UA_BLUE} 0%, #001a33 100%)`,
            color: 'white',
            borderBottom: `4px solid ${UA_GOLD}`,
            textAlign: 'center',

            // ✨ ADD THIS (glass enhancement)
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Stack alignItems="center" spacing={1}>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.38, type: 'spring', stiffness: 220 }}
            >
              <SchoolIcon sx={{ fontSize: 40, color: UA_GOLD, mb: 1 }} />
            </motion.div>
            <Typography variant="h4" fontWeight={900}>Faculty Evaluation</Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              Your feedback is private, anonymous, and secured by Diffie-Hellman encryption.
            </Typography>
          </Stack>
        </Paper>
      </motion.div>

      {/* Stepper */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.35 }}
      >
        <Box sx={{ mb: 5, px: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label} sx={{
                '& .MuiStepLabel-label.Mui-active': { color: UA_BLUE, fontWeight: 800 },
                '& .MuiStepIcon-root.Mui-active': { color: UA_BLUE },
                '& .MuiStepIcon-root.Mui-completed': { color: '#2e7d32' }
              }}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </motion.div>

      {/* Form Content */}
      <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>

          <AnimatePresence mode="wait" custom={stepDir}>
            {/* STEP 1: Selection */}
            {activeStep === 0 && (
              <motion.div
                key="step-0"
                custom={stepDir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <Fade in={activeStep === 0}>
                  <Stack spacing={3}>
                    <Typography variant="h6" fontWeight={800} color={UA_BLUE}>
                      1. Student Identification
                    </Typography>
                    <TextField
                      fullWidth
                      label="Student Number"
                      placeholder="e.g. 202312345"
                      value={formData.studentNumber}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, studentNumber: onlyDigits });
                      }}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        maxLength: 20,
                        'aria-label': 'Student number, numbers only',
                      }}
                      error={Boolean(formData.studentNumber) && !isStudentNumberValid}
                      helperText={
                        Boolean(formData.studentNumber) && !isStudentNumberValid
                          ? 'Use 6-20 digits only.'
                          : 'Numbers only. This will be validated before you can proceed.'
                      }
                    />
                    <TextField
                      select
                      fullWidth
                      label="Year and Section"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      helperText="Example format: 2-A"
                    >
                      {SECTIONS.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </TextField>

                    <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        disabled={!isProfileStepValid}
                        onClick={handleNext}
                        sx={{ bgcolor: UA_BLUE, px: 4, py: 1.2, borderRadius: 2 }}
                      >
                        Continue to Assigned Faculty
                      </Button>
                    </Box>
                  </Stack>
                </Fade>
              </motion.div>
            )}

            {/* STEP 2: Assigned Faculty Tabs */}
            {activeStep === 1 && (
              <motion.div
                key="step-1"
                custom={stepDir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <Fade in={activeStep === 1}>
                  <Stack spacing={4}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color={UA_BLUE}>
                        2. Assigned Faculty Evaluations
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Faculty for section {normalizedSection} are pre-assigned. Use each tab to complete metrics and secure feedback.
                      </Typography>
                    </Box>

                    {professorsLoading && (
                      <Alert severity="info" aria-live="polite">
                        Fetching faculty list for section {normalizedSection}.
                      </Alert>
                    )}

                    {!professorsLoading && !hasAssignedFaculty && (
                      <Alert severity="warning">
                        No faculty members are currently assigned to section {normalizedSection}. Please contact your administrator.
                      </Alert>
                    )}

                    {hasAssignedFaculty && (
                      <>
                        <Tabs
                          value={activeFacultyTab}
                          onChange={(_, value) => setActiveFacultyTab(value)}
                          variant="scrollable"
                          scrollButtons="auto"
                          aria-label="Assigned faculty tabs"
                          sx={{
                            borderBottom: '1px solid #e2e8f0',
                            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 },
                          }}
                        >
                          {professors.map((professor) => (
                            <Tab
                              key={professor.email}
                              label={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <span>{professor.name || professor.email}</span>
                                  {isFacultyComplete(professor.email) ? (
                                    <Chip label="Done" size="small" color="success" />
                                  ) : (
                                    <Chip label="Pending" size="small" color="warning" variant="outlined" />
                                  )}
                                </Stack>
                              }
                              id={`faculty-tab-${professor.email}`}
                              aria-controls={`faculty-panel-${professor.email}`}
                            />
                          ))}
                        </Tabs>

                        {activeProfessor && (
                          <Box id={`faculty-panel-${activeProfessor.email}`} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Stack spacing={2} sx={{ mb: 1 }}>
                              <Typography variant="h6" fontWeight={800} color={UA_BLUE}>
                                {activeProfessor.name || activeProfessor.email}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Role: {activeProfessor.role || 'Faculty'}
                              </Typography>
                            </Stack>

                            <Stack spacing={2.5}>
                              <Alert severity="info" sx={{ borderRadius: 2 }}>
                                Complete all metric scores for this faculty tab. Each criterion requires an explicit score selection.
                              </Alert>

                              {criteria.map((c, i) => (
                                <motion.div
                                  key={c.id}
                                  custom={i}
                                  variants={cardFadeUp}
                                  initial="hidden"
                                  animate="visible"
                                >
                                  <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                      <Typography fontWeight={700}>{c.title}</Typography>
                                      <Chip
                                        label={activeFacultyState?.scores?.[c.id] ?? 5}
                                        size="small"
                                        color={activeFacultyState?.touched?.[c.id] ? 'primary' : 'warning'}
                                        variant={activeFacultyState?.touched?.[c.id] ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: 800 }}
                                      />
                                    </Stack>
                                    <Slider
                                      fullWidth
                                      value={activeFacultyState?.scores?.[c.id] ?? 5}
                                      min={1}
                                      max={10}
                                      step={1}
                                      marks
                                      valueLabelDisplay="auto"
                                      onChange={(_, value) => updateFacultyScore(activeProfessor.email, c.id, value)}
                                      onChangeCommitted={(_, value) => updateFacultyScore(activeProfessor.email, c.id, value, true)}
                                      sx={{
                                        color: UA_BLUE,
                                        py: 1,
                                        '& .MuiSlider-thumb': { width: 22, height: 22 },
                                        '& .MuiSlider-markLabel': { fontSize: { xs: '0.7rem', sm: '0.75rem' } },
                                      }}
                                    />
                                  </Box>
                                </motion.div>
                              ))}

                              <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Secure Feedback"
                                placeholder="Share your experience with this faculty member..."
                                value={activeFacultyState?.comment || ''}
                                onChange={(e) => updateFacultyComment(activeProfessor.email, e.target.value)}
                                variant="outlined"
                                sx={{ bgcolor: '#fcfcfc' }}
                              />
                            </Stack>
                          </Box>
                        )}
                      </>
                    )}

                    {/* Handshake Visualizer */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: handshakeStatus === 'completed' ? '#f0fdf4' : '#f8fafc',
                        border: handshakeStatus === 'completed' ? '1px solid #bcf0da' : '1px solid #e2e8f0',
                        textAlign: 'center'
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {handshakeStatus === 'idle' && (
                          <motion.div
                            key="hs-idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                              <SecurityIcon color="primary" />
                              <Typography variant="body2" fontWeight={600}>
                                Ready for Diffie-Hellman Handshake
                              </Typography>
                            </Stack>
                          </motion.div>
                        )}

                        {handshakeStatus === 'performing' && (
                          <motion.div
                            key="hs-performing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <Stack spacing={1.5} alignItems="center">
                              <motion.div
                                variants={lockPulse}
                                initial="idle"
                                animate="performing"
                              >
                                <LockIcon sx={{ fontSize: 32, color: UA_BLUE }} />
                              </motion.div>
                              <CircularProgress size={24} sx={{ color: UA_BLUE }} />
                              <Typography variant="body2" fontWeight={700} color={UA_BLUE}>
                                Establishing Secure Key Exchange...
                              </Typography>
                            </Stack>
                          </motion.div>
                        )}

                        {handshakeStatus === 'completed' && (
                          <motion.div
                            key="hs-completed"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                              <motion.div variants={lockPulse} animate="completed">
                                <CheckCircleIcon color="success" />
                              </motion.div>
                              <Typography variant="body2" fontWeight={700} color="success.main">
                                Encrypted & Submitted Successfully
                              </Typography>
                            </Stack>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
                      <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                        disabled={isSubmitting}
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        disabled={!hasAssignedFaculty || professorsLoading || !isAllFacultyComplete}
                        onClick={handleNext}
                        sx={{
                          bgcolor: UA_BLUE,
                          px: 5,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 800,
                          '&:hover': { bgcolor: '#0a3d73' }
                        }}
                      >
                        Review All Evaluations
                      </Button>
                    </Box>

                    {!isAllFacultyComplete && hasAssignedFaculty && !professorsLoading && (
                      <Alert severity="warning" sx={{ borderRadius: 2 }} aria-live="polite">
                        You must rate every criterion for each assigned faculty before submission.
                      </Alert>
                    )}
                  </Stack>
                </Fade>
              </motion.div>
            )}

            {/* STEP 3: Review */}
            {activeStep === 2 && (
              <motion.div
                key="step-2"
                custom={stepDir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <Fade in={activeStep === 2}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color={UA_BLUE}>
                        3. Review Before Secure Submission
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Double-check the overview below, then submit all assigned faculty evaluations securely.
                      </Typography>
                    </Box>

                    {reviewRows.map((row, i) => (
                      <motion.div
                        key={row.professor.email}
                        custom={i}
                        variants={cardFadeUp}
                        initial="hidden"
                        animate="visible"
                      >
                        <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                          <CardContent>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                              <Box>
                                <Typography variant="h6" fontWeight={800}>{row.professor.name || row.professor.email}</Typography>
                                <Typography variant="body2" color="text.secondary">{row.professor.role || 'Faculty'}</Typography>
                              </Box>
                              <Chip
                                label={`Average ${row.average}/10`}
                                color="primary"
                                sx={{ fontWeight: 800, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                              />
                            </Stack>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography variant="body2" color="text.secondary">
                              Metrics completed: {row.completion}/{row.criteriaCount}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Feedback: {row.comment?.trim() ? row.comment : 'No comment provided.'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: handshakeStatus === 'completed' ? '#f0fdf4' : '#f8fafc',
                        border: handshakeStatus === 'completed' ? '1px solid #bcf0da' : '1px solid #e2e8f0',
                        textAlign: 'center'
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {handshakeStatus === 'idle' && (
                          <motion.div
                            key="hs2-idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                              <SecurityIcon color="primary" />
                              <Typography variant="body2" fontWeight={600}>
                                Ready for Diffie-Hellman Handshake
                              </Typography>
                            </Stack>
                          </motion.div>
                        )}

                        {handshakeStatus === 'performing' && (
                          <motion.div
                            key="hs2-performing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <Stack spacing={1.5} alignItems="center">
                              <motion.div
                                variants={lockPulse}
                                initial="idle"
                                animate="performing"
                              >
                                <LockIcon sx={{ fontSize: 36, color: UA_GOLD }} />
                              </motion.div>
                              <CircularProgress size={24} sx={{ color: UA_BLUE }} />
                              <Typography variant="body2" fontWeight={700} color={UA_BLUE}>
                                Encrypting and submitting evaluations...
                              </Typography>
                            </Stack>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                      <Button startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={isSubmitting}>
                        Back to Edit
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
                        disabled={isSubmitting || !isAllFacultyComplete}
                        onClick={handleSend}
                        sx={{
                          bgcolor: UA_GOLD,
                          color: UA_BLUE,
                          px: 5,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 800,
                          '&:hover': { bgcolor: '#e6b800' }
                        }}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Securely'}
                      </Button>
                    </Box>
                  </Stack>
                </Fade>
              </motion.div>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>

      {/* Privacy Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
          <ShieldIcon fontSize="small" />
          <Typography variant="caption" fontWeight={600}>
            End-to-End Encrypted evaluation session.
          </Typography>
        </Stack>
      </motion.div>
    </Box>
  );
};

export default EvaluationForm;