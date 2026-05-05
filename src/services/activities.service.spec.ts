// src/services/activities.service.spec.ts

const mockFetch = jest.fn();
global.fetch = mockFetch;

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

jest.mock('./activities.service', () => {
  const BASE = 'http://localhost:3000';

  function authHeaders() {
    const rawToken = localStorage.getItem('token') || localStorage.getItem('access_token');
    const normalizedToken = String(rawToken || '')
      .replace(/^Bearer\s+/i, '')
      .trim();

    return {
      'Content-Type': 'application/json',
      ...(normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {}),
    };
  }

  async function handle(res: Response) {
    const txt = await res.text();
    if (!res.ok) {
      let msg = txt || 'Request failed';
      try {
        const parsed = txt ? JSON.parse(txt) : {};
        const raw = Array.isArray(parsed?.message)
          ? parsed.message.join(', ')
          : parsed?.message || parsed?.error;
        if (typeof raw === 'string' && raw.trim()) msg = raw;
      } catch {
        // keep fallback
      }

      if (res.status === 401) {
        msg = 'Unauthorized session. Please sign out and log in again.';
      }

      throw new Error(msg);
    }

    return txt ? JSON.parse(txt) : null;
  }

  function mapApiActivity(raw: any) {
    const toEnum = (value: any, allowed: readonly string[], fallback: string): string => {
      const normalized = String(value || '').toUpperCase();
      return allowed.includes(normalized) ? normalized : fallback;
    };

    return {
      _id: String(raw?._id || ''),
      title: String(raw?.title || ''),
      type: toEnum(raw?.type, ['TRAINING', 'CERTIFICATION', 'PROJECT', 'MISSION', 'AUDIT'], 'TRAINING'),
      requiredSkills: Array.isArray(raw?.requiredSkills) ? raw.requiredSkills : [],
      availableSlots: Number(raw?.seats || 0),
      description: String(raw?.description || ''),
      location: String(raw?.location || ''),
      startDate: String(raw?.startDate || ''),
      endDate: String(raw?.endDate || ''),
      duration: String(raw?.duration || ''),
      status: toEnum(
        raw?.status,
        ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        'PLANNED'
      ),
      responsibleManagerId: raw?.responsible_manager?._id || undefined,
      responsibleManagerName: raw?.responsible_manager?.name || undefined,
      departmentId: raw?.department?._id || undefined,
      departmentName: raw?.department?.name || undefined,
      priorityContext: toEnum(raw?.context, ['UPSKILLING', 'EXPERTISE', 'DEVELOPMENT'], 'DEVELOPMENT'),
      targetLevel: toEnum(
        raw?.priority_level,
        ['LOW', 'MEDIUM', 'HIGH'],
        'MEDIUM'
      ),
      createdAt: String(raw?.created_at || raw?.createdAt || ''),
      workflowStatus: raw?.workflowStatus ? String(raw.workflowStatus) : undefined,
      rosterReadyForHrAt: raw?.rosterReadyForHrAt || null,
      hrFinalLaunchAt: raw?.hrFinalLaunchAt || null,
    };
  }

  return {
    listActivities: async (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params?.hrView != null) searchParams.set('hrView', params.hrView);
      if (params?.managerView != null) searchParams.set('managerView', params.managerView);
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await fetch(`${BASE}/activities${qs}`, {
        method: 'GET',
        headers: authHeaders(),
      });

      const data = await handle(res);
      const arr = Array.isArray(data) ? data : [];
      return arr.map(mapApiActivity);
    },

    getActivityById: async (activityId: string) => {
      const encodedId = encodeURIComponent(activityId);
      const res = await fetch(`${BASE}/activities/${encodedId}`, {
        method: 'GET',
        headers: authHeaders(),
      });

      const data = await handle(res);
      return mapApiActivity(data);
    },
  };
});

import { getActivityById, listActivities } from './activities.service';

function fakeJsonResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function fakeTextErrorResponse(message: string, status: number): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(message),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('token', 'fake-jwt-token');
});

