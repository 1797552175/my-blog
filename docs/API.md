# API 接口文档（my-blog）

后端 Base URL：本地 `http://localhost:8080`，部署后经 Nginx 反代为 `http://<host>/api`。以下路径均以 **/api** 为前缀。

---

## 1. 通用说明

### 1.1 认证

需认证的接口在请求头中携带：

```
Authorization: Bearer <JWT_TOKEN>
```

未带 Token 或 Token 无效时返回 `401 Unauthorized`，body 为可读错误描述，例如：`{"error":"请先登录"}`。

### 1.2 请求体

- Content-Type：`application/json`
- 字段校验失败时返回 `400 Bad Request`，见「错误响应」一节。

### 1.3 错误响应

统一格式：`error` 为**可读错误描述**（中文），前端可直接展示给用户，无需再根据错误码做映射。

```json
{
  "error": "可读错误描述"
}
```

示例：登录时账户未注册返回 `{"error":"账户未注册"}`，密码错误返回 `{"error":"密码错误"}`。

部分接口会带额外字段（如校验失败时的 `fields`）：

```json
{
  "error": "请检查输入",
  "fields": {
    "username": "不能为空",
    "email": "必须是有效的电子邮件地址"
  }
}
```

常见错误描述示例：`账户未注册`、`密码错误`、`用户名已被使用`、`邮箱已被使用`、`请先登录`、`当前密码错误`、`请检查输入`、`请求体格式错误`、`文章不存在`、`请填写昵称`、`请填写邮箱`、`无权限`、`服务器内部错误` 等。

### 1.4 分页

列表类接口支持 Spring Data 分页参数：

- `page`：页码，从 0 开始，默认 0
- `size`：每页条数，默认 10
- `sort`：排序，例如 `createdAt,desc`

响应为 Spring Page 序列化结果，包含：

- `content`：当前页数据数组
- `totalElements`：总条数
- `totalPages`：总页数
- `size`：每页大小
- `number`：当前页码（0-based）
- `first`、`last`：是否第一页/最后一页

---

## 2. 健康检查

### GET /api/health

无需认证，用于存活探针。

**响应示例**

```json
{
  "status": "ok"
}
```

---

## 3. 认证

### POST /api/auth/register

注册新用户。

**请求体**

| 字段       | 类型   | 必填 | 说明                    |
|------------|--------|------|-------------------------|
| username   | string | 是   | 3～32 字符              |
| email      | string | 是   | 合法邮箱，最长 128 字符 |
| password   | string | 是   | 6～72 字符              |

**响应**

- 成功：`201 Created`，无 body
- 失败：
  - `409 Conflict`：`{"error":"用户名已被使用"}` 或 `{"error":"邮箱已被使用"}`
  - `400 Bad Request`：`{"error":"请检查输入", "fields": {...}}`

---

### POST /api/auth/login

登录，获取 JWT。

**请求体**

| 字段     | 类型   | 必填 | 说明 |
|----------|--------|------|------|
| username  | string | 是   | 用户名 |
| password  | string | 是   | 密码   |

**响应**

- 成功：`200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "alice"
}
```

- 失败：`401 Unauthorized`，body 为可读描述，例如：`{"error":"账户未注册"}` 或 `{"error":"密码错误"}`

---

### GET /api/auth/me

获取当前登录用户信息。**需要认证**。

**响应**

- 成功：`200 OK`

```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com"
}
```

- 失败：`401 Unauthorized`（未带或无效 Token）

---

### PUT /api/auth/me

更新当前用户资料（如邮箱）。**需要认证**。

**请求体**

| 字段   | 类型   | 必填 | 说明                    |
|--------|--------|------|-------------------------|
| email  | string | 否   | 合法邮箱，最长 128 字符 |

**响应**

- 成功：`200 OK`，body 同 `GET /api/auth/me` 的 UserMeResponse
- 失败：`409 Conflict`（如 `{"error":"邮箱已被使用"}`）；`400` 校验失败（`{"error":"请检查输入", "fields": {...}}`）；`401` 未认证（`{"error":"请先登录"}`）

