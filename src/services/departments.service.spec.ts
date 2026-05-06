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