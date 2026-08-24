export const permissions = [
  'deal:create',
  'deal:read',
  'deal:manage',
  'business:manage',
  'verification:review',
  'dispute:review',
  'fraud:review',
  'finance:reconcile',
  'marketplace:moderate',
  'audit:read',
  'ai:operate',
  'trust.operations.view',
  'trust.verification.view',
  'trust.verification.review',
  'trust.verification.approve',
  'trust.verification.reject',
  'trust.fraud.view',
  'trust.fraud.manage',
  'trust.documents.view',
  'trust.audit.view'
] as const;

export type Permission = (typeof permissions)[number];

export const roles = [
  'buyer',
  'seller',
  'business_owner',
  'business_admin',
  'business_staff',
  'trustpay_support',
  'trustpay_operations',
  'trustpay_compliance',
  'trustpay_finance',
  'trustpay_fraud_analyst',
  'trustpay_administrator'
] as const;

export type Role = (typeof roles)[number];

const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  buyer: ['deal:create', 'deal:read'],
  seller: ['deal:create', 'deal:read'],
  business_owner: ['deal:create', 'deal:read', 'deal:manage', 'business:manage'],
  business_admin: ['deal:create', 'deal:read', 'deal:manage', 'business:manage'],
  business_staff: ['deal:create', 'deal:read'],
  trustpay_support: ['deal:read'],
  trustpay_operations: ['deal:read', 'deal:manage', 'dispute:review'],
  trustpay_compliance: [
    'verification:review',
    'audit:read',
    'trust.verification.view',
    'trust.operations.view',
    'trust.verification.review',
    'trust.verification.approve',
    'trust.verification.reject',
    'trust.documents.view',
    'trust.audit.view'
  ],
  trustpay_finance: ['finance:reconcile', 'audit:read'],
  trustpay_fraud_analyst: [
    'fraud:review',
    'audit:read',
    'trust.operations.view',
    'trust.fraud.view',
    'trust.fraud.manage',
    'trust.audit.view'
  ],
  trustpay_administrator: [
    'deal:create',
    'deal:read',
    'deal:manage',
    'business:manage',
    'verification:review',
    'dispute:review',
    'fraud:review',
    'finance:reconcile',
    'marketplace:moderate',
    'audit:read',
    'ai:operate',
    'trust.verification.view',
    'trust.operations.view',
    'trust.verification.review',
    'trust.verification.approve',
    'trust.verification.reject',
    'trust.fraud.view',
    'trust.fraud.manage',
    'trust.documents.view',
    'trust.audit.view'
  ]
};

export function hasPermission(assignedRoles: readonly Role[], permission: Permission): boolean {
  return assignedRoles.some((role) => rolePermissions[role].includes(permission));
}
