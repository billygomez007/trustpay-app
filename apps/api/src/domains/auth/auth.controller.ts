import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { loginSchema, registerSchema } from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import type { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

type CookieResponse = {
  cookie(name: string, value: string, options: Record<string, boolean | number | string>): void;
  clearCookie(name: string): void;
};

@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  public async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const input = parseRequest(registerSchema, body);
    const session = await this.authService.register({ ...input, language: input.language ?? 'en' });
    this.setWebSessionCookie(response, session.token);
    return session;
  }

  @Public()
  @Post('login')
  public async login(@Body() body: unknown, @Res({ passthrough: true }) response: CookieResponse) {
    const session = await this.authService.login(parseRequest(loginSchema, body));
    this.setWebSessionCookie(response, session.token);
    return session;
  }

  @Post('logout')
  public async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: CookieResponse
  ): Promise<{ success: true }> {
    const token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice('Bearer '.length)
      : request.headers.cookie
          ?.split(';')
          .map((value) => value.trim())
          .find((value) => value.startsWith('tp_session='))
          ?.slice('tp_session='.length);
    if (token) {
      await this.authService.logout(token);
    }
    response.clearCookie('tp_session');
    return { success: true };
  }

  @Get('me')
  public me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  private setWebSessionCookie(response: CookieResponse, token: string): void {
    response.cookie('tp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: '/'
    });
  }
}
