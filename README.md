# AI 小说创作与互动阅读平台

这是一个基于 **Spring Boot（后端）+ Next.js（前端）+ MariaDB（数据库）** 的 **AI 小说创作与互动阅读平台**。

**核心功能**：
- **写小说**：首页与 AI 对话获取灵感 → 保存到灵感库 → 选灵感开始写小说；RAG + 预压缩算法辅助 AI 高效写作。
- **AI 互动阅读**：选择剧情走向，AI 实时续写专属故事章节；开源小说以章节为节点可被读者 Fork 续写。
- **小说库**：浏览已完成小说或参与 AI 互动续写；作者可管理故事种子、分支点、世界观与 Pull Request。

本文件（**README.md**）为**运维/运行手册**：本地如何跑、服务器如何部署、环境变量、常用命令、排障。功能规格与接口定义见下方「相关文档」。

---

## 目录结构

```
my-blog/
  apps/
    api/      # Spring Boot 后端 API
    web/      # Next.js 前端应用
  deploy/     # 部署相关配置（docker-compose + nginx）
  config/     # 环境变量示例（本地 config/env.local 不提交）
  docs/       # 项目文档（功能规格、API、表结构）
  scripts/    # API 自动化测试、测试数据生成等
  README.md   # 本文件：运维与运行手册
```

**相关文档**（开发/对接时必看）：
- [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md) — 功能规格、后端模块与 API 一览、**数据库表结构（共 29 张表）**
- [docs/API.md](docs/API.md) — 接口请求/响应格式、错误码、分页等
- [docs/README.md](docs/README.md) — 文档索引
- [scripts/README.md](scripts/README.md) — API 自动化测试说明

---

## 端口与访问地址

### 本地开发

- **Web（Next.js）**：`http://localhost:3000`
- **API（Spring Boot）**：`http://localhost:8080`
  - 健康检查：`GET http://localhost:8080/api/health`
- **DB（本地 docker MariaDB）**：`127.0.0.1:3307`（宿主机端口映射）

### 服务器部署

- **统一入口（Nginx）**：`http://<server-ip>/`（80 端口）
- **API 反代**：`http://<server-ip>/api/...`

---

## 环境变量（统一入口）

后端 `apps/api/src/main/resources/application.yml` 统一使用环境变量控制数据库连接（本地/服务器都兼容）：

- `DB_HOST`（默认 `localhost`）
- `DB_PORT`（默认 `3306`）
- `DB_NAME`（默认 `blog`）
- `DB_USER`（默认 `root`）
- `DB_PASSWORD`（默认空）
- `JWT_SECRET`（JWT 密钥，生产必须设置长随机字符串）
- **AI 功能**（可选，不设则首页灵感对话与作者分身不可用）：
  - `AI_API_URL`（默认 `https://api.openai.com/v1/chat/completions`，可改为 DeepSeek 等兼容地址）
  - `AI_API_KEY`（大模型 API Key，生产必须通过环境变量注入，勿提交仓库）
  - `AI_MODEL`（默认 `gpt-4o-mini`，对话与分身共用）
- **Redis**（AI 分身对话上下文）：`REDIS_HOST`（默认 `localhost`）、`REDIS_PORT`（默认 `6379`）。本地开发若用 Docker 起 Redis，API 连 `127.0.0.1:6379`；服务器部署见 `deploy/docker-compose.yml`，API 依赖 `redis` 服务。
- **CORS**（跨域配置）：`CORS_ALLOWED_ORIGINS`（默认 `http://localhost:3000,http://localhost`）。生产环境建议只配置真实的前端地址（域名或IP），多个地址用逗号分隔。

说明：
- **本地开发**：推荐在 PowerShell 中临时设置环境变量后启动（不写入仓库文件）。
- **服务器部署**：通过 `deploy/.env` 或 compose 的 `environment` 注入。

### 本地两种连库方式（config/env.local）

- **方案 A：连本地 Docker 的 DB** — `DB_HOST=127.0.0.1`，`DB_PORT=3307`（宿主机 3307 映射到容器 3306）。
- **方案 B：连服务器上的 DB（通过 SSH 隧道）** — 服务器上 DB 映射为宿主机 `3307`（docker 3307:3306），隧道应为本地 `13306` → 服务器 `3307`，则 `DB_HOST=127.0.0.1`，`DB_PORT=13306`，密码用服务器 DB 的密码。

