import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

import { TypeOrmConfigService } from './src/database/typeorm-config.service';
import databaseConfig from './src/database/config/database.config';
import appConfig from './src/config/app.config';
import { ContentCategoryEntity } from './src/content/infrastructure/persistence/relational/entities/content-category.entity';
import { ContentItemEntity } from './src/content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentCategorySeedService } from './src/database/seeds/relational/content/content-category/content-category-seed.service';
import { ContentItemSeedService } from './src/database/seeds/relational/content/content-item/content-item-seed.service';
import { RoleEntity } from './src/roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from './src/statuses/infrastructure/persistence/relational/entities/status.entity';
import { UserEntity } from './src/users/infrastructure/persistence/relational/entities/user.entity';
import { RoleSeedService } from './src/database/seeds/relational/role/role-seed.service';
import { StatusSeedService } from './src/database/seeds/relational/status/status-seed.service';
import { UserSeedService } from './src/database/seeds/relational/user/user-seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env.release'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
    TypeOrmModule.forFeature([
      RoleEntity,
      StatusEntity,
      UserEntity,
      ContentCategoryEntity,
      ContentItemEntity,
    ]),
  ],
  providers: [
    RoleSeedService,
    StatusSeedService,
    UserSeedService,
    ContentCategorySeedService,
    ContentItemSeedService,
  ],
})
class TestModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(TestModule);

  console.log('Running seeds for release environment...');

  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(ContentCategorySeedService).run();
  await app.get(ContentItemSeedService).run();

  console.log('Seeding completed!');

  await app.close();
}

main();