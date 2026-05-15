import { NestFactory } from '@nestjs/core';
import { ScrapeLogSeedService } from './scrape-log-seed.service';
import { ScrapeLogSeedModule } from './scrape-log-seed.module';

const runSeed = async () => {
  const app = await NestFactory.create(ScrapeLogSeedModule);
  await app.get(ScrapeLogSeedService).run();
  await app.close();
};

void runSeed();