---

### PUT /api/auth/me/password

修改当前用户密码。**需要认证**。

**请求体**

| 字段            | 类型   | 必填 | 说明        |
|-----------------|--------|------|-------------|
| currentPassword | string | 是   | 当前密码    |
| newPassword     | string | 是   | 新密码，6～72 字符 |

**响应**

- 成功：`204 No Content`，无 body
- 失败：`401 Unauthorized`（如 `{"error":"当前密码错误"}`）；`400` 校验失败

---

## 4. 文章

### GET /api/tags

获取全站标签列表（含使用次数）。无需认证。

**响应**

`200 OK`，数组，每项：`{ "name": "标签名", "count": 使用次数 }`。

---

### GET /api/posts

获取已发布文章分页列表，按创建时间倒序。无需认证。

**Query 参数**

| 参数   | 类型    | 默认   | 说明     |
|--------|---------|--------|----------|
| page   | integer | 0      | 页码     |
| size   | integer | 10     | 每页条数 |
| sort   | string  | createdAt,desc | 排序     |
| tag    | string  | -      | 可选，按标签筛选 |

**响应**

`200 OK`，Spring Page 结构，`content` 中每项为 `PostResponse`：

| 字段            | 类型    | 说明           |
|-----------------|---------|----------------|
| id              | long    | 小说/文章 ID   |
| title           | string  | 标题           |
| slug            | string  | URL 友好标识   |
| contentMarkdown  | string  | 正文（Markdown）|
| published       | boolean | 是否已发布     |
| tags            | string[]| 标签列表       |
| authorUsername  | string  | 作者用户名     |
| createdAt       | string  | ISO 8601 时间  |
| updatedAt       | string  | ISO 8601 时间  |
| inspirationId   | long    | 可选，来源灵感 ID |

---

### GET /api/posts/slug/{slug}

按 slug 获取单篇文章详情。无需认证。

**路径参数**

- `slug`：文章 slug（URL 编码）

**响应**

- 成功：`200 OK`，同上 `PostResponse` 单条
- 失败：`404 Not Found`（slug 不存在）

---

### GET /api/posts/search

全文搜索已发布文章（标题或正文模糊匹配）。无需认证。

**Query 参数**

| 参数   | 类型    | 默认   | 说明     |
|--------|---------|--------|----------|
| q      | string  | -      | 关键词，空则返回全部已发布 |
| page   | integer | 0      | 页码     |
| size   | integer | 10     | 每页条数 |
| sort   | string  | createdAt,desc | 排序     |

**响应**

`200 OK`，同 `GET /api/posts` 的分页结构。

---

### GET /api/posts/{id}

获取单篇文章（仅作者本人，用于编辑预填）。**需要认证**。

**路径参数**：`id` 为文章 ID。

**响应**：`200 OK` 为单条 `PostResponse`（含 tags）；`403`/`404` 无权限或不存在。

---

### GET /api/posts/me

获取当前登录用户自己的文章列表（含未发布）。**需要认证**。

**Query 参数**

| 参数   | 类型    | 默认   | 说明     |
|--------|---------|--------|----------|
| page   | integer | 0      | 页码     |
| size   | integer | 10     | 每页条数 |
| sort   | string  | createdAt,desc | 排序     |
| tag    | string  | -      | 可选，按标签筛选，仅返回当前用户且包含该标签的文章 |

**响应**

`200 OK`，同 `GET /api/posts` 的分页结构。

---

### GET /api/posts/me/tags

获取当前登录用户文章中使用过的全部标签（去重、按标签名排序）。**需要认证**。

**响应**

`200 OK`，字符串数组，例如：`["标签A", "标签B"]`。

---

### POST /api/posts

创建小说/文章。**需要认证**。可选关联灵感（仅当前用户的灵感可关联）。

**请求体**

