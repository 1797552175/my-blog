# 项目功能规格（my-blog）

本文档描述当前已实现的功能点，前后端分层列出。功能有更新时，先更新本文档并经确认后再改代码。

---

## 1. 项目概述

- **前端**：Next.js 14 (App Router)、React 18、Tailwind CSS、Headless UI
- **后端**：Spring Boot 3、Java 21、Spring Security、JWT、JPA
- **数据库**：MariaDB 11
- **部署**：Docker Compose + Nginx 统一入口

---

## 2. 后端功能（apps/api）

### 2.1 技术栈

- Spring Boot 3、Java 21
- Spring Security + JWT
- Spring Data JPA、MariaDB
- Validation（DTO 校验）

### 2.2 模块与 API 一览

| 模块     | 方法 | 路径                     | 认证 | 说明           |
|----------|------|--------------------------|------|----------------|
| 健康检查 | GET  | /api/health              | 否   | 存活探针       |
| 认证     | POST | /api/auth/register       | 否   | 注册           |
| 认证     | POST | /api/auth/login          | 否   | 登录           |
| 文章     | GET  | /api/posts               | 否   | 分页列表(已发布) |
| 文章     | GET  | /api/posts/slug/{slug}   | 否   | 按 slug 查详情 |
| 文章     | GET  | /api/posts/me            | 是   | 当前用户文章列表 |
| 文章     | POST | /api/posts               | 是   | 创建文章       |
| 文章     | PUT  | /api/posts/{id}          | 是   | 更新文章       |
| 文章     | DELETE | /api/posts/{id}        | 是   | 删除文章       |

认证方式：除上述公开接口外，其余请求需在 Header 中携带 `Authorization: Bearer <token>`。

### 2.3 数据模型（简要）

- **User**：用户名、邮箱、密码（加密存储）
- **Post**：标题、slug、正文（Markdown）、是否发布、作者、创建/更新时间

接口请求/响应字段详见 [API 文档](API.md)。

---

## 3. 数据库表结构

数据库：MariaDB 11，库名 `blog`。表由 JPA 实体映射生成（ddl-auto: update），以下与实体一致。

### 3.1 users（用户表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 用户主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间（插入时写入） |
| updated_at | TIMESTAMP | 非空 | 更新时间（插入/更新时写入） |
| username | VARCHAR(32) | 非空、唯一 | 登录用户名 |
| email | VARCHAR(128) | 非空、唯一 | 邮箱 |
| password_hash | VARCHAR(255) | 非空 | 密码 BCrypt 加密后的密文 |

**索引**

- `idx_users_username`：username，唯一
- `idx_users_email`：email，唯一

---

### 3.2 posts（文章表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 文章主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| title | VARCHAR(200) | 非空 | 文章标题 |
| slug | VARCHAR(220) | 非空、唯一 | URL 友好标识，用于详情页路径 |
| content_markdown | LONGTEXT | 非空 | 正文（Markdown） |
| published | BIT(1) / BOOLEAN | 非空 | 是否已发布：0 草稿，1 已发布 |
| author_id | BIGINT | 非空、外键 | 作者用户 ID，关联 users.id |

**索引**

- `idx_posts_slug`：slug，唯一
- `idx_posts_author_id`：author_id（查某用户的文章列表）

**外键**

- `author_id` → `users(id)`

---

### 3.3 post_tags（文章标签表，多对多集合）

由 Post 实体的 `tags`（ElementCollection）生成，一篇文章对应多行。

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| post_id | BIGINT | 非空、联合主键之一、外键 | 文章 ID，关联 posts.id |
| tag | VARCHAR(255) | 非空、联合主键之一 | 标签名（当前业务未使用，表结构已存在） |

**说明**：当前前端与 API 未使用标签功能，仅表结构存在。

---

## 4. 前端功能（apps/web）

### 4.1 技术栈

- Next.js 14 (App Router)、React 18
- Tailwind CSS、@headlessui/react、@heroicons/react

### 4.2 页面与路由

| 路由         | 文件                    | 功能         | 登录要求 |
|--------------|-------------------------|--------------|----------|
| /            | app/page.js             | 首页         | 否       |
| /login       | app/login/page.js       | 登录         | 否       |
| /register    | app/register/page.js    | 注册         | 否       |
| /posts       | app/posts/page.js       | 文章列表     | 否       |
| /posts/[slug]| app/posts/[slug]/page.js| 文章详情     | 否       |
| /write       | app/write/page.js       | 写/发文章    | 是       |
| /me/posts    | app/me/posts/page.js    | 我的文章     | 是       |

### 4.3 前端与后端对应关系

| 页面/操作      | 调用的 API                          |
|----------------|-------------------------------------|
| 登录           | POST /api/auth/login                |
| 注册           | POST /api/auth/register             |
| 文章列表       | GET /api/posts?page=&size=&sort=    |
| 文章详情       | GET /api/posts/slug/{slug}          |
| 我的文章       | GET /api/posts/me?page=&size=&sort= |
| 创建文章       | POST /api/posts                     |
| 更新文章       | PUT /api/posts/{id}                 |
| 删除文章       | DELETE /api/posts/{id}               |

前端通过 `lib/api.js` 统一发请求，浏览器侧使用 `NEXT_PUBLIC_API_BASE`（如 /api），服务端 SSR 使用 `INTERNAL_API_URL` 直连后端。Token 存于 localStorage，请求时带 `Authorization: Bearer <token>`。

---

## 5. 开发与更新流程

- **功能有更新时**：先更新本文档（及 [API.md](API.md) 如涉及接口），写清新增/修改的功能点与接口。
- **输出文档**：将变更的文档内容先给确认方过目。
- **确认后**：再按文档修改后端/前端代码。

---

## 6. 相关文档

- [API 接口文档](API.md)：请求/响应格式、错误码、分页等
- [README.md](../README.md)：本地运行、部署、环境变量
- [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md)：架构、数据流、优化建议
