import type { AiEmployeeDefinition } from '@trustpay/types';

export const aiEmployees: readonly AiEmployeeDefinition[] = [
  {
    key: 'transaction-manager',
    role: 'Prepare transaction updates and escalate exceptions',
    allowedTools: ['deal:read'],
    autonomy: 'human_approval_required',
    escalationRule: 'Escalate financial, dispute, and compliance actions to an authorized human.'
  }
];
