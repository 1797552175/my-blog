# AI 小说创作与互动阅读平台 - 项目梳理文档

## 一、数据库表分类与使用状态

### 1.1 核心业务表（正在使用）

| 表名 | 用途 | 前台使用情况 | 涉及页面 |
|------|------|-------------|---------|
| **users** | 用户账户信息 | ✅ 使用中 | 登录/注册/个人中心 |
| **stories** | 小说主表 | ✅ 使用中 | 小说列表/详情/编辑 |
| **story_tags** | 小说标签关联 | ✅ 使用中 | 小说列表/编辑 |
| **story_chapters** | 小说章节 | ✅ 使用中 | 小说阅读/编辑 |
| **story_stars** | 小说收藏/Star | ✅ 使用中 | 小说详情页 |
| **reader_forks** | 读者阅读副本 | ✅ 使用中 | 阅读页/我的阅读 |
| **story_commits** | 读者续写章节 | ✅ 使用中 | 阅读页 |
| **story_branch_points** | 故事分支点 | ✅ 使用中 | 分支管理 |
| **story_options** | 分支选项 | ✅ 使用中 | 分支管理 |
| **story_pull_requests** | Pull Request | ✅ 使用中 | PR管理页 |

### 1.2 世界观设定表（部分使用）

| 表名 | 用途 | 前台使用情况 | 涉及页面 |
|------|------|-------------|---------|
| **story_characters** | 角色设定 | ✅ 使用中 | 世界观管理 |
| **story_terms** | 专有名词 | ✅ 使用中 | 世界观管理 |
| **story_readme** | 故事设定文档 | ✅ 使用中 | 世界观管理 |
| **story_wiki_pages** | Wiki页面 | ⚠️ 部分使用 | Wiki页（功能未完全实现） |
| **story_wiki_characters** | Wiki角色 | ❌ 未使用 | - |
| **story_wiki_timeline_events** | Wiki时间线 | ❌ 未使用 | - |

### 1.3 灵感与AI相关表（使用中）

| 表名 | 用途 | 前台使用情况 | 涉及页面 |
|------|------|-------------|---------|
| **inspirations** | 灵感库 | ✅ 使用中 | 首页/灵感浏览 |
| **inspiration_messages** | 灵感对话消息 | ✅ 使用中 | 首页/灵感浏览 |
| **user_persona_profiles** | 作者人设 | ✅ 使用中 | AI对话 |

### 1.4 RAG增强表（后端使用）

| 表名 | 用途 | 前台使用情况 | 说明 |
|------|------|-------------|------|
| **story_entity_index** | 实体索引 | ❌ 前端不直接使用 | 后端RAG用 |
| **entity_appearances** | 实体出现记录 | ❌ 前端不直接使用 | 后端RAG用 |
| **entity_relationships** | 实体关系 | ❌ 前端不直接使用 | 后端RAG用 |
| **story_commit_summaries** | 章节摘要 | ❌ 前端不直接使用 | 后端RAG用 |
| **story_timelines** | 故事时间线 | ❌ 前端不直接使用 | 后端RAG用 |
| **commit_timeline_mappings** | 时间线映射 | ❌ 前端不直接使用 | 后端RAG用 |

### 1.5 已废弃/兼容表（未使用）

| 表名 | 用途 | 状态 | 说明 |
|------|------|------|------|
| **posts** | 文章表 | ❌ 已下线 | PROJECT_SPEC中标记为已下线 |
| **post_tags** | 文章标签 | ❌ 已下线 | - |
| **comments** | 评论表 | ❌ 已下线 | - |
| **story_seeds** | 故事种子（旧） | ⚠️ 兼容保留 | 已迁移到stories表，保留兼容 |

---

## 二、核心表详细说明

### 2.1 小说表（stories）

#### 表结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 小说主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| title | VARCHAR(200) | 非空 | 小说标题 |
| slug | VARCHAR(220) | 非空、唯一 | URL友好标识 |
| published | BIT(1) | 非空 | 是否已发布 |
| is_open_source | BIT(1) | 可空 | 是否开源可Fork |
| open_source_license | VARCHAR(50) | 可空 | 开源协议（如MIT/CC-BY） |
| fork_count | INT | 可空 | 被Fork次数 |
| star_count | INT | 可空 | Star数 |
| style_params | VARCHAR(2000) | 可空 | AI风格参数 |
| license_type | VARCHAR(32) | 可空 | 许可类型 |
| story_summary | VARCHAR(2000) | 可空 | 小说概述/简介 |
| intent_keywords | JSON | 可空 | 意图分析关键字配置 |
| author_id | BIGINT | 非空、外键 | 作者用户ID |
| inspiration_id | BIGINT | 可空、外键 | 来源灵感ID |

