import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { ActivityReviewsService } from './activity-reviews.service';
import { ActivityReview, ActivityReviewStatus } from './schemas/activity-review.schema';
import { ActivitiesService } from '../activities/activities.service';
import { EmployeeService } from '../employee/employee.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityInvitationsService } from '../activity-invitations/activity-invitations.service';
import { Activity } from '../activities/entities/activity.entity';

describe('ActivityReviewsService', () => {
  let service: ActivityReviewsService;
  let activityReviewModel: any;
  let activityModel: any;
  let activitiesService: any;
  let employeeService: any;
  let notificationsService: any;
  let activityInvitationsService: any;

  const createQuery = (result: any) => ({
    lean: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    activityReviewModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    activityModel = {
      findByIdAndUpdate: jest.fn(),
    };

    activitiesService = {
      findOne: jest.fn(),
    };

    employeeService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    notificationsService = {
      createOne: jest.fn(),
    };

    activityInvitationsService = {
      createInvitations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityReviewsService,
        { provide: getModelToken(ActivityReview.name), useValue: activityReviewModel },
        { provide: getModelToken(Activity.name), useValue: activityModel },
        { provide: ActivitiesService, useValue: activitiesService },
        { provide: EmployeeService, useValue: employeeService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ActivityInvitationsService, useValue: activityInvitationsService },
      ],
    }).compile();

    service = module.get(ActivityReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('saveHrShortlist should throw when activity is missing', async () => {
    activitiesService.findOne.mockResolvedValue(null);

    await expect(
      service.saveHrShortlist('invalid', { employeeIds: [] } as any, { role: 'HR' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('saveHrShortlist should reject non HR users', async () => {
    activitiesService.findOne.mockResolvedValue({ _id: 'a1', workflowStatus: 'DRAFT' });

    await expect(
      service.saveHrShortlist(
        new Types.ObjectId().toHexString(),
        { employeeIds: [new Types.ObjectId().toHexString()] } as any,
        { role: 'MANAGER' } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('saveHrShortlist should dedupe and persist shortlist', async () => {
    const activityId = new Types.ObjectId().toHexString();
    const employeeId = new Types.ObjectId().toHexString();

    activitiesService.findOne.mockResolvedValue({
      _id: activityId,
      title: 'Activity',
      workflowStatus: 'DRAFT',
      created_by: new Types.ObjectId().toHexString(),
    });
    employeeService.findAll.mockResolvedValue([
      { _id: employeeId, user_id: { _id: employeeId } },
    ]);
    activityReviewModel.findOne.mockResolvedValue(null);
    activityReviewModel.findOneAndUpdate.mockResolvedValue({
      activityId,
      hrSelectedEmployeeIds: [employeeId],
      status: ActivityReviewStatus.HR_DRAFT,
      revisionNumber: 1,
    });

    const result = await service.saveHrShortlist(
      activityId,
      { employeeIds: [employeeId, employeeId], hrNote: 'Note' } as any,
      { _id: new Types.ObjectId(), role: 'HR' } as any,
    );

    expect(activityReviewModel.findOneAndUpdate).toHaveBeenCalled();
    expect(activityModel.findByIdAndUpdate).toHaveBeenCalledWith(activityId, expect.objectContaining({ workflowStatus: 'DRAFT' }));
    expect(result.message).toBe('HR shortlist saved successfully');
  });

  it('submitToManager should throw when review is missing', async () => {
    activitiesService.findOne.mockResolvedValue({ _id: 'a1', workflowStatus: 'DRAFT' });
    activityReviewModel.findOne.mockResolvedValue(null);

    await expect(
      service.submitToManager(new Types.ObjectId().toHexString(), { _id: new Types.ObjectId(), role: 'HR' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submitToManager should submit a valid review', async () => {
    const activityId = new Types.ObjectId().toHexString();
    const managerId = new Types.ObjectId().toHexString();
    const hrId = new Types.ObjectId().toHexString();

    activitiesService.findOne.mockResolvedValue({
      _id: activityId,
      title: 'Activity',
      workflowStatus: 'DRAFT',
      created_by: hrId,
      responsible_manager: managerId,
    });
    activityReviewModel.findOne.mockResolvedValue({
      activityId,
      status: ActivityReviewStatus.HR_DRAFT,
      revisionNumber: 1,
      hrSelectedEmployeeIds: [new Types.ObjectId().toHexString()],
      save: jest.fn().mockResolvedValue(true),
    });

    const result = await service.submitToManager(activityId, { _id: hrId, role: 'HR' } as any);

    expect(activityModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(notificationsService.createOne).toHaveBeenCalled();
    expect(result.message).toBe('Activity submitted to manager successfully');
  });

  it('getReviewByActivity should throw when no review exists', async () => {
    activityReviewModel.findOne.mockReturnValue(createQuery(null));

    await expect(service.getReviewByActivity(new Types.ObjectId().toHexString())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getPendingManagerReviews should return pending reviews', async () => {
    const pending = [{ _id: 'r1' }];
    activityReviewModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(pending),
      }),
    });

    await expect(service.getPendingManagerReviews()).resolves.toEqual(pending);
  });

  it('requestChanges should throw when review is missing', async () => {
    activitiesService.findOne.mockResolvedValue({ _id: 'a1' });
    activityReviewModel.findOne.mockResolvedValue(null);

    await expect(
      service.requestChanges(new Types.ObjectId().toHexString(), { managerSelectedEmployeeIds: [new Types.ObjectId().toHexString()] } as any, new Types.ObjectId().toHexString()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('approveFinalList should finalize and create invitations', async () => {
    const activityId = new Types.ObjectId().toHexString();
    const managerUserId = new Types.ObjectId().toHexString();
    const employeeId = new Types.ObjectId().toHexString();

    activitiesService.findOne.mockResolvedValue({
      _id: activityId,
      title: 'Activity',
      created_by: new Types.ObjectId().toHexString(),
    });
    activityReviewModel.findOne.mockResolvedValue({
      activityId,
      status: ActivityReviewStatus.CHANGES_REQUESTED,
      revisionNumber: 2,
      managerSelectedEmployeeIds: [],
      save: jest.fn().mockResolvedValue(true),
    });
    employeeService.findAll.mockResolvedValue([{ _id: employeeId, user_id: { _id: employeeId } }]);

    const result = await service.approveFinalList(
      activityId,
      { managerSelectedEmployeeIds: [employeeId], managerReplacementResponseDays: 7 } as any,
      managerUserId,
    );

    expect(activityInvitationsService.createInvitations).toHaveBeenCalled();
    expect(notificationsService.createOne).toHaveBeenCalled();
    expect(result.message).toBe('Manager approved final participants and invitations sent');
  });
});