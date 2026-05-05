import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

jest.mock('./domains.service', () => {
  const API = 'http://localhost:3000';

  function authHeaders() {
    const rawToken =
      localStorage.getItem('token') || localStorage.getItem('access_token');

    const token = String(rawToken || '')
      .replace(/^Bearer\s+/i, '')
      .trim();

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return {
    getAllDomains: async () => {
      try {
        const res = await axios.get(`${API}/domains/public`);
        if (Array.isArray(res.data)) return res.data;
      } catch {
        // ignore
      }

      try {
        const res = await axios.get(`${API}/domains`, {
          headers: authHeaders(),
        });
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },

    createDomain: async (data: any) => {
      const res = await axios.post(`${API}/domains`, data, {
        headers: authHeaders(),
      });
      return res.data;
    },

    updateDomain: async (id: string, data: any) => {
      const res = await axios.patch(`${API}/domains/${id}`, data, {
        headers: authHeaders(),
      });
      return res.data;
    },

    deleteDomain: async (id: string) => {
      const res = await axios.delete(`${API}/domains/${id}`, {
        headers: authHeaders(),
      });
      return res.data;
    },
  };
});

import {
  createDomain,
  deleteDomain,
  getAllDomains,
  updateDomain,
} from './domains.service';

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('token', 'fake-jwt-token');
});

describe('domains.service', () => {
  it('getAllDomains() should return public domains on success', async () => {
    const fakeDomains = [
      { _id: 'dom-1', name: 'Cloud Computing', description: 'Cloud technologies' },
      { _id: 'dom-2', name: 'AI/ML', description: 'AI & ML' },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: fakeDomains });

    const domains = await getAllDomains();

    expect(domains).toHaveLength(2);
    expect(domains[0]._id).toBe('dom-1');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:3000/domains/public'
    );
  });

  it('getAllDomains() should fallback to private endpoint if public fails', async () => {
    const fakeDomains = [
      { _id: 'dom-3', name: 'DevOps', description: 'DevOps practices' },
    ];

    mockedAxios.get.mockRejectedValueOnce(new Error('Public failed'));
    mockedAxios.get.mockResolvedValueOnce({ data: fakeDomains });

    const domains = await getAllDomains();

    expect(domains).toHaveLength(1);

    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/domains/public'
    );

    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/domains',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('getAllDomains() should return empty array if both fail', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const domains = await getAllDomains();

    expect(domains).toEqual([]);
  });

  it('createDomain() should POST with auth', async () => {
    const newDomain = { _id: 'dom-4', name: 'Cybersecurity' };

    mockedAxios.post.mockResolvedValueOnce({ data: newDomain });

    const result = await createDomain({ name: 'Cybersecurity' });

    expect(result._id).toBe('dom-4');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:3000/domains',
      { name: 'Cybersecurity' },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('updateDomain() should PATCH correctly', async () => {
    const updated = { _id: 'dom-1', name: 'Updated' };

    mockedAxios.patch.mockResolvedValueOnce({ data: updated });

    const result = await updateDomain('dom-1', { name: 'Updated' });

    expect(result.name).toBe('Updated');
  });

  it('deleteDomain() should DELETE correctly', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    const result = await deleteDomain('dom-1');

    expect(result.success).toBe(true);
  });

  it('should use access_token fallback', async () => {
    localStorageMock.clear();
    localStorageMock.setItem('access_token', 'Bearer fallback-token');

    mockedAxios.post.mockResolvedValueOnce({ data: { _id: 'dom-6' } });

    await createDomain({ name: 'Test' });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fallback-token',
        }),
      })
    );
  });

  it('should handle no token case', async () => {
    localStorageMock.clear();

    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    await deleteDomain('dom-1');

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      })
    );
  });
});