#### 索引
- slug（唯一索引）
- author_id
- published
- is_open_source
- open_source_license

#### 外键
- author_id → users(id)
- inspiration_id → inspirations(id)

#### 使用场景

**1. 小说列表页 (/stories)**
- 查询条件：published = true
- 排序：按创建时间倒序
- 筛选：全部/已完成/待续写
- 关联：story_tags（标签）、story_stars（收藏数）

**2. 小说详情页 (/stories/[slug])**
- 查询条件：slug = {slug}
- 如果未登录：只返回已发布的小说
- 如果是作者：可以返回未发布的小说
- 关联：story_tags（标签）、story_chapters（章节）、story_stars（收藏状态）

**3. 搜索页 (/search)**
- 搜索字段：title、story_summary
- 模糊匹配
- 关联：story_tags（标签）

**4. 创建小说页 (/write)**
- 插入操作：创建新小说
- 默认值：published = false, fork_count = 0, star_count = 0
- 必填字段：title、story_summary
- 可选字段：style_params、tags、open_source_license

**5. 编辑小说页 (/me/stories/[id]/edit)**
- 查询条件：id = {id}, author_id = 当前用户
- 更新操作：更新小说信息
- 可更新字段：title、story_summary、style_params、published、open_source_license

**6. 我的小说页 (/me/stories)**
- 查询条件：author_id = 当前用户
- 筛选：全部/已完成/待续写
- 排序：按更新时间倒序
- 关联：story_tags（标签）、story_chapters（章节数）

#### 接口映射

| 接口 | 方法 | 路径 | 操作 | 涉及字段 |
|------|------|------|------|---------|
| 小说列表 | GET | /api/stories | 查询 | published, is_open_source, fork_count, star_count |
| 搜索小说 | GET | /api/stories/search | 查询 | title, story_summary |
| 标签筛选 | GET | /api/stories/tag/{tag} | 查询 | 通过story_tags关联 |
| 小说详情 | GET | /api/stories/slug/{slug} | 查询 | 全部字段 |
| 我的小说 | GET | /api/stories/my | 查询 | 全部字段（仅作者） |
| 创建小说 | POST | /api/stories | 插入 | title, story_summary, style_params, open_source_license |
| 更新小说 | PUT | /api/stories/{id} | 更新 | title, story_summary, style_params, published, open_source_license |
| 删除小说 | DELETE | /api/stories/{id} | 删除 | 级联删除关联数据 |

#### 数据流

```
创建小说流程：
用户填写表单 → POST /api/stories
  ↓
插入stories表
  ↓
插入story_tags表（如果有标签）
  ↓
返回小说ID → 跳转到编辑页
```

```
发布小说流程：
编辑页点击发布 → PUT /api/stories/{id}
  ↓
更新stories.published = true
  ↓
更新stories.updated_at
  ↓
返回成功 → 刷新列表页
```

```
Star小说流程：
点击Star按钮 → POST /api/stories/{id}/star
  ↓
插入story_stars表
  ↓
更新stories.star_count + 1
  ↓
返回成功 → 更新UI显示
```

---

### 2.2 我的小说表（通过stories表筛选）

#### 使用场景

**1. 我的小说列表页 (/me/stories)**
- 查询条件：author_id = 当前用户
- 筛选选项：
  - 全部：显示所有小说
  - 已完成：有章节且published = true
  - 待续写：published = false 或章节数 < 3
- 排序：按更新时间倒序
- 分页：每页20条

**2. 小说编辑页 (/me/stories/[id]/edit)**
- 查询条件：id = {id}, author_id = 当前用户
- 权限检查：只有作者可以编辑
- 显示内容：
  - 小说基本信息（title、story_summary、style_params）
  - 发布状态（published）
  - 开源设置（is_open_source、open_source_license）
  - 章节列表（story_chapters）
  - 世界观设定（story_characters、story_terms、story_readme）

**3. 分支管理页 (/me/stories/[id]/branches)**
- 查询条件：id = {id}, author_id = 当前用户
- 显示内容：
  - 主线章节（parent_chapter_id IS NULL）
  - 分支章节（parent_chapter_id IS NOT NULL）
  - 分支点（story_branch_points）
  - 选项（story_options）

