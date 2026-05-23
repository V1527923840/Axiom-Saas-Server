# Admin Server - 技术文档

## 项目概述

基于 NestJS 的 SaaS 平台管理后台服务端，支持 TypeORM/Mongoose 双数据库策略、JWT 认证、多因素登录（社交登录）。

## 技术栈

### 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 11.x | Web 框架 |
| TypeScript | 5.9.x | 开发语言 |
| TypeORM | 0.3.x | 关系型数据库 ORM（PostgreSQL） |
| Mongoose | 9.x | 文档数据库 ORM（MongoDB） |

### 认证与安全
| 技术 | 用途 |
|------|------|
| Passport JWT | JWT 认证策略 |
| @nestjs/jwt | JWT 令牌管理 |
| bcryptjs | 密码加密 |
| class-validator | DTO 验证 |

### 文件存储
| 驱动 | 说明 |
|------|------|
| multer (local) | 本地文件存储 |
| multer-s3 | AWS S3 直接上传 |
| @aws-sdk/s3-request-presigner | S3 预签名 URL |

### 社交登录
- Google Auth (auth-google)
- Facebook Auth (auth-facebook)
- Apple Sign In (auth-apple)

### 其他依赖
- Swagger (@nestjs/swagger) - API 文档
- nestjs-i18n - 国际化
- nodemailer - 邮件发送
- release-it - 版本发布

---

## 目录结构

```
admin-server/src/
├── app.module.ts              # 根模块，数据库选择入口
├── main.ts                    # 应用入口，Swagger 配置
│
├── auth/                      # 认证模块（JWT + 社交登录）
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── config/                # 认证配置
│   ├── decorators/            # @CurrentUser() 等装饰器
│   ├── dto/                   # 认证 DTO
│   └── strategies/            # Passport 策略
│
├── auth-google/               # Google 社交登录
├── auth-facebook/            # Facebook 社交登录
├── auth-apple/               # Apple 社交登录
│
├── users/                     # 用户模块
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── infrastructure/
│       └── persistence/       # 数据持久化（relational/document）
│
├── roles/                     # 角色管理
├── menus/                     # 菜单管理（树形结构）
├── plans/                     # 订阅计划
├── subscriptions/             # 用户订阅
├── bills/                     # 账单与消费记录
├── content/                   # 内容管理
├── categories/                # 分类管理
├── statuses/                  # 状态定义
├── session/                   # 会话管理
├── etl/                       # ETL 任务
├── scrape-log/               # 爬虫日志管理
├── oss/                       # 对象存储浏览器
├── parse-task/               # 解析任务模块
│
├── files/                     # 文件上传模块
│   ├── files.module.ts
│   ├── files.service.ts
│   ├── config/                # 文件配置
│   └── infrastructure/
│       ├── persistence/       # 文件元数据存储
│       └── uploader/          # 上传器实现（local/s3/s3-presigned）
│
├── mail/                      # 邮件发送模块
├── mailer/                    # 邮件发送基础设施
├── home/                      # 主页模块
├── social/                    # 社交登录基础设施
│
├── database/                  # 数据库配置
│   ├── config/                # 数据库配置
│   ├── migrations/            # TypeORM 迁移
│   ├── seeds/                 # 数据种子
│   │   ├── relational/         # 关系型数据库种子
│   │   └── document/          # MongoDB 种子
│   ├── typeorm-config.service.ts
│   ├── mongoose-config.service.ts
│   └── data-source.ts
│
├── config/                    # 应用配置
├── i18n/                      # 国际化文件
└── utils/                     # 工具函数
```

### 模块划分原则

项目采用**六边形架构（Hexagonal Architecture）**：

```
module/
├── module.module.ts           # 模块入口，组合基础设施和业务逻辑
├── module.service.ts          # 业务逻辑
├── module.controller.ts       # API 端点
├── dto/                       # Data Transfer Objects
├── domain/                    # 领域实体
└── infrastructure/
    └── persistence/           # 数据持久化
        ├── relational/         # PostgreSQL 实现
        │   ├── entities/      # TypeORM 实体
        │   ├── repositories/  # TypeORM Repository
        │   └── mappers/       # Entity <-> Domain 转换
        └── document/          # MongoDB 实现
            ├── schemas/        # Mongoose Schema
            └── repositories/  # Mongoose Repository
```

---

## 代码规范

### NestJS 模块组织

