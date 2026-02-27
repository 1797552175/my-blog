# API 自动化测试脚本

本目录包含 API 自动化测试相关脚本，支持快速冒烟测试和完整回归测试。

## 目录结构

```
scripts/
├── api-test.js                    # 快速冒烟测试（基础接口）
├── api-test-complete.js           # 完整回归测试（所有接口）
├── test-utils.js                  # 公共测试工具模块
├── scan-api-and-generate-tests.js # API 扫描和测试生成工具
├── test-data-generator.js         # 测试数据生成器
├── run-api-tests.ps1              # PowerShell 测试运行脚本
├── package.json                   # npm 脚本配置
└── README.md                      # 本文档
```

## 快速开始

### 1. 启动 API 服务

```bash
cd apps/api
../../gradlew bootRun --args="--spring.profiles.active=h2"
```

或使用 H2 内存数据库（推荐用于测试）：
```bash
cd apps/api
../../gradlew bootRun --args="--spring.profiles.active=h2 --server.port=8080"
```

### 2. 运行测试

#### 使用 npm 脚本

```bash
# 快速冒烟测试
npm test

# 完整回归测试
npm run test:complete

# 带数据生成的完整测试
npm run test:complete:seed

# CI 模式（失败时返回非零退出码）
npm run test:ci

# 生成 JUnit XML 报告
npm run test:junit
```

#### 使用 PowerShell 脚本

```powershell
# 快速测试
.\run-api-tests.ps1

# 完整测试
.\run-api-tests.ps1 -Complete

# 带数据生成
.\run-api-tests.ps1 -Complete -Seed

# 生成报告
.\run-api-tests.ps1 -Complete -Report

# 生成 JUnit 报告
.\run-api-tests.ps1 -Complete -JUnit "test-reports/junit.xml"

# 监视模式（等待服务启动后持续运行）
.\run-api-tests.ps1 -Watch -MaxWait 600

# 指定不同的 API 地址
.\run-api-tests.ps1 -BaseUrl "http://localhost:8081"
```

#### 直接使用 Node.js

```bash
# 基础测试
node api-test.js

# 完整测试
node api-test-complete.js

# 带参数
node api-test-complete.js --ci --report --seed
node api-test-complete.js --junit=test-reports/junit.xml
```

## 命令行参数

### api-test.js / api-test-complete.js

| 参数 | 说明 |
|------|------|
| `--report` | 生成 Markdown 报告（保存到 test-reports/） |
| `--report=path.md` | 指定报告输出路径 |
| `--ci` | CI 模式，测试失败时返回非零退出码 |
| `--seed` | 先运行数据生成器（仅 api-test-complete.js） |
| `--junit=path.xml` | 生成 JUnit XML 报告 |

### run-api-tests.ps1

| 参数 | 说明 |
|------|------|
| `-Complete` | 运行完整测试（默认快速测试） |
| `-Report` | 生成报告 |
| `-CI` | CI 模式 |
| `-Seed` | 先运行数据生成 |
| `-JUnit <path>` | 生成 JUnit XML 报告 |
| `-Watch` | 监视模式 |
| `-MaxWait <秒>` | 监视模式最大等待时间（默认 300） |
| `-BaseUrl <url>` | 指定 API 基础 URL |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_BASE_URL` | API 基础 URL | `http://localhost:8080` |

## 测试类型说明

### 快速冒烟测试 (api-test.js)

- **目的**: 快速验证核心接口是否正常
- **覆盖范围**: 健康检查、认证、Story、Chapter、Wiki 基础接口
- **运行时间**: 约 10-20 秒
- **适用场景**: 开发过程中快速验证、提交前检查

### 完整回归测试 (api-test-complete.js)

- **目的**: 全面验证所有接口
- **覆盖范围**: 所有模块（Story、Chapter、Wiki、Inspiration、Post、Comment、StorySeed、Tag、AI）
- **运行时间**: 约 30-60 秒
- **适用场景**: 发布前验证、CI/CD 流程

## 扫描和生成新测试

当添加新的 API 接口时，可以使用扫描工具自动生成测试模板：

```bash
# 扫描并显示未覆盖的接口
node scan-api-and-generate-tests.js

# 生成测试代码模板
node scan-api-and-generate-tests.js --generate

# 生成的代码在 generated-tests.js 中
```

### 合并生成的测试

