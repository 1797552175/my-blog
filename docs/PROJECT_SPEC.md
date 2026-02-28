# 项目功能规格（AI 小说创作与互动阅读平台）

本文档描述当前已实现的功能点，前后端分层列出。功能有更新时，先更新本文档并经确认后再改代码。

---

## 1. 项目概述

- **定位**：**AI 小说创作与互动阅读平台**。核心功能：
  - **写小说**：首页与 AI 对话获取灵感 → 保存到灵感库 → 选灵感开始写小说
  - **AI 互动阅读**：选择剧情走向，AI 实时续写专属故事章节
  - **小说库**：浏览已完成小说或参与 AI 互动续写
- **说明**：本产品专注于「小说」创作与阅读，不提供「文章」功能。
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

| 模块     | 方法 | 路径                        | 认证 | 说明               |
|----------|------|-----------------------------|------|--------------------|
| 健康检查 | GET  | /api/health                 | 否   | 存活探针           |
| 认证     | POST | /api/auth/register          | 否   | 注册               |
| 认证     | POST | /api/auth/login             | 否   | 登录               |
| 标签     | GET  | /api/tags                   | 否   | 全站标签列表(含次数) |
| ~~文章~~ | ~~GET~~  | ~~/api/posts~~                  | ~~否~~   | ~~(已下线)~~ |
| ~~文章~~ | ~~GET~~  | ~~/api/posts/slug/{slug}~~      | ~~否~~   | ~~(已下线)~~     |
| ~~文章~~ | ~~GET~~  | ~~/api/posts/search~~           | ~~否~~   | ~~(已下线)~~ |
| ~~文章~~ | ~~GET~~  | ~~/api/posts/{id}~~             | ~~是~~   | ~~(已下线)~~ |
| ~~文章~~ | ~~GET~~  | ~~/api/posts/me~~               | ~~是~~   | ~~(已下线)~~   |
| ~~文章~~ | ~~POST~~ | ~~/api/posts~~                  | ~~是~~   | ~~(已下线)~~ |
| ~~文章~~ | ~~PUT~~  | ~~/api/posts/{id}~~             | ~~是~~   | ~~(已下线)~~ |
| ~~文章~~ | ~~DELETE~~ | ~~/api/posts/{id}~~           | ~~是~~   | ~~(已下线)~~           |
| ~~评论~~ | ~~GET~~  | ~~/api/posts/{postId}/comments~~ | ~~否~~   | ~~(已下线)~~   |
| ~~评论~~ | ~~POST~~ | ~~/api/posts/{postId}/comments~~ | ~~否~~   | ~~(已下线)~~ |
| 故事种子 | GET  | /api/story-seeds              | 否   | 已发布故事种子分页列表 |
| 故事种子 | GET  | /api/story-seeds/slug/{slug}  | 否   | 按 slug 查故事详情 |
| 故事种子 | GET  | /api/story-seeds/me           | 是   | 当前用户故事种子列表 |
| 故事种子 | GET  | /api/story-seeds/{id}         | 是   | 作者获取单条(编辑用) |
| 故事种子 | POST | /api/story-seeds              | 是   | 创建故事种子 |
| 故事种子 | PUT  | /api/story-seeds/{id}         | 是   | 更新故事种子（仅作者） |
| 故事种子 | DELETE | /api/story-seeds/{id}       | 是   | 删除故事种子（仅作者） |
| 分支点   | POST   | /api/story-seeds/{id}/branch-points | 是   | 创建分支点（含选项，仅作者） |
| 分支点   | PUT    | /api/story-seeds/{id}/branch-points/{pointId} | 是   | 更新分支点（仅作者） |
| 分支点   | DELETE | /api/story-seeds/{id}/branch-points/{pointId} | 是   | 删除分支点（仅作者） |
| 世界观   | GET    | /api/story-seeds/{id}/characters | 是   | 角色列表（仅作者） |
| 世界观   | POST   | /api/story-seeds/{id}/characters | 是   | 创建角色（仅作者） |
| 世界观   | PUT    | /api/story-seeds/{id}/characters/{charId} | 是   | 更新角色（仅作者） |
| 世界观   | DELETE | /api/story-seeds/{id}/characters/{charId} | 是   | 删除角色（仅作者） |
| 世界观   | GET    | /api/story-seeds/{id}/terms | 是   | 专有名词列表（仅作者） |
| 世界观   | POST   | /api/story-seeds/{id}/terms | 是   | 创建专有名词（仅作者） |
| 世界观   | PUT    | /api/story-seeds/{id}/terms/{termId} | 是   | 更新专有名词（仅作者） |
| 世界观   | DELETE | /api/story-seeds/{id}/terms/{termId} | 是   | 删除专有名词（仅作者） |
| 世界观   | GET    | /api/story-seeds/{id}/readme | 是   | 故事设定文档（仅作者） |
| 世界观   | PUT    | /api/story-seeds/{id}/readme | 是   | 更新故事设定文档（仅作者） |
| 读者 Fork | POST  | /api/story-seeds/{id}/fork   | 是   | 开始阅读（创建或返回已有 fork） |
| 读者 Fork | GET   | /api/reader-forks/me         | 是   | 我的阅读副本列表 |
| 读者 Fork | GET   | /api/reader-forks/{id}       | 是   | 获取 fork 详情 |
| 读者 Fork | GET   | /api/reader-forks/{id}/commits | 是 | 获取 fork 的章节链（版本历史） |
| 读者 Fork | POST  | /api/reader-forks/{id}/choose | 是   | 在分支点选择选项并生成下一章（AI） |
| 读者 Fork | POST  | /api/reader-forks/{id}/rollback | 是   | 回退到某章节（丢弃该章之后） |
| Pull Request | POST | /api/story-seeds/{id}/pull-requests | 是   | 读者提交分支给作者 |
| Pull Request | GET  | /api/story-seeds/{id}/pull-requests | 是   | 作者查看该故事的 PR 列表 |
| Pull Request | GET  | /api/story-pull-requests/{prId} | 是   | 作者/读者查看 PR 详情 |
| Pull Request | PATCH | /api/story-pull-requests/{prId} | 是   | 作者改 PR 状态（merged/closed） |

