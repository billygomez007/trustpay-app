import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  assertActorCanTransition,
  assertValidTransition
} from '../src/domains/deals/deal-state-machine.js';

test('allows only defined Deal state transitions', () => {
  assert.doesNotThrow(() => assertValidTransition('created', 'awaiting_payment'));
  assert.throws(() => assertValidTransition('created', 'completed'), BadRequestException);
});

test('prevents clients from asserting provider payment security', () => {
  assert.throws(
    () =>
      assertActorCanTransition({
        current: 'awaiting_payment',
        target: 'payment_secured',
        actorId: 'buyer',
        buyerId: 'buyer',
        sellerId: 'seller'
      }),
    ForbiddenException
  );
});

test('requires the buyer to complete a Deal', () => {
  assert.throws(
    () =>
      assertActorCanTransition({
        current: 'inspection_period',
        target: 'completed',
        actorId: 'seller',
        buyerId: 'buyer',
        sellerId: 'seller'
      }),
    ForbiddenException
  );
});

test('requires the buyer to confirm receipt', () => {
  assert.throws(
    () =>
      assertActorCanTransition({
        current: 'inspection_period',
        target: 'buyer_confirmed',
        actorId: 'seller',
        buyerId: 'buyer',
        sellerId: 'seller'
      }),
    ForbiddenException
  );
});

test('keeps release transitions inside the financial workflow', () => {
  assert.throws(
    () =>
      assertActorCanTransition({
        current: 'release_pending',
        target: 'released',
        actorId: 'buyer',
        buyerId: 'buyer',
        sellerId: 'seller'
      }),
    ForbiddenException
  );
});
