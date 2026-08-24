import { z } from 'zod';

export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, 'Use an ISO 4217 currency code');
export const moneySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Use a positive decimal amount'),
  currency: currencyCodeSchema
});

export const dealTypeSchema = z.enum([
  'physical_product',
  'service',
  'freelance',
  'milestone',
  'business_to_business',
  'vehicle',
  'property',
  'rental',
  'digital_product',
  'custom'
]);

export const createDealSchema = z.object({
  sellerId: z.string().uuid(),
  businessId: z.string().uuid().optional(),
  type: dealTypeSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5_000).optional(),
  amount: moneySchema,
  inspectionPeriodHours: z.number().int().min(0).max(720).optional()
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  language: z.string().trim().min(2).max(10).default('en')
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
});

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(['sole_proprietor', 'company', 'partnership', 'non_profit', 'other']),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  currency: currencyCodeSchema,
  description: z.string().trim().max(2_000).optional()
});

export const addBusinessMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['business_owner', 'business_admin', 'business_staff'])
});

export const dealStatusSchema = z.enum([
  'created',
  'awaiting_payment',
  'payment_secured',
  'seller_accepted',
  'fulfillment_started',
  'delivered',
  'inspection_period',
  'buyer_confirmed',
  'release_pending',
  'released',
  'completed',
  'cancelled',
  'disputed',
  'refunded',
  'expired'
]);

export const transitionDealSchema = z.object({
  targetStatus: dealStatusSchema,
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type AddBusinessMemberInput = z.infer<typeof addBusinessMemberSchema>;
export type TransitionDealInput = z.infer<typeof transitionDealSchema>;

export const createPaymentIntentSchema = z.object({
  dealId: z.string().uuid(),
  providerCode: z.string().trim().min(2).max(50),
  idempotencyKey: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const prepareOrderPaymentSchema = z.object({
  providerCode: z.string().trim().min(2).max(50),
  idempotencyKey: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const providerWebhookSchema = z.object({
  providerEventId: z.string().trim().min(1).max(200),
  providerReference: z.string().trim().min(1).max(200),
  eventType: z.enum(['payment.confirmed', 'payment.failed']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: currencyCodeSchema,
  payload: z.record(z.string(), z.unknown())
});

export const createRefundSchema = z.object({
  paymentIntentId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.string().trim().min(3).max(500).optional()
});

export const submitDisputeEvidenceSchema = z.object({
  kind: z.string().trim().min(2).max(50),
  reference: z.string().trim().min(3).max(500),
  description: z.string().trim().max(2_000).optional()
});

export const submitDisputeResponseSchema = z.object({
  response: z.string().trim().min(3).max(5_000)
});

export const proposeDisputeResolutionSchema = z.object({
  outcome: z.enum(['release', 'refund', 'partial_refund', 'partial_release', 'amend_terms']),
  notes: z.string().trim().min(3).max(5_000)
});

export const reviewDisputeResolutionSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  reason: z.string().trim().min(3).max(2_000)
});

export const disputeDecisionSchema = z.object({
  outcome: z.enum(['release', 'refund']),
  reason: z.string().trim().min(3).max(2_000)
});

export const createDisputeSchema = z.object({
  dealId: z.string().uuid(),
  reason: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(5_000)
});

export const createDealAmendmentSchema = z
  .object({
    reason: z.string().trim().min(3).max(2_000),
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(5_000).optional(),
    amount: moneySchema.optional(),
    inspectionPeriodHours: z.number().int().min(0).max(720).optional(),
    deliveryExpectations: z.string().trim().max(5_000).optional(),
    completionRequirements: z.string().trim().max(5_000).optional(),
    cancellationRules: z.string().trim().max(5_000).optional(),
    additionalNotes: z.string().trim().max(5_000).optional()
  })
  .refine(
    (value) =>
      Boolean(
        value.title ||
          value.description ||
          value.amount ||
          value.inspectionPeriodHours !== undefined ||
          value.deliveryExpectations ||
          value.completionRequirements ||
          value.cancellationRules ||
          value.additionalNotes
      ),
    'At least one proposed agreement change is required.'
  );

export const reviewDealAmendmentSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  reason: z.string().trim().min(3).max(2_000)
});

export const createProductSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(5_000),
  categoryId: z.string().uuid().optional(),
  images: z.array(z.string().url()).max(8).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: currencyCodeSchema,
  location: z.string().trim().max(160).optional(),
  businessId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'unavailable']).optional()
});

