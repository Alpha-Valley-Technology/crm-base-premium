import { test } from 'node:test';
import assert from 'node:assert';
import { usaEmulador } from '../../base/env.js';

test('usaEmulador true em localhost/127.0.0.1', () => {
  assert.equal(usaEmulador('localhost'), true);
  assert.equal(usaEmulador('127.0.0.1'), true);
});
test('usaEmulador false em domínio real', () => {
  assert.equal(usaEmulador('meu-crm.web.app'), false);
});