切换方式：改 `config/env.local` 里的 `DB_PORT`（3307 或 13306），然后按 README 用该文件里的变量启动后端即可。

## 本地开发：切换使用哪个 DB（本地 DB / 服务器 DB（SSH 隧道））

你当前本地后端使用环境变量连接数据库（`DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`），因此只要切换这些变量即可切换 DB。

### 方案 A：使用本地 docker DB（默认）

- DB 地址：`127.0.0.1:3307`（宿主机端口映射到容器 3306）
- 启动本地 DB：见上面的 “1) 启动本地数据库（3307）”
- 启动后端时设置：
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=3307`

### 方案 B：使用服务器 DB（SSH 隧道）

在 xshell/终端开隧道：**本地监听 13306** -> **服务器 3307**（服务器上 DB 在宿主机 3307，见 deploy docker-compose）。命令示例：`ssh -L 13306:127.0.0.1:3307 root@服务器IP`

- DB 地址：`127.0.0.1:13306`
- 启动后端时设置：
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=13306`

**启动方式**：与上面相同，使用脚本即可（脚本会读取 `config/env.local` 中的 `DB_PORT=13306` 等）：

```powershell
.\scripts\start-api.ps1
```

只需在 `config/env.local` 里把 `DB_PORT` 设为 `13306`（并确保隧道已开、密码正确）。

注意：
- **密码一定要用服务器 DB 的真实密码**（否则会 `Access denied for user 'blog'...`）。
- 隧道断开后，本地后端会连不上 DB（表现为接口 500/超时），先确认隧道是否仍在监听 `13306`。

说明：
- 确保这里的 `DB_PASSWORD` 和上一步启动 DB 使用的 `DB_PASSWORD` 一致。
- 启动后 Hibernate 会根据实体自动建表/更新（`ddl-auto: update`）。

### DB 密码不一致/注册接口报 500/连不上数据库怎么办？

如果你之前已经启动过 DB（卷里保留了旧账号密码），建议重置一次：

```powershell
$env:DB_PASSWORD="abc123"; $env:DB_ROOT_PASSWORD="abc123"
docker compose -f my-blog/deploy/docker-compose.yml down -v
docker compose -f my-blog/deploy/docker-compose.yml up -d db
```

#### 3) 启动本地前端（Next.js）

```powershell
cd C:\Users\huqicheng\Documents\think\my-blog\apps\web
npm install
npm run dev
```

### 本地 Docker 全栈（热更新，可选）

若希望 **DB + API + Web 全在 Docker 里跑，且 API/Web 支持热更新**（改代码自动生效），在 `deploy` 目录执行：

```bash
cd my-blog/deploy
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

- `docker-compose.dev.yml` **不会自动加载**，必须显式加 `-f docker-compose.dev.yml`。
- 效果：API 用 `gradle bootRun`、Web 用 `npm run dev`，源码挂载进容器，改完即生效。
- **服务器部署不要加** `docker-compose.dev.yml`，否则 api 会以开发模式运行并可能退出；服务器只用 `-f docker-compose.yml`。

---

## Navicat 连接本地数据库（3307）

- 主机：`127.0.0.1`
- 端口：`3307`
- 用户：`blog`
- 密码：按你本地 db 配置
- 数据库：`blog`

常用验证 SQL：

```sql
USE blog;
SHOW TABLES;
```

表结构说明（字段含义、索引、外键）见 [docs/PROJECT_SPEC.md 第 3 节](docs/PROJECT_SPEC.md)；库中列注释由迁移 `V12__add_column_comments.sql` 写入，新增表时需同步维护 COMMENT 与文档。

---

## 服务器部署（Docker Compose + Nginx，80 端口对外）

### 先决条件

- 服务器安装 Docker + Docker Compose
- 对外开放 80（Nginx）
- （可选）对外开放 443（后续上 HTTPS 用）

### 1) 拉取代码到服务器

建议把项目放在例如 `/opt/my-blog`：

```bash
cd /opt
git clone <your-repo-url> my-blog
cd my-blog
```

后续更新就用 `git pull`（见下方“服务器更新”）。

### 2) 配置环境变量（deploy/.env）

在服务器 `my-blog/deploy/` 目录复制模板并编辑：

```bash
cd /opt/my-blog/deploy
cp env.example .env
# 编辑 .env，至少设置 DB_PASSWORD、DB_ROOT_PASSWORD、JWT_SECRET
```

必填项（与 `deploy/env.example` 一致）：

```env
DB_PASSWORD=your_strong_password
DB_ROOT_PASSWORD=your_strong_root_password
JWT_SECRET=a_very_long_and_secure_secret_key_for_production
```

可选：AI 功能（首页灵感对话、作者分身）需在 `.env` 中增加 `AI_API_KEY`（必填）、`AI_API_URL`、`AI_MODEL`；不配置则 AI 不可用。Redis 由 docker-compose 自动起，无需在 `.env` 中配置。

说明：
- **`.env` 不要提交到 git**（模板见 `deploy/env.example`）。
- 如果你改过 DB 密码，可能需要重置 DB 卷（见下方“重置数据库”）。

### 3) 启动（首次部署）

```bash
cd /opt/my-blog/deploy
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml ps -a
```

> **注意**：服务器只用 `docker-compose.yml`，不要加 `docker-compose.override.yml` 或 `docker-compose.dev.yml`，否则 api 会以开发模式（gradle bootRun）运行并可能退出。

访问：
- `http://<server-ip>/` 前端
- `http://<server-ip>/api/health` 后端健康检查

