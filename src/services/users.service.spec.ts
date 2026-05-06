// src/services/users.service.spec.ts

// ── Mock fetch ──────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Mock localStorage ───────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] || null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { getUsers, createUser } from './users.service';

// ── Helper ──────────────────────────────────────────────────────
function fakeResponse(body: any, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('token', 'fake-jwt-token');
});

// ═══════════════════════════════════════════════════════════════
describe('users.service', () => {

  // ── TEST 1 ───────────────────────────────────────────────────
  it('getUsers() doit retourner un tableau de users', async () => {
    const fakeUsers = [
      { _id: '1', name: 'Alice', email: 'alice@test.com', role: 'EMPLOYEE' },
      { _id: '2', name: 'Bob',   email: 'bob@test.com',   role: 'MANAGER'  },
    ];

    mockFetch.mockResolvedValueOnce(fakeResponse(fakeUsers));

    const users = await getUsers();

    expect(users).toHaveLength(2);
    expect(users[0].name).toBe('Alice');
    expect(users[1].role).toBe('MANAGER');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      }),
    );
  });

  // ── TEST 2 ───────────────────────────────────────────────────
  it('createUser() doit envoyer POST avec le bon payload', async () => {
    const createdUser = {
      _id:   'new-id-123',
      name:  'Charlie',
      email: 'charlie@test.com',
      role:  'EMPLOYEE',
    };

    mockFetch.mockResolvedValueOnce(fakeResponse(createdUser));

    const payload = {
      name:      'Charlie',
      email:     'charlie@test.com',
      password:  'Test1234',
      role:      'EMPLOYEE' as const,
      matricule: 'MAT-003',
    };

    const result = await createUser(payload);

    expect(result._id).toBe('new-id-123');
    expect(result.name).toBe('Charlie');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users',
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify(payload),
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      }),
    );
  });
});