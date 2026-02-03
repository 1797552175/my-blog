# API 接口文档（my-blog）

后端 Base URL：本地 `http://localhost:8080`，部署后经 Nginx 反代为 `http://<host>/api`。以下路径均以 **/api** 为前缀。

---

## 1. 通用说明

### 1.1 认证

需认证的接口在请求头中携带：

```
Authorization: Bearer <JWT_TOKEN>
```

未带 Token 或 Token 无效时返回 `401 Unauthorized`，body 示例：`{"error":"..."}`。

### 1.2 请求体

- Content-Type：`application/json`
- 字段校验失败时返回 `400 Bad Request`，见「错误响应」一节。

### 1.3 错误响应

统一格式：

```json
{
  "error": "错误码或简短描述"
}
```

部分接口会带额外字段（如校验失败时的 `fields`）：

```json
{
  "error": "validation_failed",
  "fields": {
    "username": "不能为空",
    "email": "必须是有效的电子邮件地址"
  }
}
```

常见错误码：`bad_credentials`、`username_taken`、`email_taken`、`validation_failed`、`invalid_json`、`internal_error`。

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
  - `409 Conflict`：`{"error":"username_taken"}` 或 `{"error":"email_taken"}`
  - `400 Bad Request`：`validation_failed` + `fields`

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

- 失败：`401 Unauthorized`，`{"error":"bad_credentials"}`

---

## 4. 文章

### GET /api/posts

获取已发布文章分页列表，按创建时间倒序。无需认证。

**Query 参数**

| 参数   | 类型    | 默认   | 说明     |
|--------|---------|--------|----------|
| page   | integer | 0      | 页码     |
| size   | integer | 10     | 每页条数 |
| sort   | string  | createdAt,desc | 排序     |

**响应**

`200 OK`，Spring Page 结构，`content` 中每项为 `PostResponse`：

| 字段            | 类型    | 说明           |
|-----------------|---------|----------------|
| id              | long    | 文章 ID        |
| title           | string  | 标题           |
| slug            | string  | URL 友好标识   |
| contentMarkdown  | string  | 正文（Markdown）|
| published       | boolean | 是否已发布     |
| authorUsername  | string  | 作者用户名     |
| createdAt       | string  | ISO 8601 时间  |
| updatedAt       | string  | ISO 8601 时间  |

---

### GET /api/posts/slug/{slug}

按 slug 获取单篇文章详情。无需认证。

**路径参数**

- `slug`：文章 slug（URL 编码）

**响应**

- 成功：`200 OK`，同上 `PostResponse` 单条
- 失败：`404 Not Found`（slug 不存在）

---

### GET /api/posts/me

获取当前登录用户自己的文章列表（含未发布）。**需要认证**。

**Query 参数**

与 `GET /api/posts` 相同：`page`、`size`、`sort`。

**响应**

`200 OK`，同 `GET /api/posts` 的分页结构。

---

### POST /api/posts

创建文章。**需要认证**。

**请求体**

| 字段            | 类型    | 必填 | 说明                |
|-----------------|---------|------|---------------------|
| title           | string  | 是   | 标题，最长 200 字符 |
| contentMarkdown | string  | 是   | 正文（Markdown）    |
| published       | boolean | 否   | 是否发布，默认 false |

**响应**

- 成功：`201 Created`，body 为单条 `PostResponse`
- 失败：`400 Bad Request`（校验失败）等

---

### PUT /api/posts/{id}

更新指定文章。**需要认证**，仅作者本人可改。

**路径参数**

- `id`：文章 ID（long）

**请求体**

与 `POST /api/posts` 相同：`title`、`contentMarkdown`、`published`。

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

## 5. 文档与代码对应

- 健康检查：[HealthController](../apps/api/src/main/java/com/example/api/health/HealthController.java)
- 认证：[AuthController](../apps/api/src/main/java/com/example/api/auth/AuthController.java)，DTO 见 auth/dto
- 文章：[PostController](../apps/api/src/main/java/com/example/api/post/PostController.java)，DTO 见 post/dto
- 统一异常与错误格式：[GlobalExceptionHandler](../apps/api/src/main/java/com/example/api/common/GlobalExceptionHandler.java)