若需启用 AI 功能，在 `deploy/.env` 中增加 `AI_API_KEY`（必填）、`AI_API_URL`、`AI_MODEL`（可选）；compose 已包含 `redis` 服务，API 会自动连接。

---

## 服务器更新（代码/配置更新后的正确姿势）

### A. 仅代码更新（最常用）

```bash
cd /opt/my-blog
git pull

cd deploy
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml ps
curl -sS http://127.0.0.1/api/health
```

> `docker compose -f docker-compose.yml up -d --build` 会自动按需重建镜像并更新服务（不会清空 DB 数据卷）。服务器部署始终只指定 `-f docker-compose.yml`。

### B. 改了 Nginx 配置（例如 `deploy/nginx/nginx.conf`）

```bash
cd /opt/my-blog/deploy
docker compose -f docker-compose.yml up -d --build nginx
```

### C. 只更新后端 / 只更新前端

```bash
# 只更新 API
cd /opt/my-blog/deploy
docker compose -f docker-compose.yml up -d --build api

# 只更新 Web
docker compose -f docker-compose.yml up -d --build web
```

### D. 改了环境变量（deploy/.env）

改完 `.env` 后建议重建对应服务：

```bash
cd /opt/my-blog/deploy
docker compose -f docker-compose.yml up -d --build
```

### E. 重置数据库（危险：会清空数据）

只有在 **DB 密码/初始化坏掉** 或你明确要清空数据时才用：

```bash
cd /opt/my-blog/deploy
docker compose -f docker-compose.yml down -v
docker compose -f docker-compose.yml up -d --build
```

---

## Docker 构建网络问题（v2ray / 代理）怎么处理（推荐方案）

原则：**线上 `docker-compose.yml` 不要写死本地代理地址**（例如 `host.docker.internal:10809`），否则在 Linux 服务器上很容易不可用。

本项目的做法：
- `deploy/docker-compose.yml`：生产/服务器用，不包含任何代理配置（线上安全）
- `deploy/docker-compose.dev.yml`：本地热更新（API gradle bootRun + Web npm run dev），**不会自动加载**，需显式 `-f docker-compose.dev.yml`；**服务器部署不要加此文件**，否则 api 会以开发模式运行并可能退出
- 本地如果需要代理：创建 `deploy/docker-compose.proxy.local.yml`（已在 `.gitignore` 忽略，不会提交到线上）

本地使用方式（叠加一个本地专用文件）：

```bash
cd my-blog/deploy
docker compose -f docker-compose.yml -f docker-compose.proxy.local.yml up -d --build
```

你可以在 `deploy/docker-compose.proxy.local.yml` 里把 `HTTP_PROXY/HTTPS_PROXY` 改成你本地 v2ray 的代理地址。

---

## 常见问题排查（本地）

### 1) `1046 - No database selected`

原因：未选择库。

解决：

```sql
USE blog;
SHOW TABLES;
```

### 2) PowerShell 在 `C:\WINDOWS\system32` 执行脚本找不到 `my-blog`

