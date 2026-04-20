import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders() {
  const rawToken = localStorage.getItem('token') || localStorage.getItem('access_token');
  const token = String(rawToken || '').replace(/^Bearer\s+/i, '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type Domain = {
  _id: string;
  name: string;
  description?: string;
};

export const getAllDomains = async (): Promise<Domain[]> => {
  try {
    const res = await axios.get(`${API}/domains/public`);
    if (Array.isArray(res.data)) return res.data;
  } catch {
    /* ignore */
  }
  try {
    const res = await axios.get(`${API}/domains`, { headers: authHeaders() });
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const createDomain = async (data: { name: string; description?: string }) => {
  const res = await axios.post(`${API}/domains`, data, { headers: authHeaders() });
  return res.data;
};

export const updateDomain = async (id: string, data: Partial<{ name: string; description: string }>) => {
  const res = await axios.patch(`${API}/domains/${id}`, data, { headers: authHeaders() });
  return res.data;
};

export const deleteDomain = async (id: string) => {
  const res = await axios.delete(`${API}/domains/${id}`, { headers: authHeaders() });
  return res.data;
};
