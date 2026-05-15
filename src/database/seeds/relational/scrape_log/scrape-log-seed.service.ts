import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ScrapeLogSeedService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async run() {
    const sql = `
    CREATE TABLE IF NOT EXISTS scrape_log (
      id uuid NOT NULL DEFAULT uuid_generate_v4(),
      source varchar(50) NOT NULL,
      targettime timestamptz NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending',
      filecount int NOT NULL DEFAULT 0,
      postcount int NOT NULL DEFAULT 0,
      latestposttime timestamptz,
      osspath varchar(500),
      errormessage text,
      startedat timestamptz NOT NULL DEFAULT now(),
      completedat timestamptz,
      createdat timestamptz NOT NULL DEFAULT now(),
      updatedat timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT pk_scrape_log PRIMARY KEY (id)
    );

    CREATE INDEX IF NOT EXISTS idx_scrape_log_source ON scrape_log (source);
    CREATE INDEX IF NOT EXISTS idx_scrape_log_target_time ON scrape_log (targettime);
    CREATE INDEX IF NOT EXISTS idx_scrape_log_status ON scrape_log (status);
    CREATE INDEX IF NOT EXISTS idx_scrape_log_createdat ON scrape_log (createdat);
    `;

    await this.dataSource.query(sql);
  }
}
