import React, { useMemo, useState } from 'react';
import { Box, Button, Paper, Skeleton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { decryptEvaluation } from '../../shared/api/adminApi';
import { getApiErrorMessage } from '../../shared/api/client';
import LoadStateCard from '../shared/LoadStateCard';

const computeMetricAverage = (scores = []) => {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const total = scores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
  return total / scores.length;
};

const EvaluationTable = ({ evaluations, loading, error, onRetry, sharedGridSx, cardSurfaceSx }) => {
  const queryClient = useQueryClient();
  const [decryptingId, setDecryptingId] = useState(null);
  const [decryptedRows, setDecryptedRows] = useState({});

  const handleDecrypt = async (id) => {
    if (!id) return;
    setDecryptingId(id);
    try {
      const decryptedText = await decryptEvaluation(id);
      queryClient.setQueryData(['admin-evaluations'], (prev = []) =>
        prev.map((item) => (item.id === id ? { ...item, ciphertext: decryptedText } : item))
      );
      setDecryptedRows((prev) => ({ ...prev, [id]: true }));
      toast.success('Feedback decrypted.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Decryption failed.'));
    } finally {
      setDecryptingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: 'studentEmail',
        headerName: 'Student Email',
        flex: 1,
        minWidth: 180,
        valueGetter: (value, row) => {
          // Exhaustive search for email field in the row object
          const email = 
            row.studentEmail || 
            row.email || 
            row.student?.email || 
            row.username || 
            row.userEmail ||
            row.authorEmail ||
            value;
          
          return email || '—';
        },
      },
      { field: 'studentNumber', headerName: 'Student ID', width: 120 },
      { 
        field: 'facultyEmail', 
        headerName: 'Faculty Email', 
        flex: 1, 
        minWidth: 200,
        valueGetter: (value, row) => {
           const fEmail = 
            row.facultyEmail || 
            row.faculty?.email || 
            row.profEmail || 
            row.professorEmail ||
            value;
           
           return fEmail || '—';
        }
      },
      {
        field: 'performance',
        headerName: 'Performance',
        width: 110,
        valueGetter: (_value, row) => computeMetricAverage(row.scores).toFixed(1),
      },
      {
        field: 'ciphertext',
        headerName: 'Feedback',
        flex: 1.8,
        minWidth: 280,
        renderCell: (params) => {
          const rowId = params?.row?.id;
          return (
            <Box
              sx={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: 1.35,
                padding: '6px 0',
                fontSize: '0.88rem',
                color: decryptedRows[rowId] ? 'text.primary' : 'text.secondary',
              }}
            >
              {params?.value || '••••••••••'}
            </Box>
          );
        },
      },
      {
        field: 'action',
        headerName: 'Security',
        width: 140,
        sortable: false,
        renderCell: (params) => {
          const rowId = params?.row?.id;
          const isDecrypting = rowId && decryptingId === rowId;
          const isDecrypted = rowId && decryptedRows[rowId];
          return (
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={isDecrypted ? <LockIcon /> : <LockOpenIcon />}
              onClick={() => rowId && handleDecrypt(rowId)}
              disabled={!rowId || isDecrypting || isDecrypted}
            >
              {isDecrypting ? 'Decrypting...' : isDecrypted ? 'Decrypted' : 'Decrypt'}
            </Button>
          );
        },
      },
    ],
    [decryptedRows, decryptingId]
  );

  return (
    <Paper elevation={0} sx={{ ...cardSurfaceSx, p: 2.5, borderColor: '#e2e8f0', mt: 1 }}>
      {error && (
        <Box sx={{ mb: 2 }}>
          <LoadStateCard
            icon={<InsightsOutlinedIcon sx={{ fontSize: 52 }} />}
            title="We could not load encrypted feedback"
            description="Please retry to continue reviewing submissions."
            severity="error"
            actionLabel="Try again"
            onAction={onRetry}
            minHeight={180}
          />
        </Box>
      )}
      {loading ? (
        <Box sx={{ p: 1 }}>
          <Skeleton variant="text" width="32%" height={32} />
          <Skeleton variant="rounded" height={460} sx={{ mt: 1.5 }} />
        </Box>
      ) : evaluations.length === 0 ? (
        <LoadStateCard
          icon={<InsightsOutlinedIcon sx={{ fontSize: 58 }} />}
          title="No submissions yet"
          description="Student evaluations will appear here after secure submission."
          actionLabel="Refresh"
          onAction={onRetry}
        />
      ) : (
      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={evaluations}
          columns={columns}
          loading={loading}
          getRowId={(row) => row._rowId || row.id}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          getRowHeight={() => 'auto'}
          disableRowSelectionOnClick
          sx={sharedGridSx}
        />
      </Box>
      )}
    </Paper>
  );
};

export default EvaluationTable;