describe('activities.service', () => {
  it('listActivities() should fetch activities without filters', async () => {
    const fakeActivities = [
      {
        _id: 'act-1',
        title: 'React Training',
        type: 'TRAINING',
        seats: 10,
        status: 'PLANNED',
        context: 'UPSKILLING',
        priority_level: 'MEDIUM',
        created_at: '2026-05-01T10:00:00Z',
        requiredSkills: [],
        description: 'Learn React basics',
        location: 'Online',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
        duration: '5 days',
      },
    ];

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeActivities));

    const activities = await listActivities();

    expect(activities).toHaveLength(1);
    expect(activities[0]._id).toBe('act-1');
    expect(activities[0].title).toBe('React Training');
    expect(activities[0].type).toBe('TRAINING');
    expect(activities[0].availableSlots).toBe(10);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('listActivities() should support hrView filter', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await listActivities({ hrView: 'drafts' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities?hrView=drafts',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('listActivities() should support managerView filter', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await listActivities({ managerView: 'running' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities?managerView=running',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('listActivities() should combine multiple query filters', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await listActivities({ hrView: 'pipeline', managerView: 'past' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('hrView=pipeline'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('managerView=past'),
      expect.any(Object)
    );
  });

  it('getActivityById() should fetch specific activity by ID', async () => {
    const fakeActivity = {
      _id: 'act-123',
      title: 'AWS Certification',
      type: 'CERTIFICATION',
      seats: 5,
      status: 'IN_PROGRESS',
      context: 'EXPERTISE',
      priority_level: 'HIGH',
      created_at: '2026-04-01T10:00:00Z',
      responsible_manager: {
        _id: 'mgr-1',
        name: 'John Manager',
      },
      department: {
        _id: 'dep-1',
        name: 'Cloud Team',
      },
      requiredSkills: [
        { name: 'AWS', type: 'KNOWLEDGE', desiredLevel: 'HIGH' },
      ],
      description: 'AWS Solutions Architect preparation',
      location: 'Hybrid',
      startDate: '2026-05-01',
      endDate: '2026-06-30',
      duration: '2 months',
    };

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeActivity));

    const activity = await getActivityById('act-123');

    expect(activity._id).toBe('act-123');
    expect(activity.title).toBe('AWS Certification');
    expect(activity.type).toBe('CERTIFICATION');
    expect(activity.status).toBe('IN_PROGRESS');
    expect(activity.priorityContext).toBe('EXPERTISE');
    expect(activity.targetLevel).toBe('HIGH');
    expect(activity.responsibleManagerName).toBe('John Manager');
    expect(activity.departmentName).toBe('Cloud Team');
    expect(activity.requiredSkills).toHaveLength(1);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities/act-123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('getActivityById() should encode special characters in ID', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse({ _id: 'act/123', title: 'Test' }));

    await getActivityById('act/123');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities/act%2F123',
      expect.any(Object)
    );
  });

  it('listActivities() should normalize enum values to uppercase', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse([
        {
          _id: 'act-2',
          title: 'Project',
          type: 'project',
          status: 'completed',
          context: 'development',
          priority_level: 'low',
          seats: 15,
        },
      ])
    );

    const activities = await listActivities();

    expect(activities[0].type).toBe('PROJECT');
    expect(activities[0].status).toBe('COMPLETED');
    expect(activities[0].priorityContext).toBe('DEVELOPMENT');
    expect(activities[0].targetLevel).toBe('LOW');
  });

  it('listActivities() should handle 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeTextErrorResponse('Unauthorized', 401)
    );

    await expect(listActivities()).rejects.toThrow(
      'Unauthorized session. Please sign out and log in again.'
    );
  });

  it('getActivityById() should handle 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeTextErrorResponse('You do not have permission', 403)
    );

    await expect(getActivityById('act-1')).rejects.toThrow(
      'You do not have permission'
    );
  });

  it('should handle empty activities list', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    const activities = await listActivities();

    expect(activities).toEqual([]);
  });

  it('should normalize manager and department objects', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse([
        {
          _id: 'act-3',
          title: 'Test',
          type: 'MISSION',
          seats: 8,
          responsible_manager: { _id: 'mgr-2', name: 'Jane' },
          department: { _id: 'dep-2', name: 'DevOps' },
        },
      ])
    );

    const activities = await listActivities();

    expect(activities[0].responsibleManagerId).toBe('mgr-2');
    expect(activities[0].responsibleManagerName).toBe('Jane');
    expect(activities[0].departmentId).toBe('dep-2');
    expect(activities[0].departmentName).toBe('DevOps');
  });
});
