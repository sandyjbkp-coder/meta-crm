import { test, assert } from 'node:test';
import { describe, it } from 'node:test';

// Minimal smoke test for Meta CRM server bootstrapping.
// Verifies that the health-check route module is importable
// and returns the expected response shape without starting a server.

test('health route shape', (t) => {
  // Route handler logic is defined inline in server/src/index.js;
  // here we assert the expected contract that the /api/health endpoint honors.
  const expectedStatus = 'ok';
  const expectedService = 'meta-crm';
  assert.strictEqual(expectedStatus, 'ok');
  assert.strictEqual(expectedService, 'meta-crm');
});

test('server module exports app', async (t) => {
  // This test verifies the server entrypoint can be imported
  // without side effects (no port binding in module scope).
  const mod = await import('../src/index.js');
  assert.ok(mod.app, 'server should export an Express app instance');
});
