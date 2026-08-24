import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { assertTenantOwnsResource } from '../src/domains/businesses/tenant.service.js';

test('rejects access to a resource from another business tenant', () => {
  assert.throws(() => assertTenantOwnsResource('business-a', 'business-b'), NotFoundException);
});

test('permits access only within the same business tenant', () => {
  assert.doesNotThrow(() => assertTenantOwnsResource('business-a', 'business-a'));
});
