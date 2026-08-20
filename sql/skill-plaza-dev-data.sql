-- ============================================================
-- Skill Plaza — Dev Data Snapshot (★ 2026-08-20)
-- ============================================================
-- 用途: 本地 axiom_dev pgsql 在 2026-08-20 的 skill 相关数据快照,
--       方便生产部署 schema 后跟着灌一份初始内容(可选)。
--
-- 数据来源:  开发环境通过 saas-web Skill Plaza 上传,绑定到 user_id=1。
-- 内容:      2 个 skill (财务分析 + financial-analysis-valuation),
--            54 个 skill_file 记录, 2 条 user_skill_binding, 1 条
--            session_skill_mount。
--
-- 注意:  2 个 skill 都是 status='published' marketplace_status='private',
--        不会出现在普通用户广场里 — 必须绑定到 user_id 才会被 vibe
--        注入 system prompt。生产上若想给所有用户开,需要改成
--        marketplace_status='listed' 并清掉 user_skill_binding。
--
-- 用法:  可选。生产上若只需要 schema,跳过本文件;若想带 dev 内容,
--        先跑 sql/skill-plaza-production-setup.sql,再 \\i 本文件。
--        不要在已有数据上重跑(无 ON CONFLICT 保护)。
-- ============================================================

BEGIN;


