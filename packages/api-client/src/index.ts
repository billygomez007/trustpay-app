import type { AuthSession, DealSummary } from '@trustpay/types';
import {
  createBusinessSchema,
  createDealSchema,
  loginSchema,
  registerSchema,
  type CreateBusinessInput,
  type CreateDealInput,
  type LoginInput,
  type RegisterInput
} from '@trustpay/validation';

export class TrustPayApiClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly sessionToken?: string
  ) {}

  public withSession(token: string): TrustPayApiClient {
    return new TrustPayApiClient(this.baseUrl, this.fetcher, token);
  }

  public async register(input: RegisterInput): Promise<AuthSession> {
    return this.request('/auth/register', { method: 'POST', body: registerSchema.parse(input) });
  }

  public async login(input: LoginInput): Promise<AuthSession> {
    return this.request('/auth/login', { method: 'POST', body: loginSchema.parse(input) });
  }

  public async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  public async createDeal(input: CreateDealInput): Promise<DealSummary> {
    const payload = createDealSchema.parse(input);
    return this.request('/deals', { method: 'POST', body: payload });
  }

  public async createBusiness(input: CreateBusinessInput) {
    return this.request('/businesses', { method: 'POST', body: createBusinessSchema.parse(input) });
  }

  public async listDeals(businessId?: string): Promise<DealSummary[]> {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
    return this.request(`/deals${suffix}`, { method: 'GET' });
  }

  public async listNotifications(): Promise<
    Array<{ id: string; title: string; body: string; createdAt: string; readAt: string | null }>
  > {
    return this.request('/notifications', { method: 'GET' });
  }

  private async request<T>(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown }
  ): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: options.method,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(this.sessionToken ? { authorization: `Bearer ${this.sessionToken}` } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    if (!response.ok) {
      throw new Error(`TrustPay API request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
