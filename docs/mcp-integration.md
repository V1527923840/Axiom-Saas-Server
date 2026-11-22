# MCP 接入指南（WorkBuddy / CodeBuddy）

本项目提供 MCP（Model Context Protocol）端点，把「情报精选」和「机构研报」两类数据暴露为 MCP 工具，供 WorkBuddy / CodeBuddy 等 MCP 客户端调用。

## 端点

| 项目 | 值 |
|------|-----|
| 外部路径 | `POST {BACKEND_DOMAIN}/api_group/api/v1/mcp` |
| 后端路径 | `POST /api/v1/mcp` |
| 协议 | MCP Streamable HTTP（JSON-RPC 2.0） |
| 传输类型 | WorkBuddy 配置中的 `"type": "http"` |
| 状态 | 无状态（stateless）——每次请求独立，不签发 session id |

> **注意 `/api_group/` 前缀。** 线上 Nginx 是
> `location /api_group/ { proxy_pass http://api/; }`，末尾的斜杠会让
> Nginx **剥离** `/api_group/` 前缀再转发。所以：
>
> | 外部请求 | Nginx 转发给后端 | 后端路由 |
> |---------|----------------|---------|
> | `/api_group/api/v1/mcp` | `/api/v1/mcp` | ✅ 命中 |
> | `/api/v1/mcp` | — | ❌ 不经过 `/api_group/`，不会被转发 |
>
> **WorkBuddy 配置里必须带 `/api_group/` 前缀**，否则请求根本到不了后端。

`GET` 该路径返回 `405 Method Not Allowed`：本服务端不推送主动消息，无需 SSE 通道。

## 开关

`MCP_ENABLED` **默认为关闭**。必须显式设置 `MCP_ENABLED=true` 才会启用端点：

```bash
MCP_ENABLED=true
```

关闭时（默认值）端点返回 JSON-RPC 错误 `MCP endpoint is disabled`，不会静默消失——这样排查时能立刻区分「没开」和「路径写错」。

> **为什么默认关闭**：升级后端不应该意外把一个新的对外端点暴露出去。
> 先确认前端既有接口一切正常，再显式开启 MCP。

## 工具清单

| 工具 | 说明 | 参数 |
|------|------|------|
| `search_intelligence` | 搜索情报精选，列出相关文章 | `keyword`、`company`、`categoryL1`、`categoryL2`、`dateFrom`、`dateTo`、`page`、`pageSize` |
| `get_intelligence_detail` | 查看单篇情报详情，含金字塔观点与原文 | `id`(UUID)、`includeOriginalText`(默认 true) |
| `search_research_analysis` | 搜索机构研报 | `keyword`、`categoryL1`、`categoryL2`、`dateFrom`、`dateTo`、`page`、`pageSize` |
| `get_research_analysis_detail` | 查看单份研报详情，含金字塔观点与原文地址 | `id`(数字) |

### 金字塔观点结构

详情工具返回 `pyramid` 字段，包含完整的金字塔分层：

```json
{
  "pyramid": {
    "rawFacts": { "...": "原始事实" },
    "inductionGroups": { "...": "归纳分组" },
    "baseView": { "...": "基础层观点" },
    "midView": { "...": "中层观点" },
    "coreView": { "...": "核心观点" },
    "pyramidJudgement": { "...": "金字塔判断" },
    "pyramidVersion": "v2.0"
  }
}
```

列表工具只返回 `coreView`（核心观点）摘要，不返回原文——避免单次响应塞满模型上下文。需要正文时再调用详情工具。

## 鉴权

支持两种凭证，按顺序校验：

1. **静态 API Key**（MCP 客户端推荐）
   - `X-MCP-Api-Key: <key>` 或 `Authorization: Bearer <key>`
2. **JWT**（前端已有登录态时使用）
   - `Authorization: Bearer <登录返回的 access token>`

静态 API Key 对应的是服务账号，**不经过** `MenuAccessGuard` 的菜单权限校验，只受 `MCP_API_KEY` 本身保护。因此该 Key 应视为只读凭证，妥善保管。

### 多 Key 与单独吊销

`MCP_API_KEY` 支持**逗号分隔的多个 key**：

```bash
MCP_API_KEY=key_for_team_a,key_for_team_b,key_for_team_c
```

每个 key 是**独立凭证**，拥有：

