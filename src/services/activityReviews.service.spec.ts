// src/services/activityReviews.service.spec.ts

const mockFetch = jest.fn();
global.fetch = mockFetch;

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

import {
  approveActivityReview,
  getActivityReview,
  requestActivityReviewChanges,
  saveHrShortlist,
  submitHrShortlistToManager,
} from './activityReviews.service';

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

describe('activityReviews.service', () => {

  it('getActivityReview() should fetch activity review', async () => {
    const fakeReview = {
      _id: 'review-1',
      activityId: 'act-1',
      hrShortlist: ['emp-1', 'emp-2'],
      status: 'PENDING_MANAGER_REVIEW',
    };
    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeReview));
    const review = await getActivityReview('act-1');
    expect(review).toEqual(fakeReview);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activity-reviews/act-1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fake-jwt-token' }),
      })
    );
  });

  it('getActivityReview() should return null on 404', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse({ error: 'Not found' }, 404));
    const review = await getActivityReview('act-notfound');
    expect(review).toBeNull();
  });

  it('getActivityReview() should throw on other errors', async () => {
    mockFetch.mockResolvedValueOnce(fakeTextErrorResponse('Database error', 500));
    await expect(getActivityReview('act-1')).rejects.toThrow('Database error');
  });

  it('saveHrShortlist() should POST with employeeIds and optional fields', async () => {
    const fakeResponse = {
      message: 'Shortlist saved',
      review: { _id: 'review-1', status: 'HR_SHORTLIST_SAVED' },
    };
    mockFetch.mockResolvedValueOnce(fakeJsonResponse(fakeResponse));
    const payload = {
      employeeIds: ['emp-1', 'emp-2', 'emp-3'],
      hrNote: 'Top candidates selected',
      hrInvitationResponseDays: 3,
    };
    const result = await saveHrShortlist('act-1', payload);
    expect(result.message).toBe('Shortlist saved');
    expect(result.review._id).toBe('review-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activity-reviews/act-1/hr-shortlist',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  it('saveHrShortlist() should URL encode activityId', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse({ message: 'OK', review: {} }));
    await saveHrShortlist('act/special-id', { employeeIds: ['emp-1'] });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activity-reviews/act%2Fspecial-id/hr-shortlist',
      expect.any(Object)
    );
  });

  it('submitHrShortlistToManager() should PATCH submit-to-manager endpoint', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ message: 'Submitted to manager', review: { _id: 'review-1' } })
    );
    const result = await submitHrShortlistToManager('act-1');
    expect(result.message).toBe('Submitted to manager');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activity-reviews/act-1/submit-to-manager',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('approveActivityReview() should PATCH approve endpoint with manager selections', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ message: 'Activity approved', review: { status: 'MANAGER_APPROVED' } })
    );
    const payload = {
      managerSelectedEmployeeIds: ['emp-1', 'emp-2'],
      managerNote: 'Excellent candidates',
      managerReplacementResponseDays: 7,
    };
    const result = await approveActivityReview('act-1', payload);
    expect(result.message).toBe('Activity approved');
    expect(result.review.status).toBe('MANAGER_APPROVED');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/activity-reviews/act-1/approve',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(payload) })
    );
  });

  it('requestActivityReviewChanges() should PATCH request-changes endpoint', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ message: 'Changes requested', review: { status: 'CHANGES_REQUESTED' } })
    );
    const payload = { managerSelectedEmployeeIds: ['emp-2'], managerNote: 'Need others' };
    const result = await requestActivityReviewChanges('act-1', payload);
    expect(result.message).toBe('Changes requested');
    expect(result.review.status).toBe('CHANGES_REQUESTED');
  });

  it('should handle 401 unauthorized with custom message', async () => {
    mockFetch.mockResolvedValueOnce(fakeTextErrorResponse('Unauthorized', 401));
    await expect(getActivityReview('act-1')).rejects.toThrow(
      'Unauthorized session. Please sign in with an HR account.'
    );
  });

  it('should handle error response with array message', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ message: ['Error 1', 'Error 2', 'Error 3'] }, 400)
    );
    await expect(saveHrShortlist('act-1', { employeeIds: [] })).rejects.toThrow(
      'Error 1, Error 2, Error 3'
    );
  });

  it('saveHrShortlist() should handle response with candidateSnapshots', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse({ message: 'Saved', review: { _id: 'review-1' } }));
    const payload = {
      employeeIds: ['emp-1', 'emp-2'],
      candidateSnapshots: [
        { employeeId: 'emp-1', score: 95 },
        { employeeId: 'emp-2', score: 88 },
      ],
    };
    const result = await saveHrShortlist('act-1', payload);
    expect(result.review._id).toBe('review-1');
  });

  it('approveActivityReview() should work with minimal payload', async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse({ message: 'OK', review: {} }));
    await approveActivityReview('act-1', { managerSelectedEmployeeIds: ['emp-1'] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

});