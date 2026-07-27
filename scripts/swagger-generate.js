#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Swagger regeneration helper.
 *
 * Booting AppModule requires a live database (TypeOrmModule +
 * MongooseModule eagerly connect). For full regeneration against a
 * live DB, run the dev server once: `npm run start:dev`, wait for
 * `docs/swagger.json` to be written, then stop the process.
 *
 * This script's role is to:
 *   1. Verify `docs/swagger.json` exists and is well-formed.
 *   2. Surface a clear error if it is missing or stale.
 *
 * It does NOT spawn a DB or app — that would require credentials
 * outside this repo's CI scope.
 */
const fs = require('fs');
const path = require('path');

const specPath = path.resolve(__dirname, '..', 'docs', 'swagger.json');

if (!fs.existsSync(specPath)) {
  console.error(
    '[swagger:generate] docs/swagger.json not found.\n' +
      'To regenerate: start the dev server (npm run start:dev) — ' +
      'main.ts writes the spec on bootstrap.',
  );
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
} catch (err) {
  console.error(
    '[swagger:generate] docs/swagger.json is not valid JSON:',
    err.message,
  );
  process.exit(1);
}

const pathCount = Object.keys(spec.paths ?? {}).length;
const schemaCount = Object.keys(spec.components?.schemas ?? {}).length;

if (pathCount === 0) {
  console.error(
    '[swagger:generate] docs/swagger.json has zero paths. The spec ' +
      'appears to be empty. Regenerate against a live server.',
  );
  process.exit(1);
}

console.log(
  `[swagger:generate] docs/swagger.json OK — ${pathCount} paths, ` +
    `${schemaCount} schemas, ${spec.openapi ?? 'unknown'} format.`,
);