**4. PR管理页 (/me/stories/[id]/pull-requests)**
- 查询条件：story_id = {id}, author_id = 当前用户
- 显示内容：
  - PR列表（story_pull_requests）
  - PR状态：open/merged/closed
  - Fork信息（reader_forks）
  - 章节信息（story_commits）

#### 接口映射

| 接口 | 方法 | 路径 | 操作 | 涉及表 |
|------|------|------|------|---------|
| 我的小说列表 | GET | /api/stories/my | 查询 | stories, story_tags |
| 小说详情（编辑用） | GET | /api/stories/{id} | 查询 | stories, story_tags |
| 更新小说 | PUT | /api/stories/{id} | 更新 | stories, story_tags |
| 删除小说 | DELETE | /api/stories/{id} | 删除 | stories（级联） |
| 章节列表 | GET | /api/stories/{id}/chapters | 查询 | story_chapters |
| 创建章节 | POST | /api/stories/{id}/chapters | 插入 | story_chapters |
| 更新章节 | PUT | /api/stories/{id}/chapters/{chapterId} | 更新 | story_chapters |
| 删除章节 | DELETE | /api/stories/{id}/chapters/{chapterId} | 删除 | story_chapters（级联） |
| 分支树 | GET | /api/stories/{id}/branches/tree | 查询 | story_chapters |
| 主线 | GET | /api/stories/{id}/branches/mainline | 查询 | story_chapters |
| PR列表 | GET | /api/story-seeds/{id}/pull-requests | 查询 | story_pull_requests, reader_forks |
| PR详情 | GET | /api/story-pull-requests/{prId} | 查询 | story_pull_requests, story_commits |
| 更新PR状态 | PATCH | /api/story-pull-requests/{prId} | 更新 | story_pull_requests |

#### 数据流

```
编辑小说流程：
进入编辑页 → GET /api/stories/{id}
  ↓
显示小说信息
  ↓
修改内容 → PUT /api/stories/{id}
  ↓
更新stories表
  ↓
更新stories.updated_at
  ↓
返回成功 → 刷新页面
```

```
管理章节流程：
编辑页 → GET /api/stories/{id}/chapters
  ↓
显示章节列表
  ↓
创建章节 → POST /api/stories/{id}/chapters
  ↓
插入story_chapters表
  ↓
返回章节ID
  ↓
编辑章节内容 → PUT /api/stories/{id}/chapters/{chapterId}
  ↓
更新story_chapters.content_markdown
  ↓
返回成功 → 刷新列表
```

```
处理PR流程：
PR管理页 → GET /api/story-seeds/{id}/pull-requests
  ↓
显示PR列表
  ↓
查看PR详情 → GET /api/story-pull-requests/{prId}
  ↓
显示PR详情（包含章节内容）
  ↓
审核通过 → PATCH /api/story-pull-requests/{prId}
  ↓
更新story_pull_requests.status = 'merged'
  ↓
将story_commits复制到story_chapters
  ↓
返回成功 → 刷新列表
```

---

### 2.3 我的阅读表（reader_forks）

#### 表结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | Fork主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子ID（兼容旧互动） |
| story_id | BIGINT | 可空、外键 | 小说ID（从某小说Fork） |
| reader_id | BIGINT | 非空、外键 | 读者用户ID |
| title | VARCHAR(200) | 可空 | 副本标题 |
| from_chapter_sort_order | INT | 可空 | 从第几章开始续写（作者章节序号） |

#### 唯一约束
- (story_id, reader_id)

#### 外键
- story_seed_id → story_seeds(id)
- story_id → stories(id)
- reader_id → users(id)

#### 使用场景

**1. 我的阅读页 (/me/reads)**
- 查询条件：reader_id = 当前用户
- 排序：按更新时间倒序
- 关联：stories（小说信息）、story_commits（章节数）
- 显示内容：
  - 副本标题
  - 原小说标题
  - 章节进度
  - 最后阅读时间

**2. 阅读页 (/read/[forkId])**
- 查询条件：id = {forkId}, reader_id = 当前用户
- 权限检查：只有读者可以访问自己的Fork
- 关联：stories（原小说）、story_commits（章节链）
- 显示内容：
  - 当前章节内容
  - 分支点选项
  - 章节历史
  - 回退功能

**3. 小说详情页 - 添加到阅读**
- 查询条件：story_id = {storyId}, reader_id = 当前用户
- 如果已存在：返回现有Fork
- 如果不存在：创建新Fork
- 默认值：from_chapter_sort_order = NULL（从开头开始）

