# 原型：AI 灵感与作者分身

本期实现：**首页 AI 对话找灵感**、**灵感库**、**写文章浏览灵感**、**作者 AI 分身对话**。以下为已确认的原型说明，可直接作为 PROJECT_SPEC、API 文档与实现的依据。

---

## 1. 概述与待优化点

### 1.1 功能范围

- **功能一**：首页与 AI 对话找灵感；输入下方「开启新的思考」清空上下文；右侧灵感区支持查询、删除、选中查看详情
- **功能二**：写文章页面可浏览灵感库、删除灵感、查看灵感详情，辅助写作
- **功能三**：游客在文章列表/详情页与作者 AI 分身对话（基于作者设定 + 历史文章提炼）

### 1.2 技术约定

| 项 | 说明 |
|----|------|
| AI 输出 | 本期使用**非流式**，接口一次返回完整回复 |
| 模型配置 | 对话模型**写死在代码配置文件**（如 `application.yml`），不支持用户选择 |
| 历史文章 | 使用**方案 B**，新增表存储提炼结果，每发布一篇文章即更新 |
| 分身对话 | **存 Redis**，不建表，按 session 管理多轮上下文 |

### 1.3 待优化点（记入原型，本期不实现）

| 项 | 说明 |
|----|------|
| 流式输出 | AI 对话改为 SSE 流式返回，提升体验 |
| 用户模型选择 | 允许用户在设置中选择对话模型（需模型列表与权限控制） |

---

## 2. 功能一：首页 AI 对话找灵感（重构版）

### 2.1 目标

登录用户在首页与 AI 多轮对话获取写作灵感；输入区下方提供「开启新的思考」以清空当前上下文；右侧灵感区展示灵感列表，支持删除、选中查看详情。

### 2.2 权限

仅登录用户可用，未登录提示跳转 `/login?next=/`。

### 2.3 前端

| 页面/组件 | 说明 |
|-----------|------|
| **入口** | 首页 `/` 增加「AI 找灵感」入口（折叠面板或主区域） |
| **交互** | 聊天界面，多轮对话；**无左侧对话框** |
| **开启新的思考** | 输入区下方按钮，点击后清空当前窗口聊天上下文，开始新一轮对话 |

### 2.4 后端

- 调用大模型：统一走 `AiChatService`，非流式返回
- 灵感查询：`GET /api/inspirations`（分页）、`GET /api/inspirations/{id}`（详情，含 inspiration_messages）
- 灵感删除：`DELETE /api/inspirations/{id}`（仅作者可删，级联删除 inspiration_messages）

### 2.5 首页布局与 UI 设计（重构）

首页「AI 找灵感」采用**双栏布局**：左/主区域为当前对话，右侧为灵感区。**不再保留左侧对话框**。

#### 2.5.1 整体布局

| 区域 | 位置 | 宽度建议 | 说明 |
|------|------|----------|------|
| **当前对话** | 左侧/主区域 | 弹性占据主区域 | 聊天内容与输入区；输入区下方「开启新的思考」 |
| **灵感区** | 右侧 | 固定或可收窄（如 320px） | 灵感列表 + 选中灵感的详情展示；可折叠 |

- 大屏：双栏并排；小屏可改为单栏切换或抽屉。
- 背景以浅色为主，主操作区白底，边框/分割线轻量。

#### 2.5.2 左/主区域：当前对话

| 元素 | 说明 |
|------|------|
| **顶部/空态** | 无消息时展示欢迎语，如「今天有什么可以帮到你？」 |
| **消息区** | 多轮对话展示：用户消息与 AI 回复区分左右或样式，支持滚动 |
| **输入区** | 底部固定：多行输入框，占位符如「给 AI 发送消息」；右侧发送按钮 |
| **开启新的思考** | 输入区**下方**醒目按钮，点击后**清空当前窗口上下文**（messages 置空），开始新一轮思考；可带快捷键提示（如 Ctrl+J） |

风格：消息气泡清晰、间距适中，无左侧历史对话列表。

#### 2.5.3 右栏：灵感区

| 元素 | 说明 |
|------|------|
| **标题** | 明确标题「灵感区」 |
| **灵感列表** | 展示当前用户灵感列表（标题、创建时间），分页；每条支持**删除**按钮（悬停或行内图标），删除前可二次确认 |
| **选中与详情** | 点击列表某项**选中**后，该灵感的完整对话（inspiration_messages）**显示在最右侧**（或列表下方展开区域）；未选中时右侧/详情区为空态或提示「点击左侧灵感查看详情」 |
| **空态** | 无灵感时展示「暂无灵感」；列表为空时详情区不展示 |

