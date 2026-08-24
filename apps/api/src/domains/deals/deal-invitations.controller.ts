import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import type { DealInvitationsService } from './deal-invitations.service.js';

@Controller('deal-invitations')
export class DealInvitationsController {
  public constructor(private readonly invitations: DealInvitationsService) {}

  @Get(':token')
  public view(@Param('token') token: string) {
    return this.invitations.getInvitation(token);
  }

  @Post(':token/accept')
  public accept(@Req() request: AuthenticatedRequest, @Param('token') token: string) {
    return this.invitations.acceptInvitation(token, request.user!.id);
  }

  @Post(':token/reject')
  public reject(@Req() request: AuthenticatedRequest, @Param('token') token: string) {
    return this.invitations.rejectInvitation(token, request.user!.id);
  }
}
