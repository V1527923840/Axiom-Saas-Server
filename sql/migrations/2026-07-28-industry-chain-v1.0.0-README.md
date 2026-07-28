# 产业链模块 v1.0.0 — 远端部署指南

**Tag:** `industry-chain-v1.0.0` (在 Axiom-Saas-Server 和 Axiom-Saas-Web 两个仓库都打了)
**Spec:** `docs/superpowers/specs/2026-07-28-industry-chain-module-design.md`
**Plan:** `docs/superpowers/plans/2026-07-28-industry-chain-module.md`

## 部署步骤

### 1. 拉取代码

```bash
# 后端
cd Axiom-Saas-Server
git fetch --tags
git checkout industry-chain-v1.0.0
pnpm install
pnpm build

# 前端
cd ../Axiom-Saas-Web
git fetch --tags
git checkout industry-chain-v1.0.0
pnpm install
pnpm build
```

### 2. 应用数据库迁移（菜单 + 权限）

```bash
cd Axiom-Saas-Server
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p 5432 -U $DB_USER -d $DB_NAME \
  -v ON_ERROR_STOP=1 \
  -f sql/migrations/2026-07-28-industry-chain-v1.0.0.sql
```

`v ON_ERROR_STOP=1` 很重要：任一语句失败立刻中止（避免菜单插了但 role_menu 漏了的不一致状态）。

### 3. 重启服务

```bash
# 后端
pm2 restart axiom-server  # 或你的部署命令

# 前端（如果有 SSR / SSR 缓存）
pm2 restart axiom-web
```

### 4. 验证

- 浏览器打开 `https://your-domain/content/industry-chains`
- Admin 登录后，左侧"内容管理"下应出现"产业链"菜单（Factory 图标）
- 点击后能看到 4 个申万一级行业，展开能看到 5 个二级 → 8 个 chain → 8 个 version
- 点击 version 行的"查看"按钮 → 弹窗显示对应 Markdown

## 数据说明

模块的"骨架数据"只有菜单 + 权限（上面的 SQL）。

8 条 `industry_chain_qiniu_registry` 记录是**内容数据**（实际的产业链 MD 文档元数据），由内容生产流水线写入。本脚本不包含这些内容数据的迁移；如有需要可从开发库导出或重新跑内容生产。

## 卸载

```sql
-- 回滚 SQL（谨慎使用）
DELETE FROM role_menu WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'industry-chains');
DELETE FROM menu WHERE code = 'industry-chains';
```

回滚后还需在两仓库 `git checkout main` 切回主分支。
