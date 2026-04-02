import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  OutlinedInput,
  Skeleton,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { createProfessor, deleteProfessor, updateProfessor } from '../../shared/api/adminApi';
import { getApiErrorMessage } from '../../shared/api/client';
import LoadStateCard from '../shared/LoadStateCard';

const SECTIONS = ['1-A', '1-B', '1-C', '2-A', '2-B', '2-C', '3-A', '3-B', '4-A'];
const DEFAULT_PROFESSOR_FORM = { name: '', email: '', role: '', assignedSections: '', isActive: true };

const ProfessorManager = ({ professors, loading, error, onRetry, sharedGridSx, cardSurfaceSx }) => {
  const queryClient = useQueryClient();
  const [profDialogOpen, setProfDialogOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [professorForm, setProfessorForm] = useState(DEFAULT_PROFESSOR_FORM);
  const [selectedSections, setSelectedSections] = useState([]);

  const saveProfessorMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateProfessor(id, payload) : createProfessor(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-professors'] });
      toast.success(selectedProfessor ? 'Professor updated.' : 'Professor added.');
      closeProfessorDialog();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to save professor.')),
  });

  const removeProfessorMutation = useMutation({
    mutationFn: (id) => deleteProfessor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-professors'] });
      toast.success('Professor removed.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to delete professor.')),
  });

  const closeProfessorDialog = () => {
    setProfDialogOpen(false);
    setSelectedProfessor(null);
    setProfessorForm(DEFAULT_PROFESSOR_FORM);
    setSelectedSections([]);
  };

  const openProfessorDialog = (item = null) => {
    setSelectedProfessor(item);
    const parsedSections = item?.assignedSections
      ? item.assignedSections.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setProfessorForm(item ? {
      name: item.name || '',
      email: item.email || '',
      role: item.role || '',
      assignedSections: item.assignedSections || '',
      isActive: item.isActive ?? true,
    } : DEFAULT_PROFESSOR_FORM);
    setSelectedSections(parsedSections);
    setProfDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Faculty Name', flex: 1.2, minWidth: 160 },
      { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
      { field: 'role', headerName: 'Role', flex: 1, minWidth: 140 },
      { field: 'assignedSections', headerName: 'Assigned Sections', flex: 1, minWidth: 170 },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 200,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openProfessorDialog(params.row)}>
              Edit
            </Button>
            <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => removeProfessorMutation.mutate(params.row.id)}>
              Delete
            </Button>
          </Stack>
        ),
      },
    ],
    [removeProfessorMutation]
  );

  return (
    <Paper elevation={0} sx={{ ...cardSurfaceSx, p: 2.5, borderColor: '#e2e8f0', mt: 1 }}>
      {error && (
        <Box sx={{ mb: 2 }}>
          <LoadStateCard
            icon={<GroupOutlinedIcon sx={{ fontSize: 52 }} />}
            title="We could not load faculty records"
            description="Please check your connection and try again. Your existing data is safe."
            severity="error"
            actionLabel="Try again"
            onAction={onRetry}
            minHeight={180}
          />
        </Box>
      )}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => openProfessorDialog()}>
          Add Professor
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ p: 1 }}>
          <Skeleton variant="text" width="28%" height={32} />
          <Skeleton variant="rounded" height={420} sx={{ mt: 1.5 }} />
        </Box>
      ) : professors.length === 0 ? (
        <LoadStateCard
          icon={<GroupOutlinedIcon sx={{ fontSize: 58 }} />}
          title="No faculty accounts yet"
          description="Add your first professor to start receiving section-based evaluations."
          actionLabel="Add professor"
          onAction={() => openProfessorDialog()}
        />
      ) : (
      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={professors}
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

      <Dialog open={profDialogOpen} onClose={closeProfessorDialog} fullWidth maxWidth="sm">
        <DialogTitle>{selectedProfessor ? 'Edit Professor' : 'Add Professor'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Assign one or more sections so students only evaluate the correct faculty members.
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={professorForm.name} onChange={(e) => setProfessorForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField label="Email" value={professorForm.email} onChange={(e) => setProfessorForm((prev) => ({ ...prev, email: e.target.value }))} fullWidth />
            <TextField label="Role" value={professorForm.role} onChange={(e) => setProfessorForm((prev) => ({ ...prev, role: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel id="assigned-sections-label">Assigned Sections</InputLabel>
              <Select
                labelId="assigned-sections-label"
                multiple
                value={selectedSections}
                onChange={(event) => setSelectedSections(event.target.value)}
                input={<OutlinedInput label="Assigned Sections" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {SECTIONS.map((section) => (
                  <MenuItem key={section} value={section}>
                    {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProfessorDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveProfessorMutation.mutate({
              id: selectedProfessor?.id,
              payload: {
                ...professorForm,
                assignedSections: selectedSections.join(', '),
              }
            })}
            disabled={!professorForm.name || !professorForm.email || !professorForm.role || selectedSections.length === 0}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ProfessorManager;
