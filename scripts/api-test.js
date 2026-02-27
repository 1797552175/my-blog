#!/usr/bin/env node

/**
 * API 自动化测试脚本 - 快速冒烟测试
 * 
 * 使用方法:
 *   node api-test.js                    # 运行所有测试
 *   node api-test.js --report           # 生成详细报告
 *   node api-test.js --report=path.md   # 指定报告路径
 *   node api-test.js --ci               # CI 模式，有错误时退出码非零
 *   node api-test.js --junit=report.xml # 生成 JUnit XML 报告
 * 
 * 环境变量:
 *   API_BASE_URL - API 基础 URL (默认: http://localhost:8080)
 */

const { TestSuite, TestRunner, assert, DEFAULT_CONFIG } = require('./test-utils');

// ==================== 配置 ====================
const CONFIG = {
  ...DEFAULT_CONFIG,
  TIMEOUT: 10000,
  RETRIES: 2
};

// ==================== 测试套件定义 ====================

// 1. 健康检查测试
class HealthTests extends TestSuite {
  async runTests() {
    await this.test('GET /api/health 应该返回 ok', async () => {
      const res = await this.httpClient.request('/api/health');
      assert.statusOk(res);
      assert.equal(res.body.status, 'ok');
    });
  }
}

// 2. 认证相关测试
class AuthTests extends TestSuite {
  async runTests() {
    // 注册新用户
    await this.test('POST /api/auth/register 应该成功注册', async () => {
      const res = await this.httpClient.request('/api/auth/register', {
        method: 'POST',
        body: {
          username: CONFIG.TEST_USER.username,
          email: CONFIG.TEST_USER.email,
          password: CONFIG.TEST_USER.password
        }
      });
      assert.statusOk(res, 201);
    });

    // 重复注册应该失败
    await this.test('POST /api/auth/register 重复注册应该返回 409', async () => {
      const res = await this.httpClient.request('/api/auth/register', {
        method: 'POST',
        body: {
          username: CONFIG.TEST_USER.username,
          email: CONFIG.TEST_USER.email,
          password: CONFIG.TEST_USER.password
        }
      });
      assert.equal(res.status, 409);
    });

    // 登录
    await this.test('POST /api/auth/login 应该成功登录', async () => {
      const res = await this.httpClient.request('/api/auth/login', {
        method: 'POST',
        body: {
          username: CONFIG.TEST_USER.username,
          password: CONFIG.TEST_USER.password
        }
      });
      assert.statusOk(res);
      assert.hasField(res.body, 'token');
      this.context.testUserToken = res.body.token;
      this.runner.globalState.testUserToken = res.body.token;
    });

    // 错误密码登录
    await this.test('POST /api/auth/login 错误密码应该返回 401', async () => {
      const res = await this.httpClient.request('/api/auth/login', {
        method: 'POST',
        body: {
          username: CONFIG.TEST_USER.username,
          password: 'wrongpassword'
        }
      });
      assert.equal(res.status, 401);
    });

    // 获取当前用户信息
    await this.test('GET /api/auth/me 应该返回用户信息', async () => {
      const res = await this.httpClient.request('/api/auth/me', {
        token: this.context.testUserToken
      });
      assert.statusOk(res);
      assert.equal(res.body.username, CONFIG.TEST_USER.username);
    });

    // 未授权访问
    await this.test('GET /api/auth/me 未授权应该返回 401/403', async () => {
      const res = await this.httpClient.request('/api/auth/me');
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`Expected 401 or 403, got ${res.status}`);
      }
    });
  }
}

// 3. Story 相关测试
class StoryTests extends TestSuite {
  async beforeAll() {
    // 使用已知账号登录
    const res = await this.httpClient.request('/api/auth/login', {
      method: 'POST',
      body: CONFIG.KNOWN_USER
    });
    if (res.status === 200 && res.body.token) {
      this.context.authToken = res.body.token;
      this.runner.globalState.authToken = res.body.token;
    }
  }

