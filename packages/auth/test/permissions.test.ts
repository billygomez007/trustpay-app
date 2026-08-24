import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission } from '../src/index.js';

test('keeps finance permission out of merchant roles', () => {
  assert.equal(hasPermission(['business_owner'], 'finance:reconcile'), false);
});