认证方式：除上述公开接口外，其余请求需在 Header 中携带 `Authorization: Bearer <token>`。

### 2.3 数据模型（简要）

- **User**：用户名、邮箱、密码（加密存储）
- **Post**：标题、slug、正文（Markdown）、是否发布、标签（tags）、作者、灵感（inspiration，可选）、创建/更新时间
- **Comment**：文章、用户（可选）、游客昵称/邮箱/网址、内容、创建时间
- **Inspiration**：用户、标题、对话消息；与 Post 可选关联（小说可记录来源灵感）
- **StorySeed**：故事种子（主线），作者、标题、slug、开头正文（openingMarkdown）、风格参数（styleParams）、许可（licenseType）、是否发布、创建/更新时间

接口请求/响应字段详见 [API 文档](API.md)。

---

## 3. 数据库表结构

数据库：MariaDB 11，库名 `blog`。表由 JPA 实体映射生成（ddl-auto: update）或迁移脚本创建。**共 29 张表**，以下与当前代码/迁移一致；若库中还有由迁移单独创建的表（如 story_contributors、prompt_templates 等），以实际库结构为准。

**说明**：字段在库中的中文说明可通过 Flyway 迁移 `V12__add_column_comments.sql` 写入列注释（COMMENT），便于在数据库工具中直接查看。

### 3.1 users（用户表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 用户主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间（插入时写入） |
| updated_at | TIMESTAMP | 非空 | 更新时间（插入/更新时写入） |
| username | VARCHAR(32) | 非空、唯一 | 登录用户名 |
| email | VARCHAR(128) | 非空、唯一 | 邮箱 |
| password_hash | VARCHAR(255) | 非空 | 密码 BCrypt 加密后的密文 |
| persona_prompt | TEXT | 可空 | 作者分身/人设提示词 |
| persona_enabled | BIT(1) | 非空 | 是否启用作者分身 |
| default_ai_model | VARCHAR(64) | 可空 | 默认使用的 AI 模型 |

**索引**：idx_users_username（username，唯一）、idx_users_email（email，唯一）。

---

### 3.2 posts（文章/旧小说表，保留兼容）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| title | VARCHAR(200) | 非空 | 标题 |
| slug | VARCHAR(220) | 非空、唯一 | URL 友好标识 |
| content_markdown | LONGTEXT | 非空 | 正文（Markdown） |
| published | BIT(1) | 非空 | 是否已发布 |
| author_id | BIGINT | 非空、外键 | 作者用户 ID |
| inspiration_id | BIGINT | 可空、外键 | 来源灵感 ID |