用途：管理已保存灵感（查询、删除、查看详情）。

**灵感保存入口**：原「添加到灵感库」按钮已改为「开启新的思考」。若仍需从首页将当前对话保存到灵感库，可在消息区为单条消息提供「保存到灵感」操作菜单，或与产品确认后单独设计入口。

#### 2.5.4 UI 参考要点

- **布局**：双栏——左/主为当前对话 + 输入 + 「开启新的思考」；右为灵感列表 + 选中灵感详情。
- **交互**：开启新的思考、发送、灵感列表选中与删除等主操作明确；无左侧对话框，界面更简洁。

---

## 3. 功能二：灵感库与写文章浏览

### 3.1 目标

登录用户在写文章页可浏览灵感库，选择某条灵感查看对话内容辅助写作；支持删除灵感。

### 3.2 前端

| 页面/组件 | 说明 |
|-----------|------|
| **入口** | 写文章页 `/write` 增加「浏览灵感」入口（侧边栏或折叠面板） |
| **列表** | 展示当前用户的灵感列表（标题、创建时间），分页；每条支持**删除** |
| **详情** | 点击某条灵感，展开/显示该灵感的完整对话（inspiration_messages，多轮 user/assistant） |

### 3.3 后端

| API | 说明 |
|-----|------|
| GET /api/inspirations | 分页列表，仅当前用户 |
| GET /api/inspirations/{id} | 单条灵感详情（含 inspiration_messages） |
| DELETE /api/inspirations/{id} | 删除灵感（仅作者可删，级联删除 inspiration_messages） |

---

## 4. 功能三：作者 AI 分身对话

### 4.1 目标

游客在文章列表或详情页可与该作者的 AI 分身对话，分身结合「作者设定 + 历史文章提炼 + 当前文章（若有）」生成回复。

### 4.2 权限

游客可用，无需登录。

### 4.3 作者设定

- 默认开启；作者可在设置中关闭（`persona_enabled=false` 时，列表/详情页不展示分身入口）
- 作者在账号设置中填写「AI 分身设定」（`persona_prompt`）：风格、人设、擅长话题等

### 4.4 历史文章提炼（方案 B）

- 新增表 `user_persona_profile`，存每个作者的提炼结果
- 作者每**发布**一篇文章，触发更新：对该作者已发布文章做提炼，写入/更新 `user_persona_profile`
- 分身对话时，直接读取该表内容，无需实时查文章，节省 token

### 4.5 前端

| 页面/组件 | 说明 |
|-----------|------|
| **入口** | 文章列表页 `/posts`、文章详情页 `/posts/[slug]` 均有「与作者 AI 对话」入口 |
| **列表页** | 按作者聚合时，可为每位作者提供分身入口；或列表页顶部/侧边提供「选择作者对话」 |
| **详情页** | 当前文章作者明确，入口直接指向该作者分身 |
| **交互** | 聊天浮层/侧边栏，多轮对话，上下文存 Redis（`session_id:author_id`） |

### 4.6 后端

- `POST /api/ai/persona/chat`：请求体含 `authorId`、`postId`（可选）、`messages`（历史）、`content`（本条用户消息）
- 从 `user_persona_profile` 读作者提炼；若有 `postId` 则附带当前文章摘要
- 调用大模型生成回复，非流式
- 将本轮对话写入 Redis，key 为 `persona:{sessionId}:{authorId}`，TTL 1 小时

---

## 5. 数据模型与表结构

### 5.1 新增/修改表

| 表名 | 说明 |
|------|------|
| **inspirations** | 灵感主表，user_id、title、created_at、updated_at |
| **inspiration_messages** | 灵感消息表，inspiration_id、seq、role、content、created_at |
| **users** 新增字段 | persona_prompt (TEXT)、persona_enabled (BOOLEAN, default true) |
| **user_persona_profile** | 作者历史文章提炼，user_id、distilled_content (TEXT)、updated_at |
| 分身对话 | 不建表，存 Redis |

### 5.2 inspirations 表

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 灵感主键 |
| user_id | BIGINT | 非空、外键 | 所属用户 |
| title | VARCHAR(200) | 可空 | 标题，默认取首条用户消息前 50 字 |
| created_at | TIMESTAMP | 非空 | 创建时间 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |

