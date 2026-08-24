import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthService } from './auth.service.js';
import { IS_PUBLIC } from './public.decorator.js';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass()
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const cookieToken = request.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('tp_session='))
      ?.slice('tp_session='.length);
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : cookieToken;
    if (!token) {
      throw new UnauthorizedException('A bearer session token is required.');
    }

    request.user = await this.authService.authenticate(token);
    return true;
  }
}
