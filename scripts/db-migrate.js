#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Pyramid-view DB migration: local 192.168.1.3 (source) -> remote 106.13.219.178 (target).
 *
 * Steps:
 *   1. SCHEMA SYNC
 *      Apply the same ALTERs as migration 1781000003000 to the target DB
 *      (idempotent — every statement uses IF EXISTS / IF NOT EXISTS).
 *      Drops legacy 6-dimension scoring columns and adds the pyramid-view
 *      columns + the partial expression index on core_view->>'deduction_formula'.
 *
 *   2. DATA SYNC
 *      For each row in the SOURCE zsxq_posts and research_analysis tables,
 *      upsert the pyramid-view columns onto the target table by primary
 *      key. Rows present on target but not on source are LEFT ALONE
 *      (no destructive overwrite). Rows present on both have their new
 *      columns overwritten with source values.
 *
 * Modes:
 *   --dry-run       Run schema sync but skip data sync. Print planned
 *                    operations without executing them.
 *   --skip-schema   Skip schema sync, do data sync only. Use when schema
 *                    is already aligned (idempotent migrations have run).
 *   --skip-data     Skip data sync, do schema sync only.
 *   --batch=N       Override upsert batch size (default 500).
 *
 * Usage:
 *   node scripts/db-migrate.js --dry-run
 *   node scripts/db-migrate.js
 *   node scripts/db-migrate.js --skip-schema
 *
 * Reads connection params from CLI flags or .env.dev:
 *   --src-host / --src-port / --src-user / --src-pass / --src-db
 *   --dst-host / --dst-port / --dst-user / --dst-pass / --dst-db
 *   (defaults: src = 192.168.1.3, dst = 106.13.219.178)
 *
 * Safety:
 *   - Source is NEVER mutated.
 *   - Target's legacy (old) columns are not overwritten.
 *   - All DROP / ADD DDL is idempotent (IF EXISTS / IF NOT EXISTS).
 *   - Every batch is a single transaction; failure rolls back the batch.
 *   - Final summary prints row counts before/after and any errors.
 *
 * The script intentionally does NOT use TypeORM or AppModule to keep
 * the blast radius small (no app boot, no module graph, no config side
 * effects).
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ---------- CLI args ----------

function parseArgs(argv) {
  const args = {
    dryRun: false,
    skipSchema: false,
    skipData: false,
    batch: 500,
    src: {},
    dst: {},
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--skip-schema") args.skipSchema = true;
    else if (a === "--skip-data") args.skipData = true;
    else if (a.startsWith("--batch=")) args.batch = Number(a.slice(8));
    else if (a.startsWith("--src-")) args.src[a.slice(6)] = argv[++i];
    else if (a.startsWith("--dst-")) args.dst[a.slice(6)] = argv[++i];
  }
  return args;
}

function loadEnvDefaults() {
  const envPath = path.resolve(__dirname, "..", ".env.dev");
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, "utf8");
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return map;
}

function buildConn(overrides, env, role) {
  // role: 'src' or 'dst'
  const defaults = {
    host: role === "src" ? "192.168.1.3" : "106.13.219.178",
    port: 5432,
    user: env.DATABASE_USERNAME || "postgrest_root",
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME || "axiom_dev",
  };
  return {
    host: overrides.host || defaults.host,
    port: Number(overrides.port || defaults.port),
    user: overrides.user || defaults.user,
    password: overrides.pass || overrides.password || defaults.password,
    database: overrides.db || overrides.database || defaults.database,
    ssl: false,
    connectionTimeoutMillis: 15000,
    statement_timeout: 60000,
  };
}

// ---------- Schema sync ----------

