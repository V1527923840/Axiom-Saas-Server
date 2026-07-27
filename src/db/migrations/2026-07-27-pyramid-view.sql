-- =====================================================
-- Pyramid-View Schema Sync
-- Date: 2026-07-27
-- Project: admin-server
-- Purpose: Replace legacy 6-dimension scoring with the
--          "pyramid view" structure (raw_facts ->
--          induction_groups -> base_view -> mid_view ->
--          core_view -> pyramid_judgement) on both
--          zsxq_posts and research_analysis tables.
-- =====================================================
--
-- REVIEW ONLY — already applied to dev DB at 192.168.1.3.
-- The TypeORM migration 1781000003000-AddPyramidViewToZsxqAndResearch.ts
-- carries the canonical idempotent script. This file is kept as a
-- SQL-only reference for DBAs and historical auditing.
--
-- Fresh installs running the existing migrations
--   1781000001000 (creates old zsxq_posts with 6-dim scoring)
--   1781000002000 (adds image_urls)
-- followed by 1781000003000 (this script) will end up with the
-- current dev DB shape.
-- =====================================================

BEGIN;

-- ============================================================
-- Table: zsxq_posts
-- ============================================================
-- Drop legacy social-count + 6-dimension scoring + composite columns
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS like_count;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS comment_count;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS source_credibility;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS timeliness_score;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS data_density;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS differentiation_score;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS actionability;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS risk_disclosure;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS confidence_factor;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS total_score;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS value_rating;
ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS summary_points;

-- Drop indexes tied to the removed columns
DROP INDEX IF EXISTS idx_zsxq_value_rating;
DROP INDEX IF EXISTS idx_zsxq_total_score;

-- Add pyramid-view columns
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS classification_method VARCHAR(20) DEFAULT 'llm';
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS raw_facts JSONB;
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS induction_groups JSONB;
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS base_view JSONB;
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS mid_view JSONB;
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS core_view JSONB;
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS pyramid_judgement JSONB;
ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS pyramid_version VARCHAR(10) DEFAULT 'v2.0';

-- Partial expression index on core_view.deduction_formula
CREATE INDEX IF NOT EXISTS idx_zsxq_pyramid_core_formula
  ON zsxq_posts ((core_view->>'deduction_formula'))
  WHERE core_view IS NOT NULL;

COMMENT ON COLUMN zsxq_posts.classification_method IS '分类方法 (llm / rule / hybrid)';
COMMENT ON COLUMN zsxq_posts.raw_facts IS '金字塔底层 — 原始事实清单';
COMMENT ON COLUMN zsxq_posts.induction_groups IS '金字塔 — 归纳分组';
COMMENT ON COLUMN zsxq_posts.base_view IS '金字塔 — 基础观点';
COMMENT ON COLUMN zsxq_posts.mid_view IS '金字塔 — 中层观点';
COMMENT ON COLUMN zsxq_posts.core_view IS '金字塔 — 核心观点 (含 deduction_formula 字段)';
COMMENT ON COLUMN zsxq_posts.pyramid_judgement IS '金字塔 — 最终研判';
COMMENT ON COLUMN zsxq_posts.pyramid_version IS '金字塔协议版本';

-- ============================================================
-- Table: research_analysis
-- ============================================================
-- Drop legacy scoring + investment + content columns
ALTER TABLE research_analysis DROP COLUMN IF EXISTS summary_points;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS source_credibility;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS timeliness_score;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS data_density;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS differentiation_score;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS actionability;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS risk_disclosure;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS confidence_factor;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS overall_score;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS value_rating;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS recommendation;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS target_price;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS investment_horizon;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS risks_warnings;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS impact_level;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS affected_sectors;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS market_sentiment;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS original_text;
ALTER TABLE research_analysis DROP COLUMN IF EXISTS original_text_raw;

-- Drop indexes tied to the removed columns
DROP INDEX IF EXISTS idx_research_value_rating;
DROP INDEX IF EXISTS idx_research_overall_score;
DROP INDEX IF EXISTS idx_research_impact_level;
DROP INDEX IF EXISTS idx_research_market_sentiment;
DROP INDEX IF EXISTS idx_research_recommendation;

-- Tighten types
ALTER TABLE research_analysis ALTER COLUMN version SET NOT NULL;
ALTER TABLE research_analysis ALTER COLUMN oss_url TYPE TEXT USING oss_url::TEXT;
ALTER TABLE research_analysis ALTER COLUMN local_path TYPE TEXT USING local_path::TEXT;

-- Add pyramid-view columns
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS raw_facts JSONB;
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS induction_groups JSONB;
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS base_view JSONB;
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS mid_view JSONB;
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS core_view JSONB;
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS pyramid_judgement JSONB;
ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS pyramid_version VARCHAR(10) DEFAULT 'v2.0';

COMMENT ON COLUMN research_analysis.raw_facts IS '金字塔底层 — 原始事实清单';
COMMENT ON COLUMN research_analysis.induction_groups IS '金字塔 — 归纳分组';
COMMENT ON COLUMN research_analysis.base_view IS '金字塔 — 基础观点';
COMMENT ON COLUMN research_analysis.mid_view IS '金字塔 — 中层观点';
COMMENT ON COLUMN research_analysis.core_view IS '金字塔 — 核心观点 (含 deduction_formula 字段)';
COMMENT ON COLUMN research_analysis.pyramid_judgement IS '金字塔 — 最终研判';
COMMENT ON COLUMN research_analysis.pyramid_version IS '金字塔协议版本';

COMMIT;

-- =====================================================
-- Verification queries (run manually after applying)
-- =====================================================
-- zsxq_posts:
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'zsxq_posts' ORDER BY ordinal_position;
--
-- research_analysis:
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'research_analysis' ORDER BY ordinal_position;
--
-- Index check:
--   SELECT indexname FROM pg_indexes
--   WHERE tablename IN ('zsxq_posts', 'research_analysis')
--   ORDER BY tablename, indexname;