1. 查看 `generated-tests.js` 中的代码
2. 复制对应的测试类到 `api-test-complete.js`
3. 根据注释中的"依赖说明"准备前置条件（如 ID、认证令牌等）
4. 调整路径变量和请求体
5. 将套件添加到 runner:
   ```javascript
   runner.addSuite(new NewControllerTests('NewController 接口'))
   ```

## 测试工具模块 (test-utils.js)

公共模块提供以下功能：

### HttpClient

带重试机制的 HTTP 客户端：

```javascript
const { HttpClient } = require('./test-utils');
const client = new HttpClient({ BASE_URL: 'http://localhost:8080' });

const res = await client.request('/api/stories', {
  method: 'POST',
  token: authToken,
  body: { title: '测试' }
});
```

### 断言工具

```javascript
const { assert } = require('./test-utils');

assert.equal(actual, expected, '可选的错误消息');
assert.notEqual(actual, expected);
assert.ok(value);
assert.statusOk(response, 200);
assert.statusIn(response, [200, 201]);
assert.hasField(obj, 'fieldName');
assert.isArray(value);
assert.notNull(value);
assert.match(value, /regex/);
```

### 测试套件基类

```javascript
const { TestSuite } = require('./test-utils');

class MyTests extends TestSuite {
  async beforeAll() {
    // 前置准备，如登录获取 token
    this.context.myData = await createTestData();
  }
  
  async runTests() {
    await this.test('测试描述', async () => {
      // 使用 this.httpClient 发送请求
      // 使用 this.assert 进行断言
      // 使用 this.context 存储套件内数据
      // 使用 this.runner.globalState 访问全局状态
    });
  }
  
  async afterAll() {
    // 清理工作
  }
}
```

## 编写测试的最佳实践

### 1. 状态隔离

每个测试套件使用 `this.context` 存储自己的数据，避免交叉污染：

```javascript
async beforeAll() {
  // 创建本套件专用的测试数据
  const res = await this.httpClient.request('/api/stories', {
    method: 'POST',
    token: this.runner.globalState.authToken,
    body: { title: '测试小说' }
  });
  this.context.storyId = res.body.id;  // 仅在本套件内使用
}
```

### 2. 跳过条件

对于需要前置条件的测试，使用 skip 选项：

```javascript
await this.test('需要认证的测试', async () => {
  // 测试代码
}, { 
  skip: !this.runner.globalState.authToken, 
  skipReason: '需要认证令牌' 
});
```

### 3. 依赖说明

在测试注释中说明依赖的前置条件：

```javascript
await this.test('GET /api/stories/{id} 应该返回详情', async () => {
  // 依赖: storyId 在 beforeAll 中创建
  const res = await this.httpClient.request(`/api/stories/${this.context.storyId}`);
  this.assert.statusOk(res);
}, { skip: !this.context.storyId, skipReason: '需要故事ID' });
```

## 故障排除

### 健康检查失败

```
❌ 健康检查失败
   无法连接到 API 服务: connect ECONNREFUSED 127.0.0.1:8080
```

**解决**: 确保 API 服务已启动，或检查 `API_BASE_URL` 环境变量。

### 认证失败

如果认证相关测试被跳过，检查：
1. 测试账号是否存在（默认使用 `author` / `123456`）
2. API 认证接口是否正常

### 测试数据不足

某些测试依赖已有数据（如小说列表），如果数据库为空：

```bash
# 先运行数据生成器
node api-test-complete.js --seed
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Start API Server
        run: |
          cd apps/api
          ./gradlew bootRun --args="--spring.profiles.active=h2" &
          sleep 60  # 等待服务启动
      
      - name: Run API Tests
        run: |
          cd scripts
          npm ci
          npm run test:complete:ci
      
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: test-reports/
```

## 报告格式

### Markdown 报告

包含：
- 测试摘要（总数、通过、失败、跳过、通过率）
- 失败的测试详情
- 跳过的测试及原因
- 详细结果表格

### JUnit XML 报告

兼容 Jenkins、GitHub Actions、GitLab CI 等 CI 工具，可用于：
- 在 CI 界面展示测试结果
- 生成测试趋势图
- 失败通知

## 更新日志

### v1.1.0
- 添加健康检查
- 修复除零问题
- 统一断言集
- 改进扫描脚本的注释和依赖说明

### v1.0.0
- 初始版本
- 支持快速和完整测试
- 支持 JUnit XML 报告
- 支持重试机制