const SCHEMA_STATEMENTS = [
  // zsxq_posts — drop legacy columns
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS like_count`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS comment_count`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS source_credibility`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS timeliness_score`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS data_density`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS differentiation_score`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS actionability`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS risk_disclosure`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS confidence_factor`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS total_score`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS value_rating`,
  `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS summary_points`,

  // zsxq_posts — drop legacy indexes
  `DROP INDEX IF EXISTS idx_zsxq_value_rating`,
  `DROP INDEX IF EXISTS idx_zsxq_total_score`,

  // zsxq_posts — add pyramid columns
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS classification_method VARCHAR(20) DEFAULT 'llm'`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS raw_facts JSONB`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS induction_groups JSONB`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS base_view JSONB`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS mid_view JSONB`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS core_view JSONB`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS pyramid_judgement JSONB`,
  `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS pyramid_version VARCHAR(10) DEFAULT 'v2.0'`,

  // zsxq_posts — partial expression index
  `CREATE INDEX IF NOT EXISTS idx_zsxq_pyramid_core_formula ON zsxq_posts ((core_view->>'deduction_formula')) WHERE core_view IS NOT NULL`,

  // research_analysis — drop legacy columns
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS summary_points`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS source_credibility`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS timeliness_score`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS data_density`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS differentiation_score`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS actionability`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS risk_disclosure`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS confidence_factor`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS overall_score`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS value_rating`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS recommendation`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS target_price`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS investment_horizon`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS risks_warnings`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS impact_level`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS affected_sectors`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS market_sentiment`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS original_text`,
  `ALTER TABLE research_analysis DROP COLUMN IF EXISTS original_text_raw`,

  // research_analysis — drop legacy indexes
  `DROP INDEX IF EXISTS idx_research_value_rating`,
  `DROP INDEX IF EXISTS idx_research_overall_score`,
  `DROP INDEX IF EXISTS idx_research_impact_level`,
  `DROP INDEX IF EXISTS idx_research_market_sentiment`,
  `DROP INDEX IF EXISTS idx_research_recommendation`,

  // research_analysis — type tightenings
  `ALTER TABLE research_analysis ALTER COLUMN version SET NOT NULL`,
  `ALTER TABLE research_analysis ALTER COLUMN oss_url TYPE TEXT USING oss_url::TEXT`,
  `ALTER TABLE research_analysis ALTER COLUMN local_path TYPE TEXT USING local_path::TEXT`,

  // research_analysis — add pyramid columns
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS raw_facts JSONB`,
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS induction_groups JSONB`,
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS base_view JSONB`,
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS mid_view JSONB`,
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS core_view JSONB`,
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS pyramid_judgement JSONB`,
  `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS pyramid_version VARCHAR(10) DEFAULT 'v2.0'`,
];

// ---------- Data sync ----------
//
// For each row in SOURCE, upsert the pyramid-view columns onto TARGET
// by primary key. We use a row-level upsert (UPDATE ... WHERE pk = $1)
// rather than COPY, because TARGET may already have rows we don't want
// to clobber.
//
// Upsert columns per table:
const ZSXQ_PYRAMID_COLS = [
  "classification_method",
  "raw_facts",
  "induction_groups",
  "base_view",
  "mid_view",
  "core_view",
  "pyramid_judgement",
  "pyramid_version",
];

const RESEARCH_PYRAMID_COLS = [
  "raw_facts",
  "induction_groups",
  "base_view",
  "mid_view",
  "core_view",
  "pyramid_judgement",
  "pyramid_version",
];

const ZSXQ_NON_PYRAMID_COLS = [
  "id",
  "scrape_log_id",
  "source_file_key",
  "version",
  "post_date",
  "category_l1",
  "category_l2",
  "summary",
  "title",
  "original_text",
  "original_text_raw",
  "image_urls",
  "author",
  "group_name",
  "sw_industry_tag",
  "stock_mapping",
  "expectation_gap",
  "created_at",
  "updated_at",
];

const RESEARCH_NON_PYRAMID_COLS = [
  "id",
  "version",
  "document_name",
  "doc_type",
  "source_file_key",
  "oss_url",
  "local_path",
  "scrape_log_id",
  "analyzed_at",
  "category_l1",
  "category_l2",
  "sw_industry_tag",
  "mentioned_stocks",
  "key_thesis",
  "analysis_version",
  "created_at",
  "updated_at",
];

// ---------- Helpers ----------

async function connect(connStr, label) {
  const client = new Client(connStr);
  await client.connect();
  console.log(`[connect] ${label} -> ${connStr.host}:${connStr.port}/${connStr.database} OK`);
  return client;
}

