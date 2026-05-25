import React, { useMemo, useState, useEffect } from 'react';
import {
  TextField, MenuItem, Box, Typography, Button, Paper,
  Stack, Chip, Divider, Alert, Stepper, Step, StepLabel,
  Card, CardContent, CircularProgress,
  Fade, Tabs, Tab, Slider, Zoom, RadioGroup, FormControlLabel, Radio, Checkbox, FormGroup
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import CelebrationIcon from '@mui/icons-material/Celebration';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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
import uaLogo from './assets/UA-Logo.png';

const UA_BLUE = '#003366';
const UA_GOLD = '#FFCC00';

const SECTIONS = ['1-A', '1-B', '1-C', '2-A', '2-B', '2-C', '3-A', '3-B', '4-A'];
const STEPS = ['Student Info', 'Assigned Faculty Evaluations', 'Review'];
const STUDENT_NUMBER_REGEX = /^\d{6,20}$/;

const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }),
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
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  }),
};

const EvaluationForm = ({ studentEmail, onSubmitted }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);
  const [formData, setFormData] = useState({ studentNumber: '', section: '' });
  const [facultyEvaluations, setFacultyEvaluations] = useState({});
  const [activeFacultyTab, setActiveFacultyTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const [handshakeStatus, setHandshakeStatus] = useState('idle');

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
  const criteria = useMemo(() => {
    const list = Array.isArray(criteriaData) && criteriaData.length > 0 ? criteriaData : DEFAULT_CRITERIA;
    return [...list].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [criteriaData]);

  const isCriterionComplete = (facultyEmail, criterion) => {
    const answer = facultyEvaluations[facultyEmail]?.answers?.[criterion.id];
    if (!criterion.mandatory) return true;

    if (criterion.type === 'RADIO') return answer?.score !== undefined;
    if (criterion.type === 'CHECKBOX') {
        try {
            const choices = JSON.parse(answer?.choiceResponse || '[]');
            return choices.length > 0;
        } catch { return false; }
    }
    if (criterion.type === 'TEXT') return (answer?.textResponse || '').trim().length > 0;
    return false;
  };

  const isFacultyComplete = (facultyEmail) => {
    return criteria.every((criterion) => isCriterionComplete(facultyEmail, criterion));
  };

  const isAllFacultyComplete = useMemo(() => {
    if (!professors.length || !criteria.length) return false;
    return professors.every((professor) => isFacultyComplete(professor.email));
  }, [professors, criteria, facultyEvaluations]);

  useEffect(() => {
    setActiveFacultyTab(0);
  }, [normalizedSection]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (typeof onSubmitted === 'function') onSubmitted();
          else window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showSuccess, onSubmitted]);

  useEffect(() => {
    if (!professors.length || !criteria.length) {
      setFacultyEvaluations({});
      return;
    }

    setFacultyEvaluations((prev) => {
      const next = {};
      let changed = false;
      
      professors.forEach((professor) => {
        const existing = prev[professor.email] || { answers: {}, comment: '' };
        if (!prev[professor.email]) changed = true;
        
        const nextAnswers = {};
        criteria.forEach(c => {
            const existingAns = existing.answers[c.id];
            if (!existingAns) changed = true;
            nextAnswers[c.id] = existingAns || { score: c.type === 'RADIO' ? 5 : undefined, choiceResponse: '[]', textResponse: '' };
        });
        next[professor.email] = { answers: nextAnswers, comment: existing.comment };
      });
      
      // Only update if the structure actually changed (e.g. new professor or criteria loaded)
      if (!changed && Object.keys(prev).length === professors.length) return prev;
      return next;
    });
  }, [professors, criteria]);

  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
  };

  const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const handleNext = () => { setStepDir(1); setActiveStep((prev) => prev + 1); };
  const handleBack = () => { setStepDir(-1); setActiveStep((prev) => prev - 1); };

  const handleSend = async () => {
    setIsSubmitting(true);
    setHandshakeStatus('performing');
    try {
      const keyData = await fetchHandshakeKey();
      const serverKeyData = base64ToArrayBuffer(keyData);
      const studentKeyPair = await window.crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
      const serverPubKey = await window.crypto.subtle.importKey('spki', serverKeyData, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      const sharedSecret = await window.crypto.subtle.deriveKey({ name: 'ECDH', public: serverPubKey }, studentKeyPair.privateKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt']);
      const studentPubKeyExport = await window.crypto.subtle.exportKey('spki', studentKeyPair.publicKey);

      const submissions = professors.map(async (professor) => {
        const facultyState = facultyEvaluations[professor.email];
        
        // 1. Prepare numeric/choice answers for plain-text storage
        const answers = criteria.map(c => ({
            criterionId: c.id,
            score: facultyState.answers[c.id]?.score,
            choiceResponse: facultyState.answers[c.id]?.choiceResponse,
            textResponse: '', // Text is encrypted, so we leave this blank here
        }));

        // 2. Prepare only text/qualitative data for encryption
        const qualitativeData = {
            generalComment: facultyState.comment || '',
            textResponses: criteria
                .filter(c => c.type === 'TEXT')
                .map(c => ({
                    id: c.id,
                    title: c.title,
                    value: facultyState.answers[c.id]?.textResponse || ''
                }))
        };

        const messageIv = window.crypto.getRandomValues(new Uint8Array(12));
        const messageCiphertext = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: messageIv },
          sharedSecret,
          new TextEncoder().encode(JSON.stringify(qualitativeData))
        );

        return submitEvaluation({
          studentNumber: normalizedStudentNumber,
          facultyEmail: professor.email,
          section: normalizedSection,
          studentEmail: studentEmail || '',
          ciphertext: arrayBufferToBase64(messageCiphertext),
          studentPublicKey: arrayBufferToBase64(studentPubKeyExport),
          iv: arrayBufferToBase64(messageIv),
          answers,
        });
      });

      await Promise.all(submissions);
      setHandshakeStatus('completed');
      toast.success('Success! All evaluations submitted securely.');
      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (err) {
      setIsSubmitting(false);
      setHandshakeStatus('idle');
      toast.error(getApiErrorMessage(err, 'Submission failed.'));
    }
  };

  const isProfileStepValid = STUDENT_NUMBER_REGEX.test(normalizedStudentNumber) && Boolean(normalizedSection);
  const activeProfessor = professors[activeFacultyTab] || null;
  const activeFacultyState = activeProfessor ? facultyEvaluations[activeProfessor.email] : null;

  const updateAnswer = (facultyEmail, criterionId, field, value) => {
    setFacultyEvaluations(prev => ({
        ...prev,
        [facultyEmail]: {
            ...prev[facultyEmail],
            answers: {
                ...prev[facultyEmail].answers,
                [criterionId]: { ...prev[facultyEmail].answers[criterionId], [field]: value }
            }
        }
    }));
  };

  const toggleCheckbox = (facultyEmail, criterionId, option) => {
      const currentRaw = facultyEvaluations[facultyEmail]?.answers?.[criterionId]?.choiceResponse || '[]';
      let current = [];
      try { current = JSON.parse(currentRaw); } catch { current = []; }

      const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
      updateAnswer(facultyEmail, criterionId, 'choiceResponse', JSON.stringify(next));
  };

  if (showSuccess) {
    return (
      <Zoom in timeout={280}>
        <Box sx={{ maxWidth: 760, mx: 'auto', py: 2 }}>
          <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, textAlign: 'center', color: 'white', background: `linear-gradient(135deg, ${UA_BLUE} 0%, #001a33 100%)`, borderBottom: `6px solid ${UA_GOLD}` }}>
            <CelebrationIcon sx={{ fontSize: 72, color: UA_GOLD, mb: 1 }} />
            <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>Thank You!</Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>Your evaluations have been received.</Typography>
            <Typography variant="body1">Redirecting in {redirectCountdown}s...</Typography>
          </Paper>
        </Box>
      </Zoom>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 2 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, mb: 4, background: `linear-gradient(135deg, ${UA_BLUE} 0%, #001a33 100%)`, color: 'white', borderBottom: `4px solid ${UA_GOLD}`, textAlign: 'center' }}>
        <Box
          component="img"
          src={uaLogo}
          alt="UA logo"
          sx={{ 
            height: 64, 
            mb: 1.5,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' // Stronger shadow on dark bg
          }}
        />
        <Typography variant="h4" fontWeight={900}>Faculty Evaluation Portal</Typography>
        <Typography variant="body1" sx={{ opacity: 0.8 }}>End-to-End Encrypted via ECDH Twist</Typography>
      </Paper>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
        {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <AnimatePresence mode="wait">
            {activeStep === 0 && (
              <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Stack spacing={3}>
                  <Typography variant="h6" fontWeight={800} color={UA_BLUE}>1. Student Identification</Typography>
                  <TextField fullWidth label="Student Number" value={formData.studentNumber} onChange={e => setFormData({ ...formData, studentNumber: e.target.value.replace(/\D/g, '') })} />
                  <TextField select fullWidth label="Year and Section" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}>
                    {SECTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="contained" onClick={handleNext} disabled={!isProfileStepValid}>Continue</Button></Box>
                </Stack>
              </motion.div>
            )}

            {activeStep === 1 && (
              <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Tabs value={activeFacultyTab} onChange={(_, v) => setActiveFacultyTab(v)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  {professors.map((p, idx) => (
                    <Tab key={p.email} label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{p.name || p.email}</span>
                        {isFacultyComplete(p.email) ? <CheckCircleIcon fontSize="small" color="success" /> : <HelpOutlineIcon fontSize="small" color="warning" />}
                      </Stack>
                    } />
                  ))}
                </Tabs>

                {activeProfessor && activeFacultyState && (
                  <Stack spacing={4}>
                    <Box>
                        <Typography variant="h5" fontWeight={800} color={UA_BLUE}>{activeProfessor.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{activeProfessor.role}</Typography>
                    </Box>

                    {criteria.map((c, i) => {
                        const options = c.options ? JSON.parse(c.options) : null;
                        const answer = activeFacultyState.answers[c.id];

                        return (
                          <motion.div key={c.id} custom={i} variants={cardFadeUp} initial="hidden" animate="visible">
                            <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fcfcfc' }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                  <Typography fontWeight={700}>{i+1}. {c.title}</Typography>
                                  {c.mandatory && <Chip label="Required" size="small" color="error" variant="outlined" />}
                              </Stack>

                              {c.type === 'RADIO' && (
                                  options ? (
                                    <RadioGroup value={answer?.score ?? ''} onChange={e => updateAnswer(activeProfessor.email, c.id, 'score', parseInt(e.target.value))}>
                                        {options.map((opt, oIdx) => (
                                            <FormControlLabel key={oIdx} value={oIdx} control={<Radio />} label={opt} />
                                        ))}
                                    </RadioGroup>
                                  ) : (
                                    <Box sx={{ px: 2 }}>
                                        <Slider value={answer?.score ?? 5} min={1} max={10} step={1} marks valueLabelDisplay="auto" onChange={(_, v) => updateAnswer(activeProfessor.email, c.id, 'score', v)} />
                                        <Typography variant="caption" color="text.secondary">Scale: 1 (Poor) to 10 (Excellent)</Typography>
                                    </Box>
                                  )
                              )}

                              {c.type === 'CHECKBOX' && (
                                  <FormGroup>
                                      {(options || []).map((opt, oIdx) => (
                                          <FormControlLabel
                                            key={oIdx}
                                            control={<Checkbox checked={JSON.parse(answer?.choiceResponse || '[]').includes(opt)} onChange={() => toggleCheckbox(activeProfessor.email, c.id, opt)} />}
                                            label={opt}
                                          />
                                      ))}
                                  </FormGroup>
                              )}

                              {c.type === 'TEXT' && (
                                  <TextField fullWidth multiline rows={3} placeholder="Your detailed feedback..." value={answer?.textResponse || ''} onChange={e => updateAnswer(activeProfessor.email, c.id, 'textResponse', e.target.value)} />
                              )}
                            </Box>
                          </motion.div>
                        );
                    })}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>Back</Button>
                        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext} disabled={!isAllFacultyComplete}>Review Submission</Button>
                    </Box>
                  </Stack>
                )}
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>3. Final Review</Typography>
                <Stack spacing={2}>
                    {professors.map(p => (
                        <Card key={p.email} variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Typography fontWeight={800}>{p.name}</Typography>
                                <Typography variant="body2" color="text.secondary">All mandatory fields completed.</Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={isSubmitting}>Edit</Button>
                    <Button variant="contained" startIcon={<LockIcon />} onClick={handleSend} disabled={isSubmitting} sx={{ bgcolor: UA_GOLD, color: UA_BLUE, '&:hover': { bgcolor: '#e6b800' } }}>
                        {isSubmitting ? 'Encrypting...' : 'Submit Securely'}
                    </Button>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EvaluationForm;
