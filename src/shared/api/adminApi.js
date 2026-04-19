import { apiClient } from './client';

const ensureArrayResponse = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Ignore parsing errors so the grid simply renders an empty list.
      }
    }
  }
  return [];
};

const getFilenameFromDisposition = (disposition, fallback) => {
  if (!disposition) {
    return fallback;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
};

const triggerBrowserDownload = (blob, filename) => {
  const href = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(href);
};

const downloadFile = async (url, fallbackFilename, params) => {
  const response = await apiClient.get(url, {
    params,
    responseType: 'blob',
  });

  const disposition = response?.headers?.['content-disposition'];
  const filename = getFilenameFromDisposition(disposition, fallbackFilename);
  const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data]);
  triggerBrowserDownload(blob, filename);
  return filename;
};

export const fetchEvaluationsAdmin = async () => {
  const { data } = await apiClient.get('/api/evaluations');
  return ensureArrayResponse(data);
};

export const decryptEvaluation = async (id, facultyEmail) => {
  const params = facultyEmail ? { facultyEmail } : undefined;
  const { data } = await apiClient.get(`/api/evaluations/${id}/decrypt`, { params });
  return data;
};

export const exportAllEvaluationsCsv = async () => {
  return downloadFile('/api/evaluations/export/csv', 'all_evaluations.csv');
};

export const exportAllEvaluationsPdf = async () => {
  return downloadFile('/api/evaluations/export/pdf', 'all_evaluations.pdf');
};

export const exportFacultyEvaluationsCsv = async (facultyEmail) => {
  return downloadFile('/api/evaluations/export/faculty/csv', `faculty_evaluations_${facultyEmail}.csv`, { facultyEmail });
};

export const exportFacultyEvaluationsPdf = async (facultyEmail) => {
  return downloadFile('/api/evaluations/export/faculty/pdf', `faculty_evaluations_${facultyEmail}.pdf`, { facultyEmail });
};

export const exportSingleEvaluationCsv = async (id) => {
  return downloadFile(`/api/evaluations/${id}/export/csv`, `evaluation_${id}.csv`);
};

export const exportSingleEvaluationPdf = async (id) => {
  return downloadFile(`/api/evaluations/${id}/export/pdf`, `evaluation_${id}.pdf`);
};

export const fetchProfessors = async () => {
  const { data } = await apiClient.get('/api/admin/professors');
  return ensureArrayResponse(data);
};

export const createProfessor = async (payload) => {
  const requestBody = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    assignedSections: payload.assignedSections,
    isActive: payload.isActive ?? true,
  };
  const { data } = await apiClient.post('/api/admin/professors', requestBody);
  return data;
};

export const updateProfessor = async (id, payload) => {
  const requestBody = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    assignedSections: payload.assignedSections,
    isActive: payload.isActive ?? true,
  };
  const { data } = await apiClient.put(`/api/admin/professors/${id}`, requestBody);
  return data;
};

export const deleteProfessor = async (id) => {
  await apiClient.delete(`/api/admin/professors/${id}`);
};

export const fetchCriteria = async () => {
  const { data } = await apiClient.get('/api/admin/criteria');
  return ensureArrayResponse(data);
};

export const fetchUsers = async () => {
  const { data } = await apiClient.get('/api/admin/users');
  return ensureArrayResponse(data);
};

export const createCriterion = async (payload) => {
  const { data } = await apiClient.post('/api/admin/criteria', { title: payload.title });
  return data;
};

export const updateCriterion = async (id, payload) => {
  const { data } = await apiClient.put(`/api/admin/criteria/${id}`, { title: payload.title });
  return data;
};

export const deleteCriterion = async (id) => {
  await apiClient.delete(`/api/admin/criteria/${id}`);
};