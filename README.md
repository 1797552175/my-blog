# My Blog Project

这是一个基于 **Spring Boot（后端）+ Next.js（前端）+ MariaDB（数据库）** 的个人博客项目。

- 本文件（README.md）：放**运维/运行手册**（本地如何跑、服务器如何部署、环境变量、常用命令、排障）。
- `PROJECT_OVERVIEW.md`：放**部署疑问/解决方法/知识总结/学习过程**。

---

## 目录结构

```
my-blog/
  apps/
    api/      # Spring Boot 后端 API
    web/      # Next.js 前端应用
  deploy/     # 部署相关配置（docker-compose + nginx）
  config/     # 环境变量示例等
  README.md
  PROJECT_OVERVIEW.md
```

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

说明：
- **本地开发**：推荐在 PowerShell 中临时设置环境变量后启动（不写入仓库文件）。
- **服务器部署**：通过 `deploy/.env` 或 compose 的 `environment` 注入。

### 本地两种连库方式（config/env.local）

- **方案 A：连本地 Docker 的 DB** — `DB_HOST=127.0.0.1`，`DB_PORT=3307`（宿主机 3307 映射到容器 3306）。
- **方案 B：连服务器上的 DB（通过 SSH 隧道）** — 隧道例如本地 `13306` → 服务器 `3306`，则 `DB_HOST=127.0.0.1`，`DB_PORT=13306`，密码用服务器 DB 的密码。

切换方式：改 `config/env.local` 里的 `DB_PORT`（3307 或 13306），然后按 README 用该文件里的变量启动后端即可。

---

## 本地开发（推荐模式：本地前后端 + 本地 DB 3307）

这是目前验证可用的开发模式：

- 本地跑 Web（Next.js）
- 本地跑 API（Spring Boot）
- 本地用 docker 起 MariaDB，映射到 `3307`

### 先决条件

- Docker Desktop
- JDK 21
- Node.js 18+

### 启动步骤（3 个终端）

#### 1) 启动本地数据库（MariaDB，端口 3307）

在项目根目录执行：

```powershell
 $env:DB_PASSWORD="abc123"; $env:DB_ROOT_PASSWORD="abc123"
docker compose -f my-blog/deploy/docker-compose.yml up -d db
```

> 注意：`docker-compose.yml` 里 DB 用户是 `blog`，并且会使用 `DB_PASSWORD` 创建/校验密码。
> 如果你不设置 `DB_PASSWORD/DB_ROOT_PASSWORD`（或之前用不同密码启动过），后端会出现 `Access denied for user 'blog'...`，从而导致注册/登录/文章接口失败。

#### 2) 启动本地后端（Spring Boot，连接本地 3307）

在项目根目录执行（Windows PowerShell，一行命令）：

```powershell
cd C:\Users\huqicheng\Documents\think; $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; $env:DB_HOST="127.0.0.1"; $env:DB_PORT="3307"; $env:DB_NAME="blog"; $env:DB_USER="blog"; $env:DB_PASSWORD="abc123"; $env:JWT_SECRET="a-very-long-and-secure-secret-key-for-jwt"; .\my-blog\apps\api\gradlew.bat -p my-blog\apps\api bootRun --no-daemon
```

---

## 本地开发：切换使用哪个 DB（本地 DB / 服务器 DB（SSH 隧道））

你当前本地后端使用环境变量连接数据库（`DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`），因此只要切换这些变量即可切换 DB。

### 方案 A：使用本地 docker DB（默认）

- DB 地址：`127.0.0.1:3307`（宿主机端口映射到容器 3306）
- 启动本地 DB：见上面的 “1) 启动本地数据库（3307）”
- 启动后端时设置：
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=3307`

### 方案 B：使用服务器 DB（SSH 隧道）

你已经在 xshell 开了隧道：**本地监听 13306** -> **服务器 3306**。

- DB 地址：`127.0.0.1:13306`
- 启动后端时设置：
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=13306`

示例（Windows PowerShell，一行命令）：

```powershell
cd C:\Users\huqicheng\Documents\think; $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; $env:DB_HOST="127.0.0.1"; $env:DB_PORT="13306"; $env:DB_NAME="blog"; $env:DB_USER="blog"; $env:DB_PASSWORD="<server-db-password>"; $env:JWT_SECRET="a-very-long-and-secure-secret-key-for-jwt"; .\my-blog\apps\api\gradlew.bat -p my-blog\apps\api bootRun --no-daemon
```

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

在服务器 `my-blog/deploy/` 目录创建 `.env`：

```env
DB_PASSWORD=your_strong_password
DB_ROOT_PASSWORD=your_strong_root_password
JWT_SECRET=a_very_long_and_secure_secret_key_for_production
```

说明：
- **`.env` 不要提交到 git**（只提交 `config/env.example` 作为模板）。
- 如果你改过 DB 密码，可能需要重置 DB 卷（见下方“重置数据库”）。

### 3) 启动（首次部署）

```bash
cd /opt/my-blog/deploy
docker compose up -d --build
```

访问：
- `http://<server-ip>/` 前端
- `http://<server-ip>/api/health` 后端健康检查

---

## 服务器更新（代码/配置更新后的正确姿势）

### A. 仅代码更新（最常用）

```bash
cd /opt/my-blog
git pull

cd deploy
docker compose up -d --build
docker compose ps
curl -sS http://127.0.0.1/api/health
```

> `docker compose up -d --build` 会自动按需重建镜像并更新服务（不会清空 DB 数据卷）。

### B. 改了 Nginx 配置（例如 `deploy/nginx/nginx.conf`）

```bash
cd /opt/my-blog/deploy
docker compose up -d --build nginx
```

### C. 只更新后端 / 只更新前端

```bash
# 只更新 API
cd /opt/my-blog/deploy
docker compose up -d --build api

# 只更新 Web
docker compose up -d --build web
```

### D. 改了环境变量（deploy/.env）

改完 `.env` 后建议重建对应服务：

```bash
cd /opt/my-blog/deploy
docker compose up -d --build
```

### E. 重置数据库（危险：会清空数据）

只有在 **DB 密码/初始化坏掉** 或你明确要清空数据时才用：

```bash
cd /opt/my-blog/deploy
docker compose down -v
docker compose up -d --build
```

---

## Docker 构建网络问题（v2ray / 代理）怎么处理（推荐方案）

原则：**线上 `docker-compose.yml` 不要写死本地代理地址**（例如 `host.docker.internal:10809`），否则在 Linux 服务器上很容易不可用。

本项目的做法：
- `deploy/docker-compose.yml`：不包含任何代理配置（线上安全）
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

## 常用命令速查

- 启动本地 DB：`docker compose -f my-blog/deploy/docker-compose.yml up -d db`
- 停止本地 DB：`docker compose -f my-blog/deploy/docker-compose.yml stop db`
- 查看本地 DB 日志：`docker compose -f my-blog/deploy/docker-compose.yml logs -f db`
