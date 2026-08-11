import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const synchronize = this.configService.get('database.synchronize', {
      infer: true,
    });
    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true });

    // 生产环境开 synchronize 会让 TypeORM 按 entity 推断 DDL 直接改表。
    // 本仓多张表（zsxq_posts / research_analysis / daily_summary）由
    // Agent 侧拥有，entity 只映射了部分列 —— 一旦 synchronize=true 会
    // DROP 掉未映射的列（含 Agent 侧写入数据），不可逆。宁可启动失败
    // 也不能放行。所有 schema 变更必须走 migration:run。
    if (nodeEnv === 'production' && synchronize === true) {
      throw new Error(
        '[FATAL] DATABASE_SYNCHRONIZE=true is forbidden when NODE_ENV=production. ' +
          'Schema changes must go through migrations (npm run migration:run).',
      );
    }

    return {
      type: this.configService.get('database.type', { infer: true }),
      url: this.configService.get('database.url', { infer: true }),
      host: this.configService.get('database.host', { infer: true }),
      port: this.configService.get('database.port', { infer: true }),
      username: this.configService.get('database.username', { infer: true }),
      password: this.configService.get('database.password', { infer: true }),
      database: this.configService.get('database.name', { infer: true }),
      synchronize,
      dropSchema: false,
      keepConnectionAlive: true,
      logging:
        this.configService.get('app.nodeEnv', { infer: true }) !== 'production',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      cli: {
        entitiesDir: 'src',

        subscribersDir: 'subscriber',
      },
      extra: {
        // based on https://node-postgres.com/apis/pool
        // max connection pool size
        max: this.configService.get('database.maxConnections', { infer: true }),
        ssl: this.configService.get('database.sslEnabled', { infer: true })
          ? {
              rejectUnauthorized: this.configService.get(
                'database.rejectUnauthorized',
                { infer: true },
              ),
              ca:
                this.configService.get('database.ca', { infer: true }) ??
                undefined,
              key:
                this.configService.get('database.key', { infer: true }) ??
                undefined,
              cert:
                this.configService.get('database.cert', { infer: true }) ??
                undefined,
            }
          : undefined,
      },
    } as TypeOrmModuleOptions;
  }
}