- 独立的限流令牌桶（一个用满不影响其他人）
- 独立的审计记录（能定位到具体是谁在调用）
- 独立的吊销能力（从列表里删掉这个 key 即可，其他人不受影响）

> **多人共用时务必一人一个 key。** 所有人共用同一个 key 的话：
> 一旦该 key 泄露，你无法定位是谁泄露的；
> 也无法只吊销掉肇事者而不影响其他人；
> 而且一个人跑满限流额度会连累所有人。

吊销一个 key：把 `MCP_API_KEY` 改成去掉该 key 的新列表，然后重启服务。

---

## 滥用与 DDoS 防护

多人共用端点时，防护分四层。

### 第 1 层：按调用方隔离的限流（令牌桶）

每个 key 独立的令牌桶，默认 **5 rps、突发 10 次**。超限的调用被拒绝，并返回给模型一条可读提示（`isError`），让客户端退避重试而不是立刻重试形成风暴。

核心保证：**一个恶意调用方无法消耗其他人的配额**。

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `MCP_RATE_LIMIT_RPS` | `5` | 每个凭证的持续速率 |
| `MCP_RATE_LIMIT_BURST` | `10` | 突发容量（连续快速调用的上限） |

### 第 2 层：全局并发上限

默认 `MCP_MAX_CONCURRENCY=8`。即使某调用方速率合规，也可以并发发起大量请求，占满 TypeORM 连接池（`DATABASE_MAX_CONNECTIONS=100`）。这个上限约束的是**同时在飞的查询数**。

### 第 3 层：查询放大防护

这是最容易被忽视、但影响最大的一层。

`search_intelligence` 的关键词过滤底层是 `ILIKE '%keyword%'`。在 `zsxq_posts.title` 上：

- b-tree 索引**无法**服务前导通配符；
- `title` 列原本**根本没有索引**；
- 因此每次关键词搜索都是一次**全表扫描**。

这意味着「一次廉价 HTTP 请求 → 一次昂贵数据库顺序扫描」，是典型的放大路径。防护手段：

1. **限流**（第 1、2 层）——降低扫描频率
2. **`MCP_MAX_FILTER_LENGTH=100`**——限制过滤串长度
3. **trigram 索引**（迁移 `1795000000000`）——根治单次扫描成本

`pg_trgm` 的 GIN 索引原生支持 `ILIKE '%x%'`，建好后同样的查询从 Seq Scan 变成 Bitmap Index Scan，成本与命中行数相关而非与表大小相关。**这是最重要的一层**。

### 第 4 层：审计日志

每次工具调用都记录：调用方指纹、工具名、耗时、结果状态、实际生效的过滤条件。

日志形如：

```
[mcp] key:9f2c1a4b7e8d0356 search_intelligence ok 12ms args={"keyword":"算力","page":1}
[mcp] key:9f2c1a4b7e8d0356 search_intelligence rate_limited 0ms
```

调用方标识是 key 的 SHA-256 前 16 位**指纹**，不是原始 key——凭证本身不会进日志。

### 请求体大小

`main.ts` 显式设置 `app.useBodyParser('json', { limit: '100kb' })`。MCP 的 JSON-RPC 消息正常只有几百字节，100KB 绰绰有余；而没有上限时，超大 body 会在进入业务逻辑前吃掉大量内存。

### 分层防护的关系

```
客户端 → Nginx (IP 限流, 共享状态) → NestJS (按 key 限流 + 并发上限)
       → 工具参数校验 → trigram 索引 (低成本查询) → Postgres
```

应用层限流状态在进程内。多副本部署时，每个实例各算各的配额，实际额度是 `实例数 × 单实例额度`。**多副本场景请务必加上 Nginx 的 `limit_req`**（见下方配置），它是跨实例共享的那一层。

---

## 部署步骤

### 1. 生成 API Key 并配置环境变量

```bash
# 为每个使用方生成一个独立 key
openssl rand -hex 32   # team_a
openssl rand -hex 32   # team_b
```

在服务器 `.env` 中追加：

```bash
# ★ 必须显式开启,默认是关闭的
MCP_ENABLED=true
MCP_API_KEY=<key_a>,<key_b>
MCP_MAX_PAGE_SIZE=20
MCP_MAX_ORIGINAL_TEXT_LENGTH=20000

# ---- 滥用防护 ----
MCP_RATE_LIMIT_RPS=5
MCP_RATE_LIMIT_BURST=10
MCP_MAX_CONCURRENCY=8
MCP_MAX_FILTER_LENGTH=100
```

