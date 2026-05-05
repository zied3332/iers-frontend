// src/services/activities.service.spec.ts

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getActivityById, listActivities } from './activities.service';

const mockFetch = jest.fn<any>();
(globalThis as any).fetch = mockFetch;

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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

function fakeJsonResponse(body: any, status = 200): any {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function fakeTextErrorResponse(message: string, status: number): any {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(message),
  };
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
      }),
    );
  });

  it('listActivities() should support hrView filter', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await listActivities({ hrView: 'drafts' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities?hrView=drafts',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('listActivities() should support managerView filter', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await listActivities({ managerView: 'running' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities?managerView=running',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('listActivities() should combine multiple query filters', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await listActivities({ hrView: 'pipeline', managerView: 'past' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('hrView=pipeline'),
      expect.any(Object),
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('managerView=past'),
      expect.any(Object),
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
      }),
    );
  });

  it('getActivityById() should encode special characters in ID', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ _id: 'act/123', title: 'Test' }),
    );

    await getActivityById('act/123');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activities/act%2F123',
      expect.any(Object),
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
      ]),
    );

    const activities = await listActivities();

    expect(activities[0].type).toBe('PROJECT');
    expect(activities[0].status).toBe('COMPLETED');
    expect(activities[0].priorityContext).toBe('DEVELOPMENT');
    expect(activities[0].targetLevel).toBe('LOW');
  });

  it('listActivities() should handle 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce(fakeTextErrorResponse('Unauthorized', 401));

    await expect(listActivities()).rejects.toThrow(
      'Unauthorized session. Please sign out and log in again.',
    );
  });

  it('getActivityById() should handle 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeTextErrorResponse('You do not have permission', 403),
    );

    await expect(getActivityById('act-1')).rejects.toThrow(
      'You do not have permission',
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
      ]),
    );

    const activities = await listActivities();

    expect(activities[0].responsibleManagerId).toBe('mgr-2');
    expect(activities[0].responsibleManagerName).toBe('Jane');
    expect(activities[0].departmentId).toBe('dep-2');
    expect(activities[0].departmentName).toBe('DevOps');
  });
});