async function ping(client, label) {
  const r = await client.query("SELECT version() AS v, now() AS t");
  console.log(`[ping] ${label} ${r.rows[0].v.split(",")[0]} (server time ${r.rows[0].t.toISOString()})`);
}

async function countRows(client, table) {
  const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return r.rows[0].n;
}

async function tableHasColumn(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`,
    [table, column],
  );
  return r.rows.length > 0;
}

async function applySchema(client, dryRun) {
  console.log(`\n[schema] applying ${SCHEMA_STATEMENTS.length} statements (dryRun=${dryRun})`);
  let applied = 0;
  let skipped = 0;
  for (const sql of SCHEMA_STATEMENTS) {
    const head = sql.replace(/\s+/g, " ").slice(0, 80);
    try {
      if (dryRun) {
        console.log(`  [dry-run] ${head}...`);
        skipped++; // don't actually run
      } else {
        await client.query(sql);
        console.log(`  [ok]     ${head}...`);
        applied++;
      }
    } catch (e) {
      console.error(`  [FAIL]   ${head}...`);
      console.error(`           ${e.message}`);
      throw e;
    }
  }
  console.log(`[schema] ${dryRun ? "would apply" : "applied"} ${applied + skipped} statements (${applied} executed, ${skipped} skipped dry-run)`);
}

async function streamTable(client, table, columns, batchSize, onBatch) {
  // Stream rows in batches via simple LIMIT/OFFSET loop. For our row counts
  // (< 10k) this is fine; for larger tables, switch to a server-side cursor.
  const total = await countRows(client, table);
  console.log(`\n[data:${table}] total source rows = ${total}, batch=${batchSize}`);
  let offset = 0;
  let processed = 0;
  while (offset < total) {
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const r = await client.query(
      `SELECT ${colList} FROM ${table} ORDER BY 1 LIMIT $1 OFFSET $2`,
      [batchSize, offset],
    );
    if (r.rows.length === 0) break;
    await onBatch(r.rows);
    processed += r.rows.length;
    offset += batchSize;
    process.stdout.write(`\r[data:${table}] processed ${processed}/${total}`);
  }
  process.stdout.write("\n");
  return processed;
}

async function upsertRow(client, table, pkCol, allCols, row, dryRun) {
  // row is keyed by column name. Build parameterized UPDATE.
  const setClauses = [];
  const params = [];
  let p = 1;
  for (const col of allCols) {
    if (col === pkCol) continue;
    setClauses.push(`"${col}" = $${p}`);
    params.push(row[col]);
    p++;
  }
  params.push(row[pkCol]);
  const sql = `UPDATE ${table} SET ${setClauses.join(", ")} WHERE "${pkCol}" = $${p}`;
  if (dryRun) {
    return; // skip
  }
  await client.query(sql);
}

async function syncTable(opts) {
  const { srcClient, dstClient, table, pkCol, allCols, batch, dryRun } = opts;
  // First: how many source rows have at least one pyramid column populated?
  const r = await srcClient.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE id IS NOT NULL`,
  );
  const total = r.rows[0].n;
  console.log(`\n[data:${table}] ${total} source rows to sync (dryRun=${dryRun})`);

  let updated = 0;
  let skipped = 0;
  await streamTable(srcClient, table, allCols, batch, async (rows) => {
    if (!dryRun) await dstClient.query("BEGIN");
    try {
      for (const row of rows) {
        // Existence check on target: skip if pk missing on destination
        const exists = await dstClient.query(
          `SELECT 1 FROM ${table} WHERE "${pkCol}" = $1 LIMIT 1`,
          [row[pkCol]],
        );
        if (exists.rows.length === 0) {
          skipped++;
          continue;
        }
        await upsertRow(dstClient, table, pkCol, allCols, row, dryRun);
        updated++;
      }
      if (!dryRun) await dstClient.query("COMMIT");
    } catch (e) {
      if (!dryRun) await dstClient.query("ROLLBACK");
      throw e;
    }
  });

  console.log(`[data:${table}] done — ${updated} updated, ${skipped} skipped (pk missing on target), ${total} total`);
  return { updated, skipped, total };
}

