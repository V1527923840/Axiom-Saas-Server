// src/database/typeorm-config.service.spec.ts
//
// Verifies Part 4.2 of the cleanup plan:
// - production + synchronize=true throws
// - production + synchronize=false returns options
// - development + synchronize=true returns options (no throw)
import { ConfigService } from '@nestjs/config';
import { TypeOrmConfigService } from './typeorm-config.service';

function buildConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('TypeOrmConfigService', () => {
  const baseConfig = {
    'database.type': 'postgres',
    'database.host': 'localhost',
    'database.port': 5432,
    'database.username': 'u',
    'database.password': 'p',
    'database.name': 'd',
    'database.maxConnections': 10,
    'database.sslEnabled': false,
    'app.nodeEnv': 'production',
  };

  it('should throw when synchronize=true in production', () => {
    const service = new TypeOrmConfigService(
      buildConfig({
        ...baseConfig,
        'database.synchronize': true,
      }) as ConfigService,
    );
    expect(() => service.createTypeOrmOptions()).toThrow(
      /DATABASE_SYNCHRONIZE=true is forbidden/,
    );
  });

  it('should return options when synchronize=false in production', () => {
    const service = new TypeOrmConfigService(
      buildConfig({
        ...baseConfig,
        'database.synchronize': false,
      }) as ConfigService,
    );
    const opts = service.createTypeOrmOptions();
    expect(opts.synchronize).toBe(false);
  });

  it('should NOT throw when synchronize=true in development', () => {
    const service = new TypeOrmConfigService(
      buildConfig({
        ...baseConfig,
        'app.nodeEnv': 'development',
        'database.synchronize': true,
      }) as ConfigService,
    );
    const opts = service.createTypeOrmOptions();
    expect(opts.synchronize).toBe(true);
  });
});