```typescript
// module.module.ts - 标准模块结构
@Module({
  imports: [
    // 依赖的其他模块
    InfrastructurePersistenceModule,
    forwardRef(() => RelatedModule),
  ],
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService, InfrastructurePersistenceModule],
})
export class ModuleModule {}
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 模块目录 | kebab-case | `user-roles` |
| 类名 | PascalCase | `UsersService`, `UserEntity` |
| 文件名 | kebab-case | `user.entity.ts`, `create-user.dto.ts` |
| 接口名 | PascalCase + `I` 前缀（可选） | `UserRepository` |
| 变量/函数 | camelCase | `getUserById`, `userData` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 数据库表名 | snake_case | `user_roles` |
| DTO 属性 | camelCase | `firstName`, `emailAddress` |

### TypeScript 规范

- 启用 `strictNullChecks`
- 使用 `interface` 而非 `type` 来定义对象类型（除非需要联合类型）
- 所有函数参数和返回值必须有类型标注（公共 API）
- 使用 `{ infer: true }` 配合 `configService.get()` 以获得正确的类型检查

```typescript
// 正确
const port = configService.get('app.port', { infer: true });

// 错误 - 会导致类型推断失败
const port = configService.get('app.port');
```

### 测试规范

- 测试文件命名：`*.spec.ts`
- 使用 `it` 时必须以 `should` 开头

```typescript
// 正确
it('should return user by id', async () => {
  // ...
});

// 错误
it('returns user by id', async () => {
  // ...
});
```

---

## 环境变量规范

### .env.example 结构

```bash
# ============ 应用配置 ============
NODE_ENV=development
APP_PORT=3000
APP_NAME=app
APP_HEADER_LANGUAGE=x-custom-lang
APP_FALLBACK_LANGUAGE=en

# ============ 数据库配置 ============
# 方式1：使用 DATABASE_URL（推荐）
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# 方式2：分别配置
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=admin
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres

# 公共配置
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false

# ============ 认证配置 ============
AUTH_JWT_SECRET=your-jwt-secret
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=your-refresh-secret
AUTH_REFRESH_TOKEN_EXPIRES_IN=7d
AUTH_FORGOT_SECRET=your-forgot-secret
AUTH_FORGOT_TOKEN_EXPIRES_IN=1h
AUTH_CONFIRM_EMAIL_SECRET=your-confirm-email-secret
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=7d

# ============ 社交登录配置 ============
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# ============ 文件上传配置 ============
FILE_DRIVER=local  # local | s3 | s3-presigned
ACCESS_KEY_ID=your-aws-access-key
SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_S3_BUCKET=your-bucket
AWS_S3_REGION=us-east-1
MINIO_ENDPOINT=your-minio-endpoint  # 可选，用于 MinIO 兼容的对象存储

# ============ 邮件配置 ============
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@example.com
MAIL_PASSWORD=your-password
```

### 必需的环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` 或数据库分别配置 | PostgreSQL 连接信息 | - |
| `AUTH_JWT_SECRET` | JWT 签名密钥 | - |
| `AUTH_JWT_TOKEN_EXPIRES_IN` | Access Token 过期时间 | `15m` |
| `AUTH_REFRESH_SECRET` | Refresh Token 密钥 | - |
| `AUTH_REFRESH_TOKEN_EXPIRES_IN` | Refresh Token 过期时间 | `7d` |
| `FILE_DRIVER` | 文件存储驱动 | `local` |
| `MINIO_ENDPOINT` | MinIO 兼容对象存储端点（可选） | - |

---

## 数据库策略

### 双数据库支持

项目通过 `databaseConfig().isDocumentDatabase` 标志切换数据库：

```typescript
// app.module.ts
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({ useClass: MongooseConfigService })
  : TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService });
```

**关系型（PostgreSQL）**：
- 使用 TypeORM
- 自动递增 ID 作为主键（业务实体）
- UUID 用于特定场景

**文档型（MongoDB）**：
- 使用 Mongoose
- Schema 定义

### 主键策略

| 模块 | 主键类型 | 说明 |
|------|---------|------|
| User | UUID | 用户全局唯一 |
| Role | 自增 | 角色数量有限 |
| Menu | UUID | 树形结构需要 |
| Plan | UUID | 订阅计划 |
| Subscription | UUID | 用户订阅 |
| Bill | UUID | 账单记录 |
| ScrapeLog | UUID | 爬虫日志 |

---

## 迁移机制

### 迁移命令

```bash
# 生成迁移（需要先修改实体）
npm run migration:generate -- src/database/migrations/MigrationName

# 运行迁移
npm run migration:run

# 回滚上一个迁移
npm run migration:revert

# 创建空白迁移
npm run migration:create -- src/database/migrations/MigrationName

# 删除所有表（危险！）
npm run schema:drop
```

### 迁移文件命名

格式：`{timestamp}-{PascalCaseName}.ts`

示例：`1747000000000-CreatePlansTable.ts`

### 迁移编写规范

```typescript
// src/database/migrations/{timestamp}-CreatePlansTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePlansTable1747000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'plan',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('plan');
  }
}
```

### 迁移类型模式