**索引**：idx_posts_slug、idx_posts_author_id。**外键**：author_id → users(id)，inspiration_id → inspirations(id)。

---

### 3.3 post_tags（文章标签表，多对多）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| post_id | BIGINT | 非空、联合主键之一、外键 | 文章 ID，关联 posts.id |
| tag | VARCHAR(255) | 非空、联合主键之一 | 标签名 |

---

### 3.4 comments（评论表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 评论主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| post_id | BIGINT | 非空、外键 | 文章 ID，关联 posts.id |
| user_id | BIGINT | 可空、外键 | 登录用户 ID，空表示游客 |
| guest_name | VARCHAR(64) | 可空 | 游客昵称 |
| guest_email | VARCHAR(128) | 可空 | 游客邮箱 |
| guest_url | VARCHAR(512) | 可空 | 游客网址 |
| content | VARCHAR(2000) | 非空 | 评论内容（纯文本） |

**索引**：post_id、created_at。**外键**：post_id → posts(id)，user_id → users(id)。

---

### 3.5 inspirations（灵感表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| user_id | BIGINT | 非空、外键 | 所属用户 ID |
| title | VARCHAR(200) | 可空 | 灵感标题 |

**索引**：user_id。**外键**：user_id → users(id)。

---

### 3.6 inspiration_messages（灵感对话消息表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| inspiration_id | BIGINT | 非空、外键 | 灵感 ID |
| seq | INT | 非空 | 消息序号 |
| role | VARCHAR(20) | 非空 | 角色：user/assistant |
| content | TEXT | 非空 | 消息内容 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |

**外键**：inspiration_id → inspirations(id)。

---

### 3.7 story_seeds（故事种子表，互动续写用）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| title | VARCHAR(200) | 非空 | 故事标题 |
| slug | VARCHAR(220) | 非空、唯一 | URL 友好标识 |
| opening_markdown | LONGTEXT | 非空 | 开头正文（Markdown） |
| style_params | VARCHAR(2000) | 可空 | AI 风格参数 |
| license_type | VARCHAR(32) | 可空 | 许可类型 |
| published | BIT(1) | 非空 | 是否已发布 |
| author_id | BIGINT | 非空、外键 | 作者用户 ID |
| story_summary | VARCHAR(2000) | 可空 | 小说概述/简介 |
| intent_keywords | JSON | 可空 | 意图分析关键字配置 |

**索引**：slug 唯一、author_id、published。**外键**：author_id → users(id)。

---

### 3.8 story_branch_points（故事分支点表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子 ID（兼容旧数据） |
| story_id | BIGINT | 可空、外键 | 小说 ID，关联 stories.id |
| sort_order | INT | 非空 | 分支点顺序 |
| anchor_text | VARCHAR(500) | 可空 | 分支前剧情摘要 |

**外键**：story_seed_id → story_seeds(id)，story_id → stories(id)。

---

### 3.9 story_options（故事选项表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| branch_point_id | BIGINT | 非空、外键 | 分支点 ID |
| label | VARCHAR(200) | 非空 | 选项文案 |
| sort_order | INT | 非空 | 选项顺序 |
| influence_notes | TEXT | 可空 | 影响描述（供 AI 用） |

**外键**：branch_point_id → story_branch_points(id)。

---

### 3.10 story_characters（故事角色表，世界观）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子 ID |
| story_id | BIGINT | 可空、外键 | 小说 ID |
| name | VARCHAR(100) | 非空 | 角色名 |
| description | TEXT | 可空 | 性格、背景等 |
| sort_order | INT | 非空 | 展示顺序 |

**外键**：story_seed_id → story_seeds(id)，story_id → stories(id)。

---

### 3.11 story_terms（故事专有名词表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子 ID |
| story_id | BIGINT | 可空、外键 | 小说 ID |
| term_type | VARCHAR(32) | 非空 | 如 place/item/skill |
| name | VARCHAR(100) | 非空 | 名称 |
| definition | TEXT | 可空 | 简短定义 |
| sort_order | INT | 非空 | 展示顺序 |

