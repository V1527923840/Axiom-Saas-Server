# API 接口文档

**Base URL:** `http://localhost:3000/api`
**API Version:** v1
**Swagger Docs:** `http://localhost:3000/docs`

---

## 目录

- [认证模块 (Auth)](#认证模块-auth)
  - [邮箱登录](#邮箱登录)
  - [邮箱注册](#邮箱注册)
  - [确认邮箱](#确认邮箱)
  - [确认新邮箱](#确认新邮箱)
  - [忘记密码](#忘记密码)
  - [重置密码](#重置密码)
  - [获取当前用户](#获取当前用户)
  - [刷新 Token](#刷新-token)
  - [登出](#登出)
  - [更新当前用户](#更新当前用户)
  - [删除当前用户](#删除当前用户)
- [用户模块 (Users)](#用户模块-users)
  - [创建用户](#创建用户)
  - [查询用户列表](#查询用户列表)
  - [获取单个用户](#获取单个用户)
  - [更新用户](#更新用户)
  - [删除用户](#删除用户)
- [文件模块 (Files)](#文件模块-files)
  - [上传文件](#上传文件)
- [Home](#home)

---

## 认证模块 (Auth)

### 邮箱登录

登录系统，返回访问令牌和刷新令牌。

- **URL:** `POST /api/v1/auth/email/login`
- **认证:** 无
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| email | string | 是 | 邮箱地址 | `test1@example.com` |
| password | string | 是 | 密码 (最小6位) | `password123` |

- **响应 (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 900,
  "user": {
    "id": 1,
    "email": "test1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": { "id": 1, "name": "admin" },
    "status": { "id": 1, "name": "active" }
  }
}
```

---

### 邮箱注册

注册新用户账号。注册后需要通过邮件链接确认邮箱。

- **URL:** `POST /api/v1/auth/email/register`
- **认证:** 无
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| email | string | 是 | 邮箱地址 | `test1@example.com` |
| password | string | 是 | 密码 (最小6位) | `password123` |
| firstName | string | 是 | 名 | `John` |
| lastName | string | 是 | 姓 | `Doe` |

- **响应 (204):** 无内容

---

### 确认邮箱

通过邮件中的哈希值确认邮箱地址。

- **URL:** `POST /api/v1/auth/email/confirm`
- **认证:** 无
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| hash | string | 是 | 邮件中的确认哈希 | `abc123...` |

- **响应 (204):** 无内容

---

### 确认新邮箱

确认更改后的新邮箱地址。

- **URL:** `POST /api/v1/auth/email/confirm/new`
- **认证:** 无
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| hash | string | 是 | 邮件中的确认哈希 | `abc123...` |

- **响应 (204):** 无内容

---

### 忘记密码

请求密码重置，会向注册邮箱发送包含重置链接的邮件。

- **URL:** `POST /api/v1/auth/forgot/password`
- **认证:** 无
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| email | string | 是 | 邮箱地址 | `test1@example.com` |

- **响应 (204):** 无内容

---

### 重置密码

使用哈希值重置密码。

- **URL:** `POST /api/v1/auth/reset/password`
- **认证:** 无
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| hash | string | 是 | 重置哈希 | `abc123...` |
| password | string | 是 | 新密码 (最小6位) | `newpassword123` |

- **响应 (204):** 无内容

---

### 获取当前用户

获取当前登录用户的信息。

- **URL:** `GET /api/v1/auth/me`
- **认证:** Bearer Token (JWT)

- **响应 (200):**

```json
{
  "id": 1,
  "email": "test1@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": { "id": 1, "name": "admin" },
  "status": { "id": 1, "name": "active" }
}
```

---

### 刷新 Token

使用刷新令牌获取新的访问令牌。

- **URL:** `POST /api/v1/auth/refresh`
- **认证:** Bearer Token (JWT-Refresh)

- **响应 (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 900
}
```

---

### 登出

使当前会话失效。

- **URL:** `POST /api/v1/auth/logout`
- **认证:** Bearer Token (JWT)
- **响应 (204):** 无内容

---

### 更新当前用户

更新当前登录用户的资料信息。

- **URL:** `PATCH /api/v1/auth/me`
- **认证:** Bearer Token (JWT)
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| firstName | string | 否 | 名 | `John` |
| lastName | string | 否 | 姓 | `Doe` |
| email | string | 否 | 新邮箱地址 | `new.email@example.com` |
| password | string | 否 | 新密码 (最小6位) | `newpassword123` |
| oldPassword | string | 否 | 旧密码 (修改密码时必填) | `oldpassword123` |
| photo | object | 否 | 头像文件信息 | `{ id, path }` |

- **响应 (200):** 返回更新后的用户对象

---

### 删除当前用户

软删除当前登录用户。

- **URL:** `DELETE /api/v1/auth/me`
- **认证:** Bearer Token (JWT)
- **响应 (204):** 无内容

---

## 用户模块 (Users)

> **注意:** 用户模块需要 `admin` 角色权限。

### 创建用户

创建一个新用户。

- **URL:** `POST /api/v1/users`
- **认证:** Bearer Token (JWT) + Admin Role
- **请求体:**

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| email | string | 是 | 邮箱地址 | `user@example.com` |
| password | string | 是 | 密码 (最小6位) | `password123` |
| firstName | string | 是 | 名 | `John` |
| lastName | string | 是 | 姓 | `Doe` |
| role | object | 否 | 角色对象 `{ id, name }` | `{ id: 1, name: "admin" }` |
| status | object | 否 | 状态对象 `{ id, name }` | `{ id: 1, name: "active" }` |
| photo | object | 否 | 头像文件信息 | `{ id, path }` |

- **响应 (201):** 返回创建的用户对象

---

### 查询用户列表

分页查询用户列表。

- **URL:** `GET /api/v1/users`
- **认证:** Bearer Token (JWT) + Admin Role
- **Query 参数:**

| 字段 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | number | 否 | 页码 | `1` |
| limit | number | 否 | 每页数量 (最大50) | `10` |
| filters | string | 否 | JSON 字符串，过滤条件 | - |
| sort | string | 否 | JSON 字符串，排序规则 | - |

**filters 参数示例:**
```
filters={"roles":[{"id":1,"name":"admin"}]}
```

**sort 参数示例:**
```
sort=[{"orderBy":"firstName","order":"asc"}]
```

- **响应 (200):**

```json
{
  "data": [
    {
      "id": 1,
      "email": "test1@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": { "id": 1, "name": "admin" },
      "status": { "id": 1, "name": "active" }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

### 获取单个用户

通过 ID 获取用户详情。

- **URL:** `GET /api/v1/users/:id`
- **认证:** Bearer Token (JWT) + Admin Role
- **路径参数:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户 ID |

- **响应 (200):** 返回用户对象

---

### 更新用户

通过 ID 更新用户信息。

- **URL:** `PATCH /api/v1/users/:id`
- **认证:** Bearer Token (JWT) + Admin Role
- **路径参数:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户 ID |

- **请求体:** 同 [创建用户](#创建用户)，所有字段可选

- **响应 (200):** 返回更新后的用户对象

---

### 删除用户

通过 ID 删除用户。

- **URL:** `DELETE /api/v1/users/:id`
- **认证:** Bearer Token (JWT) + Admin Role
- **路径参数:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户 ID |

- **响应 (204):** 无内容

---

## 文件模块 (Files)

### 上传文件

上传文件到服务器。

- **URL:** `POST /api/v1/files/upload`
- **认证:** Bearer Token (JWT)
- **Content-Type:** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 要上传的文件 |

- **响应 (201):**

```json
{
  "file": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "path": "uploads/550e8400-e29b-41d4-a716-446655440000.png"
  }
}
```

---

## Home

### 获取应用信息

健康检查接口。

- **URL:** `GET /api/`
- **认证:** 无

- **响应 (200):** 返回应用基本信息

---

## 数据模型

### User (用户)

```json
{
  "id": "number",
  "email": "string | null",
  "firstName": "string | null",
  "lastName": "string | null",
  "provider": "string",
  "socialId": "string | null",
  "photo": "File | null",
  "role": "Role",
  "status": "Status",
  "createdAt": "Date",
  "updatedAt": "Date",
  "deletedAt": "Date | null"
}
```

### Role (角色)

```json
{
  "id": "number",
  "name": "string"
}
```

### Status (状态)

```json
{
  "id": "number",
  "name": "string"
}
```

### File (文件)

```json
{
  "id": "string (UUID)",
  "path": "string"
}
```

---

## 认证说明

### JWT Bearer Token

大多数接口需要携带 Bearer Token 进行认证，格式如下：

```
Authorization: Bearer <token>
```

### Token 刷新机制

访问令牌有效期为 15 分钟 (`AUTH_JWT_TOKEN_EXPIRES_IN=15m`)。

当令牌过期时，使用 `/api/v1/auth/refresh` 接口获取新的访问令牌。

### 角色权限

| 角色 | 说明 |
|------|------|
| admin | 管理员，可管理所有用户 |
| user | 普通用户，仅可操作自己的数据 |

---

## 错误响应

### 标准错误格式

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

### 常见 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 成功 (无返回内容) |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
