import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align DB `menu.icon` values with the expanded Lucide iconMap in
 * Axiom-Saas-Web/src/components/app-sidebar.tsx.
 *
 * Background: the previous sidebar iconMap only knew 9 icon names
 * (LayoutDashboard, Shield, Settings, Users, CreditCard, FileText,
 * Wallet, Menu, Atom). Every other icon stored in `menu.icon` silently
 * fell back to the generic `Menu` icon — making the sidebar visually
 * identical across very different menus. The migration brings DB icons
 * into the set the frontend can actually render, and tightens a few
 * icon-to-name semantic matches.
 *
 * Each UPDATE is guarded with `icon = '<expected_old>'` so:
 *   - re-running the migration is a no-op;
 *   - operators who have manually set a different icon keep their
 *     choice (operator wins).
 *
 * Mapping (old → new, with rationale):
 *   daily-news           FileText   → Newspaper      (每日消息 = 报纸)
 *   audio-interpretation FileText   → Headphones     (音频 = 耳机)
 *   institution-reports  FileText   → BookOpenText   (研报 = 翻开的书)
 *   oss-browser          Folder     → FolderOpen     (文件管理 = 打开的文件夹)
 *   subscriptions        Shield     → BadgeCheck     (订阅 = 已验证徽章)
 *   roles                Shield     → ShieldCheck    (角色 = 带勾的盾)
 *   settings             Settings   → Wrench         (设置 = 扳手)
 *
 * Icons that were already correct (MessageSquare for sentiment-posts,
 * Database for etl, Tag for categories, Bot for scrape-logs /
 * vibe-trading, FileJson for parse-tasks, Layers for versions, Star
 * for intelligence, ArrowLeftRight for flows, Receipt for
 * consumptions) are not touched here — they only needed the frontend
 * iconMap to learn them, which the matching app-sidebar change does.
 */
export class UpdateMenuIcons1790400000000 implements MigrationInterface {
  name = 'UpdateMenuIcons1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE menu SET icon = 'Newspaper'    WHERE code = 'daily-news'           AND icon = 'FileText'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'Headphones'   WHERE code = 'audio-interpretation' AND icon = 'FileText'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'BookOpenText' WHERE code = 'institution-reports'  AND icon = 'FileText'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'FolderOpen'   WHERE code = 'oss-browser'          AND icon = 'Folder'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'BadgeCheck'   WHERE code = 'subscriptions'        AND icon = 'Shield'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'ShieldCheck'  WHERE code = 'roles'                AND icon = 'Shield'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'Wrench'       WHERE code = 'settings'             AND icon = 'Settings'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE menu SET icon = 'FileText'     WHERE code = 'daily-news'           AND icon = 'Newspaper'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'FileText'     WHERE code = 'audio-interpretation' AND icon = 'Headphones'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'FileText'     WHERE code = 'institution-reports'  AND icon = 'BookOpenText'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'Folder'       WHERE code = 'oss-browser'          AND icon = 'FolderOpen'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'Shield'       WHERE code = 'subscriptions'        AND icon = 'BadgeCheck'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'Shield'       WHERE code = 'roles'                AND icon = 'ShieldCheck'`,
    );
    await queryRunner.query(
      `UPDATE menu SET icon = 'Settings'     WHERE code = 'settings'             AND icon = 'Wrench'`,
    );
  }
}