**外键**：story_seed_id → story_seeds(id)，story_id → stories(id)。

---

### 3.12 story_readme（故事设定文档表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子 ID |
| story_id | BIGINT | 可空、外键 | 小说 ID |
| content_markdown | LONGTEXT | 可空 | 设定文档（Markdown） |

**外键**：story_seed_id → story_seeds(id)，story_id → stories(id)。

---

### 3.13 stories（小说表，统一主线/开源小说）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| title | VARCHAR(200) | 非空 | 小说标题 |
| slug | VARCHAR(220) | 非空、唯一 | URL 友好标识 |
| published | BIT(1) | 非空 | 是否已发布 |
| is_open_source | BIT(1) | 可空 | 是否开源可 Fork |
| open_source_license | VARCHAR(50) | 可空 | 开源协议（如 MIT/CC-BY） |
| fork_count | INT | 可空 | 被 Fork 次数 |
| star_count | INT | 可空 | Star 数 |
| style_params | VARCHAR(2000) | 可空 | AI 风格参数 |
| license_type | VARCHAR(32) | 可空 | 许可类型 |
| story_summary | VARCHAR(2000) | 可空 | 小说概述/简介 |
| intent_keywords | JSON | 可空 | 意图分析关键字配置 |
| author_id | BIGINT | 非空、外键 | 作者用户 ID |
| inspiration_id | BIGINT | 可空、外键 | 来源灵感 ID |

**索引**：slug 唯一、author_id、published、is_open_source、open_source_license。**外键**：author_id → users(id)，inspiration_id → inspirations(id)。

---

### 3.14 story_tags（小说标签表，多对多）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| story_id | BIGINT | 非空、联合主键之一、外键 | 小说 ID |
| tag | VARCHAR(255) | 非空、联合主键之一 | 标签名 |

**外键**：story_id → stories(id)。

---

### 3.15 story_chapters（小说章节表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_id | BIGINT | 非空、外键 | 小说 ID |
| author_id | BIGINT | 可空、外键 | 章节作者（原作者或贡献者） |
| parent_chapter_id | BIGINT | 可空、外键 | 父章节 ID，null 表示主线起点 |
| sort_order | INT | 非空 | 章节在该故事线内序号 |
| title | VARCHAR(200) | 非空 | 章节标题 |
| content_markdown | LONGTEXT | 可空 | 章节正文（Markdown） |
| is_mainline | BIT(1) | 可空 | 是否主创的主线 |
| branch_name | VARCHAR(200) | 可空 | 分支名称（如：某读者的暗黑结局） |

**外键**：story_id → stories(id)，author_id → users(id)，parent_chapter_id → story_chapters(id)。

---

### 3.16 story_stars（小说 Star/收藏表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_id | BIGINT | 非空、外键 | 小说 ID |
| user_id | BIGINT | 非空、外键 | 用户 ID |

**唯一约束**：(story_id, user_id)。**外键**：story_id → stories(id)，user_id → users(id)。

---

### 3.17 reader_forks（读者阅读副本表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子 ID（兼容旧互动） |
| story_id | BIGINT | 可空、外键 | 小说 ID（从某小说 Fork） |
| reader_id | BIGINT | 非空、外键 | 读者用户 ID |
| title | VARCHAR(200) | 可空 | 副本标题 |
| from_chapter_sort_order | INT | 可空 | 从第几章开始续写（作者章节序号） |

**唯一约束**：(story_id, reader_id)。**外键**：story_seed_id → story_seeds(id)，story_id → stories(id)，reader_id → users(id)。（迁移中或有 fork_type 等字段，以实际库为准。）

---

### 3.18 story_commits（故事章节/提交表，读者 Fork 内 AI 生成章节链）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| fork_id | BIGINT | 非空、外键 | 读者 fork ID |
| parent_commit_id | BIGINT | 可空、外键 | 上一章节 ID |
| branch_point_id | BIGINT | 可空、外键 | 分支点 ID |
| option_id | BIGINT | 可空、外键 | 选项 ID |
| content_markdown | LONGTEXT | 非空 | AI 生成本章正文 |
| sort_order | INT | 非空 | 章节顺序 |

**外键**：fork_id → reader_forks(id)，parent_commit_id → story_commits(id)，branch_point_id → story_branch_points(id)，option_id → story_options(id)。

