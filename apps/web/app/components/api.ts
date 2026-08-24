'use client';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`TrustPay API request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export type PublicSeller = {
  id: string;
  displayName: string;
  country: string | null;
  verificationLevel: string;
  trustScore: number;
  completedDeals: number;
  averageRating: string | null;
  memberSince: string;
};

export type CustomerDeal = {
  id: string;
  reference: string;
  type: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  status: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  events?: Array<{ id: string; action: string; actorId: string | null; createdAt: string }>;
  terms?: {
    id: string;
    deliveryExpectations: string | null;
    completionRequirements: string | null;
    cancellationRules: string | null;
    additionalNotes: string | null;
    acceptedAt: string | null;
  } | null;
  order?: { id: string; status: string } | null;
  delivery?: { id: string; method: string; trackingReference: string | null; status: string; notes: string | null; deliveredAt: string | null } | null;
  participants?: Array<{ id: string; userId: string | null; role: string; acceptedAt: string | null; user?: { profile?: { name: string } | null } | null }>;
  amendments?: Array<{
    id: string;
    actorId: string;
    status: string;
    createdAt: string;
    changes: Record<string, unknown>;
  }>;
  disputes?: Array<{
    id: string;
    openedById: string;
    reason: string;
    description: string;
    responseById: string | null;
    responseAt: string | null;
    responseSummary: string | null;
    resolutionProposal: { outcome: string; notes: string; proposedById: string; proposedAt: string } | null;
    resolutionDecision: string | null;
    resolutionDecisionById: string | null;
    resolutionDecisionAt: string | null;
    status: string;
    createdAt: string;
    evidence: Array<{
      id: string;
      kind: string;
      reference: string;
      description: string | null;
      createdAt: string;
    }>;
    decisions: Array<{ id: string; outcome: string; reason: string; createdAt: string }>;
  }>;
  buyer?: { id: string; profile?: { name: string } | null } | null;
  seller?: { id: string; profile?: { name: string } | null } | null;
};

export type DealAmendment = {
  id: string;
  actorId: string;
  status: string;
  createdAt: string;
  changes: Record<string, unknown>;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  accountStatus: string;
  verificationStatus: string;
};

export type DisputeCase = {
  id: string;
  openedById: string;
  reason: string;
  description: string;
  responseSummary: string | null;
  responseById: string | null;
  responseAt: string | null;
  resolutionProposal:
    | { outcome: string; notes: string; proposedById: string; proposedAt: string }
    | null;
  resolutionDecision: string | null;
  resolutionDecisionById: string | null;
  resolutionDecisionAt: string | null;
  status: string;
  createdAt: string;
  deal: {
    id: string;
    reference: string;
    title: string;
    buyerId: string;
    sellerId: string;
    buyer?: { id: string; profile?: { name: string } | null } | null;
    seller?: { id: string; profile?: { name: string } | null } | null;
  };
  evidence: Array<{
    id: string;
    kind: string;
    reference: string;
    description: string | null;
    createdAt: string;
    submittedById: string;
    submittedBy?: { id: string; profile?: { name: string } | null } | null;
  }>;
  decisions: Array<{
    id: string;
    outcome: string;
    reason: string;
    createdAt: string;
    reviewerId: string;
    reviewer?: { id: string; profile?: { name: string } | null } | null;
  }>;
};

export type RiskSignal = {
  id: string;
  userId: string | null;
  businessId: string | null;
  signalType: string;
  severity: string;
  explanation: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type FraudCase = {
  id: string;
  userId: string | null;
  businessId: string | null;
  riskLevel: string;
  reason: string;
  evidence: Record<string, unknown> | null;
  status: string;
  assignedReviewerId: string | null;
  investigationNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string } | null;
  business?: { id: string; name: string } | null;
  signals?: RiskSignal[];
};

export async function listPublicSellers(search = ''): Promise<PublicSeller[]> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<PublicSeller[]>(`/trust/public-sellers${suffix}`);
}

export async function getPublicSeller(id: string): Promise<PublicSeller> {
  return apiRequest<PublicSeller>(`/trust/public/${id}`);
}

export async function getCustomerDeal(id: string): Promise<CustomerDeal> {
  return apiRequest<CustomerDeal>(`/deals/${id}`);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me');
}

export async function proposeDealAmendment(
  dealId: string,
  input: {
    reason: string;
    title?: string;
    description?: string;
    amount?: { amount: string; currency: string };
    inspectionPeriodHours?: number;
    deliveryExpectations?: string;
    completionRequirements?: string;
    cancellationRules?: string;
    additionalNotes?: string;
  }
) {
  return apiRequest<DealAmendment>(`/deals/${dealId}/amendments`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function reviewDealAmendment(
  dealId: string,
  amendmentId: string,
  input: { decision: 'accepted' | 'rejected'; reason: string }
) {
  return apiRequest<DealAmendment>(
    `/deals/${dealId}/amendments/${amendmentId}/review`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

export async function submitDisputeEvidence(
  disputeId: string,
  input: { kind: string; reference: string; description?: string }
) {
  return apiRequest(`/disputes/${disputeId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export type Product = {
  id: string;
  title: string;
  description: string;
  images: string[] | null;
  price: string;
  currency: string;
  location: string | null;
  status: 'draft' | 'published' | 'unavailable';
  category: { id: string; name: string } | null;
  seller: { id: string; name: string; verificationLevel: string; trustScore: number | null; completedDeals: number | null; averageRating: string | null };
};

export async function listProducts(search = ''): Promise<Product[]> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<Product[]>(`/products${suffix}`);
}