**业务表迁移**：使用 `queryRunner.createTable()` 创建标准表结构。

**菜单迁移**：插入菜单并分配给角色时，使用原始 SQL：

```typescript
// 菜单迁移示例：插入菜单并分配给 Admin 角色
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::uuid,
      '菜单名称',
      'menu-code',
      'IconName',
      '/menu-path',
      NULL,
      5,
      'active',
      NOW(),
      NOW()
    )
  `);

  // 分配给 Admin 角色 (roleId = 2)
  await queryRunner.query(`
    INSERT INTO role_menu ("roleId", "menuId")
    SELECT 2, id FROM menu WHERE code = 'menu-code'
  `);
}
```

**Seed-Only 表**：某些表（如 `scrape_log`）通过 Seed 创建而非迁移，使用原始 SQL 在 SeedService 中建表：

```typescript
// scrape-log-seed.service.ts - Seed 中建表
async run() {
  const sql = `
  CREATE TABLE IF NOT EXISTS scrape_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    source varchar(50) NOT NULL,
    targettime timestamptz NOT NULL,
    ...
  );
  `;
  await this.dataSource.query(sql);
}
```

---

## Seed 机制

### Seed 命令

```bash
# 生成 Relational Seed（使用 Hygen）
npm run seed:create:relational

# 生成 Document Seed（使用 Hygen）
npm run seed:create:document

# 运行 Seeds
npm run seed:run:relational
npm run seed:run:document
```

### Seed 结构

```
src/database/seeds/
├── relational/                # PostgreSQL Seeds
│   ├── seed.module.ts          # Seed 根模块
│   ├── run-seed.ts             # 入口
│   ├── user/                   # 按模块组织
│   ├── role/
│   ├── menu/
│   ├── status/
│   ├── content/
│   └── scrape_log/            # 爬虫日志种子（建表脚本）
└── document/                   # MongoDB Seeds
    ├── seed.module.ts
    ├── run-seed.ts
    └── user/
```

### Seed 模块示例

```typescript
// user-seed.module.ts
@Module({
  imports: [RelationalUserPersistenceModule],
  providers: [UserSeedService],
})
export class UserSeedModule {}
```

---

## 常用开发命令

### 启动

```bash
# 开发模式（监听文件变化）
npm run start:dev

# 调试模式
npm run start:debug

# 生产模式
npm run start:prod
```

### 代码质量

```bash
# ESLint 检查
npm run lint

# ESLint 自动修复
npm run lint -- --fix

# Prettier 格式化
npm run format

# 类型检查（NestJS build）
npm run build
```

### 测试

```bash
# 运行所有测试
npm test

# 监听模式（热重载）
npm run test:watch

# 覆盖率
npm run test:cov

# E2E 测试
npm run test:e2e

# Docker 环境 E2E 测试
npm run test:e2e:relational:docker
npm run test:e2e:document:docker
```

### 资源生成

使用 Hygen 生成器快速创建模块：

```bash
# 生成关系型资源（Entity + Service + Controller + DTOs）
npm run generate:resource:relational

# 生成文档型资源
npm run generate:resource:document

# 生成支持双数据库的资源
npm run generate:resource:all-db

# 为现有资源添加字段
npm run add:property:to-all-db
```

---

## 提交规范

项目使用 Commitlint + Conventional Commits：

```bash
# 格式
git commit -m "type(scope): subject"

# 示例
git commit -m "feat(users): add subscription fields to user entity"
git commit -m "fix(auth): resolve refresh token expiration issue"
git commit -m "docs: update API documentation for bills endpoint"
git commit -m "chore(deps): upgrade typeorm to 0.3.28"
```

### Commit Types

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不是修复或功能） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具变更 |

---

## API 文档

启动应用后访问：`http://localhost:3000/docs`

Swagger UI 提供：
- 所有 API 端点文档
- 请求/响应示例
- Bearer Auth 认证支持
- 全局参数（语言设置）

---

## API 响应格式规范

### 标准响应格式

后端 API 统一使用以下响应格式之一：

**格式 A: 标准分页响应（使用 `infinityPagination`）**
```typescript
// 用于列表端点 (GET /users, GET /tasks 等)
{
  data: T[],
  total: number,
  page: number,
  pageSize: number
}
```

**格式 B: 单对象响应（直接返回 `{ data }`）**
```typescript
// 用于详情端点 (GET /users/:id, POST /tasks 等)
{
  data: T
}
```

**格式 C: 操作结果响应（使用 `{ success, data }` 包装）**
```typescript
// 用于 create/update/delete 操作
{
  success: true,
  data: T,
  message?: string
}
```

### 已废弃的格式（避免使用）

**不要使用** `{ success: true, data: { versions: [...] } }` 这种嵌套格式，这会导致前端需要额外解包。