---

### 3.19 story_pull_requests（故事 Pull Request 表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 非空、外键 | 故事种子 ID |
| fork_id | BIGINT | 非空、外键 | 读者 fork ID |
| from_commit_id | BIGINT | 可空、外键 | 希望合并的起点章节 ID |
| title | VARCHAR(200) | 可空 | PR 标题 |
| description | TEXT | 可空 | 说明 |
| status | VARCHAR(20) | 非空 | open/merged/closed |
| reviewed_by_id | BIGINT | 可空、外键 | 处理人（作者）ID |

**外键**：story_seed_id → story_seeds(id)，fork_id → reader_forks(id)，from_commit_id → story_commits(id)，reviewed_by_id → users(id)。

---

### 3.20 story_wiki_pages（小说 Wiki 页面表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_id | BIGINT | 非空、外键 | 所属小说 ID |
| slug | VARCHAR(100) | 非空 | 页面标识（如 worldview, characters） |
| title | VARCHAR(200) | 非空 | 页面标题 |
| content_markdown | LONGTEXT | 可空 | 页面内容（Markdown） |
| category | VARCHAR(50) | 可空 | 分类：worldview/character/timeline/other |
| sort_order | INT | 可空 | 排序顺序 |

**唯一约束**：(story_id, slug)。**外键**：story_id → stories(id)。

---

### 3.21 story_wiki_characters（小说角色档案表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_id | BIGINT | 非空、外键 | 所属小说 ID |
| name | VARCHAR(100) | 非空 | 角色名称 |
| alias | VARCHAR(200) | 可空 | 角色别名/称号 |
| avatar_url | VARCHAR(500) | 可空 | 角色头像 URL |
| role_type | VARCHAR(50) | 可空 | 角色类型：protagonist/supporting/antagonist/minor |
| age | VARCHAR(50) | 可空 | 年龄 |
| gender | VARCHAR(20) | 可空 | 性别 |
| appearance | TEXT | 可空 | 外貌描述 |
| personality | TEXT | 可空 | 性格特点 |
| background | TEXT | 可空 | 背景故事 |
| abilities | TEXT | 可空 | 能力/技能 |
| relationships | TEXT | 可空 | 人物关系 |
| content_markdown | LONGTEXT | 可空 | 完整角色介绍（Markdown） |
| sort_order | INT | 可空 | 排序顺序 |

**唯一约束**：(story_id, name)。**外键**：story_id → stories(id)。

---

### 3.22 story_wiki_timeline_events（小说时间线事件表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_id | BIGINT | 非空、外键 | 所属小说 ID |
| event_time | VARCHAR(100) | 非空 | 事件发生时间（如：第一章、十年前） |
| title | VARCHAR(200) | 非空 | 事件标题 |
| description | TEXT | 可空 | 事件描述 |
| content_markdown | LONGTEXT | 可空 | 详细内容（Markdown） |
| related_characters | VARCHAR(500) | 可空 | 相关角色（逗号分隔） |
| sort_order | INT | 可空 | 排序顺序 |

**外键**：story_id → stories(id)。

---

### 3.23 story_entity_index（RAG 实体索引表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 非空、外键 | 故事种子 ID |
| entity_type | VARCHAR(50) | 非空 | 实体类型：character/location/item/organization/event |
| entity_name | VARCHAR(100) | 非空 | 实体名称 |
| entity_alias | JSON | 可空 | 别名列表 |
| description | TEXT | 可空 | 实体描述 |
| first_appearance_commit_id | BIGINT | 可空、外键 | 首次出场章节 ID |
| last_appearance_commit_id | BIGINT | 可空、外键 | 最后出场章节 ID |
| appearance_count | INT | 可空 | 出场次数 |
| current_status | VARCHAR(200) | 可空 | 当前状态 |
| status_history | JSON | 可空 | 状态变更历史 |
| relationships | JSON | 可空 | 关系网络 |

**外键**：story_seed_id → story_seeds(id)，first_appearance_commit_id / last_appearance_commit_id → story_commits(id)。

---