export async function getProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`);
}

export async function listSellerProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/products/seller/mine');
}

export async function createProduct(input: { title: string; description: string; price: string; currency: string; categoryId?: string; location?: string; status?: 'draft' | 'published' | 'unavailable' }) {
  return apiRequest<Product>('/products', { method: 'POST', body: JSON.stringify(input) });
}

export async function createOrder(productId: string) {
  return apiRequest<{ id: string; dealId: string }>('/orders', { method: 'POST', body: JSON.stringify({ productId }) });
}

export async function prepareOrderPayment(orderId: string, providerCode = 'paystack') {
  return apiRequest<{ id: string; reference: string; status: string }>(`/orders/${orderId}/payment-intents`, { method: 'POST', body: JSON.stringify({ providerCode, idempotencyKey: crypto.randomUUID() }) });
}

export async function confirmDelivery(dealId: string) {
  return apiRequest(`/deals/${dealId}/transitions`, { method: 'POST', body: JSON.stringify({ targetStatus: 'buyer_confirmed' }) });
}

export async function transitionDeal(dealId: string, targetStatus: string, metadata?: Record<string, unknown>) {
  return apiRequest(`/deals/${dealId}/transitions`, {
    method: 'POST',
    body: JSON.stringify(metadata ? { targetStatus, metadata } : { targetStatus })
  });
}

export async function openDispute(input: { dealId: string; reason: string; description: string }) {
  return apiRequest('/disputes', { method: 'POST', body: JSON.stringify(input) });
}

export async function listDisputes(): Promise<DisputeCase[]> {
  return apiRequest<DisputeCase[]>('/disputes');
}

export async function getDispute(disputeId: string): Promise<DisputeCase> {
  return apiRequest<DisputeCase>(`/disputes/${disputeId}`);
}

export async function listRiskSignals(): Promise<RiskSignal[]> {
  return apiRequest<RiskSignal[]>('/admin/trust/risk-signals');
}

export async function listFraudCases(): Promise<FraudCase[]> {
  return apiRequest<FraudCase[]>('/admin/trust/fraud-cases');
}

export async function getFraudCase(fraudCaseId: string): Promise<FraudCase> {
  return apiRequest<FraudCase>(`/admin/trust/fraud-cases/${fraudCaseId}`);
}

export async function updateFraudCase(
  fraudCaseId: string,
  input: {
    status?: 'open' | 'investigating' | 'under_review' | 'more_information_required' | 'resolved' | 'cleared' | 'action_required' | 'dismissed' | 'closed';
    assignedReviewerId?: string | null;
    investigationNotes?: string;
    evidence?: Record<string, unknown>;
  }
) {
  return apiRequest<FraudCase>(`/admin/trust/fraud-cases/${fraudCaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function submitDisputeResponse(disputeId: string, response: string) {
  return apiRequest(`/disputes/${disputeId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response })
  });
}

export async function proposeDisputeResolution(
  disputeId: string,
  input: { outcome: 'release' | 'refund' | 'partial_refund' | 'partial_release' | 'amend_terms'; notes: string }
) {
  return apiRequest(`/disputes/${disputeId}/resolution`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function reviewDisputeResolution(
  disputeId: string,
  input: { decision: 'accepted' | 'rejected'; reason: string }
) {
  return apiRequest(`/disputes/${disputeId}/resolution/decision`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}
