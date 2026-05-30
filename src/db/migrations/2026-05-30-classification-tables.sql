-- =====================================================
-- ZSXQ/PDF Classification Tables Migration
-- Date: 2026-05-30
-- Project: admin-server
-- Purpose: Store parsed document classifications with 6-dimension scoring
-- =====================================================

BEGIN;

-- ============================================================
-- Table: zsxq_classification (ZSXQ帖子分类表)
-- ============================================================
CREATE TABLE IF NOT EXISTS zsxq_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrape_log_id UUID REFERENCES scrape_log(id) ON DELETE CASCADE,
    source_file_key VARCHAR(500) NOT NULL,
    version VARCHAR(50) NOT NULL,
    post_date DATE NOT NULL,
    category_l1 VARCHAR(100) NOT NULL,          -- 一级分类: INDUSTRY/COMPANY/MACRO/NEWS/RESEARCH/TRADING/CONCEPT
    category_l2 VARCHAR(100) NOT NULL,          -- 二级分类: 基于L1递进选择
    summary TEXT,                               -- 摘要（由summary_points join生成）
    title TEXT,
    original_text TEXT NOT NULL,
    author VARCHAR(200),
    group_name VARCHAR(200),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    -- 6维度评分 (0-10)
    source_credibility SMALLINT,
    timeliness_score SMALLINT,
    data_density SMALLINT,
    differentiation_score SMALLINT,
    actionability SMALLINT,
    risk_disclosure SMALLINT,
    -- 综合评分
    confidence_factor DECIMAL(3,2),             -- 置信因子 0.50-1.00
    total_score SMALLINT,                       -- 总分 0-100
    value_rating VARCHAR(10),                    -- 高/中/低/高风险
    -- JSONB字段
    sw_industry_tag JSONB,                      -- 申万行业分类数组，如["电子","计算机"]
    stock_mapping JSONB,                        -- 提及股票，如{"mentioned_stocks":[{"name":"海光信息"}]}
    expectation_gap JSONB,                       -- 周期/定价/催化信息
    summary_points JSONB,                        -- 4个核心要点数组
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_zsxq_version_post_date UNIQUE (version, post_date)
);

-- Indexes for zsxq_classification
CREATE INDEX IF NOT EXISTS idx_zsxq_class_category_l1 ON zsxq_classification(category_l1);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_category_l2 ON zsxq_classification(category_l1, category_l2);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_category_date ON zsxq_classification(category_l1, category_l2, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_version ON zsxq_classification(version);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_value_rating ON zsxq_classification(value_rating);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_total_score ON zsxq_classification(total_score);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_sw_industry ON zsxq_classification USING GIN (sw_industry_tag);
CREATE INDEX IF NOT EXISTS idx_zsxq_class_scrape_log_id ON zsxq_classification(scrape_log_id);

COMMENT ON TABLE zsxq_classification IS '知识星球帖子分类表';
COMMENT ON COLUMN zsxq_classification.category_l1 IS '一级分类: INDUSTRY/COMPANY/MACRO/NEWS/RESEARCH/TRADING/CONCEPT';
COMMENT ON COLUMN zsxq_classification.value_rating IS '价值评级: 高/中/低/高风险';

-- ============================================================
-- Table: pdf_classification (PDF文档分类表)
-- ============================================================
CREATE TABLE IF NOT EXISTS pdf_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrape_log_id UUID REFERENCES scrape_log(id) ON DELETE CASCADE,
    source_file_key VARCHAR(500) NOT NULL,
    version VARCHAR(50) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    page_count INTEGER,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category_l1 VARCHAR(100) NOT NULL,
    category_l2 VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    extracted_text TEXT,
    minio_source_link VARCHAR(1000) NOT NULL,
    -- 6维度评分 (0-10)
    source_credibility SMALLINT,
    timeliness_score SMALLINT,
    data_density SMALLINT,
    differentiation_score SMALLINT,
    actionability SMALLINT,
    risk_disclosure SMALLINT,
    -- 综合评分
    confidence_factor DECIMAL(3,2),
    total_score SMALLINT,
    value_rating VARCHAR(10),
    -- JSONB字段
    stock_mapping JSONB,
    expectation_gap JSONB,
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pdf_classification
CREATE INDEX IF NOT EXISTS idx_pdf_class_category_l1 ON pdf_classification(category_l1);
CREATE INDEX IF NOT EXISTS idx_pdf_class_category_l2 ON pdf_classification(category_l1, category_l2);
CREATE INDEX IF NOT EXISTS idx_pdf_class_category_date ON pdf_classification(category_l1, category_l2, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_class_version ON pdf_classification(version);
CREATE INDEX IF NOT EXISTS idx_pdf_class_value_rating ON pdf_classification(value_rating);
CREATE INDEX IF NOT EXISTS idx_pdf_class_total_score ON pdf_classification(total_score);
CREATE INDEX IF NOT EXISTS idx_pdf_class_scrape_log_id ON pdf_classification(scrape_log_id);

COMMENT ON TABLE pdf_classification IS 'PDF文档分类表';

-- ============================================================
-- Table: source_credibility_profile (来源可信度档案)
-- ============================================================
CREATE TABLE IF NOT EXISTS source_credibility_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,            -- 'zsxq_post' or 'pdf_research'
    total_posts INT DEFAULT 0,
    low_risk_disclosure_count INT DEFAULT 0,   -- risk_disclosure < 3 的数量
    credibility_score DECIMAL(3,2) DEFAULT 1.0,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_source_profile_name_type UNIQUE (source_name, source_type)
);

CREATE INDEX IF NOT EXISTS idx_source_profile_credibility ON source_credibility_profile(credibility_score);

COMMENT ON TABLE source_credibility_profile IS '来源可信度档案';

-- ============================================================
-- Cleanup: Remove deprecated columns (run separately if needed)
-- ============================================================
-- These columns are no longer used by the classification system:
--
-- ALTER TABLE zsxq_classification DROP COLUMN IF EXISTS category_l3;
-- ALTER TABLE zsxq_classification DROP COLUMN IF EXISTS industry_tags;
-- ALTER TABLE pdf_classification DROP COLUMN IF EXISTS category_l3;
-- ALTER TABLE pdf_classification DROP COLUMN IF EXISTS industry_tags;

COMMIT;

-- ============================================================
-- Verification Query (run after migration)
-- ============================================================
-- SELECT COUNT(*) FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('zsxq_classification', 'pdf_classification', 'source_credibility_profile');