import { apiClient } from './client';

const ensureArrayResponse = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};

export const DEFAULT_CRITERIA = [
  { id: 1, title: 'Quality of Teaching' },
  { id: 2, title: 'Punctuality' },
  { id: 3, title: 'Clarity of Explanation' },
  { id: 4, title: 'Class Engagement' },
];

export const fetchPublicProfessors = async (section) => {
  const params = section ? { section } : undefined;
  const { data } = await apiClient.get('/api/public/professors', { params });
  return ensureArrayResponse(data);
};

export const fetchPublicCriteria = async () => {
  const { data } = await apiClient.get('/api/public/criteria');
  return ensureArrayResponse(data);
};

export const fetchHandshakeKey = async () => {
  const { data } = await apiClient.get('/api/keys/handshake');
  return data;
};

export const submitEvaluation = async (payload) => {
  const { data } = await apiClient.post('/api/evaluations', payload);
  return data;
};
