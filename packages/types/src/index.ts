export type CurrencyCode = string;
export type Money = Readonly<{ amount: string; currency: CurrencyCode }>;

export type DealType =
  | 'physical_product'
  | 'service'
  | 'freelance'
  | 'milestone'
  | 'business_to_business'
  | 'vehicle'
  | 'property'
  | 'rental'
  | 'digital_product'
  | 'custom';

export type DealStatus =
  | 'draft'
  | 'invited'
  | 'parties_accepted'
  | 'created'
  | 'awaiting_payment'
  | 'payment_secured'
  | 'seller_accepted'
  | 'fulfillment_started'
  | 'delivered'
  | 'inspection_period'
  | 'buyer_confirmed'
  | 'release_pending'
  | 'released'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'refunded'
  | 'expired';

export interface DealSummary {
  id: string;
  reference: string;
  businessId: string | null;
  buyerId: string;
  sellerId: string;
  type: DealType;
  title: string;
  amount: Money;
  feeAmount: Money | null;
  status: DealStatus;
  createdAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  accountStatus: 'active' | 'suspended' | 'locked';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

export type PaymentProviderCapability = 'collect' | 'refund' | 'payout' | 'webhooks';

export interface PaymentProvider {
  readonly code: string;
  readonly capabilities: readonly PaymentProviderCapability[];
  createPaymentIntent(input: {
    dealReference: string;
    amount: Money;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; checkoutUrl?: string }>;
  verifyWebhook(input: {
    signature: string;
    payload: string;
  }): Promise<{ providerEventReference: string; type: string }>;
}

export type AiAutonomyLevel = 'assistive' | 'recommendation_only' | 'human_approval_required';

export interface AiEmployeeDefinition {
  key: string;
  role: string;
  allowedTools: readonly string[];
  autonomy: AiAutonomyLevel;
  escalationRule: string;
}
