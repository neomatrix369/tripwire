import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { isMissingSchemaError, schemaPath } from '../src/ensureSchema.js';

test('schemaPath points at db/schema.sql', () => {
  const path = schemaPath();
  assert.ok(path.endsWith('db/schema.sql'));
  assert.equal(existsSync(path), true);
});

test('isMissingSchemaError detects PostgREST missing-table shapes', () => {
  assert.equal(isMissingSchemaError({ code: 'PGRST205', message: 'nope' }), true);
  assert.equal(
    isMissingSchemaError({ message: 'Could not find the table \'public.items\' in the schema cache' }),
    true
  );
  assert.equal(isMissingSchemaError({ message: 'relation "items" does not exist' }), true);
  assert.equal(isMissingSchemaError({ message: 'JWT expired' }), false);
  assert.equal(isMissingSchemaError(null), false);
});