### 3.24 entity_appearances（实体出场记录表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| entity_id | BIGINT | 非空、外键 | 实体 ID，关联 story_entity_index.id |
| commit_id | BIGINT | 非空、外键 | 章节 ID |
| appearance_type | VARCHAR(50) | 可空 | 出场类型：mention/dialogue/action/thought |
| context_snippet | TEXT | 可空 | 出场上下文片段 |
| context_start_position | INT | 可空 | 上下文起始位置 |
| emotional_state | VARCHAR(100) | 可空 | 情绪状态 |
| physical_state | VARCHAR(100) | 可空 | 身体状态 |
| location_at | VARCHAR(100) | 可空 | 所在地点 |
| significance_score | INT | 可空 | 重要性 1–10 |
| is_key_moment | BIT(1) | 可空 | 是否关键情节 |

**唯一约束**：(entity_id, commit_id)。**外键**：entity_id → story_entity_index(id)，commit_id → story_commits(id)。

---

### 3.25 entity_relationships（实体关系表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| source_entity_id | BIGINT | 非空、外键 | 源实体 ID |
| target_entity_id | BIGINT | 非空、外键 | 目标实体 ID |
| relationship_type | VARCHAR(50) | 非空 | 关系类型 |
| relationship_description | VARCHAR(500) | 可空 | 关系描述 |
| strength_score | INT | 可空 | 关系强度 |
| is_bidirectional | BIT(1) | 非空 | 是否双向 |
| first_appearance_commit_id | BIGINT | 可空 | 首次出现章节 ID |
| last_updated_commit_id | BIGINT | 可空 | 最后更新章节 ID |
| is_active | BIT(1) | 非空 | 是否有效 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |

**外键**：source_entity_id / target_entity_id → story_entity_index(id)。

---

### 3.26 story_commit_summaries（章节摘要表，RAG 用）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| commit_id | BIGINT | 非空、唯一、外键 | 章节 ID |
| ultra_short_summary | VARCHAR(100) | 非空 | 50 字以内超压缩摘要 |
| short_summary | VARCHAR(500) | 非空 | 200 字以内短摘要 |
| medium_summary | TEXT | 可空 | 500 字以内中等摘要 |
| key_events | JSON | 可空 | 关键事件列表 |
| characters_involved | JSON | 可空 | 出场角色 |
| locations_involved | JSON | 可空 | 出场地点 |
| items_involved | JSON | 可空 | 出场物品 |
| emotional_tone | VARCHAR(50) | 可空 | 情感基调 |
| chapter_function | VARCHAR(200) | 可空 | 本章功能 |
| token_estimate | INT | 可空 | 原始章节预估 token 数 |
| summary_token_estimate | INT | 可空 | 摘要预估 token 数 |
| prerequisite_chapters | JSON | 可空 | 前置依赖章节 ID 列表 |

**外键**：commit_id → story_commits(id)。

---

### 3.27 story_timeline（RAG 故事时间线表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| story_seed_id | BIGINT | 非空、外键 | 故事种子 ID |
| timeline_name | VARCHAR(100) | 非空 | 时间线名称 |
| timeline_description | VARCHAR(500) | 可空 | 时间线描述 |
| branch_point | VARCHAR(200) | 可空 | 分支点描述 |
| divergence_commit_id | BIGINT | 可空 | 分歧点章节 ID |
| is_main_timeline | BIT(1) | 非空 | 是否主线时间线 |
| is_active | BIT(1) | 非空 | 是否启用 |
| probability | DECIMAL(3,2) | 可空 | 概率 |
| stability_score | INT | 可空 | 稳定性评分 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |

**外键**：story_seed_id → story_seeds(id)。

---

### 3.28 commit_timeline_mapping（章节与时间线映射表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| timeline_id | BIGINT | 非空、外键 | 时间线 ID |
| commit_id | BIGINT | 非空、外键 | 章节 ID |
| timeline_order | INT | 非空 | 在时间线中的顺序 |
| is_divergence_point | BIT(1) | 非空 | 是否分歧点 |
| divergence_description | VARCHAR(500) | 可空 | 分歧描述 |
| probability_at_this_point | DECIMAL(3,2) | 可空 | 该点概率 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |

**外键**：timeline_id → story_timeline(id)，commit_id → story_commits(id)。

---

### 3.29 user_persona_profile（用户作者分身档案表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| user_id | BIGINT | 主键、外键 | 用户 ID，与 users.id 一对一 |
| distilled_content | LONGTEXT | 可空 | 提炼后的分身内容 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |

