# 请求模式说明：经过 Nginx vs 不经过 Nginx

## 核心概念：谁在发请求？

在这个项目里，**发 API 请求的只有两种“角色”**：

| 角色 | 运行环境 | 用的 base URL | 请求会经过 Nginx 吗？ |
|------|----------|----------------|----------------------|
| **Next.js 服务端** | Web 容器（Node.js） | `INTERNAL_API_URL`，如 `http://api:8080` | **不经过**（容器直连 API） |
| **浏览器里的前端 JS** | 用户电脑 | `NEXT_PUBLIC_API_BASE`，即 `/api`（同源） | **经过**（浏览器 → Nginx → API） |

**重要澄清**：「不经过 Nginx」**不是**指「前台直接请求后台、绕过 Nginx」。  
用户浏览器**始终只和 Nginx 说话**；「不经过 Nginx」的是 **Next.js 服务端** 在渲染页面时，自己向 API 发的那条请求（Web 容器 → API 容器，走 Docker 内网）。

---

## 两种请求路径示意

### 1. 经过 Nginx 的请求（浏览器发起的 API 调用）

```
用户浏览器  →  Nginx (47.121.27.3:80)  →  API 容器 (api:8080)
     ↑                    ↑
  发 /api/xxx          根据 location /api/ 转发
```

- 典型场景：用户点「登录」、提交表单、发小说、删小说、打开「我的小说」等。
- 请求从**浏览器**发出，URL 是 `http://47.121.27.3/api/...` 或相对路径 `/api/...`，所以**一定先到 Nginx**，再由 Nginx 转发到 API。

### 2. 不经过 Nginx 的请求（Next.js 服务端发起的 API 调用）

```
用户浏览器  →  Nginx  →  Web 容器 (Next.js)
                              ↓
                         Web 内部发请求
                              ↓
                         API 容器 (http://api:8080/api/...)
                              ↑
                         Docker 内网直连，不经过 Nginx
```

- 典型场景：用户打开「热门小说列表」「小说详情」「首页」时，页面是**服务端渲染**的，Next.js 在**服务端**先调 API 拿数据，再吐出 HTML。
- 这条 API 请求是 **Web 容器 → API 容器**，走的是 `http://api:8080/api/...`，在 Docker 网络里直连，**不经过 Nginx**。
- 用户浏览器只收到「已经渲染好的页面」，没有直接向 API 发请求。

---

## 本项目里：哪些经过 Nginx，哪些不经过？

判断方式：**看这段调用 API 的代码是在服务端跑还是在浏览器跑**。

- **服务端跑**：在 **async Server Component** 里调用的、没有 `'use client'` 的页面里调用的 → 用 `INTERNAL_API_URL`，**不经过 Nginx**。
- **浏览器跑**：在 **`'use client'`** 的组件里、在事件处理（如 `onSubmit`）或 `useEffect` 里调用的 → 用 `/api`，**经过 Nginx**。

### 不经过 Nginx 的 API 请求（服务端 → API 直连）

| 页面/场景 | 调用的接口 | 说明 |
|-----------|------------|------|
| 首页 `/` | `GET /api/health` | `page.js` 里 async `Home()` 调 `getHealth()` |
| 热门小说列表 `/posts` | `GET /api/posts` 或 `GET /api/posts/search?q=...` | `posts/page.js` 里 async `PostsPage()` 调 `listPosts()` / `searchPosts()` |
| 小说详情 `/posts/[slug]` | `GET /api/posts/slug/:slug` | `posts/[slug]/page.js` 里 async `PostDetailPage()` 调 `getPostBySlug()` |

以上都是在 **服务端** 执行的 async 组件里发请求，base 是 `http://api:8080`，不经过 Nginx。

### 经过 Nginx 的 API 请求（浏览器 → Nginx → API）

| 页面/场景 | 调用的接口 | 说明 |
|-----------|------------|------|
| 登录页提交 | `POST /api/auth/login` | `LoginPage` 是 `'use client'`，`onSubmit` 里调 `login()` |
| 注册页提交 | `POST /api/auth/register` | `RegisterPage` 是 `'use client'`，表单提交调 `register()` |
| 写小说页提交 | `POST /api/posts` | `WritePage` 是 `'use client'`，`onSubmit` 里调 `createPost()`（可选带 inspirationId） |
| 我的小说列表 | `GET /api/posts/me?page=0&size=20&...` | `MyPostsPage` 是 `'use client'`，`useEffect` 里调 `listMyPosts()` |
| 我的小说页删除 | `DELETE /api/posts/:id` | `MyPostsPage` 里 `onDelete` 调 `deletePost()` |

以上都是在**浏览器**里执行（`'use client'` + 事件/effect），请求发到当前站点 `/api/...`，所以会经过 Nginx 再转发到 API。

### 不发 API 请求的前端逻辑

| 功能 | 说明 |
|------|------|
| `getCurrentUser()` | 只读 `localStorage`，不请求后端 |
| `isAuthed()` | 只读 `localStorage` 里是否有 token |
| `logout()` | 只清 `localStorage` |

---

## 小结

- **经过 Nginx**：浏览器发起的、URL 为 `http://47.121.27.3/api/...` 或 `/api/...` 的请求，全部先到 Nginx，再由 Nginx 转给 API。
- **不经过 Nginx**：Next.js 服务端在渲染页面时，用 `INTERNAL_API_URL`（如 `http://api:8080`）直接请求 API，这条请求是「Web 容器 → API 容器」，不经过 Nginx，也不是「前台直接请求后台绕过 Nginx」——用户浏览器只和 Nginx 通信，数据流是：**浏览器 ↔ Nginx ↔ Web**，而 **Web ↔ API** 在服务端内部完成。

这样设计的好处：需要首屏数据的页面（首页、列表、详情）由服务端直连 API，不依赖 Nginx 的路径规则，也不多走一层公网；需要登录、写文章等交互的请求才从浏览器经 Nginx 打到 API，便于统一做域名、HTTPS、限流等。