// ---------- Main ----------

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnvDefaults();

  const srcConn = buildConn(args.src, env, "src");
  const dstConn = buildConn(args.dst, env, "dst");

  console.log("[config]");
  console.log(`  source: ${srcConn.host}:${srcConn.port}/${srcConn.database}`);
  console.log(`  target: ${dstConn.host}:${dstConn.port}/${dstConn.database}`);
  console.log(`  dry-run: ${args.dryRun}`);
  console.log(`  skip-schema: ${args.skipSchema}`);
  console.log(`  skip-data: ${args.skipData}`);
  console.log(`  batch: ${args.batch}`);

  // Sanity: source != target
  if (srcConn.host === dstConn.host && srcConn.database === dstConn.database) {
    console.error("[abort] source and target point to the same database");
    process.exit(2);
  }

  const src = await connect(srcConn, "SRC");
  const dst = await connect(dstConn, "DST");
  try {
    await ping(src, "SRC");
    await ping(dst, "DST");

    const beforeSrcZ = await countRows(src, "zsxq_posts");
    const beforeDstZ = await countRows(dst, "zsxq_posts");
    const beforeSrcR = await countRows(src, "research_analysis");
    const beforeDstR = await countRows(dst, "research_analysis");

    console.log(`\n[counts] before`);
    console.log(`  zsxq_posts         src=${beforeSrcZ}  dst=${beforeDstZ}`);
    console.log(`  research_analysis  src=${beforeSrcR}  dst=${beforeDstR}`);

    // ---- Schema sync ----
    if (!args.skipSchema) {
      await applySchema(dst, args.dryRun);
    } else {
      console.log("\n[schema] skipped");
    }

    // ---- Data sync ----
    let summary = null;
    if (!args.skipData) {
      // Defensive: verify pyramid columns exist on target after schema sync
      const needCheck = [...ZSXQ_PYRAMID_COLS, ...RESEARCH_PYRAMID_COLS];
      for (const col of needCheck) {
        const tbl = ZSXQ_PYRAMID_COLS.includes(col) ? "zsxq_posts" : "research_analysis";
        const ok = await tableHasColumn(dst, tbl, col);
        if (!ok && !args.dryRun) {
          throw new Error(`target ${tbl} missing pyramid column ${col} after schema sync`);
        }
      }

      const zsxqAll = [...ZSXQ_NON_PYRAMID_COLS, ...ZSXQ_PYRAMID_COLS];
      const researchAll = [...RESEARCH_NON_PYRAMID_COLS, ...RESEARCH_PYRAMID_COLS];

      console.log(`\n[data] syncing zsxq_posts (${zsxqAll.length} cols)`);
      const zRes = await syncTable({
        srcClient: src,
        dstClient: dst,
        table: "zsxq_posts",
        pkCol: "id",
        allCols: zsxqAll,
        batch: args.batch,
        dryRun: args.dryRun,
      });

      console.log(`\n[data] syncing research_analysis (${researchAll.length} cols)`);
      const rRes = await syncTable({
        srcClient: src,
        dstClient: dst,
        table: "research_analysis",
        pkCol: "id",
        allCols: researchAll,
        batch: args.batch,
        dryRun: args.dryRun,
      });

      summary = { zsxq_posts: zRes, research_analysis: rRes };
    }

    // ---- Final counts ----
    if (!args.dryRun) {
      const afterDstZ = await countRows(dst, "zsxq_posts");
      const afterDstR = await countRows(dst, "research_analysis");
      console.log(`\n[counts] after`);
      console.log(`  zsxq_posts         dst=${afterDstZ} (was ${beforeDstZ})`);
      console.log(`  research_analysis  dst=${afterDstR} (was ${beforeDstR})`);
    }

    console.log(`\n[done] ${args.dryRun ? "DRY RUN — no changes made" : "migration complete"}`);
    if (summary) {
      console.log(`  zsxq_posts:        ${summary.zsxq_posts.updated}/${summary.zsxq_posts.total} updated`);
      console.log(`  research_analysis: ${summary.research_analysis.updated}/${summary.research_analysis.total} updated`);
    }
  } finally {
    await src.end().catch(() => {});
    await dst.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(`\n[FATAL] ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});