`MCP_ENABLED` 不设置或设为 `false` 时端点不工作。

### 2. 执行迁移（重要）

```bash
npm run migration:run
```

这一步建立 trigram 索引，消除关键词搜索的全表扫描。

> ⚠️ 见下方「关于 pg_trgm 权限与回退」一节——迁移可能因权限或锁表失败，
> 且**这一步是可独立回退的**，失败不影响服务启动。

### 3. 重新构建并重启

```bash
npm run build
# 重启服务（按现有部署方式）
```

> 重建后先验证既有前端接口正常（`/api_group/api/v1/...`），
> 再去 WorkBuddy 里连 MCP。

### 4. 确认端点可达

注意路径要带 `/api_group/` 前缀：

```bash
curl -i -X POST http://<host>/api_group/api/v1/mcp \
  -H "X-MCP-Api-Key: <MCP_API_KEY>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

返回 JSON-RPC 响应即表示正常。

若返回 `404` + `"MCP endpoint is disabled"`，说明 `MCP_ENABLED` 没设成 `true`；
若返回 `404` 且是 HTML，则是路径漏了 `/api_group/` 前缀。

### 5. 配置 WorkBuddy

用户级配置 `~/.workbuddy/mcp.json`（对所有项目生效）：

```jsonc
{
  "mcpServers": {
    "axiom-intelligence": {
      "type": "http",
      // ★ 带 /api_group/ 前缀,与线上 Nginx 的 location 保持一致
      "url": "https://your-domain.com/api_group/api/v1/mcp",
      "headers": {
        "X-MCP-Api-Key": "<该用户自己的 KEY>"
      },
      "description": "Axiom 情报精选与机构研报查询"
    }
  }
}
```

项目级配置 `<项目目录>/.workbuddy/mcp.json`（仅当前项目生效）——同样的 JSON 结构。

也可以用 CLI 添加：

```bash
codebuddy mcp add --scope user --transport http axiom-intelligence https://your-domain.com/api_group/api/v1/mcp
```

保存后在 WorkBuddy 界面查看 MCP Server 状态：🟢 绿色表示连接成功，🔴 红色表示配置有误。

> 使用 CLI 添加后，需要手动把 `headers` 补进配置，否则请求会被 401 拒绝。

---

## 注意事项

### 反向代理

线上目前的配置是：

```nginx
location /api_group/ {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
    proxy_pass http://api/;
}
```

这个配置对 MCP 是**可以工作的**——`proxy_pass http://api/` 末尾的斜杠会剥离
`/api_group/` 前缀，把 `/api_group/api/v1/mcp` 转成 `/api/v1/mcp`，正好命中后端路由。

不过有两个点值得注意：

**1. `X-MCP-Api-Key` 请求头。** WorkBuddy 用这个头传 key。你的
`Access-Control-Allow-Headers` 列表里**没有**它。当前不影响，
因为 WorkBuddy 是服务端调用（不走浏览器 CORS 预检）；
但如果将来从浏览器前端直连 MCP，需要补上：

```nginx
add_header 'Access-Control-Allow-Headers' '...,Authorization,X-MCP-Api-Key';
```

**2. 单副本部署下，应用层限流就是精确的。**

限流令牌桶是**进程内**状态。你现在是单副本（`proxy_pass http://api/` 指向一个实例），
所以 `MCP_RATE_LIMIT_RPS=5` 就是全局真实上限，不需要额外的 Nginx 限流。

只有将来扩到多副本时，额度才会变成 `实例数 × 5`。那时再补 Nginx 的共享状态层：

```nginx
limit_req_zone $binary_remote_addr zone=mcp_per_ip:10m rate=20r/m;

location /api_group/api/v1/mcp {
    limit_req zone=mcp_per_ip burst=40 nodelay;
    proxy_pass http://api/;
}
```

也可以按 key 限流（同一出口 IP 后有多个团队时更合适）：

```nginx
map $http_x_mcp_api_key $mcp_key_bucket {
    default "mcp_key_shared";
    "~<具体的key>" "mcp_key_team_a";
}
limit_req_zone $mcp_key_bucket zone=mcp_per_key:10m rate=30r/m;
```

**3. 可选优化（多副本或长连接场景才需要）。**

当前后端是无状态的，POST 返回单个 JSON 响应，HTTP/1.0 默认配置够用。
若将来要用 SSE 流式推送，建议补上：

