-- Scrape Log Table Initialization Script
-- Database: axiom_dev (PostgreSQL)
-- Run with: psql -U postgrest_root -d axiom_dev -f init_scrape_log.sql

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

COMMENT ON TABLE scrape_log IS 'Web scraper execution log table';
COMMENT ON COLUMN scrape_log.source IS 'Data source type (e.g., zsxq)';
COMMENT ON COLUMN scrape_log.targettime IS 'Target scraping time range';
COMMENT ON COLUMN scrape_log.status IS 'Execution status: pending, running, success, failed';
COMMENT ON COLUMN scrape_log.filecount IS 'Number of files downloaded';
COMMENT ON COLUMN scrape_log.postcount IS 'Number of posts scraped';
COMMENT ON COLUMN scrape_log.latestposttime IS 'Timestamp of the latest post retrieved';
COMMENT ON COLUMN scrape_log.osspath IS 'OSS storage path after upload';
COMMENT ON COLUMN scrape_log.errormessage IS 'Error message if failed';
COMMENT ON COLUMN scrape_log.startedat IS 'Execution start time';
COMMENT ON COLUMN scrape_log.completedat IS 'Execution completion time';