  async runTests() {
    // 公开接口 - 不需要认证
    await this.test('GET /api/stories 应该返回小说列表', async () => {
      const res = await this.httpClient.request('/api/stories?page=0&size=6');
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
      assert.isArray(res.body.content);
    });

    await this.test('GET /api/stories?filter=completed 应该返回已完成小说', async () => {
      const res = await this.httpClient.request('/api/stories?filter=completed');
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
    });

    await this.test('GET /api/stories?filter=interactive 应该返回互动小说', async () => {
      const res = await this.httpClient.request('/api/stories?filter=interactive');
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
    });

    await this.test('GET /api/stories/tags 应该返回标签列表(需要认证)', async () => {
      const res = await this.httpClient.request('/api/stories/tags', { token: this.context.authToken });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !this.context.authToken, skipReason: '需要认证令牌' });

    // 搜索接口
    await this.test('GET /api/stories/search?q=test 应该返回搜索结果', async () => {
      const res = await this.httpClient.request('/api/stories/search?q=修');
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
    });

    // 需要认证的接口
    await this.test('GET /api/stories/my 需要认证', async () => {
      const res = await this.httpClient.request('/api/stories/my', { token: this.context.authToken });
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
    }, { skip: !this.context.authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/stories/my/tags 需要认证', async () => {
      const res = await this.httpClient.request('/api/stories/my/tags', { token: this.context.authToken });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !this.context.authToken, skipReason: '需要认证令牌' });

    // 获取小说详情
    await this.test('GET /api/stories/slug/{slug} 应该返回小说详情', async () => {
      const listRes = await this.httpClient.request('/api/stories');
      if (listRes.body.content && listRes.body.content.length > 0) {
        const slug = listRes.body.content[0].slug;
        const res = await this.httpClient.request(`/api/stories/slug/${slug}`);
        assert.statusOk(res);
        assert.hasField(res.body, 'title');
      } else {
        throw new Error('No stories available for testing');
      }
    });

    // 创建小说
    await this.test('POST /api/stories 应该创建小说', async () => {
      const testUserToken = this.runner.globalState.testUserToken;
      const res = await this.httpClient.request('/api/stories', {
        method: 'POST',
        token: testUserToken,
        body: {
          title: '测试小说 ' + Date.now(),
          published: true,
          openSource: false,
          tags: ['测试', '自动化']
        }
      });
      assert.statusOk(res, 201);
      assert.hasField(res.body, 'id');
      this.context.createdStoryId = res.body.id;
    }, { skip: !this.runner.globalState.testUserToken, skipReason: '需要测试用户令牌' });

    // 更新小说
    await this.test('PUT /api/stories/{id} 应该更新小说', async () => {
      const testUserToken = this.runner.globalState.testUserToken;
      const res = await this.httpClient.request(`/api/stories/${this.context.createdStoryId}`, {
        method: 'PUT',
        token: testUserToken,
        body: {
          title: '更新后的测试小说 ' + Date.now(),
          published: true,
          openSource: false,
          tags: ['测试', '自动化', '已更新']
        }
      });
      assert.statusOk(res);
    }, { skip: !this.runner.globalState.testUserToken || !this.context.createdStoryId, skipReason: '需要测试用户令牌和故事ID' });

    // 删除小说
    await this.test('DELETE /api/stories/{id} 应该删除小说', async () => {
      const testUserToken = this.runner.globalState.testUserToken;
      const res = await this.httpClient.request(`/api/stories/${this.context.createdStoryId}`, {
        method: 'DELETE',
        token: testUserToken
      });
      assert.statusOk(res, 204);
    }, { skip: !this.runner.globalState.testUserToken || !this.context.createdStoryId, skipReason: '需要测试用户令牌和故事ID' });
  }
}

// 4. 章节相关测试
class ChapterTests extends TestSuite {
  async runTests() {
    // 获取章节列表（需要认证）
    await this.test('GET /api/stories/{id}/chapters 应该返回章节列表(需要认证)', async () => {
      const storiesRes = await this.httpClient.request('/api/stories');
      if (storiesRes.body.content && storiesRes.body.content.length > 0) {
        const storyId = storiesRes.body.content[0].id;
        const authToken = this.runner.globalState.authToken;
        const res = await this.httpClient.request(`/api/stories/${storyId}/chapters`, { token: authToken });
        assert.statusOk(res);
        assert.isArray(res.body);
      } else {
        throw new Error('No stories available for testing');
      }
    }, { skip: !this.runner.globalState.authToken, skipReason: '需要认证令牌' });
  }
}

// 5. Wiki 相关测试
class WikiTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    // 需要认证的 Wiki 接口
    await this.test('GET /api/stories/{id}/wiki/pages 应该返回 Wiki 页面列表(需要认证)', async () => {
      const storiesRes = await this.httpClient.request('/api/stories');
      if (storiesRes.body.content && storiesRes.body.content.length > 0) {
        const storyId = storiesRes.body.content[0].id;
        const res = await this.httpClient.request(`/api/stories/${storyId}/wiki/pages`, { token: authToken });
        assert.statusOk(res);
        assert.isArray(res.body);
      } else {
        throw new Error('No stories available for testing');
      }
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/stories/{id}/wiki/characters 应该返回角色列表(需要认证)', async () => {
      const storiesRes = await this.httpClient.request('/api/stories');
      if (storiesRes.body.content && storiesRes.body.content.length > 0) {
        const storyId = storiesRes.body.content[0].id;
        const res = await this.httpClient.request(`/api/stories/${storyId}/wiki/characters`, { token: authToken });
        assert.statusOk(res);
        assert.isArray(res.body);
      } else {
        throw new Error('No stories available for testing');
      }
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/stories/{id}/wiki/timeline 应该返回时间线(需要认证)', async () => {
      const storiesRes = await this.httpClient.request('/api/stories');
      if (storiesRes.body.content && storiesRes.body.content.length > 0) {
        const storyId = storiesRes.body.content[0].id;
        const res = await this.httpClient.request(`/api/stories/${storyId}/wiki/timeline`, { token: authToken });
        assert.statusOk(res);
        assert.isArray(res.body);
      } else {
        throw new Error('No stories available for testing');
      }
    }, { skip: !authToken, skipReason: '需要认证令牌' });
  }
}

// ==================== 主函数 ====================
async function main() {
  const args = process.argv.slice(2);
  const isCI = args.includes('--ci');
  
  // 解析 --report 参数（可以是开关或路径）
  let reportPath = null;
  const reportArg = args.find(a => a.startsWith('--report'));
  if (reportArg) {
    const match = reportArg.match(/--report(?:=(.+))?/);
    if (match && match[1]) {
      reportPath = match[1];
    } else {
      reportPath = null; // 使用默认路径
    }
  }
  const shouldSaveReport = args.includes('--report') || reportPath !== null;

  // 解析 --junit 参数
  let junitPath = null;
  const junitArg = args.find(a => a.startsWith('--junit='));
  if (junitArg) {
    junitPath = junitArg.split('=')[1];
  }

  const runner = new TestRunner(CONFIG);

  runner
    .addSuite(new HealthTests('健康检查'))
    .addSuite(new AuthTests('认证接口'))
    .addSuite(new StoryTests('Story 接口'))
    .addSuite(new ChapterTests('Chapter 接口'))
    .addSuite(new WikiTests('Wiki 接口'));

  await runner.run({
    ci: isCI,
    report: shouldSaveReport,
    reportPath: reportPath,
    junitPath: junitPath
  });
}

main().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
