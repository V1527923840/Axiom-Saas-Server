import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MCP 查询放大防护 —— 为模糊搜索建立 trigram 索引。
 *
 * ## 背景
 *
 * MCP 的 `search_intelligence` / `search_research_analysis` 工具用
 * `ILIKE '%keyword%'` 过滤（见 `intelligence.repository.ts` /
 * `research.repository.ts`）。`zsxq_posts.title` 和
 * `research_analysis.document_name` 都是普通 `varchar`/`text` 列：
 *
 * - b-tree 索引**无法**服务 `%keyword%` 这种前导通配符；
 * - `zsxq_posts.title` 上原本**根本没有索引**（只有 `post_date`、
 *   `category_l1` 等有索引），所以每次关键词搜索都是一次全表扫描。
 *
 * 全表扫描意味着：一次廉价的 HTTP 请求 → 一次昂贵的数据库顺序扫描。
 * 这是典型的放大路径，也是限流之外必须消除的成本。
 *
 * ## 方案
 *
 * `pg_trgm` 的 GIN 索引可以服务 `ILIKE '%x%'`（trigram 索引原生支持
 * `LIKE`/`ILIKE`）。建好之后，同样的查询从 Seq Scan 变成 Bitmap Index
 * Scan，成本与命中行数相关，而不是与表大小相关。
 *
 * 迁移里同时**显式建索引**（而不是只依赖 TypeORM 的 `@Index` 装饰器），
 * 因为：
 * - `@Index()` 装饰器只在 `synchronize: true` 时生效，而生产环境禁止
 *   synchronize；
 * - 这两张表数据量可能已经很大，索引创建需要走一次性的迁移流程。
 *
 * ## ⚠️ 执行注意事项
 *
 * - `CREATE INDEX`（非 CONCURRENTLY）会在索引期间持有写锁。
 *   若表很大（十万级以上）且线上有写入，请改成手工执行
 *   `CREATE INDEX CONCURRENTLY`，或安排在低峰期。
 *   本迁移默认使用普通 `CREATE INDEX`，与本项目既有迁移的做法一致
 *   （见 `DropDailySummaryRevisionFields1793000000000` 的说明）。
 * - `pg_trgm` 扩展需要数据库超级用户权限创建。若无权限，迁移会失败，
 *   此时可改为由 DBA 预先 `CREATE EXTENSION pg_trgm`，再重跑本迁移。
 *
 * Idempotent:全部 `IF NOT EXISTS`，在已有索引上重跑安全。
 */
export class AddMcpSearchTrigramIndexes1795000000000 implements MigrationInterface {
  name = 'AddMcpSearchTrigramIndexes1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pg_trgm 是 PostgreSQL 的官方 contrib 扩展，pgcrypto 一样常见。
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // zsxq_posts.title —— 情报精选的标题模糊搜索。
    // ★ 这张表原本没有 title 索引，是最严重的全表扫描来源。
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_posts_title_trgm
        ON public.zsxq_posts
        USING gin (title gin_trgm_ops)
    `);

    // research_analysis.document_name —— 研报名称模糊搜索。
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_research_analysis_document_name_trgm
        ON public.research_analysis
        USING gin (document_name gin_trgm_ops)
    `);

    // stock_mapping 是 jsonb，MCP 的 `company` 过滤对它做 ILike。
    // jsonb 的 GIN（jsonb_path_ops）不能服务文本模糊匹配，
    // 因此这里为它建表达式索引，提取出可能被检索的文本再套 trigram。
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_posts_stock_mapping_trgm
        ON public.zsxq_posts
        USING gin ((stock_mapping::text) gin_trgm_ops)
    `);

    await queryRunner.query(`
      COMMENT ON INDEX public.idx_zsxq_posts_title_trgm IS
        'MCP 模糊搜索支撑索引:让 ILIKE ''%kw%'' 走 GIN 而非全表扫描'
    `);
    await queryRunner.query(`
      COMMENT ON INDEX public.idx_research_analysis_document_name_trgm IS
        'MCP 模糊搜索支撑索引:让 ILIKE ''%kw%'' 走 GIN 而非全表扫描'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS public.idx_zsxq_posts_stock_mapping_trgm`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS public.idx_research_analysis_document_name_trgm`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS public.idx_zsxq_posts_title_trgm`,
    );
    // 注意:不删除 pg_trgm 扩展本身 —— 它可能还被其它对象使用。
  }
}