#### 接口映射

| 接口 | 方法 | 路径 | 操作 | 涉及字段 |
|------|------|------|------|---------|
| 我的Fork列表 | GET | /api/reader-forks/me | 查询 | 全部字段 |
| Fork详情 | GET | /api/reader-forks/{id} | 查询 | 全部字段 |
| 创建Fork | POST | /api/stories/slug/{slug}/fork | 插入 | story_id, reader_id, from_chapter_sort_order |
| Fork章节链 | GET | /api/reader-forks/{id}/commits | 查询 | 关联story_commits |
| 选择选项 | POST | /api/reader-forks/{id}/choose | 插入 | 关联story_commits |
| 回退 | POST | /api/reader-forks/{id}/rollback | 删除 | 关联story_commits |

#### 数据流

```
开始阅读流程：
小说详情页 → 点击"开始阅读"
  ↓
POST /api/stories/slug/{slug}/fork
  ↓
检查是否已存在Fork（story_id, reader_id）
  ↓
如果存在：返回现有Fork
  ↓
如果不存在：创建新Fork
  ↓
插入reader_forks表
  ↓
跳转到阅读页 /read/{forkId}
```

```
阅读续写流程：
阅读页 → 显示当前章节
  ↓
显示分支点选项（story_branch_points, story_options）
  ↓
选择选项 → POST /api/reader-forks/{id}/choose
  ↓
调用AI生成下一章
  ↓
插入story_commits表
  ↓
更新reader_forks.updated_at
  ↓
返回新章节 → 显示内容
```

```
回退章节流程：
阅读页 → 点击"回退"
  ↓
显示章节历史（story_commits）
  ↓
选择要回退到的章节
  ↓
POST /api/reader-forks/{id}/rollback
  ↓
删除该章节之后的所有story_commits
  ↓
更新reader_forks.updated_at
  ↓
返回成功 → 刷新页面
```

```
提交PR流程：
阅读页 → 点击"提交给作者"
  ↓
填写PR信息（标题、说明）
  ↓
POST /api/story-seeds/{id}/pull-requests
  ↓
插入story_pull_requests表
  ↓
关联reader_forks、story_commits
  ↓
返回成功 → 跳转到PR管理页
```

---

### 2.4 分支表（story_branch_points + story_options）

#### story_branch_points 表结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 分支点主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| story_seed_id | BIGINT | 可空、外键 | 故事种子ID（兼容旧数据） |
| story_id | BIGINT | 可空、外键 | 小说ID，关联stories.id |
| sort_order | INT | 非空 | 分支点顺序 |
| anchor_text | VARCHAR(500) | 可空 | 分支前剧情摘要 |

#### story_options 表结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 选项主键 |
| created_at | TIMESTAMP | 非空、不可更新 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |
| branch_point_id | BIGINT | 非空、外键 | 分支点ID |
| label | VARCHAR(200) | 非空 | 选项文案 |
| sort_order | INT | 非空 | 选项顺序 |
| influence_notes | TEXT | 可空 | 影响描述（供AI用） |

#### 外键
- story_branch_points.story_id → stories(id)
- story_branch_points.story_seed_id → story_seeds(id)
- story_options.branch_point_id → story_branch_points(id)

#### 使用场景

**1. 分支管理页 (/me/stories/[id]/branches)**
- 查询条件：story_id = {id}
- 排序：按sort_order升序
- 显示内容：
  - 分支点列表（story_branch_points）
  - 每个分支点的选项（story_options）
  - 关联的章节（story_chapters）

**2. 阅读页 (/read/[forkId])**
- 查询条件：story_id = {storyId}
- 显示内容：
  - 当前章节对应的分支点
  - 分支点选项列表
  - 选项的影响描述

**3. AI生成章节时**
- 读取分支点和选项信息
- 将选项作为AI提示词的一部分
- 生成符合选项方向的章节内容

#### 接口映射

| 接口 | 方法 | 路径 | 操作 | 涉及表 |
|------|------|------|------|---------|
| 创建分支点 | POST | /api/story-seeds/{id}/branch-points | 插入 | story_branch_points |
| 更新分支点 | PUT | /api/story-seeds/{id}/branch-points/{pointId} | 更新 | story_branch_points |
| 删除分支点 | DELETE | /api/story-seeds/{id}/branch-points/{pointId} | 删除 | story_branch_points, story_options（级联） |
| 分支树 | GET | /api/stories/{id}/branches/tree | 查询 | story_branch_points, story_options, story_chapters |
| 主线 | GET | /api/stories/{id}/branches/mainline | 查询 | story_branch_points, story_options, story_chapters |
| 子分支 | GET | /api/stories/{id}/branches/chapter/{chapterId}/children | 查询 | story_branch_points, story_options, story_chapters |