| 字段            | 类型    | 必填 | 说明                |
|-----------------|---------|------|---------------------|
| title           | string  | 是   | 标题，最长 200 字符 |
| contentMarkdown | string  | 是   | 正文（Markdown）    |
| published       | boolean | 否   | 是否发布，默认 false |
| tags            | string[]| 否   | 标签列表，每项最长 64 字符 |
| inspirationId   | long    | 否   | 来源灵感 ID，关联 inspirations.id |

**响应**

- 成功：`201 Created`，body 为单条 `PostResponse`
- 失败：`400 Bad Request`（校验失败）；`403` 无权限关联该灵感

---

### PUT /api/posts/{id}

更新指定小说/文章。**需要认证**，仅作者本人可改。

**路径参数**

- `id`：文章 ID（long）

**请求体**

与 `POST /api/posts` 相同：`title`、`contentMarkdown`、`published`、`tags`、可选 `inspirationId`。

**响应**

- 成功：`200 OK`，body 为更新后的 `PostResponse`
- 失败：`400` 校验失败；`403`/`404` 无权限或文章不存在

---

### DELETE /api/posts/{id}

删除指定文章。**需要认证**，仅作者本人可删。

**路径参数**

- `id`：文章 ID（long）

**响应**

- 成功：`204 No Content`，无 body
- 失败：`403`/`404` 无权限或文章不存在

---

## 5. 评论

### GET /api/posts/{postId}/comments

获取某篇文章的评论分页列表，按创建时间正序。无需认证。

**路径参数**：`postId` 为文章 ID。

**Query 参数**：`page`、`size`、`sort=createdAt,asc`（默认）。

**响应**

`200 OK`，Spring Page 结构，`content` 中每项：

| 字段        | 类型   | 说明           |
|-------------|--------|----------------|
| id          | long   | 评论 ID        |
| authorName  | string | 显示名（登录为用户名，游客为昵称） |
| createdAt   | string | ISO 8601 时间  |
| content     | string | 评论内容（纯文本） |

- 若文章不存在：`404`，`{"error":"文章不存在"}`。

---

### POST /api/posts/{postId}/comments

发表评论。无需认证；登录用户可不填游客信息，游客必填昵称与邮箱。

**路径参数**：`postId` 为文章 ID。

**请求体**

| 字段       | 类型   | 必填 | 说明                |
|------------|--------|------|---------------------|
| guestName  | string | 游客必填 | 昵称，最长 64 字符  |
| guestEmail | string | 游客必填 | 邮箱，最长 128 字符 |
| guestUrl   | string | 否   | 网址，最长 512 字符 |
| content    | string | 是   | 评论内容，最长 2000 字符（纯文本） |

登录用户只需传 `content`。

**响应**

- 成功：`201 Created`，body 为单条评论（同上 `CommentResponse`）
- 失败：`400`（如 `{"error":"请填写昵称"}`、`{"error":"请填写邮箱"}`、校验失败）；`404`（`{"error":"文章不存在"}`）

---

## 6. 故事种子

故事种子（StorySeed）为互动式故事的主线框架：作者提供开头与风格，读者后续可在分支点选择并触发 AI 生成章节。

### GET /api/story-seeds

获取已发布故事种子分页列表。无需认证。

**Query 参数**：`page`、`size`、`sort`（默认 `createdAt,desc`）。

**响应**

`200 OK`，Spring Page 结构，`content` 中每项为 `StorySeedListItemResponse`：

| 字段         | 类型    | 说明           |
|--------------|---------|----------------|
| id           | long    | 故事种子 ID    |
| title        | string  | 标题           |
| slug         | string  | URL 友好标识   |
| styleParams  | string  | 风格参数       |
| licenseType  | string  | 许可类型       |
| published    | boolean | 是否已发布     |
| authorUsername | string | 作者用户名   |
| createdAt    | string  | ISO 8601 时间  |
| updatedAt    | string  | ISO 8601 时间  |

---

### GET /api/story-seeds/slug/{slug}

按 slug 获取单条故事种子详情。无需认证；仅返回已发布的。

