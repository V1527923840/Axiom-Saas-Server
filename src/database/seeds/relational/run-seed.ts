import { NestFactory } from '@nestjs/core';
import { ContentCategorySeedService } from './content/content-category/content-category-seed.service';
import { ContentItemSeedService } from './content/content-item/content-item-seed.service';
import { MenuSeedService } from './menu/menu-seed.service';
import { RoleSeedService } from './role/role-seed.service';
import { SeedModule } from './seed.module';
import { StatusSeedService } from './status/status-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { ScrapeLogSeedService } from './scrape_log/scrape-log-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // run
  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(ContentCategorySeedService).run();
  await app.get(ContentItemSeedService).run();
  await app.get(MenuSeedService).run();
  await app.get(ScrapeLogSeedService).run();

  await app.close();
};

void runSeed();