```nginx
location /api_group/api/v1/mcp {
    proxy_pass http://api/;
    proxy_http_version 1.1;          # SSE 需要
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_buffering off;             # 避免缓冲延迟
    proxy_read_timeout 300s;
    client_max_body_size 100k;       # 与 body-parser 默认上限对齐
}
```

### 上下文长度

WorkBuddy 默认 `MAX_MCP_OUTPUT_TOKENS` 为 20000 tokens（约 80KB 字符）。情报原文可能很长，因此：

- 列表工具不返回原文，只返回概要；
- 详情工具的原文按 `MCP_MAX_ORIGINAL_TEXT_LENGTH` 截断，并在结尾标注 `[...truncated, N more characters]`；
- 模型可以用 `includeOriginalText: false` 跳过原文，或用 `search_*` 缩小范围。

如确需完整原文，调大 `MCP_MAX_ORIGINAL_TEXT_LENGTH`，或让模型分页拉取。

### 多实例部署

端点是无状态的，任意实例均可处理请求，无需会话亲和（session affinity）。多副本部署时每个实例使用相同的 `MCP_API_KEY` 即可，但**限流额度会按实例数放大**——请配合 Nginx `limit_req` 使用。

### 排查

```bash
# 查看 MCP 调用与限流情况
docker logs <container> 2>&1 | grep '\[mcp\]'

# 统计各调用方的调用量
docker logs <container> 2>&1 | grep '\[mcp\]' | \
  sed -E 's/.*\[mcp\] ([^ ]+) ([^ ]+).*/\1 \2/' | sort | uniq -c | sort -rn
```

看到大量 `rate_limited` 说明该调用方触发了限流；持续出现说明它要么在正常高频使用（考虑调高额度），要么是在做恶意调用（考虑吊销该 key）。

---

## 关于 pg_trgm 权限

迁移 `1795000000000` 会执行 `CREATE EXTENSION IF NOT EXISTS pg_trgm`。
在 PostgreSQL 中，**创建扩展需要数据库超级用户**（或对该扩展的信任权限）。
普通应用账号执行会报 `ERROR: permission denied to create extension "pg_trgm"`。

### 第一步：查询当前是否已有该扩展

用**你的应用连接用户**（不是 DBA）连接数据库后执行：

```sql
-- 1) 扩展是否已安装
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pg_trgm';

-- 2) 当前连接的用户及其角色
SELECT current_user, session_user, current_database();

-- 3) 当前用户是否具备创建扩展的权限
--    (PostgreSQL 13+ 自带 pg_create_extension 预置角色)
SELECT r.rolname AS role, r.rolsuper AS is_superuser, r.rolcreaterole
FROM pg_roles r
WHERE r.rolname = current_user;

-- 4) 一句话判定:能否创建扩展
SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_in_db;
```

**判定标准：**

| 查询结果 | 含义 | 后续动作 |
|---------|------|---------|
| 第 1 条返回一行 | `pg_trgm` **已安装** | 直接跑迁移，无需任何授权 |
| 第 1 条返回空 + 第 4 条为 `t` | 扩展未装，但当前库有 CREATE 权限 | 大概率可直接 `CREATE EXTENSION` |
| 第 1 条返回空 + 第 4 条为 `f` | 扩展未装且无建扩展权限 | 走下面的授权流程 |

也可以直接试一把（最省事）：

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

成功即说明权限没问题；报 `permission denied` 则按下面处理。

### 第二步：授权（需要 DBA / 超级用户执行）

**方案 A（推荐）：由 DBA 预先创建扩展**

让有超级用户权限的人连上数据库执行一次：

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

应用用户**不需要**任何额外权限——扩展建好之后，`CREATE INDEX` 只需要对表的
`CREATE` 权限，而应用用户本来就有。

**方案 B：把当前用户加入 `pg_create_extension` 预置角色**（PostgreSQL 13+）

```sql
GRANT pg_create_extension TO <你的应用用户名>;
```

这比给超级用户安全得多 —— 它只允许创建扩展，不给其它超级用户能力。

**方案 C：给数据库 CREATE 权限**

```sql
GRANT CREATE ON DATABASE <数据库名> TO <你的应用用户名>;
```

权限范围比 A/B 大，一般不推荐。

> 创建扩展是**数据库级**操作，需要在**每个**环境（生产 / 预发 / 本地）
> 各执行一次。

---

## 回退方案

整个改动是**可独立回退**的，而且分成互相独立的几个部分。