#### 数据流

```
创建分支点流程：
分支管理页 → 点击"添加分支点"
  ↓
填写分支点信息（剧情摘要、位置）
  ↓
POST /api/story-seeds/{id}/branch-points
  ↓
插入story_branch_points表
  ↓
返回分支点ID
  ↓
添加选项 → 插入story_options表
  ↓
返回成功 → 刷新列表
```

```
编辑分支点流程：
分支管理页 → 点击"编辑"分支点
  ↓
显示分支点详情（包含选项）
  ↓
修改分支点信息 → PUT /api/story-seeds/{id}/branch-points/{pointId}
  ↓
更新story_branch_points表
  ↓
修改选项 → PUT/DELETE story_options
  ↓
返回成功 → 刷新列表
```

```
读者选择选项流程：
阅读页 → 显示当前章节
  ↓
查找对应的分支点（story_branch_points）
  ↓
显示选项列表（story_options）
  ↓
选择选项 → POST /api/reader-forks/{id}/choose
  ↓
传递branch_point_id和option_id
  ↓
调用AI生成章节（使用influence_notes作为提示）
  ↓
插入story_commits表
  ↓
返回新章节 → 显示内容
```

---

## 三、接口与表映射关系

### 3.1 认证相关接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 注册 | POST | /api/auth/register | users | ✅ 注册页 |
| 登录 | POST | /api/auth/login | users | ✅ 登录页 |

### 3.2 小说核心接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 小说列表 | GET | /api/stories | stories, story_tags | ✅ 小说列表页 |
| 搜索小说 | GET | /api/stories/search | stories, story_tags | ✅ 搜索页 |
| 标签筛选 | GET | /api/stories/tag/{tag} | stories, story_tags | ✅ 小说列表页 |
| 小说详情 | GET | /api/stories/slug/{slug} | stories, story_tags | ✅ 小说详情页 |
| 我的小说 | GET | /api/stories/my | stories, story_tags | ✅ 我的小说页 |
| 创建小说 | POST | /api/stories | stories, story_tags | ✅ 创建小说页 |
| 更新小说 | PUT | /api/stories/{id} | stories, story_tags | ✅ 编辑小说页 |
| 删除小说 | DELETE | /api/stories/{id} | stories, story_tags | ✅ 我的小说页 |
| Star小说 | POST | /api/stories/{id}/star | story_stars | ✅ 小说详情页 |
| 取消Star | DELETE | /api/stories/{id}/star | story_stars | ✅ 小说详情页 |
| 获取标签 | GET | /api/stories/tags | story_tags | ✅ 小说列表页 |

### 3.3 章节管理接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 章节列表 | GET | /api/stories/{id}/chapters | story_chapters | ✅ 编辑页 |
| 章节列表（公开） | GET | /api/stories/slug/{slug}/chapters | story_chapters | ✅ 阅读页 |
| 创建章节 | POST | /api/stories/{id}/chapters | story_chapters | ✅ 编辑页 |
| 更新章节 | PUT | /api/stories/{id}/chapters/{chapterId} | story_chapters | ✅ 编辑页 |
| 删除章节 | DELETE | /api/stories/{id}/chapters/{chapterId} | story_chapters | ✅ 编辑页 |

### 3.4 分支管理接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 分支树 | GET | /api/stories/{id}/branches/tree | story_chapters | ✅ 分支页 |
| 主线 | GET | /api/stories/{id}/branches/mainline | story_chapters | ✅ 分支页 |
| 子分支 | GET | /api/stories/{id}/branches/chapter/{chapterId}/children | story_chapters | ✅ 分支页 |
| 后代树 | GET | /api/stories/{id}/branches/chapter/{chapterId}/descendants | story_chapters | ✅ 分支页 |
| 祖先链 | GET | /api/stories/{id}/branches/chapter/{chapterId}/ancestors | story_chapters | ✅ 分支页 |
| 作者分支 | GET | /api/stories/{id}/branches/author/{authorId} | story_chapters | ⚠️ 未使用 |
| 分支统计 | GET | /api/stories/{id}/branches/stats | story_chapters | ⚠️ 未使用 |

