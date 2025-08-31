import axios from 'axios';

const getApiBaseUrl = () => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('notaria-auth-storage');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      if (parsed.state?.token) config.headers.Authorization = `Bearer ${parsed.state.token}`;
    } catch {}
  }
  return config;
});

const docsService = {
  async list({ state, search, ownerId, limit = 25, cursor } = {}) {
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (search) params.set('search', search);
    if (ownerId) params.set('ownerId', String(ownerId));
    if (limit) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const { data } = await api.get(`/docs?${params.toString()}`);
    return data;
  },
  async search({ query, scope = 'context', state = 'any', ownerId, limit = 25 } = {}) {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    params.set('scope', scope);
    params.set('state', state);
    if (ownerId) params.set('ownerId', String(ownerId));
    if (limit) params.set('limit', String(limit));
    const { data } = await api.get(`/docs/search?${params.toString()}`);
    return data;
  },
  async patchState(id, { state, payload }) {
    const { data } = await api.patch(`/docs/${id}/state`, { state, payload });
    return data;
  },
  async patchBulkState({ ids, state }) {
    const { data } = await api.patch(`/docs/bulk/state`, { ids, state });
    return data;
  }
};

export default docsService;

