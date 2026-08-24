import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { calculateFee } from '../src/domains/financial/fees/fee-calculation.service.js';
import { assertBalanced } from '../src/domains/financial/ledger/ledger.service.js';

test('calculates configurable percentage and fixed fees', () => {
  assert.equal(calculateFee({ amount: '10000.00', percentage: '1.5' }), '150.00');
  assert.equal(calculateFee({ amount: '100.00', fixedAmount: '2.50' }), '2.50');
  assert.equal(calculateFee({ amount: '999999999999.99', percentage: '1.27' }), '12699999999.99');
});

test('requires journals to balance exactly', () => {
  assert.doesNotThrow(() =>
    assertBalanced([
      {
        accountCode: 'cash',
        accountName: 'Cash',
        accountType: 'asset',
        direction: 'debit',
        amount: '100.00',
        currency: 'GHS'
      },
      {
        accountCode: 'liability',
        accountName: 'Liability',
        accountType: 'liability',
        direction: 'credit',
        amount: '100.00',
        currency: 'GHS'
      }
    ])
  );
  assert.throws(
    () =>
      assertBalanced([
        {
          accountCode: 'cash',
          accountName: 'Cash',
          accountType: 'asset',
          direction: 'debit',
          amount: '100.00',
          currency: 'GHS'
        },
        {
          accountCode: 'liability',
          accountName: 'Liability',
          accountType: 'liability',
          direction: 'credit',
          amount: '99.99',
          currency: 'GHS'
        }
      ]),
    BadRequestException
  );
});
