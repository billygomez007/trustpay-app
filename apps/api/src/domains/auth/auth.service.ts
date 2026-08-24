import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import type { AuthSession, AuthenticatedUser } from '@trustpay/types';
import type { LoginInput, RegisterInput } from '@trustpay/validation';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { AuditService } from '../audit/audit.service.js';

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  public constructor(private readonly auditService: AuditService) {}

  public async register(input: RegisterInput): Promise<AuthSession> {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new UnauthorizedException('An account already exists for this email address.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        profile: {
          create: {
            name: input.name,
            country: input.country,
            language: input.language
          }
        }
      },
      include: { profile: true }
    });

    await this.auditService.record({
      actorId: user.id,
      action: 'identity.registered',
      resource: `user:${user.id}`
    });
    return this.createSession(this.toAuthenticatedUser(user));
  }

  public async login(input: LoginInput): Promise<AuthSession> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { profile: true }
    });
    if (
      !user ||
      user.accountStatus !== 'active' ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.auditService.record({
      actorId: user.id,
      action: 'identity.logged_in',
      resource: `user:${user.id}`
    });
    return this.createSession(this.toAuthenticatedUser(user));
  }

  public async logout(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const session = await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    if (session.count > 0) {
      await this.auditService.record({ action: 'identity.logged_out', resource: 'session' });
    }
  }

  public async authenticate(token: string): Promise<AuthenticatedUser> {
    const session = await prisma.session.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { accountStatus: 'active' }
      },
      include: { user: { include: { profile: true } } }
    });
    if (!session) {
      throw new UnauthorizedException('Your session is invalid or has expired.');
    }
    return this.toAuthenticatedUser(session.user);
  }

  private async createSession(user: AuthenticatedUser): Promise<AuthSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await prisma.session.create({
      data: { userId: user.id, tokenHash: this.hashToken(token), expiresAt }
    });
    return { token, expiresAt: expiresAt.toISOString(), user };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    accountStatus: 'active' | 'suspended' | 'locked';
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
    profile: { name: string } | null;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.profile?.name ?? user.email,
      accountStatus: user.accountStatus,
      verificationStatus: user.verificationStatus
    };
  }
}