如果必须使用 `{ success, data }` 包装，**必须**确保前端 `api.ts` 的 auto-unwrap 机制已处理。

### 示例：正确的响应

```typescript
// ✅ 正确 - 使用 infinityPagination
return infinityPagination(items, { page, limit }, total)

// ✅ 正确 - 直接返回对象
return { data: createdItem }

// ❌ 错误 - 嵌套过多层
return { success: true, data: { items: [...] } }
// 这会导致 response.data.data.items
```

## 常见模式

### Repository + Mapper 模式

```typescript
// Repository 负责数据持久化
// Mapper 负责 Entity <-> Domain 转换
async create(data: Omit<User, 'id'>): Promise<User> {
  const persistenceModel = UserMapper.toPersistence(data);
  const newEntity = await this.userRepository.save(
    this.userRepository.create(persistenceModel),
  );
  return UserMapper.toDomain(newEntity);
}
```

### 分页模式

```typescript
const [entities, total] = await this.userRepository.findAndCount({
  skip: (paginationOptions.page - 1) * paginationOptions.limit,
  take: paginationOptions.limit,
  order: { createdAt: 'DESC' },
});
```

### 树形结构构建（两遍遍历）

```typescript
// 第一遍：建立 map
filteredMenus.forEach((menu) => {
  menuMap.set(menu.id, MenuMapper.toDomain(menu, []));
});
// 第二遍：构建树
filteredMenus.forEach((menu) => {
  const domainMenu = menuMap.get(menu.id)!;
  if (menu.parentId && menuMap.has(menu.parentId)) {
    const parent = menuMap.get(menu.parentId)!;
    parent.children = parent.children || [];
    parent.children.push(domainMenu);
  } else {
    roots.push(domainMenu);
  }
});
```

### 选择性更新模式

```typescript
async update(id: string, payload: Partial<User>): Promise<User | null> {
  const entity = await this.userRepository.findOne({ where: { id } });
  if (!entity) return null;

  // 只更新提供的字段
  if (payload.name !== undefined) entity.name = payload.name;
  if (payload.email !== undefined) entity.email = payload.email;

  return UserMapper.toDomain(await this.userRepository.save(entity));
}
```

### 权限控制模式（MenuAccessGuard）

MenuAccessGuard 提供基于菜单路径的动态权限控制，无需硬编码角色权限。

**原理：**
1. 控制器使用 `@UseGuards(AuthGuard('jwt'), MenuAccessGuard)`
2. 如果接口有 `@MenuPaths('/xxx')`，使用显式路径
3. 否则自动从 URL 推导（如 `/api/v1/plans/:id` → `/plans`）
4. 检查用户是否拥有该菜单路径（从 role_menu、plan_menu、user_menu 三源合并）

**子路径匹配：**
拥有 `/versions` 菜单可访问 `/versions`、`/versions/sources`、`/versions/:id` 等所有子路由。

**使用示例：**
```typescript
// 方式1：显式指定菜单路径
@Get()
@MenuPaths('/plans')
async findAll() { ... }

// 方式2：自动推导（URL /api/v1/roles → 推导 /roles）
@Get()
async findAll() { ... }
```

**数据库菜单分配：**
菜单权限来自三个表：
- `role_menu` - 角色分配的菜单
- `plan_menu` - 套餐包含的菜单
- `user_menu` - 用户额外单独分配的菜单

用户可访问的菜单 = 三者并集（去重）

**Admin 权限：**
`role.id === 1` 的用户拥有绝对权限，绕过所有 MenuAccessGuard 检查。

---

## 开发注意事项

### 数据库同步

- **禁止**在生产环境使用 `DATABASE_SYNCHRONIZE=true`
- 所有数据库变更必须通过迁移文件
- 修改实体后运行 `npm run migration:generate`

### 循环依赖

模块间存在循环依赖时使用 `forwardRef()`：

```typescript
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => UsersModule)],
})
export class AuthModule {}
```

### ConfigService 类型安全

**必须**在 `configService.get()` 中使用 `{ infer: true }`：

```typescript
// 正确 - 获得类型推断
const port = configService.get('app.port', { infer: true });

// 错误 - 类型为 any
const port = configService.get('app.port');
```

### 软删除

实体使用 `deletedAt` 字段实现软删除：

```typescript
@DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
deletedAt?: Date | null;
```

### 社交登录回调

社交登录配置后，回调 URL 格式：
- 开发环境：`http://localhost:3000/api/v1/auth/{provider}/callback`
- 生产环境：`https://your-domain.com/api/v1/auth/{provider}/callback`

---

## 版本发布

```bash
# 发布版本（自动生成 CHANGELOG）
npm run release
```

发布配置使用 `release-it` + Conventional Commits preset。