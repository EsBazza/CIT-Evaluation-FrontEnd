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

export const fetchEvaluationsAdmin = async () => {
  const { data } = await apiClient.get('/api/evaluations');
  return ensureArrayResponse(data);
};

export const decryptEvaluation = async (id, facultyEmail) => {
  const params = facultyEmail ? { facultyEmail } : undefined;
  const { data } = await apiClient.get(`/api/evaluations/${id}/decrypt`, { params });
  return data;
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