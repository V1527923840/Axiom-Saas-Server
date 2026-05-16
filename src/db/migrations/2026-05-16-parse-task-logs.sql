-- =====================================================
-- parse_task_logs 表 - 解析任务日志
-- Date: 2026-05-16
-- =====================================================
CREATE TABLE IF NOT EXISTS parse_task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrape_log_id UUID NOT NULL REFERENCES scrape_log(id) ON DELETE CASCADE,
    extraction_log_id UUID REFERENCES extraction_logs(id) ON DELETE SET NULL,
    source VARCHAR(64) NOT NULL,
    version VARCHAR(128) NOT NULL,
    source_file_key VARCHAR(512) NOT NULL,
    source_filename VARCHAR(256),
    output_json_key VARCHAR(512),
    output_md_key VARCHAR(512),
    status VARCHAR(32) DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    parser VARCHAR(128),
    parse_duration_ms BIGINT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_parse_task_source_version ON parse_task_logs(source, version);
CREATE INDEX IF NOT EXISTS idx_parse_task_status ON parse_task_logs(status);
CREATE INDEX IF NOT EXISTS idx_parse_task_scrape_log_id ON parse_task_logs(scrape_log_id);
CREATE INDEX IF NOT EXISTS idx_parse_task_extraction_log_id ON parse_task_logs(extraction_log_id);
CREATE INDEX IF NOT EXISTS idx_parse_task_created ON parse_task_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_parse_task_metadata ON parse_task_logs USING GIN (metadata);

COMMENT ON TABLE parse_task_logs IS '文档解析任务日志';
COMMENT ON COLUMN parse_task_logs.source IS '来源标识: zsxq/tushare/...';
COMMENT ON COLUMN parse_task_logs.version IS '版本号: 从 osspath 解析';
COMMENT ON COLUMN parse_task_logs.extraction_log_id IS '关联 extraction_logs 表（可选）';

-- =====================================================
-- parse_task_assets 表 - 解析产物资产
-- Date: 2026-05-16
-- =====================================================
CREATE TABLE IF NOT EXISTS parse_task_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parse_task_id UUID NOT NULL REFERENCES parse_task_logs(id) ON DELETE CASCADE,
    asset_type VARCHAR(32) NOT NULL,
    minio_object_key VARCHAR(512) NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parse_task_assets_task_id ON parse_task_assets(parse_task_id);

COMMENT ON TABLE parse_task_assets IS '解析任务产物记录';
COMMENT ON COLUMN parse_task_assets.asset_type IS '产物类型: json | md';

-- =====================================================
-- 扩展 extraction_logs 表（可选，如有需要可取消注释）
-- Date: 2026-05-16
-- =====================================================
-- ALTER TABLE extraction_logs
-- ADD COLUMN IF NOT EXISTS source VARCHAR(50),
-- ADD COLUMN IF NOT EXISTS version VARCHAR(128),
-- ADD COLUMN IF NOT EXISTS parse_task_id UUID REFERENCES parse_task_logs(id);
--
-- CREATE INDEX IF NOT EXISTS idx_extraction_logs_source ON extraction_logs(source);
-- CREATE INDEX IF NOT EXISTS idx_extraction_logs_version ON extraction_logs(version);

-- =====================================================
-- 回滚脚本
-- =====================================================
-- DROP TABLE IF EXISTS parse_task_assets;
-- DROP TABLE IF EXISTS parse_task_logs;
-- ALTER TABLE extraction_logs DROP COLUMN IF EXISTS source;
-- ALTER TABLE extraction_logs DROP COLUMN IF EXISTS version;
-- ALTER TABLE extraction_logs DROP COLUMN IF EXISTS parse_task_id;