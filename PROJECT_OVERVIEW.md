# 项目概览（my-blog）

## 1. 项目定位与目标

这是一个全栈个人博客项目：

- 前端：`Next.js 14 (App Router)`
- 后端：`Spring Boot 3`（Java 21）
- 数据库：`MariaDB 11`
- 部署：`Docker Compose + Nginx` 统一反向代理

项目的核心目标是：用一套可容器化、可部署的工程，打通“前端页面渲染/请求 -> 后端 API -> 数据库存储 -> Nginx 统一入口”的完整链路。

## 2. 核心功能点梳理

### 2.1 前端（apps/web）

从当前代码结构看，前端是一个较轻量的 Next.js 应用，主要职责是：

- 页面渲染（`app/layout.js`, `app/page.js`）
- 通过环境变量区分：
  - 浏览器侧请求：`NEXT_PUBLIC_API_BASE=/api`（走 Nginx 反代）
  - SSR/Server Actions 等服务端请求：`INTERNAL_API_URL=http://api:8080`（容器内直连后端）

### 2.2 后端（apps/api）

后端是典型的 Spring Boot API 工程，已具备博客系统的关键“骨架能力”：

- **健康检查**：`/api/health`（用于容器编排/存活探针）
- **认证与授权（JWT）**：
  - `auth` 模块：登录/认证相关控制器与 DTO
  - `security` 模块：JWT 过滤器、TokenProvider、UserDetailsService
  - `SecurityConfig`：Spring Security 配置入口
- **用户模块**：`user/User.java`, `UserRepository.java`
- **文章模块**：
  - `post/Post.java`：文章实体
  - `post/PostRepository.java`：JPA 仓储
  - `post/PostService + PostServiceImpl`：业务层
  - `post/PostController.java`：对外 REST API
- **通用基础设施**：
  - `common/BaseEntity.java`：基础实体（通常含 id、时间戳等）
  - `common/GlobalExceptionHandler.java`：统一异常处理
  - `common/CorsConfig.java`：跨域配置
  - `common/SlugUtil.java`：slug 工具（通常用于文章 URL 友好化）
  - `common/ApiException.java`：自定义异常

> 依赖侧也能反推能力：
> - `spring-boot-starter-validation`：参数校验（DTO/Request）
> - `spring-boot-starter-data-jpa`：JPA + ORM
> - `io.jsonwebtoken:jjwt-*`：JWT 生成/校验

### 2.3 部署与运行（deploy + nginx + docker-compose）

- **单一入口**：Nginx 监听 `80` 端口
- **反向代理**：将 Web 与 API 统一挂到同域下（典型是 `/` 给前端、`/api` 给后端）
- **容器编排**：
  - `db`：MariaDB，带健康检查与数据卷 `db_data`
  - `api`：Spring Boot，等待 db 健康后启动
  - `web`：Next.js
  - `nginx`：对外 80，反代 `web`/`api`

## 3. 目录结构说明

以 `my-blog/` 为根目录：

```
my-blog/
  apps/
    api/                    # Spring Boot 后端
      src/main/java/...     # 业务代码（auth/post/user/security/common/health）
      src/main/resources/   # application.yml / application-docker.yml
      Dockerfile            # API 镜像构建
      build.gradle          # Java/Spring 依赖与构建
    web/                    # Next.js 前端
      app/                  # App Router 页面入口
      public/               # 静态资源
      package.json          # 前端依赖与脚本
      next.config.js        # Next 配置
      Dockerfile            # Web 镜像构建
  config/
    env.example             # 环境变量模板
    env.local               # 本地/生产实际配置（不应提交到仓库）
  deploy/
    docker-compose.yml      # 生产/默认编排
    docker-compose.override.yml # 本地开发覆盖（热更新等）
    nginx/
      nginx.conf            # Nginx 反代配置
  README.md                 # 已有：启动、部署、踩坑记录
```

## 4. 数据流与调用链（建议理解方式）