-- skill: skill-19474ae347a6-614c
INSERT INTO skill (id, code, name, description, category, tags, thumbnail_url, uploader_type, uploader_id, marketplace_status, signature, status, manifest_content, files_dir_path, tools_dir_path, manifest_token_estimate, total_token_estimate, content_hash, changelog, published_at, created_by, tools, created_at, updated_at, deleted_at) VALUES ('74317fe3-437d-4a09-b926-fcef7c16f107', 'skill-19474ae347a6-614c', '财务报表分析与股票估值', 'test 知识库 from 《财务报表分析与股票估值》by 郭永清(2017,机械工业出版社). 涵盖全书 16 章,按 5 层组织:财报阅读基础 / 财报分析框架 / 三表深度分析 / 估值方法 / 实战案例库. Use when analyzing a Chinese A-share company''s financial statements, applying 价值评估四特征, building 8 步案例法, computing ROE 五因素分解, running DCF/FCF-DCF valuation, identifying 价值陷阱, or stress-testing 安全边际 thresholds. Includes ~120 named frameworks, ~30 reusable analysis patterns, decision rules + thresholds cheatsheet, 19 case studies + 3 methodology sections.', 'analysis', ARRAY['financial-statement','valuation','dcf','a-share','value-investing'], NULL, 'platform', 1, 'private', NULL, 'published', '---
name: financial-analysis-valuation
display_name: 财报分析与估值
description: "知识库 from 《财务报表分析与股票估值》by 郭永清(2017,机械工业出版社). 涵盖全书 16 章,按 5 层组织:财报阅读基础 / 财报分析框架 / 三表深度分析 / 估值方法 / 实战案例库. Use when analyzing a Chinese A-share company''s financial statements, applying 价值评估四特征, building 8 步案例法, computing ROE 五因素分解, running DCF/FCF-DCF valuation, identifying 价值陷阱, or stress-testing 安全边际 thresholds. Includes ~120 named frameworks, ~30 reusable analysis patterns, decision rules + thresholds cheatsheet, 19 case studies + 3 methodology sections."
category: analysis
tags: [financial-statement, valuation, dcf, a-share, value-investing]
requires_tools: false
version: 1.0.0
---

<!-- argument-hint: [topic, framework name, chapter number, or company name] -->

# 财报分析与估值

**Author**: 郭永清 | **Source**: 《财务报表分析与股票估值》(2017) | **Pages**: ~390 | **Chapters**: 16 | **Generated**: 2026-08-18

---

## How to Use This Skill

- **Without arguments** — load 5 层 TOC(见下)
- **With a topic** — ask "FCF 公式校正" / "ROE 五因素" / "安全边际" 等;我找到对应 chapter + framework
- **With a chapter** — ask "ch10 ROE 分解" / "ch15 DCF 应用" 等;加载该章详情
- **With a company** — ask "白云机场 FCF" / "万华化学 ROE" 等;跳转 ch16 案例库
- **With a layer** — ask "三表深度分析" / "估值方法" 等;加载该层所有章节索引

---

## 5 层导航(TOC)

按因果链组织,而非章节编号。

### Layer A — 财报阅读基础(Ch 1+2)
> 目标:学会读懂一份财报,识别数据可信度

- [Ch 1 财报基础](references/chapters/ch01-财报基础.md) — 审计意见 / 四表勾稽 / 利润质量三层诊断 / CAS 14/21/22
- [Ch 2 财报原理](references/chapters/ch02-财报原理.md) — 六步判断财报质量 / 危险信号 9 条 / 防舞弊两招

[Layer A 详情](references/nav/by-layer.md#layer-a--财报阅读基础ch-12)

### Layer B — 财报分析框架(Ch 3+4+5)
> 目标:从"读懂财报"升级到"理解财报"——战略与执行的传导链

- [Ch 3 公司财报分析的框架](references/chapters/ch03-公司财报分析的框架.md) — 价值四特征 / 三大主体 / 顺向 vs 逆向 / "起于战略"
- [Ch 4 公司战略](references/chapters/ch04-公司战略.md) — 战略四象限 / 行业决定财报结构 / 总成本领先 vs 差异化
- [Ch 5 财报项目逻辑](references/chapters/ch05-财报项目逻辑.md) — 现金持续循环图 / 9 条逻辑命题 / 筹资五问

[Layer B 详情](references/nav/by-layer.md#layer-b--财报分析框架ch-345)

### Layer C — 三表深度分析(Ch 6+7+8+9+10+11)
> 目标:把 Layer B 框架应用到三张表的具体分析

- [Ch 6 财报与估值](references/chapters/ch06-财报与估值.md) — 投资活动分析 / 扩张性资本支出比例 / 净合并额
- [Ch 7 资本管理](references/chapters/ch07-资本管理.md) — 现金自给率 / WACC / 融资优序理论 / 偿付利息倒算
- [Ch 8 资产资本](references/chapters/ch08-资产资本.md) — 资产资本表重构 / 流动性三策略 / 长期融资净值
- [Ch 9 股权价值增加分析](references/chapters/ch09-股权价值增加分析.md) — 利润表重构 / 财务成本负担率 / 股权价值增加值
- [Ch 10 资产资本与股权价值](references/chapters/ch10-资产资本与股权价值.md) — ROE 五因素分解 / 三色判断
- [Ch 11 回归现金](references/chapters/ch11-回归现金.md) — 三个现金含量指标 / 五种状态 / 现金分红政策

[Layer C 详情](references/nav/by-layer.md#layer-c--三表深度分析ch-67891011)

### Layer D — 估值方法(Ch 12+13+14+15)
> 目标:把"是否值得投资"的决策落地

- [Ch 12 股票价格和股票价值](references/chapters/ch12-股票价格和股票价值.md) — 价格 vs 价值 / 安全边际 / 巴菲特原则 / 成组购买
- [Ch 13 相对估值法](references/chapters/ch13-相对估值法.md) — PE/PB/PS/PEG 四方法 + 选择决策树 + 四步法
- [Ch 14 绝对估值法](references/chapters/ch14-绝对估值法.md) — DCF/DDM 数学原理 + WACC + 简化模型
- [Ch 15 自由现金流贴现估值](references/chapters/ch15-自由现金流贴现估值.md) — FCF 公式校正 + 8% 简化折现率 + 7 维度历史分析

[Layer D 详情](references/nav/by-layer.md#layer-d--估值方法ch-12131415)

### Layer E — 实战案例库(Ch 16)
> 目标:用真实公司案例验证理论框架

- [Ch 16 实战案例](references/chapters/ch16-实战案例.md) — 19 个公司案例 + 3 个方法论节

[Layer E 详情](references/nav/by-layer.md#layer-e--实战案例库ch-16)

---

## 跨章节索引

### 按 Framework 类型(~120 框架)

[按 framework 类型导航](references/nav/by-framework.md)— 按"价值定义/战略/财报质量/现金流/投资/筹资/资产/利润/ROE/估值/案例/哲学"12 大类组织

### 按公司案例(19 家公司)

[按公司案例导航](references/nav/by-case.md)— 按"家电/基础设施/工业/能源/互联网/房地产/反例"7 大行业组织

### 按 Layer 详细摘要

[按 Layer 详细摘要](references/nav/by-layer.md)— 5 层的因果传递逻辑 + 完整应用路径

---

## Supporting Files

> All paths below are **relative to the skill root directory**. Use the `read_file` tool to load them on demand.

- [references/chapters/](references/chapters/) — 16 章正文(每章一个文件)
- [references/nav/](references/nav/) — 三种导航入口(by-layer / by-framework / by-case)
- [references/glossary.md](references/glossary.md) — 统一术语库(精选 ~120 条 + 跨章引用)
- [references/patterns.md](references/patterns.md) — 统一分析模式库(精选 30 个可复用模式)
- [references/cheatsheet.md](references/cheatsheet.md) — 决策规则 + 阈值表 + 行业方法速查
- [references/README.md](references/README.md) — Skill 自带的 README(说明设计原则与历史)
- [examples/](examples/) — LangGraph / playbook 代码示例(`valuation_playbook.py` / `basic_usage.py` / `langgraph_workflow.py`)

**How to load a chapter on demand**: call `read_file` with the relative path, e.g. `references/chapters/ch10-资产资本与股权价值.md`.

---

## 核心洞察(Quick Reference)

### 一、价值是什么
> **价值 = 风险与报酬平衡下的自由现金流现值**(郭永清价值定义四特征)

### 二、财报核心观点
> **财报的核心就是公司的投资活动**(Ch 6)
> **资产负债表和利润表是为现金流量表服务的**(Ch 11)

### 三、战略传导
> **起于战略,重在执行,止于财报**(Ch 3)
> **行业 + 竞争策略 = 财报特征**(Ch 4)

### 四、估值方法
> **相对估值找候选 + 绝对估值定决策**(Ch 13 + Ch 14)
> **FCF 公式校正**(教科书会误杀成长公司)(Ch 15)

### 五、投资哲学
> **价格 ≠ 价值**;安全边际是单股防线,组合分散是组合防线(Ch 12)

---

## 关键阈值速查(更全在 cheatsheet.md)

| 类别 | 关键阈值 |
|---|---|
| 财报质量 | 经营 CF/净利润 ≥ 1;营业利润占比 ≥ 80% |
| 投资活动 | 扩张性 CapEx 比例:> 20% 高速 / 5~20% 稳健 / 0~5% 维持 / < 0% 收缩 |
| 资产结构 | 长期融资净值 > 0;财务杠杆倍数 ≤ 2 |
| 利润质量 | 财务成本负担率 < 10% 健康,> 80% 为银行打工 |
| 估值 | 永续 g < r;折现率 8% 简化;安全边际 ≥ 30% 强买入 |

---

## Scope & Limits

**This skill covers**:郭永清《财务报表分析与股票估值》全书 16 章的完整内容。

**For hands-on analysis**:
- 实时数据:combine with `a-stock-data` skill(A 股数据)
- 行业对标:combine with `tushare` / `eastmoney` data tools
- 估值自动化:`examples/` 子目录提供 LangGraph / playbook 示例代码片段

**项目本地**(`**不**`发布到公共 GitHub):
- 存放位置:本项目 `agent/src/skills/financial-analysis-valuation/`(bundled)或通过 admin 后台上传到七牛云后由 `SkillsLoader` 动态加载
- 原 16 个 chapter skill 保留在 `Book2Skill/FinancialAnalysisAndValuation/claudeCode/财报基础/` 等目录
- 生成方式:HEIC → sips PDF → pypdf 合并 → Docling+RapidOCR → 蒸馏为 16 个 skill → 合并为 mega-skill

**时效性提示**:Ch 16 案例全部基于 2015-2017 财务数据;乐视网已在 2021 年退市(16.15 反例验证);万华化学 2017-2024 一体化战略持续推进(16.18 正例验证)。

---

## 10 个最常用框架(50% 问题用这 10 个)

1. **审计意见五层过滤** — 拿到任何财报第一件事
2. **四表勾稽** — 开机必查的 5 项
3. **利润质量三层诊断** — 营业利润占比 + 含金量 + 控制力
4. **公司分析 8 步法** — 任何公司的完整分析链路
5. **资产资本表重构** — 做所有比率分析之前先重构
6. **ROE 五因素分解** — 综合分析的入口
7. **现金自给率** — 判断公司增长是"自给"还是"借来"
8. **FCF 公式校正** — 避免误杀成长公司
9. **相对估值 + DCF 协作** — 相对找候选 + 绝对定决策
10. **安全边际判断** — 60% 强买入 / 80% 观望 / 100%+ 不买入

---

## Provenance & License Note

- **Source**: 第三方版权内容(郭永清《财务报表分析与股票估值》)
- **存放位置**: 项目本地 `.claude/skills/财报分析与估值/`,**不发布到公共仓库**
- **生成方式**: HEIC → sips → PDF → pypdf 合并 → Docling+RapidOCR 抽取 → 蒸馏为 16 个 chapter skill(2026-08-16 ~ 2026-08-18)→ 合并为 mega-skill(2026-08-18)
- **合并来源**: 原 16 个 skill 的 glossary.md / patterns.md / cheatsheet.md / SKILL.md + references/chapters/,去重 + 按 5 层组织 + 添加 3 种 nav 入口
- **代码示例**: `examples/` 子目录,提供 LangGraph / playbook 示例
- **规范化**: 2026-08-19 迁移到 `financial-analysis-valuation/` slug,统一 references/ 子目录,移除 Python 包源码(改由 Skill Plaza 端托管工具)
- **生成日期**: 2026-08-18', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/references', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/tools', 2985, NULL, '19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999', 'Initial publish', '2026-08-19 03:23:02.216000+00:00', 1, '{}', '2026-08-19 03:23:00.382326+00:00', '2026-08-19 03:23:01.999478+00:00', NULL);

-- skill: financial-analysis-valuation-0ac2
INSERT INTO skill (id, code, name, description, category, tags, thumbnail_url, uploader_type, uploader_id, marketplace_status, signature, status, manifest_content, files_dir_path, tools_dir_path, manifest_token_estimate, total_token_estimate, content_hash, changelog, published_at, created_by, tools, created_at, updated_at, deleted_at) VALUES ('a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'financial-analysis-valuation-0ac2', 'financial-analysis-valuation', '郭永清《财务报表分析与股票估值》全书知识库,16 章 + 30 分析模式 + 19 实战案例 + 8 估值工具。Use when analyzing Chinese A-share companies: applying 8 步案例法, ROE 五因素分解, FCF 公式校正, DCF/FCF-DCF 估值, 价值陷阱识别, 安全边际判断. Built-in: 公司类型剧本(playbook), 22 条作者警示(W-XX), 9 个 tool schema (audit/4-table/ROE/FCF/safety/industry/trap/DCF/capex).', 'analysis', ARRAY['financial-statement','valuation','dcf','a-share','value-investing','playbook','fcf-correction'], NULL, 'platform', 1, 'private', NULL, 'published', '---
name: financial-analysis-valuation
display_name: 财报分析与估值
description: "郭永清《财务报表分析与股票估值》全书知识库,16 章 + 30 分析模式 + 19 实战案例 + 8 估值工具。Use when analyzing Chinese A-share companies: applying 8 步案例法, ROE 五因素分解, FCF 公式校正, DCF/FCF-DCF 估值, 价值陷阱识别, 安全边际判断. Built-in: 公司类型剧本(playbook), 22 条作者警示(W-XX), 9 个 tool schema (audit/4-table/ROE/FCF/safety/industry/trap/DCF/capex)."
category: analysis
tags: [financial-statement, valuation, dcf, a-share, value-investing, playbook, fcf-correction]
requires_tools: true
version: 1.1.0
---

<!-- argument-hint: [topic, framework name, chapter number, or company name] -->

# 财报分析与估值

**Author**: 郭永清 | **Source**: 《财务报表分析与股票估值》(2017) | **Pages**: ~390 | **Chapters**: 16 | **Generated**: 2026-08-19

---

## 一句话定位

> **知识库 + 分析能力** — 输入公司类型,获得"应该按什么顺序调哪些框架"的剧本;触发警示信号时,直接对照作者原话。

---

## 5 秒决策树

你是哪种用户?

```
├── 新手 — 看下面"10 框架速查"
├── 有公司名 — 查 references/nav/by-case.md 找同类案例 → 跳 references/playbook.md
├── 有行业名 — 查 references/playbook.md 对应剧本(7 个公司类型)
├── 有问题("什么是 FCF 校正")— 用 references/patterns.md + references/cheatsheet.md 搜索
├── 看到红旗信号 — 查 references/author-warnings.md(22 条 W-XX)
└── 想做自动分析 — 用 tools/ 的 8 个 tool schema(JSON,平台端托管执行)
```

---

## 剧本入口(快速开始分析)

想开始分析一家公司?**直接去** [`references/playbook.md`](references/playbook.md),按公司类型选剧本:

| 公司类型 | 剧本 | 入口 |
|---|---|---|
| 白酒 / 家电 / 医药 | 1.1 高 ROE 消费龙头 | [playbook.md §1.1](references/playbook.md#11-高-roe-消费龙头剧本) |
| 机场 / 水电 / 高速 | 1.2 基础设施(FCF 校正) | [playbook.md §1.2](references/playbook.md#12-基础设施剧本机场--水电--高速--铁路) |
| 化工 / 钢铁 / 航空 | 1.3 重资产周期 | [playbook.md §1.3](references/playbook.md#13-重资产周期剧本化工--钢铁--航空--水泥) |
| 科技 / 医药 / 互联网 | 1.4 成长股 | [playbook.md §1.4](references/playbook.md#14-成长股剧本科技--医药--互联网--新能源) |
| 房地产 | 1.5 房地产 | [playbook.md §1.5](references/playbook.md#15-房地产剧本) |
| 银行 / 金融 | 1.6 银行 / 金融 | [playbook.md §1.6](references/playbook.md#16-银行--金融剧本) |
| FCF 长期负 / 治理恶化 / 替代风险 | **1.7 反例剧本** | [playbook.md §1.7](references/playbook.md#17-反例剧本fcf-长期负--治理恶化--替代风险) |

---

## 警示入口(看到红旗信号时)

**看到任何红旗 → 查** [`references/author-warnings.md`](references/author-warnings.md) 22 条 W-XX:

| 警示大类 | 章节 | W-XX 范围 |
|---|---|---|
| 财报质量 | [author-warnings.md §1](references/author-warnings.md#1-财报质量w-01--w-05) | W-01 ~ W-05 |
| 战略 | [author-warnings.md §2](references/author-warnings.md#2-战略w-06--w-08) | W-06 ~ W-08 |
| 资产 | [author-warnings.md §3](references/author-warnings.md#3-资产w-09--w-11) | W-09 ~ W-11 |
| 利润 | [author-warnings.md §4](references/author-warnings.md#4-利润w-12--w-14) | W-12 ~ W-14 |
| 估值 | [author-warnings.md §5](references/author-warnings.md#5-估值w-15--w-19) | W-15 ~ W-19 |
| 投资哲学 | [author-warnings.md §6](references/author-warnings.md#6-投资哲学w-20--w-22) | W-20 ~ W-22 |

---

## 5 层 TOC(精简)

按因果链组织,而非章节编号。

### Layer A — 财报阅读基础(Ch 1+2)
> 学会读懂一份财报,识别数据可信度 → [ch01](references/chapters/ch01-财报基础.md) / [ch02](references/chapters/ch02-财报原理.md)

### Layer B — 财报分析框架(Ch 3+4+5)
> 从"读懂财报"升级到"理解财报" → [ch03](references/chapters/ch03-公司财报分析的框架.md) / [ch04](references/chapters/ch04-公司战略.md) / [ch05](references/chapters/ch05-财报项目逻辑.md)

### Layer C — 三表深度分析(Ch 6+7+8+9+10+11)
> 把 Layer B 框架应用到三张表 → [ch06](references/chapters/ch06-财报与估值.md) / [ch07](references/chapters/ch07-资本管理.md) / [ch08](references/chapters/ch08-资产资本.md) / [ch09](references/chapters/ch09-股权价值增加分析.md) / [ch10](references/chapters/ch10-资产资本与股权价值.md) / [ch11](references/chapters/ch11-回归现金.md)

### Layer D — 估值方法(Ch 12+13+14+15)
> 把"是否值得投资"的决策落地 → [ch12](references/chapters/ch12-股票价格和股票价值.md) / [ch13](references/chapters/ch13-相对估值法.md) / [ch14](references/chapters/ch14-绝对估值法.md) / [ch15](references/chapters/ch15-自由现金流贴现估值.md)

### Layer E — 实战案例库(Ch 16)
> 用真实公司案例验证理论框架 → [ch16](references/chapters/ch16-实战案例.md)

[按 Layer 详细摘要](references/nav/by-layer.md)— 5 层的因果传递逻辑

---

## 项目结构(本 skill 的内容清单)

### 知识库(`references/`)

| 层 | 文件 | 何时用 |
|---|---|---|
| **方法层** | [`references/patterns.md`](references/patterns.md) | 查具体方法 / 模式(30 个) |
| **术语层** | [`references/glossary.md`](references/glossary.md) | 查术语定义(~120 条) |
| **决策层** | [`references/cheatsheet.md`](references/cheatsheet.md) | 快速决策卡 + 阈值表 |
| **宏观层** | [`references/playbook.md`](references/playbook.md) | **按公司类型选剧本** (L1) |
| **呈现层** | [`references/case-sop.md`](references/case-sop.md) | 19 案例的 9 节模板(L2) |
| **警示层** | [`references/author-warnings.md`](references/author-warnings.md) | **看到红旗时查 W-XX** (L3) |
| **导航层** | [`references/nav/`](references/nav/) | by-layer / by-framework / by-case 三种入口 |
| **章节层** | [`references/chapters/ch01-ch16.md`](references/chapters/) | 16 章正文 |

### 工具层(`tools/` — Skill Plaza 端执行)

8 个 tool schema(每个 JSON 一个 tool),对应 LangChain `@tool` 函数:

| Tool | Pattern | 用途 | Schema |
|---|---|---|---|
| `audit_filter` | Pattern 1 | 审计意见五层过滤 | [audit_filter.json](tools/audit_filter.json) |
| `four_table_check` | Pattern 2 | 四表勾稽校验(5 项必查) | [four_table_check.json](tools/four_table_check.json) |
| `decompose_roe` | Pattern 16 | ROE 五因素分解 + 三色判断 | [decompose_roe.json](tools/decompose_roe.json) |
| `correct_fcf` | Pattern 20 | FCF 公式校正(行业差异化) | [correct_fcf.json](tools/correct_fcf.json) |
| `safety_margin_check` | Pattern 24 | 60% 强买入 / 80% 观望 | [safety_margin.json](tools/safety_margin.json) |
| `industry_method_selector` | Pattern 19+28 | 估值方法选择决策树 | [industry_selector.json](tools/industry_selector.json) |
| `value_trap_screener` | Pattern 27 | 6 类价值陷阱识别 | [value_trap.json](tools/value_trap.json) |
| `dcf_two_stage` | Pattern 25 | 两阶段 DCF 估值 | [dcf_two_stage.json](tools/dcf_two_stage.json) |
| `capex_split` | Pattern 20 组件 | 维持性 vs 扩张性 CapEx 分离 | [capex_split.json](tools/capex_split.json) |

> **Tool 执行不在 zip 内**:Schema JSON 由 admin 后台上传,实际 Python 实现由 Skill Plaza 后端通过 `SkillToolExecutor` 调度执行。LLM 通过 `load_skill_*` 系列工具渐进式拉取。

### 示例代码(`examples/`)

只读参考代码,展示如何在 LangGraph / LangChain 中调用本 skill 的方法论:

- [`examples/basic_usage.py`](examples/basic_usage.py) — 单 tool 调用演示
- [`examples/langgraph_workflow.py`](examples/langgraph_workflow.py) — LangGraph 8 节点工作流
- [`examples/valuation_playbook.py`](examples/valuation_playbook.py) — 完整剧本流水线

---

## 10 个最常用框架(50% 问题用这 10 个)

1. **审计意见五层过滤** — 拿到任何财报第一件事 [ch01 / Pattern 1 / W-01 / `audit_filter`]
2. **四表勾稽** — 开机必查的 5 项 [ch01 / Pattern 2 / W-02 / `four_table_check`]
3. **利润质量三层诊断** — 营业利润占比 + 含金量 + 控制力 [ch01 / Pattern 3]
4. **公司分析 8 步法** — 任何公司的完整分析链路 [ch03 / Pattern 6 / playbook §2]
5. **资产资本表重构** — 做所有比率分析之前先重构 [ch08 / Pattern 13 / W-09]
6. **ROE 五因素分解** — 综合分析的入口 [ch10 / Pattern 16 / `decompose_roe`]
7. **现金自给率** — 判断公司增长是"自给"还是"借来" [ch07 / Pattern 11]
8. **FCF 公式校正** — 避免误杀成长公司 [ch15 / Pattern 20 / `correct_fcf` / W-15]
9. **相对估值 + DCF 协作** — 相对找候选 + 绝对定决策 [ch13/14 / Pattern 18+25 / `industry_method_selector`]
10. **安全边际判断** — 60% 强买入 / 80% 观望 / 100%+ 不买入 [ch12 / Pattern 24 / `safety_margin_check`]

---

## 关键阈值速查(6 行)

| 类别 | 关键阈值 |
|---|---|
| 财报质量 | 经营 CF/净利润 ≥ 1;营业利润占比 ≥ 80% |
| 投资活动 | 扩张性 CapEx 比例:> 20% 高速 / 5~20% 稳健 / 0~5% 维持 / < 0% 收缩 |
| 资产结构 | 长期融资净值 > 0;财务杠杆倍数 ≤ 2 |
| 利润质量 | 财务成本负担率 < 10% 健康,> 80% 为银行打工 |
| ROE | ≥ 15% 优秀 / 12~15% 良好 / 8~12% 一般 / < 8% 不合格 |
| 估值 | 永续 g < r;折现率 8% 简化;安全边际 ≥ 30% 强买入 |

完整版 → [`references/cheatsheet.md`](references/cheatsheet.md)

---

## 跨章节索引

### 按 Framework 类型(~120 框架)
[`references/nav/by-framework.md`](references/nav/by-framework.md) — 按"价值定义/战略/财报质量/现金流/投资/筹资/资产/利润/ROE/估值/案例/哲学"12 大类

### 按公司案例(19 家公司)
[`references/nav/by-case.md`](references/nav/by-case.md) — 按"家电/基础设施/工业/能源/互联网/房地产/反例"7 大行业

---

## Scope & Limits

**This skill covers**:郭永清《财务报表分析与股票估值》全书 16 章的完整内容 + 4 层分析能力(playbook / case-sop / author-warnings / tools)。

**For hands-on analysis**:
- 实时数据:combine with `a-stock-data` skill(A 股数据)
- 行业对标:combine with `tushare` / `eastmoney` data tools
- 估值自动化:使用 `tools/` 子目录的 8 个 tool schema(由 Skill Plaza 后端托管执行)

**协议合规**:本 skill zip 遵循 `admin-skill-upload.md` §2 规范:
- slug 名:`financial-analysis-valuation`
- 第一层子目录白名单:`references` / `examples` / `tools` (其余均不允许)
- 无 Python 源码(除 `examples/` 内)、无 `pyproject.toml` / `setup.py` / `__pycache__` / `.pytest_cache`

**时效性提示**:Ch 16 案例全部基于 2015-2017 财务数据;乐视网已在 2021 年退市(16.15 反例验证);万华化学 2017-2024 一体化战略持续推进(16.18 正例验证)。使用前请用 `a-stock-data` 更新数据。

---

## Provenance & License Note

- **Source**: 第三方版权内容(郭永清《财务报表分析与股票估值》)
- **存放位置**: 项目本地 `FinancialAnalysisAndValuation/langchain/financial-analysis-valuation/`(bundled)或通过 admin 后台上传到七牛云后由 `SkillsLoader` 动态加载
- **生成方式**: HEIC → sips PDF → pypdf 合并 → Docling+RapidOCR → 蒸馏为 16 个 chapter skill → 合并为 mega-skill(2026-08-18)→ 4 层深度分析升级(2026-08-19)→ 协议合规化(2026-08-19)
- **升级内容**:
  - `references/playbook.md`(L1 跨章节方法论串联,7 个公司类型剧本)
  - `references/case-sop.md`(L2 实战案例方法论抽象,9 节模板)
  - `references/author-warnings.md`(L3 作者警示集中化,22 条 W-XX)
  - `tools/*.json`(L4 工具层 — 8 个 tool schema,Skill Plaza 端执行)
  - `examples/`(LangGraph / 剧本调用示例,只读)
- **版本**: 1.1.0(2026-08-19 升级 4 层深度分析 + 协议合规化)', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/references', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/tools', 4148, NULL, '7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916', 'Initial publish', '2026-08-20 01:59:37.407000+00:00', 1, '[{"name": "four_table_check", "parameters": {"type": "object", "required": ["total_assets", "total_liabilities", "total_equity", "net_income", "beginning_retained_earnings", "dividends_paid", "ending_retained_earnings", "operating_cash_flow", "cash_and_equivalents_end", "restricted_cash", "comprehensive_income"], "properties": {"tolerance": {"type": "number", "default": 0.01, "description": "\u53ef\u63a5\u53d7\u5dee\u5f02\u6bd4\u4f8b(\u9ed8\u8ba4 0.01 = 1%)"}, "net_income": {"type": "number", "description": "\u51c0\u5229\u6da6(\u5143)"}, "total_assets": {"type": "number", "description": "\u8d44\u4ea7\u603b\u8ba1(\u5143)"}, "total_equity": {"type": "number", "description": "\u6240\u6709\u8005\u6743\u76ca\u5408\u8ba1(\u5143)"}, "dividends_paid": {"type": "number", "description": "\u672c\u671f\u5206\u7ea2(\u5143)"}, "restricted_cash": {"type": "number", "description": "\u53d7\u9650\u8d44\u91d1(\u5143)"}, "total_liabilities": {"type": "number", "description": "\u8d1f\u503a\u5408\u8ba1(\u5143)"}, "operating_cash_flow": {"type": "number", "description": "\u7ecf\u8425\u6d3b\u52a8\u73b0\u91d1\u6d41\u91cf\u51c0\u989d(\u5143)"}, "comprehensive_income": {"type": "number", "description": "\u7efc\u5408\u6536\u76ca\u603b\u989d(\u5143)"}, "cash_and_equivalents_end": {"type": "number", "description": "\u671f\u672b\u73b0\u91d1\u53ca\u73b0\u91d1\u7b49\u4ef7\u7269\u4f59\u989d(\u5143)"}, "ending_retained_earnings": {"type": "number", "description": "\u671f\u672b\u672a\u5206\u914d\u5229\u6da6(\u5143)"}, "beginning_retained_earnings": {"type": "number", "description": "\u671f\u521d\u672a\u5206\u914d\u5229\u6da6(\u5143)"}}}, "description": "\u56db\u8868\u52fe\u7a3d\u6821\u9a8c(Pattern 2)\u30025 \u9879\u5fc5\u67e5\u52fe\u7a3d(\u8d44\u4ea7=\u8d1f\u503a+\u6743\u76ca\u3001\u51c0\u5229\u6da6\u4f20\u5bfc\u3001\u7ecf\u8425CF/\u51c0\u5229\u6da6\u22651\u3001\u671f\u672b\u73b0\u91d1\u3001\u7efc\u5408\u6536\u76ca),\u4efb\u4f55\u4e00\u9879\u5f02\u5e38\u90fd\u9700\u6df1\u7a76\u3002"}, {"name": "capex_split", "parameters": {"type": "object", "required": ["total_capex", "depreciation", "amortization"], "properties": {"industry": {"type": "string", "default": "manufacturing", "description": "\u884c\u4e1a\u540d(\u51b3\u5b9a\u7ef4\u6301\u6027\u6bd4\u4f8b): \u5236\u9020 0.80 / \u673a\u573a 0.30 / \u9ad8\u901f 0.30 / \u6c34\u7535 0.20 / \u4e92\u8054\u7f51 0.0 / \u623f\u5730\u4ea7 0.80"}, "total_capex": {"type": "number", "description": "\u603b\u8d44\u672c\u652f\u51fa(\u5143)"}, "amortization": {"type": "number", "description": "\u672c\u671f\u644a\u9500(\u5143)"}, "depreciation": {"type": "number", "description": "\u672c\u671f\u6298\u65e7(\u5143)"}}}, "description": "\u7ef4\u6301\u6027 vs \u6269\u5f20\u6027 CapEx \u5206\u79bb(Pattern 20 \u7ec4\u4ef6,FCF \u6821\u6b63\u7684\u57fa\u7840)\u3002\u7ef4\u6301\u6027 CapEx = (\u6298\u65e7+\u644a\u9500)\u00d7\u884c\u4e1a\u6bd4\u4f8b;\u6269\u5f20\u6027 CapEx = \u603b CapEx - \u7ef4\u6301\u6027\u3002\u8fd4\u56de maintenance_capex / growth_capex + \u884c\u4e1a\u6bd4\u4f8b + \u89e6\u53d1 W-XX\u3002"}, {"name": "correct_fcf", "parameters": {"type": "object", "required": ["ocf", "capex_total", "depreciation"], "properties": {"ocf": {"type": "number", "description": "\u7ecf\u8425\u6d3b\u52a8\u73b0\u91d1\u6d41\u91cf\u51c0\u989d(\u5143)"}, "industry": {"type": "string", "default": "manufacturing", "description": "\u884c\u4e1a\u540d(\u51b3\u5b9a\u7ef4\u6301\u6027 CapEx \u5360\u6298\u65e7\u644a\u9500\u7684\u6bd4\u4f8b): \u5236\u9020 0.80 / \u673a\u573a 0.30 / \u9ad8\u901f 0.30 / \u6c34\u7535 0.20 / \u4e92\u8054\u7f51 0.0 / \u623f\u5730\u4ea7 0.80"}, "capex_total": {"type": "number", "description": "\u8d2d\u5efa\u56fa\u5b9a\u8d44\u4ea7/\u65e0\u5f62\u8d44\u4ea7/\u5176\u4ed6\u957f\u671f\u8d44\u4ea7\u73b0\u91d1\u652f\u51fa\u5408\u8ba1(\u5143)"}, "amortization": {"type": "number", "description": "\u672c\u671f\u644a\u9500(\u5143),\u9ed8\u8ba4 0"}, "depreciation": {"type": "number", "description": "\u672c\u671f\u6298\u65e7(\u5143)"}, "growth_working_capital_change": {"type": "number", "default": 0, "description": "\u6bd4\u57fa\u671f\u589e\u52a0\u7684\u6269\u5f20\u6027\u8425\u8fd0\u73b0\u91d1\u652f\u51fa(\u5143),\u9ed8\u8ba4 0"}}}, "description": "FCF \u516c\u5f0f\u6821\u6b63(Pattern 20,\u672c\u4e66\u6838\u5fc3\u65b9\u6cd5\u8bba)\u3002\u6559\u79d1\u4e66\u516c\u5f0f\u4f1a\u8bef\u6740\u6210\u957f\u516c\u53f8;\u6821\u6b63\u516c\u5f0f: FCF = OCF - \u7ef4\u6301\u6027 CapEx + \u6bd4\u57fa\u671f\u589e\u52a0\u7684\u6269\u5f20\u6027\u8425\u8fd0\u652f\u51fa\u3002\u8fd4\u56de textbook_fcf vs corrected_fcf + \u89e6\u53d1\u7684 W-XX\u3002"}, {"name": "audit_filter", "parameters": {"type": "object", "required": ["opinion"], "properties": {"opinion": {"type": "string", "description": "\u5ba1\u8ba1\u610f\u89c1\u539f\u6587,\u53ef\u9009\u503c: \u6807\u51c6\u65e0\u4fdd\u7559\u610f\u89c1 / \u5e26\u5f3a\u8c03\u4e8b\u9879\u6bb5\u7684\u65e0\u4fdd\u7559\u610f\u89c1 / \u4fdd\u7559\u610f\u89c1 / \u65e0\u6cd5\u8868\u793a\u610f\u89c1 / \u5426\u5b9a\u610f\u89c1"}, "kam_items": {"type": "array", "items": {"type": "string"}, "description": "KAM(\u5173\u952e\u5ba1\u8ba1\u4e8b\u9879)\u63cf\u8ff0\u5217\u8868,\u53ef\u9009"}}}, "description": "\u5ba1\u8ba1\u610f\u89c1\u4e94\u5c42\u8fc7\u6ee4(Pattern 1)\u3002\u62ff\u5230\u4efb\u4f55\u8d22\u62a5\u7b2c\u4e00\u4ef6\u4e8b:\u7528\u5ba1\u8ba1\u610f\u89c1\u5feb\u901f\u5254\u9664 ~20% \u9ad8\u98ce\u9669\u516c\u53f8\u3002\u8fd4\u56de verdict(\u5254\u9664/\u9ad8\u98ce\u9669/\u590d\u6838/\u901a\u8fc7)+ \u89e6\u53d1\u7684 W-XX \u8b66\u793a\u3002"}, {"name": "safety_margin_check", "parameters": {"type": "object", "required": ["intrinsic_value", "market_price"], "properties": {"market_price": {"type": "number", "description": "\u5f53\u524d\u5e02\u573a\u4ef7\u683c(\u5143)"}, "intrinsic_value": {"type": "number", "description": "\u6bcf\u80a1\u5185\u5728\u4ef7\u503c(\u5143)"}}}, "description": "\u5b89\u5168\u8fb9\u9645\u5224\u65ad(Pattern 24)\u3002\u5355\u80a1\u9632\u7ebf: \u73b0\u4ef7 \u2264 \u5185\u5728\u4ef7\u503c\u00d760% \u5f3a\u4e70\u5165 / \u2264 80% \u89c2\u671b / > \u5185\u5728\u4ef7\u503c \u4e0d\u4e70\u5165 / > 120% \u9ad8\u4f30\u3002\u8fd4\u56de margin_of_safety + decision + \u89e6\u53d1\u7684 W-XX\u3002"}, {"name": "decompose_roe", "parameters": {"type": "object", "required": ["ebit", "revenue", "total_assets", "equity", "interest_expense", "income_tax", "net_income"], "properties": {"ebit": {"type": "number", "description": "\u606f\u7a0e\u524d\u5229\u6da6(\u5143)"}, "equity": {"type": "number", "description": "\u80a1\u4e1c\u6743\u76ca\u5408\u8ba1(\u5143)"}, "revenue": {"type": "number", "description": "\u8425\u4e1a\u6536\u5165(\u5143)"}, "income_tax": {"type": "number", "description": "\u6240\u5f97\u7a0e\u8d39\u7528(\u5143)"}, "net_income": {"type": "number", "description": "\u51c0\u5229\u6da6(\u5143)"}, "total_assets": {"type": "number", "description": "\u8d44\u4ea7\u603b\u8ba1(\u5143)"}, "interest_expense": {"type": "number", "description": "\u5229\u606f\u8d39\u7528(\u8d22\u52a1\u8d39\u7528)(\u5143)"}}}, "description": "ROE \u4e94\u56e0\u7d20\u5206\u89e3(Pattern 16)\u3002\u516c\u5f0f: ROE = \u7ecf\u8425\u5229\u6da6\u7387 \u00d7 \u8d44\u4ea7\u5468\u8f6c\u7387 \u00d7 \u8d22\u52a1\u6210\u672c\u6548\u5e94\u6bd4\u7387 \u00d7 \u8d22\u52a1\u6760\u6746\u500d\u6570 \u00d7 \u7a0e\u7387\u6548\u5e94\u6bd4\u7387\u3002\u8fd4\u56de 5 \u4e2a\u56e0\u5b50 + 3 \u8272\u5224\u65ad(\ud83d\udfe2\u7ecf\u8425\u9a71\u52a8 / \ud83d\udfe1\u6760\u6746\u9a71\u52a8\u6216\u7a0e\u7387\u9a71\u52a8 / \ud83d\udd34\u7cfb\u7edf\u6027\u52a3\u52bf)\u3002"}, {"name": "dcf_two_stage", "parameters": {"type": "object", "required": ["fcf_series", "growth_rates", "terminal_growth"], "properties": {"net_debt": {"type": "number", "default": 0, "description": "\u51c0\u503a\u52a1(\u603b\u503a\u52a1-\u73b0\u91d1)(\u5143),\u9ed8\u8ba4 0"}, "fcf_series": {"type": "array", "items": {"type": "number"}, "description": "\u8be6\u7ec6\u9884\u6d4b\u671f FCF \u5e8f\u5217(\u5143)"}, "growth_rates": {"type": "array", "items": {"type": "number"}, "description": "\u9010\u5e74\u589e\u957f\u7387(\u5c0f\u6570),\u957f\u5ea6 = fcf_series"}, "discount_rate": {"type": "number", "default": 0.08, "description": "\u6298\u73b0\u7387(\u672c\u4e66 8% \u7b80\u5316),\u9ed8\u8ba4 0.08"}, "terminal_growth": {"type": "number", "description": "\u6c38\u7eed\u589e\u957f\u7387(\u5c0f\u6570,\u786c\u7ea6\u675f < discount_rate)"}, "financial_assets": {"type": "number", "default": 0, "description": "\u91d1\u878d\u8d44\u4ea7(\u8d26\u9762\u4ef7\u503c)(\u5143),\u9ed8\u8ba4 0"}, "minority_interest": {"type": "number", "default": 0, "description": "\u5c11\u6570\u80a1\u4e1c\u6743\u76ca(\u5143),\u9ed8\u8ba4 0"}, "shares_outstanding": {"type": "number", "default": 1, "description": "\u6d41\u901a\u80a1\u6570(\u4e07\u80a1),\u9ed8\u8ba4 1.0"}, "long_term_equity_investment": {"type": "number", "default": 0, "description": "\u957f\u671f\u80a1\u6743\u6295\u8d44(\u4e09\u5c42\u6b21\u8c03\u6574)(\u5143),\u9ed8\u8ba4 0"}}}, "description": "\u4e24\u9636\u6bb5 DCF \u4f30\u503c(Pattern 25)\u3002V = \u03a3(FCF_t / (1+r)^t) + Terminal PV\u3002\u786c\u7ea6\u675f: g < r(\u6c38\u7eed\u589e\u957f\u7387\u5fc5\u987b < \u6298\u73b0\u7387)\u3002\u8fd4\u56de enterprise_value / detailed_pv / terminal_pv / terminal_value + \u89e6\u53d1 W-XX\u3002"}, {"name": "industry_method_selector", "parameters": {"type": "object", "required": ["industry", "is_profitable"], "properties": {"industry": {"type": "string", "description": "\u884c\u4e1a\u540d,\u4f8b\u5982: \u94f6\u884c / \u623f\u5730\u4ea7 / \u673a\u573a / \u6c34\u7535 / \u9ad8\u901f / \u767d\u9152 / \u5b89\u9632 / \u5316\u5de5 / \u4e92\u8054\u7f51 / \u901a\u7528"}, "growth_rate": {"type": "number", "default": 0, "description": "\u5e74\u589e\u957f\u7387(\u5c0f\u6570,\u5982 0.15 = 15%),\u9ed8\u8ba4 0"}, "is_profitable": {"type": "boolean", "description": "\u51c0\u5229\u6da6\u662f\u5426\u4e3a\u6b63"}, "is_capital_intensive": {"type": "boolean", "default": false, "description": "\u662f\u5426\u91cd\u8d44\u4ea7(\u5316\u5de5/\u94a2\u94c1/\u822a\u7a7a/\u6c34\u6ce5),\u9ed8\u8ba4 false"}, "is_brand_differentiated": {"type": "boolean", "default": false, "description": "\u662f\u5426\u54c1\u724c\u5dee\u5f02\u5316(\u6d88\u8d39\u54c1/\u533b\u836f/\u79d1\u6280),\u9ed8\u8ba4 false"}}}, "description": "\u4f30\u503c\u65b9\u6cd5\u9009\u62e9\u51b3\u7b56\u6811(Pattern 19 + 28)\u3002\u6309\u884c\u4e1a + \u662f\u5426\u76c8\u5229 + \u589e\u957f\u7387 + \u54c1\u724c\u5dee\u5f02\u5316 + \u91cd\u8d44\u4ea7 5 \u7ef4\u8f93\u5165,\u63a8\u8350 primary method + alternatives + \u89e6\u53d1 W-XX\u3002\u94f6\u884c\u2192PB / \u623f\u5730\u4ea7\u2192RNAV / \u673a\u573a/\u6c34\u7535/\u9ad8\u901f\u2192DCF / \u767d\u9152\u2192PE / \u4e8f\u635f\u8f7b\u8d44\u4ea7\u2192PS\u3002"}, {"name": "value_trap_screener", "parameters": {"type": "object", "properties": {"pb": {"type": "number", "description": "\u5e02\u51c0\u7387 PB(\u53ef\u9009)"}, "roe": {"type": "number", "description": "ROE \u5c0f\u6570(\u53ef\u9009,\u5982 0.15 = 15%)"}, "industry": {"type": "string", "description": "\u884c\u4e1a\u540d(\u53ef\u9009)"}, "is_cycle_bottom": {"type": "boolean", "description": "\u662f\u5426\u5904\u4e8e\u5468\u671f\u4f4e\u70b9(\u9632\u5fa1\u914d\u7f6e\u673a\u4f1a,\u975e\u9677\u9631)"}, "has_recent_dilution": {"type": "boolean", "description": "\u8fd1\u671f\u662f\u5426\u6709\u5b9a\u589e\u6298\u4ef7\u6216\u5927\u80a1\u4e1c\u51cf\u6301"}, "one_off_income_ratio": {"type": "number", "description": "\u4e00\u6b21\u6027\u6536\u76ca\u5360\u51c0\u5229\u6da6\u6bd4\u4f8b(\u5c0f\u6570),> 0.30 \u89e6\u53d1"}, "has_management_change": {"type": "boolean", "description": "\u7ba1\u7406\u5c42\u662f\u5426\u8fd1\u671f\u53d8\u52a8"}, "has_substitution_risk": {"type": "boolean", "description": "\u662f\u5426\u9762\u4e34\u65b0\u80fd\u6e90/\u65b0\u6280\u672f\u66ff\u4ee3"}, "growth_rate_assumption": {"type": "number", "description": "\u4f30\u503c\u4e2d\u4f7f\u7528\u7684\u589e\u957f\u7387\u5047\u8bbe(\u5c0f\u6570),\u9ed8\u8ba4 None"}}}, "description": "6 \u7c7b\u4ef7\u503c\u9677\u9631\u8bc6\u522b(Pattern 27)\u3002PB < 1 \u4e0d\u4e00\u5b9a\u4fbf\u5b9c,\u8981\u770b ROE \u80fd\u5426\u8dd1\u8d62\u8d44\u672c\u6210\u672c\u3002\u8bc6\u522b: \u884c\u4e1a\u4e0b\u884c\u5468\u671f / \u6cbb\u7406\u95ee\u9898 / \u66ff\u4ee3\u98ce\u9669 / \u5468\u671f\u4f4e\u70b9 / \u8f6c\u578b\u9635\u75db / \u4e00\u6b21\u6027\u6536\u76ca\u5360\u5229\u6da6>30%\u3002\u8fd4\u56de is_value_trap + verdict + signals + \u89e6\u53d1 W-XX\u3002"}]', '2026-08-20 01:59:30.514248+00:00', '2026-08-20 01:59:36.473236+00:00', NULL);

-- skill_file (54 rows)
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('c0a6f304-be66-4e82-a6ed-728c33e891cc', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch14-绝对估值法.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch14-绝对估值法.md', NULL, 5241, '6030e51f2daec30a5fb6ef60ccb586c6aa1f0cfde1e6ab6624527c6275435c2a', 1454, 0);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('d623ff39-4ad6-4d0f-a166-115f8e554338', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch01-财报基础.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch01-财报基础.md', NULL, 5426, '029ecea6af58ba1c102b309d81380facec259eaa2c71011269b94c727ca12e06', 1297, 1);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('44628f5f-358d-4356-9117-e675a91aaf14', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch02-财报原理.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch02-财报原理.md', NULL, 4447, '311c26bccb5fdbf7bd1150df9e66e2e8b646a2b163d05c3697eacf1968a0c8ed', 1056, 2);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('d9ea4de3-85dd-4404-b160-246bc7f96d07', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch07-资本管理.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch07-资本管理.md', NULL, 6548, 'c683cd00aa64ad1763cf1cde82136c9a002f6b0abfacd6688de667b694948b91', 1569, 3);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('98670de0-0ebc-4b71-8681-2be8ae320023', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch11-回归现金.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch11-回归现金.md', NULL, 4578, '49719fb2ce0dfd3a491c99a894168df000d38ded796d0a5efa2385a3095cd2bf', 1125, 4);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('0f2b44bf-4e12-4440-8f8d-8ca97b337dd5', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch06-财报与估值.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch06-财报与估值.md', NULL, 5277, 'fcd94ffae793b8f0cd43a15fa93b6403417dc90d99a95f18fc3e4a518479ee57', 1302, 5);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('c008783b-c923-40f5-8ec2-65b02f2c4c1b', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch16-实战案例.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch16-实战案例.md', NULL, 7779, 'b94b8b8d5468c19bf54af418a5e0ee428bd801fc64c7aca96b905df1f423d0de', 2137, 6);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('f04c7e8e-e58b-4010-97b1-3a47b3df1645', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch08-资产资本.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch08-资产资本.md', NULL, 5125, '28242ea271acbff8f2c5cf998f0979a71d817d910d5e6b82bb3ce2daede1ddf8', 1249, 7);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('c0c55817-693c-4d08-b06d-846baa5a4a76', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch05-财报项目逻辑.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch05-财报项目逻辑.md', NULL, 5532, '476ecd98e96d8c65c44b730a0b5b8d1be913ec55c7f3c01c8c0a7b82788065f9', 1366, 8);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('72122dd2-4646-4a5e-915c-225dc56b69f8', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch12-股票价格和股票价值.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch12-股票价格和股票价值.md', NULL, 5067, '0873ab1ad926d8bb3b6f47e9cf18910618f5266825bef29f8a615cac8a00a372', 1224, 9);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('7c7b0335-4715-463e-b66d-b7ae03f6361a', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch04-公司战略.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch04-公司战略.md', NULL, 6099, 'a58bc28f4f7f48fce8c0ada38558f08cdeec10b7b752a565863930b03add1a41', 1537, 10);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('82d1083c-59a3-4409-a4d9-38e7869ef107', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch15-自由现金流贴现估值.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch15-自由现金流贴现估值.md', NULL, 6090, 'bcbfd7a2d3c5e121ae64453b934ec813dc6e6dd3f6bfd3a4c56673ff1904972f', 1594, 11);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('30fe34df-f4bb-4aff-80a3-0eaef30fd986', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch10-资产资本与股权价值.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch10-资产资本与股权价值.md', NULL, 5081, 'cfd6a66df61358c33be53c5fa16d2a6ddef37cdf9a41886009d361115fe8cdf4', 1266, 12);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('3dc5889b-3cae-45d9-b601-0d4c0a09bf76', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch13-相对估值法.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch13-相对估值法.md', NULL, 5511, 'a8a00ff65868691175f572e28e14d53ad14941125f97ba8aeff84b2df8bb1473', 1380, 13);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('a029799d-a071-43d5-8062-ab11d19891cc', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch03-公司财报分析的框架.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch03-公司财报分析的框架.md', NULL, 5660, '0868a7c79b8e1fa3172ef7eab61a0c9da8409f10a0a15cb94db8c318a9ef808a', 1411, 14);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('8ca1bc45-d9b4-4f99-8ae7-98108dc371b8', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/chapters/ch09-股权价值增加分析.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/chapters/ch09-股权价值增加分析.md', NULL, 5339, 'ec6087659b23c03c4e5dcfd5c9ead8ee7bdd613ceaaf99d7a7b498b75dd88248', 1319, 15);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('1db0db3f-61d8-4dee-87c0-7edca6bedda1', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/glossary.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/glossary.md', NULL, 13049, 'd6cd5c22c739e0850f1b12959f66ff7a2011cb65ff00d8efb2007d5089c8376b', 3536, 16);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('ef30832a-5329-4808-be5d-667cf1711bfb', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/cheatsheet.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/cheatsheet.md', NULL, 10745, 'f1ae4639fd31b103261ceaeb74556e710f34610791dea5ece8c535f612e5dec4', 3111, 17);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('24a5e896-239c-4842-8cad-e79a64dd02bc', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/README.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/README.md', NULL, 5898, '0b3dba3f52963caf3da0e4f1ca1674e2277e176aa8708a9f03824a0f746e684b', 2322, 18);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('9f72dee2-3f2a-4d43-8ba4-c2d5bdce2856', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/patterns.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/patterns.md', NULL, 14662, '42a342b6578c144a0f73970a7a1cf2187f987c0018f79d6278bde5b01bfc4a6c', 3870, 19);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('11bc88d6-991d-4277-bb20-0dc11fe9c4a2', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/nav/by-layer.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/nav/by-layer.md', NULL, 5782, '7503855fe4653a05a9ef2522d619a96e4c83ea5b715296846fe30dbcf381ae17', 1504, 20);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('7909981f-b050-4647-8c24-f94aba8f7444', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/nav/by-case.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/nav/by-case.md', NULL, 7437, '48e14336d57209544ff50ab99a8911147a1936d4ae9d0fa142f8faf12878f891', 2128, 21);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('4b778f82-596c-4c23-ab52-062e052b5b92', '74317fe3-437d-4a09-b926-fcef7c16f107', 'references/nav/by-framework.md', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/references/nav/by-framework.md', NULL, 16835, '1da34240576c2f6f73db449ccba387c6fa269c34ef6a8bab55fdd906b321c347', 5026, 22);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('625dfb55-cfe3-455c-8c15-f980ff1f633a', '74317fe3-437d-4a09-b926-fcef7c16f107', 'examples/valuation_playbook.py', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/examples/valuation_playbook.py', NULL, 6878, '1dad6f9e44937208dc77ec2267ef4aa8a086fda6cb02be2176527b2fc3e2fdf2', 3316, 23);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('13d5aa2c-d265-4b9b-9dd2-7d2dfc81437c', '74317fe3-437d-4a09-b926-fcef7c16f107', 'examples/basic_usage.py', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/examples/basic_usage.py', NULL, 2902, '6a3741b691288105406b290dfde46e03a61a58634a434562c8aa74c6b07dc06e', 1337, 24);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('dcfc20cd-223e-4ea6-b412-c684ab7263b8', '74317fe3-437d-4a09-b926-fcef7c16f107', 'examples/langgraph_workflow.py', 'skills/74317fe3-437d-4a09-b926-fcef7c16f107/19474ae347a680fa60fc8f1f33a74f90064d5247f288d6b9792f0c0ccca18999.zip', 'financial-analysis-valuation/examples/langgraph_workflow.py', NULL, 3621, '2a6a41dccc25a0f32047aee057aa5fad304c1ea01534ac207b907df4afbc5278', 1733, 25);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('d418d1eb-1a7c-43bb-950c-924482d22203', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch14-绝对估值法.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch14-绝对估值法.md', NULL, 5241, '6030e51f2daec30a5fb6ef60ccb586c6aa1f0cfde1e6ab6624527c6275435c2a', 1454, 0);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('0f980e30-1557-4b91-90c6-3ef310c2c8a1', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch01-财报基础.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch01-财报基础.md', NULL, 5426, '029ecea6af58ba1c102b309d81380facec259eaa2c71011269b94c727ca12e06', 1297, 1);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('39d4d101-b541-48dc-a1c7-6f93f2fab151', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch02-财报原理.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch02-财报原理.md', NULL, 4447, '311c26bccb5fdbf7bd1150df9e66e2e8b646a2b163d05c3697eacf1968a0c8ed', 1056, 2);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('2cc5a525-f9e8-4ecc-ad31-14e33b5edfc4', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch07-资本管理.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch07-资本管理.md', NULL, 6548, 'c683cd00aa64ad1763cf1cde82136c9a002f6b0abfacd6688de667b694948b91', 1569, 3);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('44de965f-59bd-4175-a661-4cae4e96ba99', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch11-回归现金.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch11-回归现金.md', NULL, 4578, '49719fb2ce0dfd3a491c99a894168df000d38ded796d0a5efa2385a3095cd2bf', 1125, 4);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('cf91e142-e48b-4c73-b811-6ad1f72a8b85', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch06-财报与估值.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch06-财报与估值.md', NULL, 5277, 'fcd94ffae793b8f0cd43a15fa93b6403417dc90d99a95f18fc3e4a518479ee57', 1302, 5);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('89833dc9-d9fe-473f-bc42-b2fe5dcfc456', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch16-实战案例.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch16-实战案例.md', NULL, 7779, 'b94b8b8d5468c19bf54af418a5e0ee428bd801fc64c7aca96b905df1f423d0de', 2137, 6);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('3f59c740-b62a-4b4d-9750-1e522fb725d6', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch08-资产资本.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch08-资产资本.md', NULL, 5125, '28242ea271acbff8f2c5cf998f0979a71d817d910d5e6b82bb3ce2daede1ddf8', 1249, 7);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('e4e5a72a-7dbf-49f8-bc43-e2cfa19a02a1', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch05-财报项目逻辑.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch05-财报项目逻辑.md', NULL, 5532, '476ecd98e96d8c65c44b730a0b5b8d1be913ec55c7f3c01c8c0a7b82788065f9', 1366, 8);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('d8e124b8-d486-4a20-8bf5-df28b19d6e2d', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch12-股票价格和股票价值.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch12-股票价格和股票价值.md', NULL, 5067, '0873ab1ad926d8bb3b6f47e9cf18910618f5266825bef29f8a615cac8a00a372', 1224, 9);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('b6a66ac3-b4c0-4a7e-bde4-e3f3de2b54c0', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch04-公司战略.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch04-公司战略.md', NULL, 6099, 'a58bc28f4f7f48fce8c0ada38558f08cdeec10b7b752a565863930b03add1a41', 1537, 10);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('da396c6d-9583-43f9-ba8e-a021ec9430e7', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch15-自由现金流贴现估值.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch15-自由现金流贴现估值.md', NULL, 6090, 'bcbfd7a2d3c5e121ae64453b934ec813dc6e6dd3f6bfd3a4c56673ff1904972f', 1594, 11);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('9b13dde3-5fcf-4b60-975a-7df67a930c4e', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch10-资产资本与股权价值.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch10-资产资本与股权价值.md', NULL, 5081, 'cfd6a66df61358c33be53c5fa16d2a6ddef37cdf9a41886009d361115fe8cdf4', 1266, 12);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('3e04cb2c-6802-4343-bd3e-4c883110062e', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch13-相对估值法.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch13-相对估值法.md', NULL, 5511, 'a8a00ff65868691175f572e28e14d53ad14941125f97ba8aeff84b2df8bb1473', 1380, 13);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('19ed1695-4436-4c31-aa08-54e2fe788569', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch03-公司财报分析的框架.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch03-公司财报分析的框架.md', NULL, 5660, '0868a7c79b8e1fa3172ef7eab61a0c9da8409f10a0a15cb94db8c318a9ef808a', 1411, 14);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('249a7a3a-9d8d-42c3-a6ba-d0d3c3b3aa92', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/chapters/ch09-股权价值增加分析.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/chapters/ch09-股权价值增加分析.md', NULL, 5339, 'ec6087659b23c03c4e5dcfd5c9ead8ee7bdd613ceaaf99d7a7b498b75dd88248', 1319, 15);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('ab180e99-43ee-4db9-8456-16704163e3a4', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/author-warnings.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/author-warnings.md', NULL, 16950, '9fc50dec15be218568307b1ccf547085105fd8bd0db568938b9b55056c9194b4', 4425, 16);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('bf88bee4-228b-4254-b8ee-a7298988c848', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/glossary.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/glossary.md', NULL, 13049, 'd6cd5c22c739e0850f1b12959f66ff7a2011cb65ff00d8efb2007d5089c8376b', 3536, 17);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('8e3d33f0-168d-46a9-81e5-88729af46018', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/cheatsheet.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/cheatsheet.md', NULL, 10745, 'f1ae4639fd31b103261ceaeb74556e710f34610791dea5ece8c535f612e5dec4', 3111, 18);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('11520576-5739-4cc0-8dfb-a8add15279da', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/patterns.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/patterns.md', NULL, 14662, '42a342b6578c144a0f73970a7a1cf2187f987c0018f79d6278bde5b01bfc4a6c', 3870, 19);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('60430be2-4e60-4cec-b925-f64e9c3888b8', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/playbook.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/playbook.md', NULL, 20384, '073190b887489172c6475353260f888a8d61c869611327261aa54118e669f088', 5833, 20);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('9b5a07d6-febc-4a42-9e0e-e123a0b3af16', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/nav/by-layer.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/nav/by-layer.md', NULL, 5782, '7503855fe4653a05a9ef2522d619a96e4c83ea5b715296846fe30dbcf381ae17', 1504, 21);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('8f7e4a25-ef08-4c59-a0cb-7386c13c2ec5', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/nav/by-case.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/nav/by-case.md', NULL, 7437, '48e14336d57209544ff50ab99a8911147a1936d4ae9d0fa142f8faf12878f891', 2128, 22);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('8c77f505-d556-421b-8548-b638b16347c4', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/nav/by-framework.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/nav/by-framework.md', NULL, 16835, '1da34240576c2f6f73db449ccba387c6fa269c34ef6a8bab55fdd906b321c347', 5026, 23);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('ba5f72b5-9df3-4a10-bb3b-a79ba842ebb9', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'references/case-sop.md', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/references/case-sop.md', NULL, 15551, '4b5a39fe33d24f1b9a418983e8f3227bcdfc9c960c2aae50f88193582b55abaf', 4837, 24);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('7a38e15c-cf58-4dad-b72d-039e49ecf673', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'examples/valuation_playbook.py', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/examples/valuation_playbook.py', NULL, 7787, 'dd602b43766f971f4cd6da38d4cb5689a4b9a9d3d3f8ab00cf57d00baf0def26', 3577, 25);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('fa781e09-d6c5-4adf-ba58-a29158d6308b', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'examples/basic_usage.py', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/examples/basic_usage.py', NULL, 7264, '62d1d2e9fb595a8bea309efe1480108a04971a79da2fd26f5440845ebf83b8cd', 3270, 26);
INSERT INTO skill_file (id, skill_id, relative_path, oss_path, entry_name, description, size_bytes, content_hash, token_estimate, sort_order) VALUES ('4d196d43-38f4-458a-a7d2-cd68b6d2b890', 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'examples/langgraph_workflow.py', 'skills/a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f/7dcada2b818444c8f0cab8f5bc931e12de33610015e03dd7db1088447eff2916.zip', 'financial-analysis-valuation/examples/langgraph_workflow.py', NULL, 6231, '51eb6e7731a5d2552eabb083ef6d01a207f70a66524dc87c02406c84897de938', 2893, 27);

-- user_skill_binding (2 rows, owner=user_id=1 / super_admin)
INSERT INTO user_skill_binding (id, user_id, skill_id, source, source_ref_id, status, enabled_at, enabled_by) VALUES ('e3257669-2f0a-498e-833f-adbc4bf05866', 1, '74317fe3-437d-4a09-b926-fcef7c16f107', 'user_self', NULL, 'disabled', '2026-08-19 03:23:11.791717+00:00', 1);
INSERT INTO user_skill_binding (id, user_id, skill_id, source, source_ref_id, status, enabled_at, enabled_by) VALUES ('6bcdd325-5a50-40c3-82fb-287544832a47', 1, 'a8b7fd17-06b1-4c00-9d43-ac8c36ef9f0f', 'user_self', NULL, 'enabled', '2026-08-20 01:59:45.438549+00:00', 1);

-- session_skill_mount (1 row, tied to a closed dev session)
INSERT INTO session_skill_mount (id, session_id, skill_id, op, source, mounted_at) VALUES ('643aa22c-343e-41f1-ad31-5c4af2707efc', '775cb0ec-2247-425a-b1cf-03df216ca101', '74317fe3-437d-4a09-b926-fcef7c16f107', 'add', 'manual', '2026-08-19 03:24:45.638930+00:00');

COMMIT;

-- ============================================================
-- Verification queries (run after import)
-- ============================================================
-- SELECT COUNT(*) FROM skill;                  -- 2
-- SELECT COUNT(*) FROM skill_file;             -- 54
-- SELECT COUNT(*) FROM user_skill_binding;     -- 2
-- SELECT COUNT(*) FROM session_skill_mount;    -- 1