原因：当前目录不在项目根。

解决：先 `cd` 到项目根目录再执行启动命令。

### 3) `JAVA_HOME is set to an invalid directory`

原因：JDK 安装路径与 `JAVA_HOME` 不一致。

解决：设置正确的 `JAVA_HOME`（本项目已验证可用路径示例：`C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot`）。

---

## AI 功能与配置

### 功能说明

- **首页 AI 找灵感**：登录后在首页展开「AI 找灵感」面板，与 AI 多轮对话获取写作灵感，可点击「添加到灵感库」保存当前对话（可选标题）。
- **写小说时浏览灵感**：写小说页（`/write`）右侧「浏览灵感」侧栏，分页查看已保存灵感，点击某条可展开完整对话辅助写作。
- **作者 AI 分身**：读者在小说库或故事详情页可点击「与 TA 对话」/「与作者 AI 对话」，与该作者的 AI 分身多轮对话。分身结合作者在设置中填写的「分身提示词」与系统根据其已发布内容提炼的风格描述生成回复。

### 配置入口

| 用途 | 入口 | 说明 |
|------|------|------|
| **大模型 API（运维）** | 环境变量 | `AI_API_URL`、`AI_API_KEY`、`AI_MODEL`，在本地启动后端或 `deploy/.env` 中配置；详见上文「环境变量」。 |
| **作者分身设定（用户）** | 账号设置 → AI 分身设定 | 登录后访问 `/me/settings`，在「AI 分身设定」中填写分身提示词、开启/关闭「AI 分身」；保存后读者端才会看到该作者的分身入口。 |

### 使用前提

- 后端已配置 `AI_API_KEY`（以及按需的 `AI_API_URL`、`AI_MODEL`）。
- 本地开发或部署中已启动 Redis（分身对话上下文存 Redis；灵感库与首页对话存数据库）。

---

## API 自动化测试

每次 AI 生成代码后，建议运行自动化测试脚本验证接口是否正常。

### 完整测试（推荐，覆盖60+接口）

```bash
cd scripts
node api-test-complete.js --report
```

### 生成测试数据后测试

```bash
cd scripts
node test-data-generator.js      # 生成测试数据
node api-test-complete.js        # 运行完整测试
```

### 快速测试（基础22个接口）

```bash
cd scripts
node api-test.js
```

### 生成详细报告

```bash
cd scripts
node api-test-complete.js --report
```

### CI 模式（测试失败时返回非零退出码）

```bash
cd scripts
node api-test-complete.js --ci
```

### Gradle 集成

```bash
cd apps/api
../../gradlew apiTest          # 运行测试
../../gradlew apiTestReport    # 生成报告
```

### 完整测试覆盖

- **健康检查**：`/api/health`
- **认证接口**：注册、登录、获取/更新用户信息、修改密码
- **Story 接口**：列表、搜索、CRUD、收藏、Fork、贡献者等
- **Chapter 接口**：章节列表、详情、CRUD 等
- **Wiki 接口**：页面、角色、时间线等
- **StorySeed 接口**：故事种子、分支点、世界观、读者 Fork、Pull Request 等
- **灵感接口**：灵感的 CRUD 操作
- **标签接口**：标签列表
- **AI 接口**：模型列表、聊天、流式聊天

### 报告输出

测试完成后输出：
1. **控制台摘要** - 实时显示测试结果
2. **AI 友好报告** - JSON 格式，可直接复制给 AI 分析
3. **Markdown 报告** - 保存到 `test-reports/` 目录

更多详情见 [scripts/README.md](scripts/README.md)

---

## 常用命令速查

- 启动本地 DB：`docker compose -f my-blog/deploy/docker-compose.yml up -d db`
- 启动本地 DB + Redis（启用 AI 时）：`docker compose -f my-blog/deploy/docker-compose.yml up -d db redis`
- 停止本地 DB：`docker compose -f my-blog/deploy/docker-compose.yml stop db`
- 查看本地 DB 日志：`docker compose -f my-blog/deploy/docker-compose.yml logs -f db`
- 运行 API 完整测试：`cd scripts && node api-test-complete.js`
- 运行 API 测试并生成报告：`cd scripts && node api-test-complete.js --report`
- 生成测试数据：`cd scripts && node test-data-generator.js`
