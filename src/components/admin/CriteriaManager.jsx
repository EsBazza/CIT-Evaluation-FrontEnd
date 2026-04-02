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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import { createCriterion, deleteCriterion, updateCriterion } from '../../shared/api/adminApi';
import { getApiErrorMessage } from '../../shared/api/client';
import LoadStateCard from '../shared/LoadStateCard';

const CriteriaManager = ({ criteria, loading, error, onRetry, sharedGridSx, cardSurfaceSx }) => {
  const queryClient = useQueryClient();
  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [criterionForm, setCriterionForm] = useState({ title: '' });

  const saveCriterionMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateCriterion(id, payload) : createCriterion(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-criteria'] });
      toast.success(selectedCriterion ? 'Criterion updated.' : 'Criterion added.');
      setCriterionDialogOpen(false);
      setSelectedCriterion(null);
      setCriterionForm({ title: '' });
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
    setCriterionForm(item ? { title: item.title || '' } : { title: '' });
    setCriterionDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      { field: 'title', headerName: 'Criterion', flex: 1.3, minWidth: 200 },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openCriterionDialog(params.row)}>
              Edit
            </Button>
            <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => removeCriterionMutation.mutate(params.row.id)}>
              Delete
            </Button>
          </Stack>
        ),
      },
    ],
    [removeCriterionMutation]
  );

  return (
    <Paper elevation={0} sx={{ ...cardSurfaceSx, p: 2.5, borderColor: '#e2e8f0', mt: 1 }}>
      {error && (
        <Box sx={{ mb: 2 }}>
          <LoadStateCard
            icon={<ChecklistOutlinedIcon sx={{ fontSize: 52 }} />}
            title="We could not load criteria"
            description="Please retry in a moment. You can continue once criteria records are available."
            severity="error"
            actionLabel="Try again"
            onAction={onRetry}
            minHeight={180}
          />
        </Box>
      )}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => openCriterionDialog()}>
          Add Criterion
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ p: 1 }}>
          <Skeleton variant="text" width="34%" height={32} />
          <Skeleton variant="rounded" height={420} sx={{ mt: 1.5 }} />
        </Box>
      ) : criteria.length === 0 ? (
        <LoadStateCard
          icon={<ChecklistOutlinedIcon sx={{ fontSize: 58 }} />}
          title="No criteria configured"
          description="Add criteria to define what students should score during evaluation."
          actionLabel="Add criterion"
          onAction={() => openCriterionDialog()}
        />
      ) : (
      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={criteria}
          columns={columns}
          getRowId={(row) => row._rowId || row.id}
          pageSizeOptions={[10, 20]}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={sharedGridSx}
        />
      </Box>
      )}

      <Dialog open={criterionDialogOpen} onClose={() => setCriterionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selectedCriterion ? 'Edit Criterion' : 'Add Criterion'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={criterionForm.title} onChange={(e) => setCriterionForm((prev) => ({ ...prev, title: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCriterionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => saveCriterionMutation.mutate({ id: selectedCriterion?.id, payload: criterionForm })} disabled={!criterionForm.title}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CriteriaManager;