### 3.5 读者Fork接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 创建Fork | POST | /api/stories/slug/{slug}/fork | reader_forks, stories | ✅ 小说详情页 |
| 我的Fork | GET | /api/reader-forks/me | reader_forks, stories | ✅ 我的阅读页 |
| Fork详情 | GET | /api/reader-forks/{id} | reader_forks, stories | ✅ 阅读页 |
| Fork章节链 | GET | /api/reader-forks/{id}/commits | story_commits, reader_forks | ✅ 阅读页 |
| 选择选项 | POST | /api/reader-forks/{id}/choose | story_commits, reader_forks | ✅ 阅读页 |
| 回退 | POST | /api/reader-forks/{id}/rollback | story_commits | ✅ 阅读页 |

### 3.6 Pull Request接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 创建PR | POST | /api/story-seeds/{id}/pull-requests | story_pull_requests | ✅ 阅读页 |
| PR列表 | GET | /api/story-seeds/{id}/pull-requests | story_pull_requests | ✅ PR管理页 |
| PR详情 | GET | /api/story-pull-requests/{prId} | story_pull_requests | ✅ PR管理页 |
| 更新PR状态 | PATCH | /api/story-pull-requests/{prId} | story_pull_requests | ✅ PR管理页 |

### 3.7 世界观接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 角色列表 | GET | /api/story-seeds/{id}/characters | story_characters | ✅ 世界观页 |
| 创建角色 | POST | /api/story-seeds/{id}/characters | story_characters | ✅ 世界观页 |
| 更新角色 | PUT | /api/story-seeds/{id}/characters/{charId} | story_characters | ✅ 世界观页 |
| 删除角色 | DELETE | /api/story-seeds/{id}/characters/{charId} | story_characters | ✅ 世界观页 |
| 专有名词列表 | GET | /api/story-seeds/{id}/terms | story_terms | ✅ 世界观页 |
| 创建专有名词 | POST | /api/story-seeds/{id}/terms | story_terms | ✅ 世界观页 |
| 更新专有名词 | PUT | /api/story-seeds/{id}/terms/{termId} | story_terms | ✅ 世界观页 |
| 删除专有名词 | DELETE | /api/story-seeds/{id}/terms/{termId} | story_terms | ✅ 世界观页 |
| 设定文档 | GET | /api/story-seeds/{id}/readme | story_readme | ✅ 世界观页 |
| 更新设定文档 | PUT | /api/story-seeds/{id}/readme | story_readme | ✅ 世界观页 |

### 3.8 灵感接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| 灵感列表 | GET | /api/inspirations | inspirations, inspiration_messages | ✅ 首页/灵感浏览 |
| 灵感详情 | GET | /api/inspirations/{id} | inspirations, inspiration_messages | ✅ 灵感浏览 |
| 删除灵感 | DELETE | /api/inspirations/{id} | inspirations, inspiration_messages | ✅ 灵感浏览 |

### 3.9 AI写作接口

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| AI写作 | POST | /api/ai-writing | stories, story_chapters | ✅ 编辑页 |
| AI写作流式 | POST | /api/ai-writing/stream | stories, story_chapters | ✅ 编辑页 |
| AI对话 | POST | /api/ai/chat | user_persona_profiles | ✅ 首页 |

### 3.10 Wiki接口（部分实现）

| 接口 | 方法 | 路径 | 涉及表 | 前台使用 |
|------|------|------|--------|---------|
| Wiki页面列表 | GET | /api/stories/{id}/wiki/pages | story_wiki_pages | ✅ Wiki页 |
| Wiki页面详情 | GET | /api/stories/{id}/wiki/pages/{slug} | story_wiki_pages | ✅ Wiki页 |

### 3.11 已下线接口（未使用）

| 接口 | 方法 | 路径 | 涉及表 | 状态 |
|------|------|------|--------|------|
| 文章列表 | GET | /api/posts | posts, post_tags | ❌ 已下线 |
| 文章详情 | GET | /api/posts/slug/{slug} | posts | ❌ 已下线 |
| 文章搜索 | GET | /api/posts/search | posts | ❌ 已下线 |
| 我的文章 | GET | /api/posts/me | posts | ❌ 已下线 |
| 创建文章 | POST | /api/posts | posts, post_tags | ❌ 已下线 |
| 更新文章 | PUT | /api/posts/{id} | posts, post_tags | ❌ 已下线 |
| 删除文章 | DELETE | /api/posts/{id} | posts, post_tags | ❌ 已下线 |
| 评论列表 | GET | /api/posts/{postId}/comments | comments | ❌ 已下线 |
| 创建评论 | POST | /api/posts/{postId}/comments | comments | ❌ 已下线 |