**外键**：user_id → users(id)。

---

### 3.30 story_chapter_summaries（作者章节预压缩表）

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 主键 |
| chapter_id | BIGINT | 非空、唯一、外键 | 章节 ID，关联 story_chapters.id |
| compressed_content | TEXT | 非空 | AI 压缩后的内容；失败降级时为原文 |
| is_fallback | BIT(1) | 非空 | 是否降级：1=存的是原文 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |

**唯一约束**：chapter_id。**外键**：chapter_id → story_chapters(id) ON DELETE CASCADE。用于发布章节时写入预压缩，前文概要与智能续写选项生成时读取。

---

## 4. 前端功能（apps/web）

### 4.1 技术栈

- Next.js 14 (App Router)、React 18
- Tailwind CSS、@headlessui/react、@heroicons/react

### 4.2 页面与路由

| 路由         | 文件                    | 功能         | 登录要求 |
|--------------|-------------------------|--------------|----------|
| /            | app/page.js             | 首页：AI 对话 + 灵感库（登录后）；存灵感、选灵感开始写小说跳 /write?inspiration=id | 否（登录后用灵感） |
| /login       | app/login/page.js       | 登录         | 否       |
| /register    | app/register/page.js    | 注册         | 否       |
| ~~/posts~~   | ~~app/posts/page.js~~   | ~~(已下线)~~ | ~~否~~   |
| ~~/posts/[slug]~~| ~~app/posts/[slug]/page.js~~| ~~(已下线)~~ | ~~否~~   |
| /write       | app/write/page.js       | 写小说；?edit=id 为编辑，?inspiration=id 为从灵感预填并关联 | 是       |
| ~~/me/posts~~| ~~app/me/posts/page.js~~| ~~(已下线)~~ | ~~是~~   |
| /stories     | app/stories/page.js     | 小说库：已完成小说 + AI 互动续写小说 | 否       |
| /stories/[slug] | app/stories/[slug]/page.js | 故事详情（开头 + 分支预览） | 否       |
| /stories/[slug]/read | app/stories/[slug]/read/page.js | 开始阅读（登录后 fork 并跳转 /read/[forkId]） | 是       |
| /read/[forkId] | app/read/[forkId]/page.js | 阅读页（开头 + 章节 + 分支选择 + 版本历史 + 提交 PR） | 是       |
| /me/stories  | app/me/stories/page.js  | 我的故事种子（含编辑/删除/分支/世界观/PR） | 是       |
| /me/stories/new | app/me/stories/new/page.js | 创建故事种子 | 是       |
| /me/stories/[id]/edit | app/me/stories/[id]/edit/page.js | 编辑故事种子 | 是       |
| /me/stories/[id]/branches | app/me/stories/[id]/branches/page.js | 分支点与选项配置 | 是       |
| /me/stories/[id]/worldbuilding | app/me/stories/[id]/worldbuilding/page.js | 世界观（角色、专有名词、README） | 是       |
| /me/stories/[id]/pull-requests | app/me/stories/[id]/pull-requests/page.js | 该故事收到的 PR（作者合并/关闭） | 是       |
| /me/reads    | app/me/reads/page.js    | 我的阅读（互动小说阅读记录） | 是       |

### 4.3 前端与后端对应关系

| 页面/操作      | 调用的 API                          |
|----------------|-------------------------------------|
| 登录           | POST /api/auth/login                |
| 注册           | POST /api/auth/register             |
| ~~热门小说列表/搜索~~ | ~~GET /api/posts~~ (已下线) |
| ~~小说详情~~   | ~~GET /api/posts/slug/{slug}~~ (已下线) |
| 小说库列表     | GET /api/story-seeds                |
| 小说详情       | GET /api/story-seeds/slug/{slug}    |
| 我的小说       | GET /api/story-seeds/me             |
| 写小说         | POST /api/story-seeds               |
| 编辑小说       | PUT /api/story-seeds/{id}           |
| 删除小说       | DELETE /api/story-seeds/{id}        |
| 标签列表       | GET /api/tags                       |
| 我的阅读       | GET /api/reader-forks/me            |
| 继续阅读       | GET /api/reader-forks/{id}          |
| 选择分支       | POST /api/reader-forks/{id}/choose  |

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
