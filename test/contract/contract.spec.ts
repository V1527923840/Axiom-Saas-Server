import * as fs from 'fs';
import * as path from 'path';

/**
 * Contract test — guards the OpenAPI document exported by main.ts
 * (`docs/swagger.json`) against the contract the web-side codegen
 * depends on. Reading the exported file directly is sufficient because:
 *
 *   - main.ts exports exactly this file on every bootstrap, and the
 *     web repo consumes exactly this file via openapi-typescript.
 *   - It avoids booting AppModule (no DB / external config required),
 *     making this test hermetic and fast for CI.
 */
describe('OpenAPI contract', () => {
  let spec: Record<string, unknown>;

  beforeAll(() => {
    const specPath = path.resolve(
      __dirname,
      '..',
      '..',
      'docs',
      'swagger.json',
    );
    if (!fs.existsSync(specPath)) {
      throw new Error(
        `OpenAPI document not found at ${specPath}. ` +
          'Run the server once (npm run start:dev) to generate it.',
      );
    }
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as Record<
      string,
      unknown
    >;
  });

  it('should return a valid OpenAPI document', () => {
    expect(spec).toBeDefined();
    expect(typeof spec.openapi).toBe('string');
    expect(spec.openapi).toMatch(/^3\./);
  });

  it('should declare all critical domain schemas', () => {
    const schemas = (spec.components as { schemas: Record<string, unknown> })
      ?.schemas;
    expect(schemas).toBeDefined();
    // Names match what main.ts + the @ApiProperty-decorated entities
    // currently emit. PaymentFlow / Consumption are exposed as their
    // create-DTO counterparts (CreatePaymentFlowDto / CreateConsumptionDto).
    for (const name of [
      'User',
      'Plan',
      'Role',
      'Menu',
      'CreatePaymentFlowDto',
      'CreateConsumptionDto',
    ]) {
      expect(schemas[name]).toBeDefined();
    }
  });

  it('should expose versioned paths under /api/v1', () => {
    const paths = spec.paths as Record<string, unknown>;
    expect(paths).toBeDefined();
    const v1Paths = Object.keys(paths).filter((p) => p.startsWith('/api/v1'));
    expect(v1Paths.length).toBeGreaterThan(0);
  });
});