---

## 四、前台交互与表影响分析

### 4.1 首页 (/)

**涉及表：**
- users（用户信息）
- inspirations（灵感列表）
- inspiration_messages（灵感对话）

**操作：**
- 查看灵感列表 → 读取 inspirations
- AI对话 → 创建 inspiration_messages
- 保存灵感 → 更新 inspirations

### 4.2 小说列表页 (/stories)

**涉及表：**
- stories（小说数据）
- story_tags（标签）
- story_stars（收藏数）

**操作：**
- 筛选小说 → 读取 stories, story_tags
- 搜索小说 → 读取 stories
- Star小说 → 插入/删除 story_stars
- 添加到阅读 → 创建 reader_forks

### 4.3 小说详情页 (/stories/[slug])

**涉及表：**
- stories（小说信息）
- story_tags（标签）
- story_stars（收藏状态）
- story_chapters（章节列表）

**操作：**
- 查看小说 → 读取 stories, story_tags, story_chapters
- Star/取消Star → 插入/删除 story_stars
- 开始阅读 → 创建 reader_forks
- 查看分支树 → 读取 story_chapters

### 4.4 创建小说页 (/write)

**涉及表：**
- stories（创建小说）
- story_tags（标签）

**操作：**
- 创建小说 → 插入 stories, story_tags

### 4.5 编辑小说页 (/me/stories/[id]/edit)

**涉及表：**
- stories（小说信息）
- story_chapters（章节）
- story_characters（角色）
- story_terms（专有名词）
- story_readme（设定文档）

**操作：**
- 查看小说 → 读取 stories
- 管理章节 → CRUD story_chapters
- AI写作 → 调用AI接口，更新 story_chapters
- 世界观管理 → CRUD story_characters, story_terms, story_readme

### 4.6 分支管理页 (/me/stories/[id]/branches)

**涉及表：**
- story_chapters（章节树）
- story_branch_points（分支点）
- story_options（选项）

**操作：**
- 查看分支树 → 读取 story_chapters
- 管理分支点 → CRUD story_branch_points, story_options

### 4.7 PR管理页 (/me/stories/[id]/pull-requests)

**涉及表：**
- story_pull_requests（PR）
- story_commits（章节）
- reader_forks（Fork）

**操作：**
- 查看PR列表 → 读取 story_pull_requests
- 查看PR详情 → 读取 story_pull_requests, story_commits
- 处理PR → 更新 story_pull_requests

### 4.8 阅读页 (/read/[forkId])

**涉及表：**
- reader_forks（阅读副本）
- stories（原小说）
- story_commits（章节链）
- story_branch_points（分支点）
- story_options（选项）

**操作：**
- 查看章节 → 读取 story_commits
- 选择选项 → 插入 story_commits
- 回退章节 → 删除 story_commits
- 提交PR → 插入 story_pull_requests

### 4.9 我的阅读页 (/me/reads)

**涉及表：**
- reader_forks（阅读副本）
- stories（小说信息）
- story_commits（章节）

**操作：**
- 查看阅读列表 → 读取 reader_forks, stories, story_commits

### 4.10 世界观页 (/stories/[slug]/wiki)

**涉及表：**
- story_characters（角色）
- story_terms（专有名词）
- story_readme（设定文档）
- story_wiki_pages（Wiki页面）

**操作：**
- 查看世界观 → 读取 story_characters, story_terms, story_readme
- 管理Wiki → CRUD story_wiki_pages

---

## 五、已实现但未使用的接口

### 5.1 分支相关

- `GET /api/stories/{id}/branches/author/{authorId}` - 获取某作者的分支
- `GET /api/stories/{id}/branches/stats` - 分支统计

### 5.2 Wiki相关

- `POST /api/stories/{id}/wiki/pages` - 创建Wiki页面
- `PUT /api/stories/{id}/wiki/pages/{slug}` - 更新Wiki页面
- `DELETE /api/stories/{id}/wiki/pages/{slug}` - 删除Wiki页面

### 5.3 贡献者相关

- `GET /api/stories/{id}/contributors` - 获取贡献者列表
- `GET /api/stories/{id}/contributors/count` - 获取贡献者数量

---

## 六、已设计但未使用的表

### 6.1 Wiki扩展表

- **story_wiki_characters** - Wiki角色表
- **story_wiki_timeline_events** - Wiki时间线事件表

