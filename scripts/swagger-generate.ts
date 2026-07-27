/**
 * Standalone runner for `npm run swagger:generate`.
 *
 * Boots a fresh NestJS application context, builds the OpenAPI document
 * from the controllers wired into AppModule, writes it to
 * docs/swagger.json, then closes the app. No HTTP server is started.
 *
 * Note: AppModule pulls in TypeOrmModule / MongooseModule, so this
 * script requires database env vars to be configured. The connection
 * is opened during bootstrap and closed by `app.close()` immediately
 * after the spec is written.
 */
import { bootstrapSwagger } from '../src/swagger-bootstrap';

bootstrapSwagger()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(
      '[swagger:generate] Wrote docs/swagger.json (OpenAPI spec).',
    );
    process.exit(0);
  })
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[swagger:generate] Failed:', err);
    process.exit(1);
  });
