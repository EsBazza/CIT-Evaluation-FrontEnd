import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { createCriterion, deleteCriterion, updateCriterion } from '../../shared/api/adminApi';
import { getApiErrorMessage } from '../../shared/api/client';
import LoadStateCard from '../shared/LoadStateCard';

const CRITERION_TYPES = [
  { value: 'RADIO', label: 'Radio Buttons (Numeric 1-10)' },
  { value: 'CHECKBOX', label: 'Checkboxes (Multiple Choice)' },
  { value: 'TEXT', label: 'Text Box (Open Ended)' },
];

const CriteriaManager = ({ criteria, loading, error, onRetry, sharedGridSx, cardSurfaceSx }) => {
  const queryClient = useQueryClient();
  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [criterionForm, setCriterionForm] = useState({
    title: '',
    type: 'RADIO',
    mandatory: true,
    options: '',
    orderIndex: 0
  });

  const saveCriterionMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateCriterion(id, payload) : createCriterion(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-criteria'] });
      toast.success(selectedCriterion ? 'Criterion updated.' : 'Criterion added.');
      setCriterionDialogOpen(false);
      setSelectedCriterion(null);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to save criterion.')),
  });

  const removeCriterionMutation = useMutation({
    mutationFn: (id) => deleteCriterion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-criteria'] });
      toast.success('Criterion removed.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to delete criterion.')),
  });

  const openCriterionDialog = (item = null) => {
    setSelectedCriterion(item);
    if (item) {
      setCriterionForm({
        title: item.title || '',
        type: item.type || 'RADIO',
        mandatory: item.mandatory ?? true,
        options: item.options || '',
        orderIndex: item.orderIndex || 0
      });
    } else {
      setCriterionForm({
        title: '',
        type: 'RADIO',
        mandatory: true,
        options: '',
        orderIndex: criteria.length
      });
    }
    setCriterionDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      { field: 'orderIndex', headerName: '#', width: 60 },
      { field: 'title', headerName: 'Criterion', flex: 1.3, minWidth: 200 },
      { field: 'type', headerName: 'Type', width: 120 },
      {
        field: 'mandatory',
        headerName: 'Required',
        width: 100,
        renderCell: (params) => (params.value ? 'Yes' : 'No')
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <IconButton size="small" color="primary" onClick={() => openCriterionDialog(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => removeCriterionMutation.mutate(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [removeCriterionMutation, criteria]
  );

  return (
    <Paper elevation={0} sx={{ ...cardSurfaceSx, p: 2.5, borderColor: '#e2e8f0', mt: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={800}>Evaluation Criteria</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => openCriterionDialog()}>
          Add Criterion
        </Button>
      </Stack>

      {error ? (
        <LoadStateCard
          icon={<ChecklistOutlinedIcon sx={{ fontSize: 52 }} />}
          title="We could not load criteria"
          description="Please retry in a moment."
          severity="error"
          actionLabel="Try again"
          onAction={onRetry}
        />
      ) : loading ? (
        <Skeleton variant="rounded" height={420} />
      ) : criteria.length === 0 ? (
        <LoadStateCard
          icon={<ChecklistOutlinedIcon sx={{ fontSize: 58 }} />}
          title="No criteria configured"
          description="Add criteria to define what students should score during evaluation."
          actionLabel="Add criterion"
          onAction={() => openCriterionDialog()}
        />
      ) : (
        <Box sx={{ height: 550, minHeight: 550, width: '100%' }}>
          <DataGrid
            rows={criteria}
            columns={columns}
            pageSizeOptions={[10, 20]}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'orderIndex', sort: 'asc' }] }
            }}
            sx={sharedGridSx}
          />
        </Box>
      )}

      <Dialog open={criterionDialogOpen} onClose={() => setCriterionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selectedCriterion ? 'Edit Criterion' : 'Add New Criterion'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Criterion Title"
              placeholder="e.g. The professor explained complex concepts clearly."
              value={criterionForm.title}
              onChange={(e) => setCriterionForm(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Question Type"
                value={criterionForm.type}
                onChange={(e) => setCriterionForm(prev => ({ ...prev, type: e.target.value }))}
                sx={{ flex: 1 }}
              >
                {CRITERION_TYPES.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Order Index"
                type="number"
                value={criterionForm.orderIndex}
                onChange={(e) => setCriterionForm(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
                sx={{ width: 120 }}
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={criterionForm.mandatory}
                  onChange={(e) => setCriterionForm(prev => ({ ...prev, mandatory: e.target.checked }))}
                />
              }
              label="Mandatory Field (Required for submission)"
            />

            {(criterionForm.type === 'RADIO' || criterionForm.type === 'CHECKBOX') && (
              <Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" gutterBottom fontWeight={700}>Options (JSON Format)</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Provide a JSON array of strings, e.g. ["Strongly Agree", "Agree", "Neutral", "Disagree"]
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder='["Option 1", "Option 2"]'
                  value={criterionForm.options}
                  onChange={(e) => setCriterionForm(prev => ({ ...prev, options: e.target.value }))}
                  error={criterionForm.options && !criterionForm.options.startsWith('[')}
                  helperText="Leave empty for default 1-10 numeric scale if type is Radio."
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCriterionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveCriterionMutation.mutate({ id: selectedCriterion?.id, payload: criterionForm })}
            disabled={!criterionForm.title}
          >
            {selectedCriterion ? 'Update Criterion' : 'Create Criterion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CriteriaManager;