**说明：** 这些表是为Wiki功能设计的，但前台Wiki功能尚未完全实现。

### 6.2 已下线表

- **posts** - 文章表
- **post_tags** - 文章标签表
- **comments** - 评论表

**说明：** 这些表在PROJECT_SPEC中已标记为已下线，项目已转型为纯小说平台。

### 6.3 兼容保留表

- **story_seeds** - 故事种子表

**说明：** 已迁移到stories表，但保留用于兼容旧数据和某些接口。

---

## 七、关键数据流

### 7.1 小说创作流程

```
用户创建小说 → stories表
↓
添加章节 → story_chapters表
↓
AI写作 → 调用AI接口，更新story_chapters
↓
世界观设定 → story_characters, story_terms, story_readme
↓
发布小说 → 更新stories.published
```

### 7.2 读者互动流程

```
读者浏览小说 → 读取stories
↓
创建Fork → reader_forks表
↓
选择选项 → story_commits表（AI生成章节）
↓
提交PR → story_pull_requests表
↓
作者审核 → 更新story_pull_requests.status
```

### 7.3 灵感创作流程

```
用户AI对话 → inspiration_messages表
↓
保存灵感 → inspirations表
↓
基于灵感创建小说 → stories.inspiration_id
```

---

## 八、优化建议

### 8.1 表结构优化

1. **清理已下线表**：考虑删除posts、post_tags、comments表
2. **Wiki表完善**：完成story_wiki_characters和story_wiki_timeline_events的使用
3. **索引优化**：为高频查询字段添加索引

### 8.2 接口优化

1. **启用未使用接口**：分支统计、贡献者统计等功能
2. **接口合并**：考虑合并story-seeds和stories相关接口
3. **缓存策略**：为高频查询接口添加缓存

### 8.3 前台功能完善

1. **Wiki功能**：完善Wiki页面编辑功能
2. **分支可视化**：优化分支树展示
3. **贡献者展示**：展示小说贡献者信息

---

## 九、总结

### 9.1 表使用统计

- **正在使用**：15张核心业务表
- **部分使用**：4张表（Wiki相关）
- **后端专用**：6张RAG表
- **未使用**：3张Wiki扩展表
- **已下线**：3张文章相关表
- **兼容保留**：1张story_seeds表

### 9.2 接口使用统计

- **前台使用**：约50个接口
- **未使用**：约8个接口（分支统计、Wiki管理、贡献者）
- **已下线**：9个文章/评论接口

### 9.3 核心功能模块

1. ✅ **用户认证** - 完整实现
2. ✅ **小说管理** - 完整实现
3. ✅ **章节管理** - 完整实现
4. ✅ **分支管理** - 完整实现
5. ✅ **读者互动** - 完整实现
6. ✅ **世界观设定** - 完整实现
7. ⚠️ **Wiki功能** - 部分实现
8. ✅ **灵感创作** - 完整实现
9. ✅ **AI写作** - 完整实现
10. ❌ **文章功能** - 已下线

---

## 附录：前台页面与表关系总览

| 页面路径 | 页面名称 | 主要涉及表 | 主要操作 |
|---------|---------|-----------|---------|
| / | 首页 | users, inspirations, inspiration_messages | AI对话、灵感管理 |
| /stories | 小说列表 | stories, story_tags, story_stars | 筛选、搜索、Star |
| /stories/[slug] | 小说详情 | stories, story_tags, story_stars, story_chapters | 查看小说、开始阅读 |
| /write | 创建小说 | stories, story_tags | 创建小说 |
| /me/stories | 我的小说 | stories, story_tags | 查看我的小说 |
| /me/stories/[id]/edit | 编辑小说 | stories, story_tags, story_chapters, story_characters, story_terms, story_readme | 编辑小说、管理章节、世界观 |
| /me/stories/[id]/branches | 分支管理 | story_chapters, story_branch_points, story_options | 管理分支点 |
| /me/stories/[id]/pull-requests | PR管理 | story_pull_requests, story_commits, reader_forks | 审核PR |
| /read/[forkId] | 阅读页 | reader_forks, stories, story_commits, story_branch_points, story_options | 阅读、选择选项、回退 |
| /me/reads | 我的阅读 | reader_forks, stories, story_commits | 查看阅读列表 |
| /stories/[slug]/wiki | 世界观 | story_characters, story_terms, story_readme, story_wiki_pages | 查看世界观 |
| /login | 登录 | users | 用户登录 |
| /register | 注册 | users | 用户注册 |