### 5.3 inspiration_messages 表

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| id | BIGINT | 主键、自增 | 消息主键 |
| inspiration_id | BIGINT | 非空、外键 | 所属灵感 |
| seq | INT | 非空 | 对话内顺序 |
| role | VARCHAR(20) | 非空 | user / assistant |
| content | TEXT | 非空 | 消息内容 |
| created_at | TIMESTAMP | 非空 | 创建时间 |

### 5.4 user_persona_profile 表

| 字段名 | 类型 | 约束 | 备注 |
|--------|------|------|------|
| user_id | BIGINT | 主键、外键 | 作者用户 ID |
| distilled_content | LONGTEXT | 非空 | 历史文章提炼结果 |
| updated_at | TIMESTAMP | 非空 | 更新时间 |

### 5.5 更新触发时机

`PostService` 在 `create`/`update` 且 `published=true` 时，调用 `PersonaProfileService.updateForAuthor(authorId)`，对该作者已发布文章进行提炼并更新 `user_persona_profile`。

---

## 6. API 接口清单

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/ai/chat | 是 | 首页灵感对话，body: { messages, content } |
| POST | /api/inspirations | 是 | 保存灵感，body: { title?, messages } |
| GET | /api/inspirations | 是 | 灵感列表，分页 |
| GET | /api/inspirations/{id} | 是 | 灵感详情（含 inspiration_messages） |
| DELETE | /api/inspirations/{id} | 是 | 删除灵感（级联删除 inspiration_messages） |
| PUT | /api/auth/me | 是 | 扩展：支持 persona_prompt、persona_enabled |
| GET | /api/auth/me | 是 | 响应扩展：含 persona_prompt、persona_enabled |
| POST | /api/ai/persona/chat | 否 | 分身对话，body: { authorId, postId?, messages, content } |

---

## 7. 实现顺序建议

1. 后端：模型配置、AiChatService、inspirations 表与 API、user_persona_profile 表与更新逻辑
2. 后端：users 新增字段、PUT/GET /api/auth/me 扩展
3. 后端：POST /api/ai/chat、POST /api/ai/persona/chat、Redis 集成
4. 前端：首页 AI 对话、添加灵感
5. 前端：写文章页灵感库浏览
6. 前端：账号设置页分身设定、列表/详情页分身入口与对话

---

## 8. 完成度总结

| 模块 | 状态 | 说明 |
|------|------|------|
| **功能一：首页 AI 对话找灵感** | ✅ 已完成 | 双栏布局：左/主为对话 + 输入 + 「开启新的思考」；右为灵感区（列表 + 删除 + 选中查看详情）。 |
| **功能二：灵感库与写文章浏览** | ✅ 已完成 | 写文章页灵感侧栏支持删除、选中查看详情；后端已新增 `DELETE /api/inspirations/{id}`。 |
| **功能三：作者 AI 分身对话** | ✅ 已完成 | 列表页每篇「与 TA 对话」、详情页「与作者 AI 对话」；游客可用；分身设定在账号设置。 |
| **后端：灵感表与 API** | ✅ 已完成 | inspirations / inspiration_messages 表，POST/GET inspirations、GET inspirations/{id}。 |
| **后端：用户分身字段与 auth 扩展** | ✅ 已完成 | users 表 persona_prompt、persona_enabled；GET/PUT /api/auth/me 含该字段。 |
| **后端：user_persona_profile 与发布触发** | ✅ 已完成 | 发布文章时触发提炼并写入/更新 user_persona_profile。 |
| **后端：AI 配置、AiChatService、Redis、对话接口** | ✅ 已完成 | application.yml 中 ai.api-url/api-key/model；Redis 存分身对话上下文；POST /api/ai/chat、/api/ai/persona/chat。 |
| **待优化（本期不实现）** | 记入原型 | 流式输出、用户可选对话模型。 |

**AI 配置入口（运维侧）**：见项目根目录 **README.md** 中「环境变量」与「AI 功能与配置」小节。后端通过环境变量 `AI_API_URL`、`AI_API_KEY`、`AI_MODEL` 配置大模型；本地/部署时设置后即可使用首页灵感对话与作者分身。

**作者分身设定入口（用户侧）**：登录后进入 **账号设置**（`/me/settings`）→ **AI 分身设定**：填写分身提示词、开启/关闭「AI 分身」，保存后读者在列表/详情页可见「与 TA 对话」或「与作者 AI 对话」。
