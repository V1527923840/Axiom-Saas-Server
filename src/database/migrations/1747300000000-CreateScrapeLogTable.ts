import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScrapeLogTable1747300000000 implements MigrationInterface {
  name = 'CreateScrapeLogTable1747300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE scrape_log (
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
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_scrape_log_source ON scrape_log (source)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_scrape_log_target_time ON scrape_log (targettime)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_scrape_log_status ON scrape_log (status)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_scrape_log_createdat ON scrape_log (createdat)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX public.idx_scrape_log_createdat`);
    await queryRunner.query(`DROP INDEX public.idx_scrape_log_status`);
    await queryRunner.query(`DROP INDEX public.idx_scrape_log_target_time`);
    await queryRunner.query(`DROP INDEX public.idx_scrape_log_source`);
    await queryRunner.query(`DROP TABLE scrape_log`);
  }
}