**路径参数**：`slug` 为故事 slug。

**响应**

- 成功：`200 OK`，单条 `StorySeedResponse`：

| 字段            | 类型    | 说明           |
|-----------------|---------|----------------|
| id              | long    | 故事种子 ID    |
| title           | string  | 标题           |
| slug            | string  | URL 友好标识   |
| openingMarkdown | string  | 开头正文（Markdown） |
| styleParams     | string  | 风格参数       |
| licenseType     | string  | 许可类型       |
| published       | boolean | 是否已发布     |
| authorId        | long    | 作者用户 ID    |
| authorUsername  | string  | 作者用户名     |
| createdAt       | string  | ISO 8601 时间  |
| updatedAt       | string  | ISO 8601 时间  |

- 失败：`404 Not Found`（`{"error":"故事不存在"}`）

---

### GET /api/story-seeds/me

获取当前登录用户自己的故事种子列表（含未发布）。**需要认证**。

**Query 参数**：`page`、`size`、`sort`。

**响应**

`200 OK`，同 `GET /api/story-seeds` 的分页结构（ListItem 不含 openingMarkdown）。

---

### GET /api/story-seeds/{id}

获取单条故事种子（仅作者本人，用于编辑预填）。**需要认证**。

**路径参数**：`id` 为故事种子 ID。

**响应**：`200 OK` 为单条 `StorySeedResponse`；`403`/`404` 无权限或不存在。

---

### POST /api/story-seeds

创建故事种子。**需要认证**。

**请求体**

| 字段            | 类型    | 必填 | 说明                |
|-----------------|---------|------|---------------------|
| title           | string  | 是   | 标题，最长 200 字符 |
| openingMarkdown | string  | 是   | 开头正文（Markdown）|
| styleParams     | string  | 否   | 风格参数，最长 2000 字符 |
| licenseType     | string  | 否   | 许可类型，最长 32 字符 |
| published       | boolean | 否   | 是否发布，默认 false |

**响应**

- 成功：`201 Created`，body 为单条 `StorySeedResponse`
- 失败：`400 Bad Request`（校验失败）；`401` 未登录

---

### PUT /api/story-seeds/{id}

更新指定故事种子。**需要认证**，仅作者本人可改。

**路径参数**：`id` 为故事种子 ID。

**请求体**：与 `POST /api/story-seeds` 相同。

**响应**

- 成功：`200 OK`，body 为更新后的 `StorySeedResponse`
- 失败：`400` 校验失败；`403`/`404` 无权限或故事不存在

---

### DELETE /api/story-seeds/{id}

删除指定故事种子。**需要认证**，仅作者本人可删。

**路径参数**：`id` 为故事种子 ID。

**响应**

- 成功：`204 No Content`，无 body
- 失败：`403`/`404` 无权限或故事不存在

---

### 6.1 故事种子详情中的分支点与选项

`GET /api/story-seeds/slug/{slug}` 与 `GET /api/story-seeds/{id}` 返回的 `StorySeedResponse` 包含字段 `branchPoints`，为分支点数组，每项结构如下。

**StoryBranchPointResponse**

| 字段       | 类型    | 说明           |
|------------|---------|----------------|
| id         | long    | 分支点 ID      |
| storySeedId | long   | 故事种子 ID    |
| sortOrder  | int     | 分支点顺序     |
| anchorText | string  | 分支前剧情摘要 |
| options    | array   | 选项列表，见下 |

**StoryOptionResponse**

| 字段          | 类型   | 说明           |
|---------------|--------|----------------|
| id            | long   | 选项 ID        |
| branchPointId | long  | 分支点 ID      |
| label         | string | 选项文案       |
| sortOrder     | int    | 选项顺序       |
| influenceNotes | string | 影响描述（供 AI 用） |

---

### POST /api/story-seeds/{storySeedId}/branch-points

创建分支点（含选项）。**需要认证**，仅故事作者可创建。

**路径参数**：`storySeedId` 为故事种子 ID。

**请求体**

