import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { assertValidInvitationRecipient } from '../src/domains/deals/deal-invitations.service.js';

const base = { dealId: 'deal', inviterId: 'inviter', participantRole: 'seller' as const };
test('validates an invitation recipient', () =>
  assert.doesNotThrow(() =>
    assertValidInvitationRecipient({ ...base, email: 'seller@example.com' })
  ));
test('rejects an invitation without recipient information', () =>
  assert.throws(() => assertValidInvitationRecipient(base), BadRequestException));
test('rejects an invalid recipient email', () =>
  assert.throws(
    () => assertValidInvitationRecipient({ ...base, email: 'invalid' }),
    BadRequestException
  ));