export const updateProductSchema = createProductSchema.omit({ status: true }).partial().extend({
  status: z.enum(['draft', 'published', 'unavailable']).optional()
});

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  inspectionPeriodHours: z.number().int().min(0).max(720).optional()
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PrepareOrderPaymentInput = z.infer<typeof prepareOrderPaymentSchema>;
export type ProviderWebhookInput = z.infer<typeof providerWebhookSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type SubmitDisputeEvidenceInput = z.infer<typeof submitDisputeEvidenceSchema>;
export type SubmitDisputeResponseInput = z.infer<typeof submitDisputeResponseSchema>;
export type ProposeDisputeResolutionInput = z.infer<typeof proposeDisputeResolutionSchema>;
export type ReviewDisputeResolutionInput = z.infer<typeof reviewDisputeResolutionSchema>;
export type DisputeDecisionInput = z.infer<typeof disputeDecisionSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type CreateDealAmendmentInput = z.infer<typeof createDealAmendmentSchema>;
export type ReviewDealAmendmentInput = z.infer<typeof reviewDealAmendmentSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const submitIdentityVerificationSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  dateOfBirth: z.string().date().optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  identityType: z.string().trim().min(2).max(80),
  identityReference: z.string().trim().min(3).max(160),
  country: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase())
});

export const submitBusinessVerificationSchema = z.object({
  businessId: z.string().uuid(),
  registeredName: z.string().trim().min(2).max(160).optional(),
  registrationNumber: z.string().trim().min(2).max(160).optional()
});

export const createReviewSchema = z.object({
  dealId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1_000).optional()
});

export const verificationDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(1_000)
});

export const createFraudCaseSchema = z
  .object({
    userId: z.string().uuid().optional(),
    businessId: z.string().uuid().optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical', 'critical_review']),
    reason: z.string().trim().min(3).max(2_000),
    evidence: z.record(z.string(), z.unknown()).optional()
  })
  .refine((value) => value.userId || value.businessId, 'A fraud case must have a subject.');

export const updateFraudCaseSchema = z.object({
  status: z
    .enum([
      'open',
      'investigating',
      'under_review',
      'more_information_required',
      'resolved',
      'cleared',
      'action_required',
      'dismissed',
      'closed'
    ])
    .optional(),
  assignedReviewerId: z.string().uuid().nullable().optional(),
  investigationNotes: z.string().trim().min(1).max(5_000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional()
});

export type VerificationDecisionInput = z.infer<typeof verificationDecisionSchema>;
export type CreateFraudCaseInput = z.infer<typeof createFraudCaseSchema>;
export type UpdateFraudCaseInput = z.infer<typeof updateFraudCaseSchema>;

export const createDealInvitationSchema = z
  .object({
    recipientUserId: z.string().uuid().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(6).max(30).optional(),
    participantRole: z.enum(['buyer', 'seller', 'service_provider', 'business'])
  })
  .refine((value) => value.recipientUserId || value.email || value.phone, {
    message: 'An invitation recipient is required.'
  });

export const createVerificationDocumentSchema = z.object({
  identityVerificationId: z.string().uuid().optional(),
  businessVerificationId: z.string().uuid().optional(),
  documentType: z.string().trim().min(2).max(100),
  storageReference: z.string().trim().min(3).max(500),
  expiresAt: z.string().datetime().optional()
});