| 字段       | 类型   | 必填 | 说明                |
|------------|--------|------|---------------------|
| sortOrder  | int    | 是   | 分支点顺序          |
| anchorText | string | 否   | 分支前剧情摘要，最长 500 字符 |
| options    | array  | 否   | 选项列表，每项：label（必填，最长 200）、sortOrder（必填）、influenceNotes（可选，最长 2000） |

**响应**

- 成功：`201 Created`，body 为单条 `StoryBranchPointResponse`（含 options）
- 失败：`400` 校验失败；`403`/`404` 无权限或故事不存在

---

### PUT /api/story-seeds/{storySeedId}/branch-points/{branchPointId}

更新分支点（含选项，整体替换）。**需要认证**，仅故事作者可改。

**路径参数**：`storySeedId`、`branchPointId`。

**请求体**：与 POST 相同，`options` 每项可含 `id`（更新时可选）。

**响应**

- 成功：`200 OK`，body 为更新后的 `StoryBranchPointResponse`
- 失败：`403`/`404` 无权限或分支点不存在

---

### DELETE /api/story-seeds/{storySeedId}/branch-points/{branchPointId}

删除分支点（级联删除其选项）。**需要认证**，仅故事作者可删。

**路径参数**：`storySeedId`、`branchPointId`。

**响应**

- 成功：`204 No Content`
- 失败：`403`/`404` 无权限或分支点不存在

---

### 6.2 世界观（仅主创作者维护）

以下接口均**需要认证**，且仅故事种子的作者可访问/修改。

**角色**

- `GET /api/story-seeds/{storySeedId}/characters`：角色列表，返回 `StoryCharacterResponse[]`
- `POST /api/story-seeds/{storySeedId}/characters`：创建角色，body：`{ name, description?, sortOrder }`
- `PUT /api/story-seeds/{storySeedId}/characters/{characterId}`：更新角色
- `DELETE /api/story-seeds/{storySeedId}/characters/{characterId}`：删除角色

**专有名词**

- `GET /api/story-seeds/{storySeedId}/terms`：专有名词列表，返回 `StoryTermResponse[]`
- `POST /api/story-seeds/{storySeedId}/terms`：创建专有名词，body：`{ termType, name, definition?, sortOrder }`
- `PUT /api/story-seeds/{storySeedId}/terms/{termId}`：更新专有名词
- `DELETE /api/story-seeds/{storySeedId}/terms/{termId}`：删除专有名词

**故事设定文档（README）**

- `GET /api/story-seeds/{storySeedId}/readme`：返回 `{ contentMarkdown }`
- `PUT /api/story-seeds/{storySeedId}/readme`：请求体 `{ contentMarkdown }`，更新设定文档

---

### 6.3 读者 Fork 与选择生成

**POST /api/story-seeds/{storySeedId}/fork**

开始阅读：为当前用户创建或返回已有的阅读副本。**需要认证**。

**路径参数**：`storySeedId` 为故事种子 ID。

**响应**

- 成功：`201 Created` 或 `200 OK`（已存在时），body 为 `ReaderForkResponse`（id、storySeedId、storySeedTitle、storySeedSlug、readerId、readerUsername、title、createdAt、updatedAt）
- 失败：`401` 未登录；`404` 故事不存在或未发布

---

**GET /api/reader-forks/me**

获取当前用户的阅读副本列表。**需要认证**。

**响应**：`200 OK`，`ReaderForkResponse[]`。

---

**GET /api/reader-forks/{forkId}**

获取单条阅读副本详情。**需要认证**，仅副本所属读者可访问。

**响应**：`200 OK` 为 `ReaderForkResponse`；`403`/`404` 无权限或不存在。

---

**GET /api/reader-forks/{forkId}/commits**

获取该 fork 的章节链（版本历史），按 sort_order 正序。**需要认证**，仅副本所属读者可访问。

**响应**：`200 OK`，`StoryCommitResponse[]`，每项含 id、forkId、parentCommitId、branchPointId、optionId、optionLabel、contentMarkdown、sortOrder、createdAt、updatedAt。

