import React, { useMemo, useState } from 'react';
import { Box, Button, Paper, Skeleton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { decryptEvaluation } from '../../shared/api/adminApi';
import { getApiErrorMessage } from '../../shared/api/client';
import LoadStateCard from '../shared/LoadStateCard';

const computeMetricAverage = (answers = []) => {
  if (!Array.isArray(answers) || answers.length === 0) return 0;
  const numericAnswers = answers.filter(a => a?.score !== null && a?.score !== undefined);
  if (numericAnswers.length === 0) return 0;
  const total = numericAnswers.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
  return total / numericAnswers.length;
};

const EvaluationTable = ({ evaluations, loading, error, onRetry, sharedGridSx, cardSurfaceSx }) => {
  const queryClient = useQueryClient();
  const [decryptedRows, setDecryptedRows] = useState({});
  const [decryptingIds, setDecryptingIds] = useState({});

  const handleDecrypt = async (id) => {
    setDecryptingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const plaintext = await decryptEvaluation(id);
      setDecryptedRows((prev) => ({ ...prev, [id]: plaintext }));
      toast.success('Feedback decrypted.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Decryption failed.'));
    } finally {
      setDecryptingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const columns = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 70 },
      { field: 'studentNumber', headerName: 'Student #', width: 130 },
      { field: 'facultyEmail', headerName: 'Faculty', flex: 1.2, minWidth: 200 },
      { field: 'section', headerName: 'Section', width: 90 },
      {
        field: 'performance',
        headerName: 'Performance',
        width: 110,
        valueGetter: (_value, row) => computeMetricAverage(row.answers).toFixed(1),
      },
      {
        field: 'ciphertext',
        headerName: 'Feedback',
        flex: 1.8,
        minWidth: 280,
        renderCell: (params) => {
          const rowId = params?.row?.id;
          let content = params?.value || '••••••••••';
          
          if (decryptedRows[rowId]) {
              const rawContent = decryptedRows[rowId];
              try {
                  const data = typeof rawContent === 'string' && rawContent.startsWith('{') 
                    ? JSON.parse(rawContent) 
                    : rawContent;
                  
                  if (typeof data === 'object' && data !== null) {
                      const parts = [];
                      if (data.generalComment && data.generalComment.trim()) {
                          parts.push(data.generalComment);
                      }
                      
                      const textParts = data.textResponses || data.dynamicResponses || [];
                      textParts.forEach(r => {
                          if (r.value && r.value.trim()) {
                              parts.push(`${r.title}: ${r.value}`);
                          }
                      });
                      
                      content = parts.length > 0 ? parts.join(' | ') : 'No qualitative feedback.';
                  } else {
                      content = String(rawContent);
                  }
              } catch {
                  content = String(rawContent);
              }
          }
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
              {content}
            </Box>
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Security',
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <Button
            size="small"
            startIcon={decryptedRows[params.row.id] ? <VisibilityIcon /> : <LockOpenIcon />}
            onClick={() => handleDecrypt(params.row.id)}
            disabled={Boolean(decryptedRows[params.row.id]) || decryptingIds[params.row.id]}
          >
            {decryptingIds[params.row.id] ? '...' : decryptedRows[params.row.id] ? 'Viewed' : 'Decrypt'}
          </Button>
        ),
      },
    ],
    [decryptedRows, decryptingIds]
  );

  return (
    <Paper elevation={0} sx={{ ...cardSurfaceSx, p: 0, overflow: 'hidden', mt: 1, minHeight: 600 }}>
      {error ? (
        <LoadStateCard
          title="Unable to load evaluations"
          description="A server error occurred while fetching the submission list."
          severity="error"
          actionLabel="Try again"
          onAction={onRetry}
        />
      ) : loading ? (
        <Skeleton variant="rounded" height={600} />
      ) : (
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={evaluations}
          columns={columns}
          pageSizeOptions={[5, 10, 25, 50]}
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
