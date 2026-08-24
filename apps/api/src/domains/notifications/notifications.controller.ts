import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import type { NotificationService } from './notification.service.js';

@Controller('notifications')
export class NotificationsController {
  public constructor(private readonly notifications: NotificationService) {}

  @Get()
  public list(@Req() request: AuthenticatedRequest) {
    return this.notifications.listForUser(request.user!.id);
  }
}