---

**POST /api/reader-forks/{forkId}/choose**

在「当前」分支点选择选项，触发 AI 生成下一章并落库。**需要认证**，仅副本所属读者可调用。

**请求体**

| 字段         | 类型 | 必填 | 说明       |
|--------------|------|------|------------|
| branchPointId | long | 是   | 当前分支点 ID |
| optionId     | long | 是   | 所选选项 ID   |

**说明**：分支点必须按顺序选择；当前「下一未选」分支点即请求中的 branchPointId，optionId 须属于该分支点。

**响应**

- 成功：`201 Created`，body 为新建的 `StoryCommitResponse`
- 失败：`400`（如「请按顺序选择当前分支点的选项」、选项不属于该分支点）；`403`/`404` 无权限或 fork/选项不存在

---

**POST /api/reader-forks/{forkId}/rollback**

回退到某章节：丢弃该章节之后的所有章节，读者可从该节点重新选择。**需要认证**，仅副本所属读者可调用。

**请求体**：`{ "commitId": long }`，为要保留的最后一章的 ID。

**响应**：`204 No Content`；失败：`400`（章节不属于该 fork）、`403`/`404` 无权限或不存在。

---

### 6.4 Pull Request（读者→作者）

**POST /api/story-seeds/{storySeedId}/pull-requests**

读者提交自己的分支给故事作者。**需要认证**，fork 须属于当前用户。

**请求体**：`{ forkId（必填）, fromCommitId?, title?, description? }`。

**响应**：`201 Created`，body 为 `StoryPullRequestResponse`（id、storySeedId、forkId、fromCommitId、title、description、status、reviewedById、createdAt、updatedAt）。

---

**GET /api/story-seeds/{storySeedId}/pull-requests**

作者查看该故事下的 PR 列表。**需要认证**，仅故事作者可访问。

**响应**：`200 OK`，`StoryPullRequestResponse[]`。

---

**GET /api/story-pull-requests/{prId}**

作者或 PR 所属读者查看 PR 详情。**需要认证**。

**响应**：`200 OK` 为 `StoryPullRequestResponse`；`403`/`404` 无权限或不存在。

---

**PATCH /api/story-pull-requests/{prId}**

作者更新 PR 状态（如合并或关闭）。**需要认证**，仅故事作者可改。

**请求体**：`{ "status": "open" | "merged" | "closed" }`。

**响应**：`200 OK`，body 为更新后的 `StoryPullRequestResponse`。

---

## 7. 文档与代码对应

- 健康检查：[HealthController](../apps/api/src/main/java/com/example/api/health/HealthController.java)
- 认证：[AuthController](../apps/api/src/main/java/com/example/api/auth/AuthController.java)，DTO 见 auth/dto
- 文章：[PostController](../apps/api/src/main/java/com/example/api/post/PostController.java)，DTO 见 post/dto
- 标签：[TagController](../apps/api/src/main/java/com/example/api/tag/TagController.java)
- 评论：[CommentController](../apps/api/src/main/java/com/example/api/comment/CommentController.java)，DTO 见 comment/dto
- 故事种子：[StorySeedController](../apps/api/src/main/java/com/example/api/storyseed/StorySeedController.java)，分支点：[StoryBranchPointController](../apps/api/src/main/java/com/example/api/storyseed/StoryBranchPointController.java)，世界观：[WorldbuildingController](../apps/api/src/main/java/com/example/api/storyseed/WorldbuildingController.java)，读者 Fork：[ReaderForkController](../apps/api/src/main/java/com/example/api/readerfork/ReaderForkController.java)，PR：[StoryPullRequestController](../apps/api/src/main/java/com/example/api/readerfork/StoryPullRequestController.java)，DTO 见 storyseed/dto、readerfork/dto
- 统一异常与错误格式：[GlobalExceptionHandler](../apps/api/src/main/java/com/example/api/common/GlobalExceptionHandler.java)