- **浏览器访问**：`http://<host>/` -> Nginx -> `web` 容器（Next.js）
- **浏览器发 API 请求**：`/api/...` -> Nginx -> `api` 容器
- **Next.js SSR 在容器内请求 API**：使用 `INTERNAL_API_URL=http://api:8080` 直连后端，避免 SSR 使用相对路径导致的网络/反代问题
- **后端访问 DB**：`api` -> `db:3306`（Compose 内网）

## 5. 可落地的优化建议（按优先级）

### 5.1 工程与可维护性

- **建议 1：补齐 API 文档与契约**
  - 引入 OpenAPI/Swagger（`springdoc-openapi`）
  - 让前后端调用有可视化与可测试的契约

- **建议 2：统一 API 返回结构**
  - 目前已有 `GlobalExceptionHandler`，可以进一步统一成功/失败返回格式（code/message/data），便于前端处理。

- **建议 3：DTO 分层与校验完善**
  - 已引入 validation，建议所有 Controller 入参都走 DTO，并加上 `@Valid` + 细化约束。

### 5.2 安全

- **建议 4：JWT 安全策略**
  - `JWT_SECRET` 必须足够长且随机（已在 README 强调）
  - Token 过期时间、刷新策略（refresh token）可以作为下一阶段能力
  - 重要接口按角色/权限拆分（RBAC）

- **建议 5：CORS 与安全头**
  - 生产环境避免宽松 CORS
  - Nginx 增加常见安全响应头（HSTS、X-Frame-Options、X-Content-Type-Options 等）

### 5.3 性能与体验

- **建议 6：前端数据获取策略**
  - 对文章列表/详情做 SSR/ISR（Next 的 `fetch` 缓存策略、revalidate）
  - 对静态资源启用合理缓存

- **建议 7：后端分页与索引**
  - 文章列表 API 必须分页
  - 为常用查询字段建立索引（例如 `slug`、`createdAt`、`authorId` 等）

### 5.4 部署与运维

- **建议 8：健康检查与可观测性**
  - 除 `/health` 外，建议接入 Spring Boot Actuator（受保护暴露）
  - Compose/Nginx 日志规范化，后续可以接入 Loki/ELK

- **建议 9：HTTPS**
  - 生产环境建议 Nginx + 证书（Let’s Encrypt/Certbot）

- **建议 10：CI/CD**
  - GitHub Actions：构建镜像/推送镜像、或 SSH 到服务器更新 compose

### 5.5 代码与仓库卫生

- **建议 11：避免提交构建产物与 node_modules**
  - 目前仓库里可见 `apps/web/node_modules`、以及 `apps/api/build` 输出目录；建议在 `.gitignore` 中排除，仓库只保留源码。

## 6. 下一步可扩展功能（路线建议）

- **后台管理**：文章增删改查、草稿/发布状态、上传封面图
- **评论系统**：游客评论 + 反垃圾
- **标签/分类**：文章聚合页
- **全文搜索**：简单版（DB like/索引）或高级版（Meilisearch/Elastic）
- **图片/附件存储**：本地卷、对象存储（OSS/S3）

## 7.疑问
### 为什么既有 config/ 又有 deploy/.env？

| 位置 | 谁在用 | 用途 |
|------|--------|------|
| **config/env.example** | 人看 | 模板和说明，不要放真实密码。 |
| **config/env.local** | 本地跑 API/Web 时 | 你在本机执行 `gradlew bootRun` / `npm run dev` 时，用这里的变量连数据库（可切换“本地 DB”或“服务器 DB 隧道”）。 |
| **deploy/.env** | Docker Compose | 在 **deploy 目录**执行 `docker compose up` 时，Compose **只读当前目录的 .env**，不会去读 config/。所以服务器部署（或本地用 compose 起全栈）必须在 **deploy/** 下建 .env。 |

总结：**config/** 给「本机直接跑进程」用，**deploy/.env** 给「docker compose」用，两套互不替代。

