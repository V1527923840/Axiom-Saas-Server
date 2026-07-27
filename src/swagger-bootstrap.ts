import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Boots the NestJS application, builds the OpenAPI document, and writes
 * it to docs/swagger.json. Then closes the app — does not call listen().
 *
 * Used by `npm run swagger:generate`. Extracted from src/main.ts so the
 * spec can be regenerated in CI without binding to a port (and without
 * depending on the actual HTTP server).
 */
export async function bootstrapSwagger(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn'],
  });
  try {
    const options = new DocumentBuilder()
      .setTitle('API')
      .setDescription('API docs')
      .setVersion('1.0')
      .addBearerAuth()
      .addGlobalParameters({
        in: 'header',
        required: false,
        name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
        schema: { example: 'en' },
      })
      .build();

    const document = SwaggerModule.createDocument(app, options);

    const outDir = path.resolve(process.cwd(), 'docs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'swagger.json'),
      JSON.stringify(document, null, 2),
    );

    if (
      !document ||
      typeof document !== 'object' ||
      Object.keys(document.paths ?? {}).length === 0
    ) {
      throw new Error(
        'Generated OpenAPI document has no paths. ' +
          'Check that controllers are wired into AppModule.',
      );
    }
  } finally {
    await app.close();
  }
}
