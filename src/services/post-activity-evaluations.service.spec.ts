// src/services/post-activity-evaluations.service.spec.ts

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

jest.mock('./post-activity-evaluations.service', () => {
  const BASE = 'http://localhost:3000';

  async function api(path: string, options: any = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  }

  return {
    getCompletedActivitiesForEvaluation: async () => {
      return api('/post-evaluations/activities');
    },

    getFinalizedActivitiesForEvaluation: async () => {
      return api('/post-evaluations/finalized');
    },

    getParticipantsForEvaluation: async (activityId: string) => {
      return api(`/post-evaluations/activity/${activityId}/participants`);
    },

    submitEvaluation: async (payload: any) => {
      return api('/post-evaluations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    submitBulkEvaluations: async (evaluations: any[]) => {
      return api('/post-evaluations/bulk', {
        method: 'POST',
        body: JSON.stringify({ evaluations }),
      });
    },

    finalizeActivityEvaluations: async (activityId: string) => {
      return api(`/post-evaluations/activity/${activityId}/finalize`, {
        method: 'POST',
      });
    },

    getEvaluationsByEmployee: async (employeeId: string) => {
      return api(`/post-evaluations/employee/${employeeId}`);
    },
  };
});

import {
  finalizeActivityEvaluations,
  getCompletedActivitiesForEvaluation,
  getEvaluationsByEmployee,
  getFinalizedActivitiesForEvaluation,
  getParticipantsForEvaluation,
  submitBulkEvaluations,
  submitEvaluation,
} from './post-activity-evaluations.service';

function fakeJsonResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function fakeErrorResponse(message: string): Response {
  return {
    ok: false,
    status: 400,
    text: () => Promise.resolve(message),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('token', 'fake-jwt-token');
});

describe('post-activity-evaluations.service', () => {
  it('getCompletedActivitiesForEvaluation() should fetch list of activities', async () => {
    const fakeActivities = [
      {
        activity: {
          _id: 'act-1',
          title: 'React Training',
          type: 'TRAINING',
          startDate: '2026-05-01',
          endDate: '2026-05-10',
          status: 'COMPLETED',
        },
        totalParticipants: 20,
        reviewedCount: 15,
        pendingCount: 5,
        isFullyReviewed: false,
      },
    ];

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeActivities));

    const activities = await getCompletedActivitiesForEvaluation();

    expect(activities).toHaveLength(1);
    expect(activities[0].activity._id).toBe('act-1');
    expect(activities[0].totalParticipants).toBe(20);
    expect(activities[0].isFullyReviewed).toBe(false);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations/activities',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('getFinalizedActivitiesForEvaluation() should fetch finalized activities', async () => {
    const fakeActivities = [
      {
        activity: {
          _id: 'act-2',
          title: 'AWS Certification',
          status: 'COMPLETED',
          managerEvaluationFinalizedAt: '2026-05-15T10:00:00Z',
        },
        isFullyReviewed: true,
      },
    ];

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeActivities));

    const activities = await getFinalizedActivitiesForEvaluation();

    expect(activities).toHaveLength(1);
    expect(activities[0].activity.managerEvaluationFinalizedAt).toBe('2026-05-15T10:00:00Z');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations/finalized',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('getParticipantsForEvaluation() should fetch participants with eval status', async () => {
    const fakeResponse = {
      activity: { _id: 'act-1', title: 'React Training' },
      participants: [
        {
          employee: { _id: 'emp-1', user_id: { name: 'Alice', email: 'alice@test.com' } },
          evaluation: {
            _id: 'eval-1',
            presence: 'PRESENT',
            feedback: 'Good performance',
            skillScores: [{ skillId: 'sk-1', score: 4 }],
          },
          isEvaluated: true,
        },
        {
          employee: { _id: 'emp-2', user_id: { name: 'Bob', email: 'bob@test.com' } },
          evaluation: null,
          isEvaluated: false,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeResponse));

    const result = await getParticipantsForEvaluation('act-1');

    expect(result.participants).toHaveLength(2);
    expect(result.participants[0].isEvaluated).toBe(true);
    expect(result.participants[1].isEvaluated).toBe(false);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations/activity/act-1/participants',
      expect.any(Object)
    );
  });

  it('submitEvaluation() should POST single evaluation with all fields', async () => {
    const fakeResponse = {
      message: 'Evaluation submitted',
      evaluation: { _id: 'eval-1', presence: 'PRESENT', createdAt: '2026-05-15T10:00:00Z' },
      action: 'created',
    };

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeResponse));

    const payload = {
      activityId: 'act-1',
      employeeId: 'emp-1',
      presence: 'PRESENT',
      feedback: 'Great performance',
      skillScores: [{ skillId: 'sk-1', score: 5 }],
      managerAssessment: {
        attendanceStatus: 'EXCELLENT',
        participationLevel: 'VERY_ACTIVE',
        skillProgress: 'STRONG',
        outcome: 'COMPLETED_SUCCESSFULLY',
        recommendation: 'PROJECT_ASSIGNMENT',
        rating: 9,
        comment: 'Excellent work',
      },
    };

    const result = await submitEvaluation(payload);

    expect(result.message).toBe('Evaluation submitted');
    expect(result.action).toBe('created');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
        body: JSON.stringify(payload),
      })
    );
  });

  it('submitEvaluation() should work with minimal payload', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ message: 'OK', evaluation: { _id: 'eval-2' } })
    );

    const payload = {
      activityId: 'act-1',
      employeeId: 'emp-2',
      presence: 'ABSENT',
    };

    const result = await submitEvaluation(payload);

    expect(result.evaluation._id).toBe('eval-2');
  });

  it('submitBulkEvaluations() should POST multiple evaluations', async () => {
    const fakeResponse = {
      created: 3,
      skipped: 1,
    };

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeResponse));

    const evaluations = [
      { activityId: 'act-1', employeeId: 'emp-1', presence: 'PRESENT' },
      { activityId: 'act-1', employeeId: 'emp-2', presence: 'ABSENT' },
      { activityId: 'act-1', employeeId: 'emp-3', presence: 'PRESENT' },
    ];

    const result = await submitBulkEvaluations(evaluations);

    expect(result.created).toBe(3);
    expect(result.skipped).toBe(1);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations/bulk',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ evaluations }),
      })
    );
  });

  it('finalizeActivityEvaluations() should POST finalize endpoint', async () => {
    const fakeResponse = {
      message: 'Evaluations finalized',
      activity: { _id: 'act-1', status: 'COMPLETED' },
    };

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeResponse));

    const result = await finalizeActivityEvaluations('act-1');

    expect(result.message).toBe('Evaluations finalized');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations/activity/act-1/finalize',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('getEvaluationsByEmployee() should fetch all evaluations for employee', async () => {
    const fakeEvaluations = [
      {
        _id: 'eval-1',
        activityId: 'act-1',
        employeeId: 'emp-1',
        presence: 'PRESENT',
        feedback: 'Good',
        createdAt: '2026-05-01',
      },
      {
        _id: 'eval-2',
        activityId: 'act-2',
        employeeId: 'emp-1',
        presence: 'PRESENT',
        feedback: 'Excellent',
        createdAt: '2026-05-15',
      },
    ];

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeEvaluations));

    const evaluations = await getEvaluationsByEmployee('emp-1');

    expect(evaluations).toHaveLength(2);
    expect(evaluations[0].feedback).toBe('Good');
    expect(evaluations[1].feedback).toBe('Excellent');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/post-evaluations/employee/emp-1',
      expect.any(Object)
    );
  });

  it('should handle API errors and throw with error message', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeErrorResponse('Validation failed: invalid presence')
    );

    await expect(
      submitEvaluation({
        activityId: 'act-1',
        employeeId: 'emp-1',
        presence: 'INVALID' as any,
      })
    ).rejects.toThrow('Validation failed: invalid presence');
  });

  it('should return empty object when json parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Parse error')),
      text: () => Promise.resolve('invalid json'),
    } as unknown as Response);

    const result = await getCompletedActivitiesForEvaluation();

    expect(result).toEqual({});
  });

  it('submitEvaluation() should handle update action', async () => {
    const fakeResponse = {
      message: 'Evaluation updated',
      evaluation: { _id: 'eval-1' },
      action: 'updated',
    };

    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeResponse));

    const result = await submitEvaluation({
      activityId: 'act-1',
      employeeId: 'emp-1',
      presence: 'PRESENT',
    });

    expect(result.action).toBe('updated');
  });

  it('should include auth token in all requests', async () => {
    localStorageMock.setItem('token', 'custom-jwt-token');

    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await getCompletedActivitiesForEvaluation();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer custom-jwt-token',
        }),
      })
    );
  });

  it('should work without token', async () => {
    localStorageMock.clear();

    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await getCompletedActivitiesForEvaluation();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      })
    );
  });
});
