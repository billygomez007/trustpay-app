import type { AuthenticatedUser } from '@trustpay/types';

export interface AuthenticatedRequest {
  headers: { authorization?: string; cookie?: string };
  user?: AuthenticatedUser;
}
