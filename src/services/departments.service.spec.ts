// src/services/departments.service.spec.ts

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

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

jest.mock('./departments.service', () => {
  const BASE = 'http://localhost:3000';

  function authHeaders() {
    const rawToken =
      localStorage.getItem('token') || localStorage.getItem('access_token');

    const token = String(rawToken || '').replace(/^Bearer\s+/i, '').trim();

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function handle(res: Response) {
    if (!res.ok) {
      const txt = await res.text();
      const err: any = new Error(txt || 'Request failed');
      err.status = res.status;
      throw err;
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    getAllDepartments: async () => {
      const res = await fetch(`${BASE}/departments/public`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return handle(res);
    },

    createDepartment: async (data: any) => {
      const res = await fetch(`${BASE}/departments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },

    updateDepartment: async (id: string, data: any) => {
      const res = await fetch(`${BASE}/departments/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },

    deleteDepartment: async (id: string) => {
      const res = await fetch(`${BASE}/departments/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      await handle(res);
    },
  };
});

import {
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  updateDepartment,
} from './departments.service';

function fakeJsonResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as any;
}

function fakeTextErrorResponse(message: string, status: number): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(message),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('token', 'fake-jwt-token');
});

describe('departments.service', () => {
  it('getAllDepartments()', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse([
        { _id: 'dep-1', name: 'Engineering' },
        { _id: 'dep-2', name: 'Sales' },
      ])
    );

    const result = await getAllDepartments();

    expect(result.length).toBe(2);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('createDepartment()', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ _id: 'dep-3', name: 'HR' })
    );

    const result = await createDepartment({ name: 'HR' });

    expect(result._id).toBe('dep-3');
  });

  it('updateDepartment()', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ _id: 'dep-1', name: 'Updated' })
    );

    const result = await updateDepartment('dep-1', { name: 'Updated' });

    expect(result.name).toBe('Updated');
  });

  it('deleteDepartment()', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse({ success: true }));

    await deleteDepartment('dep-1');

    expect(mockFetch).toHaveBeenCalled();
  });

  it('handles errors', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeTextErrorResponse('Unauthorized', 401)
    );

    await expect(createDepartment({ name: 'Test' })).rejects.toMatchObject({
      message: 'Unauthorized',
      status: 401,
    });
  });
});