### 改动分层与回退粒度

| 层 | 内容 | 回退方式 | 对既有接口的影响 |
|----|------|---------|----------------|
| A | 后端代码（MCP 模块） | `git revert` + 重新构建 | **无** |
| B | 数据库迁移（trigram 索引） | `migration:revert` 或手工 DROP | **无** |
| C | `.env` 配置 | 删掉 `MCP_*` 变量 | **无** |
| D | Nginx 配置 | 不需要改（现有配置已兼容） | **无** |

关键点：**没有任何一层会改变既有 REST 接口的行为**。
前端调用的 `/api_group/api/v1/...` 走的还是原来的 Service 和 Repository，
MCP 只是**新增**了一条独立的路由。

### 场景 1：迁移失败（最需要预案的场景）

迁移失败**不会影响服务运行** —— TypeORM 迁移失败时应用仍能启动，
只是索引没建好。此时 MCP 的关键词搜索会退回到全表扫描（较慢但功能正常），
且 MCP 端点因 `MCP_ENABLED` 默认关闭而不受影响。

**排查并重试：**

```bash
# 查看迁移状态
npm run typeorm -- --dataSource=src/database/data-source.ts migration:show

# 修正权限后重跑
npm run migration:run
```

**直接回退（如果迁移部分执行了）：**

```bash
npm run typeorm -- --dataSource=src/database/data-source.ts migration:revert
```

或者手工撤销（等价，且更可控）：

```sql
DROP INDEX IF EXISTS public.idx_zsxq_posts_title_trgm;
DROP INDEX IF EXISTS public.idx_research_analysis_document_name_trgm;
DROP INDEX IF EXISTS public.idx_zsxq_posts_stock_mapping_trgm;
```

> `pg_trgm` 扩展本身**不要删** —— 它可能被其它对象使用，删扩展不会自动
> 清理依赖它的索引，反而容易留下不一致状态。

**最保守的做法**：如果迁移卡在 `CREATE INDEX`（大表加索引时间长），
可以 Ctrl+C 中断，然后手工用 `CREATE INDEX CONCURRENTLY` 单独执行：

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zsxq_posts_title_trgm
  ON public.zsxq_posts USING gin (title gin_trgm_ops);
```

`CONCURRENTLY` 不阻塞写入，但**不能在事务里执行**，且失败会留下 invalid 索引，
需要 `DROP INDEX` 后重建。

### 场景 2：代码部署出问题

MCP 是**纯新增模块**，回退很简单：

```bash
git revert <本次提交>       # 或 git checkout 上一版本
npm run build
# 重启
```

回退后既有接口立刻恢复正常。因为 `MCP_ENABLED` 默认关闭，
即使忘了回退配置，MCP 端点也不会对外工作。

### 场景 3：只是想临时关掉 MCP

**不需要重新部署**，改 `.env` 即可：

```bash
MCP_ENABLED=false
```

然后重启服务。端点立刻返回 `MCP endpoint is disabled`。

### 场景 4：某个 key 被滥用，需要紧急止血

改 `.env` 里的 `MCP_API_KEY`，去掉那个 key，重启。
其他 key 不受影响，无需重新部署。

### 部署顺序建议

为了把风险降到最低，**分两步走**：

**第一步：只部署代码，不开 MCP。**

```bash
npm run build
# 重启
# 验证前端既有接口正常
curl -i https://<domain>/api_group/api/v1/intelligence -H "Authorization: Bearer <token>"
```

这一步验证了「新增模块对既有接口零影响」。

**第二步：再开 MCP。**

```bash
# 确认迁移已完成(或先单独跑迁移)
npm run migration:run
# .env 里设 MCP_ENABLED=true 和 MCP_API_KEY
# 重启
```

**全程不需要改 Nginx。** 你现有的 `location /api_group/` 配置已经能正确转发。

---

## 测试

```bash
npx jest --config ./test/jest-e2e.json --testPathPatterns "mcp"
```

- `test/mcp.e2e-spec.ts` —— 工具注册、参数 schema、列表/详情调用、原文截断开关、超长过滤词拦截
- `test/mcp-security.e2e-spec.ts` —— 限流隔离、令牌桶补充、并发上限、多 Key 身份隔离、凭证不泄露、审计归因
- `test/mcp-pipeline.e2e-spec.ts` —— 验证全局 ValidationPipe / 拦截器 / 异常过滤器不会破坏 MCP 协议
