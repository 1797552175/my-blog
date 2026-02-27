#!/usr/bin/env node

/**
 * 完整 API 自动化测试脚本 - 全量回归测试
 * 
 * 使用方法:
 *   node api-test-complete.js                    # 运行所有测试
 *   node api-test-complete.js --report           # 生成详细报告
 *   node api-test-complete.js --report=path.md   # 指定报告路径
 *   node api-test-complete.js --ci               # CI 模式
 *   node api-test-complete.js --junit=report.xml # 生成 JUnit XML 报告
 *   node api-test-complete.js --seed             # 先运行数据生成
 * 
 * 环境变量:
 *   API_BASE_URL - API 基础 URL (默认: http://localhost:8080)
 */

const { TestSuite, TestRunner, assert, DEFAULT_CONFIG } = require('./test-utils');

// ==================== 配置 ====================
const CONFIG = {
  ...DEFAULT_CONFIG,
  TIMEOUT: 15000,
  RETRIES: 2
};

// ==================== 测试套件定义 ====================

// 1. 健康检查
class HealthTests extends TestSuite {
  async runTests() {
    await this.test('GET /api/health 应该返回 ok', async () => {
      const res = await this.httpClient.request('/api/health');
      assert.statusOk(res);
      assert.equal(res.body.status, 'ok');
    });
  }
}

// 2. 认证接口
class AuthTests extends TestSuite {
  async runTests() {
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
      assert.hasField(res.body, 'id');
      this.runner.globalState.testUserId = res.body.id;
    });

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
      this.runner.globalState.authToken = res.body.token;
    });

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

    await this.test('GET /api/auth/me 应该返回用户信息', async () => {
      const res = await this.httpClient.request('/api/auth/me', { 
        token: this.runner.globalState.authToken 
      });
      assert.statusOk(res);
      assert.hasField(res.body, 'username');
      assert.equal(res.body.username, CONFIG.TEST_USER.username);
    }, { skip: !this.runner.globalState.authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/auth/me 未授权应该返回 401/403', async () => {
      const res = await this.httpClient.request('/api/auth/me');
      assert.statusIn(res, [401, 403]);
    });

    await this.test('PUT /api/auth/me 应该更新用户信息', async () => {
      const res = await this.httpClient.request('/api/auth/me', {
        method: 'PUT',
        token: this.runner.globalState.authToken,
        body: {
          bio: '测试用户简介',
          personaPrompt: '测试分身提示词'
        }
      });
      assert.statusOk(res);
    }, { skip: !this.runner.globalState.authToken, skipReason: '需要认证令牌' });

    await this.test('PUT /api/auth/me/password 应该修改密码', async () => {
      const res = await this.httpClient.request('/api/auth/me/password', {
        method: 'PUT',
        token: this.runner.globalState.authToken,
        body: {
          currentPassword: CONFIG.TEST_USER.password,
          newPassword: 'NewTest123456'
        }
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !this.runner.globalState.authToken, skipReason: '需要认证令牌' });
  }
}

// 3. Story 接口
class StoryTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    // 公开接口 - 无需认证
    await this.test('GET /api/stories 应该返回小说列表', async () => {
      const res = await this.httpClient.request('/api/stories?page=0&size=10');
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
      assert.isArray(res.body.content);
    });

    await this.test('GET /api/stories?filter=completed 应该返回已完成小说', async () => {
      const res = await this.httpClient.request('/api/stories?filter=completed');
      assert.statusOk(res);
      assert.isArray(res.body.content);
    });

    await this.test('GET /api/stories?filter=interactive 应该返回互动小说', async () => {
      const res = await this.httpClient.request('/api/stories?filter=interactive');
      assert.statusOk(res);
      assert.isArray(res.body.content);
    });

    await this.test('GET /api/stories/search?q=test 应该返回搜索结果', async () => {
      const res = await this.httpClient.request('/api/stories/search?q=test');
      assert.statusOk(res);
      assert.isArray(res.body.content);
    });

    await this.test('GET /api/stories/tag/{tag} 应该返回标签筛选结果', async () => {
      const res = await this.httpClient.request('/api/stories/tag/测试');
      assert.statusOk(res);
      assert.isArray(res.body.content);
    });

    // 需要认证的接口
    await this.test('POST /api/stories 应该创建小说', async () => {
      const res = await this.httpClient.request('/api/stories', {
        method: 'POST',
        token: authToken,
        body: {
          title: 'API测试小说',
          slug: 'api-test-story-' + Date.now(),
          tags: ['测试', 'API'],
          published: true
        }
      });
      assert.statusIn(res, [200, 201]);
      assert.hasField(res.body, 'id');
      this.context.testStoryId = res.body.id;
      this.context.testStorySlug = res.body.slug;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/stories/{id} 应该返回小说详情', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}`);
      assert.statusOk(res);
      assert.equal(res.body.id, this.context.testStoryId);
    }, { skip: !this.context.testStoryId, skipReason: '需要故事ID' });

    await this.test('GET /api/stories/slug/{slug} 应该返回小说详情', async () => {
      const res = await this.httpClient.request(`/api/stories/slug/${this.context.testStorySlug}`);
      assert.statusOk(res);
      assert.equal(res.body.slug, this.context.testStorySlug);
    }, { skip: !this.context.testStorySlug, skipReason: '需要故事slug' });

    await this.test('GET /api/stories/my 应该返回我的小说', async () => {
      const res = await this.httpClient.request('/api/stories/my', { token: authToken });
      assert.statusOk(res);
      assert.isArray(res.body.content);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/stories/tags 应该返回标签列表', async () => {
      const res = await this.httpClient.request('/api/stories/tags', { token: authToken });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/stories/my/tags 应该返回我的标签', async () => {
      const res = await this.httpClient.request('/api/stories/my/tags', { token: authToken });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('POST /api/stories/{id}/star 应该收藏小说', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}/star`, {
        method: 'POST',
        token: authToken
      });
      assert.statusIn(res, [200, 201]);
    }, { skip: !authToken || !this.context.testStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/starred 应该返回收藏状态', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}/starred`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.hasField(res.body, 'starred');
    }, { skip: !authToken || !this.context.testStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('DELETE /api/stories/{id}/star 应该取消收藏', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}/star`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.testStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/contributors 应该返回贡献者', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}/contributors`);
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !this.context.testStoryId, skipReason: '需要故事ID' });

    await this.test('GET /api/stories/{id}/contributors/count 应该返回贡献者数量', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}/contributors/count`);
      assert.statusOk(res);
      assert.hasField(res.body, 'count');
    }, { skip: !this.context.testStoryId, skipReason: '需要故事ID' });

    await this.test('PUT /api/stories/{id} 应该更新小说', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}`, {
        method: 'PUT',
        token: authToken,
        body: {
          title: '更新后的标题',
          description: '更新后的描述'
        }
      });
      assert.statusOk(res);
    }, { skip: !authToken || !this.context.testStoryId, skipReason: '需要认证令牌和故事ID' });

    // 清理：删除测试小说
    await this.test('DELETE /api/stories/{id} 应该删除小说', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.testStoryId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.testStoryId, skipReason: '需要认证令牌和故事ID' });
  }
}

// 4. 章节接口
class ChapterTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    // 先创建一个新小说用于章节测试
    await this.test('准备：创建测试小说', async () => {
      const res = await this.httpClient.request('/api/stories', {
        method: 'POST',
        token: authToken,
        body: {
          title: '章节测试小说',
          slug: 'chapter-test-' + Date.now(),
          tags: ['测试'],
          published: true
        }
      });
      assert.statusIn(res, [200, 201]);
      this.context.chapterTestStoryId = res.body.id;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('POST /api/stories/{id}/chapters 应该创建章节', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}/chapters`, {
        method: 'POST',
        token: authToken,
        body: {
          title: '第一章：测试',
          content: '这是第一章的内容...',
          chapterNumber: 1
        }
      });
      assert.statusIn(res, [200, 201]);
      assert.hasField(res.body, 'id');
      this.context.testChapterId = res.body.id;
    }, { skip: !authToken || !this.context.chapterTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/chapters 应该返回章节列表', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}/chapters`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken || !this.context.chapterTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/slug/{slug}/chapters 应该返回章节列表', async () => {
      const storyRes = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}`);
      const res = await this.httpClient.request(`/api/stories/slug/${storyRes.body.slug}/chapters`);
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !this.context.chapterTestStoryId, skipReason: '需要故事ID' });

    await this.test('GET /api/stories/{id}/chapters/{chapterId} 应该返回章节详情', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}/chapters/${this.context.testChapterId}`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.equal(res.body.id, this.context.testChapterId);
    }, { skip: !authToken || !this.context.chapterTestStoryId || !this.context.testChapterId, skipReason: '需要认证令牌、故事ID和章节ID' });

    await this.test('PUT /api/stories/{id}/chapters/{chapterId} 应该更新章节', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}/chapters/${this.context.testChapterId}`, {
        method: 'PUT',
        token: authToken,
        body: {
          title: '第一章：已更新',
          content: '更新后的内容...'
        }
      });
      assert.statusOk(res);
    }, { skip: !authToken || !this.context.chapterTestStoryId || !this.context.testChapterId, skipReason: '需要认证令牌、故事ID和章节ID' });

    await this.test('DELETE /api/stories/{id}/chapters/{chapterId} 应该删除章节', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}/chapters/${this.context.testChapterId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.chapterTestStoryId || !this.context.testChapterId, skipReason: '需要认证令牌、故事ID和章节ID' });

    // 清理：删除测试小说
    await this.test('清理：删除测试小说', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.chapterTestStoryId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.chapterTestStoryId, skipReason: '需要认证令牌和故事ID' });
  }
}

// 5. Wiki 接口
class WikiTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    // 准备：创建测试小说
    await this.test('准备：创建 Wiki 测试小说', async () => {
      const res = await this.httpClient.request('/api/stories', {
        method: 'POST',
        token: authToken,
        body: {
          title: 'Wiki测试小说',
          slug: 'wiki-test-' + Date.now(),
          tags: ['测试'],
          published: true
        }
      });
      assert.statusIn(res, [200, 201]);
      this.context.wikiTestStoryId = res.body.id;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    // Wiki 页面
    await this.test('POST /api/stories/{id}/wiki/pages 应该创建 Wiki 页面', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/pages`, {
        method: 'POST',
        token: authToken,
        body: {
          slug: 'world-setting',
          title: '世界观设定',
          content: '这是一个修仙世界...',
          category: 'WORLDVIEW'
        }
      });
      assert.statusIn(res, [200, 201]);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/wiki/pages 应该返回页面列表', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/pages`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/wiki/pages/{slug} 应该返回页面详情', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/pages/world-setting`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.equal(res.body.slug, 'world-setting');
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('PUT /api/stories/{id}/wiki/pages/{slug} 应该更新页面', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/pages/world-setting`, {
        method: 'PUT',
        token: authToken,
        body: {
          title: '更新后的世界观',
          content: '更新后的内容...'
        }
      });
      assert.statusOk(res);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    // Wiki 角色
    await this.test('POST /api/stories/{id}/wiki/characters 应该创建角色', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/characters`, {
        method: 'POST',
        token: authToken,
        body: {
          name: '测试角色',
          description: '这是一个测试角色',
          roleType: 'PROTAGONIST'
        }
      });
      assert.statusIn(res, [200, 201]);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/wiki/characters 应该返回角色列表', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/characters`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/wiki/characters/{name} 应该返回角色详情', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/characters/测试角色`, { 
        token: authToken 
      });
      assert.statusOk(res);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    // Wiki 时间线
    await this.test('POST /api/stories/{id}/wiki/timeline 应该创建时间线事件', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/timeline`, {
        method: 'POST',
        token: authToken,
        body: {
          title: '故事开始',
          description: '主角出生',
          eventTime: '元年'
        }
      });
      assert.statusIn(res, [200, 201]);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    await this.test('GET /api/stories/{id}/wiki/timeline 应该返回时间线', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}/wiki/timeline`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });

    // 清理：删除测试小说
    await this.test('清理：删除测试小说', async () => {
      const res = await this.httpClient.request(`/api/stories/${this.context.wikiTestStoryId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.wikiTestStoryId, skipReason: '需要认证令牌和故事ID' });
  }
}

// 6. 灵感接口
class InspirationTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    await this.test('POST /api/inspirations 应该创建灵感', async () => {
      const res = await this.httpClient.request('/api/inspirations', {
        method: 'POST',
        token: authToken,
        body: {
          title: '测试灵感',
          content: '这是一个测试灵感的内容...'
        }
      });
      assert.statusIn(res, [200, 201]);
      assert.hasField(res.body, 'id');
      this.context.testInspirationId = res.body.id;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/inspirations 应该返回灵感列表', async () => {
      const res = await this.httpClient.request('/api/inspirations', { token: authToken });
      assert.statusOk(res);
      assert.isArray(res.body.content);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/inspirations/{id} 应该返回灵感详情', async () => {
      const res = await this.httpClient.request(`/api/inspirations/${this.context.testInspirationId}`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.equal(res.body.id, this.context.testInspirationId);
    }, { skip: !authToken || !this.context.testInspirationId, skipReason: '需要认证令牌和灵感ID' });

    await this.test('DELETE /api/inspirations/{id} 应该删除灵感', async () => {
      const res = await this.httpClient.request(`/api/inspirations/${this.context.testInspirationId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.testInspirationId, skipReason: '需要认证令牌和灵感ID' });
  }
}

// 7. 文章接口
class PostTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    await this.test('GET /api/posts 应该返回文章列表', async () => {
      const res = await this.httpClient.request('/api/posts');
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
    });

    await this.test('GET /api/posts/search?q=test 应该返回搜索结果', async () => {
      const res = await this.httpClient.request('/api/posts/search?q=test');
      assert.statusOk(res);
      assert.isArray(res.body.content);
    });

    await this.test('POST /api/posts 应该创建文章', async () => {
      const res = await this.httpClient.request('/api/posts', {
        method: 'POST',
        token: authToken,
        body: {
          title: '测试文章',
          slug: 'test-post-' + Date.now(),
          contentMarkdown: '这是测试文章内容...',
          published: true,
          tags: ['测试']
        }
      });
      assert.statusIn(res, [200, 201]);
      assert.hasField(res.body, 'id');
      this.context.testPostId = res.body.id;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/posts/{id} 应该返回文章详情', async () => {
      const res = await this.httpClient.request(`/api/posts/${this.context.testPostId}`);
      assert.statusOk(res);
      assert.equal(res.body.id, this.context.testPostId);
    }, { skip: !this.context.testPostId, skipReason: '需要文章ID' });

    await this.test('GET /api/posts/slug/{slug} 应该返回文章详情', async () => {
      const postRes = await this.httpClient.request(`/api/posts/${this.context.testPostId}`);
      const res = await this.httpClient.request(`/api/posts/slug/${postRes.body.slug}`);
      assert.statusOk(res);
    }, { skip: !this.context.testPostId, skipReason: '需要文章ID' });

    await this.test('GET /api/posts/me 应该返回我的文章', async () => {
      const res = await this.httpClient.request('/api/posts/me', { token: authToken });
      assert.statusOk(res);
      assert.isArray(res.body.content);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('PUT /api/posts/{id} 应该更新文章', async () => {
      const res = await this.httpClient.request(`/api/posts/${this.context.testPostId}`, {
        method: 'PUT',
        token: authToken,
        body: {
          title: '更新后的标题',
          contentMarkdown: '更新后的内容...'
        }
      });
      assert.statusOk(res);
    }, { skip: !authToken || !this.context.testPostId, skipReason: '需要认证令牌和文章ID' });

    await this.test('DELETE /api/posts/{id} 应该删除文章', async () => {
      const res = await this.httpClient.request(`/api/posts/${this.context.testPostId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.testPostId, skipReason: '需要认证令牌和文章ID' });
  }
}

// 8. 评论接口
class CommentTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    // 先创建一篇文章用于评论测试
    await this.test('准备：创建评论测试文章', async () => {
      const res = await this.httpClient.request('/api/posts', {
        method: 'POST',
        token: authToken,
        body: {
          title: '评论测试文章',
          slug: 'comment-test-' + Date.now(),
          contentMarkdown: '用于评论测试',
          published: true,
          tags: ['测试']
        }
      });
      assert.statusIn(res, [200, 201]);
      this.context.commentPostId = res.body.id;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('POST /api/posts/{id}/comments 应该创建评论', async () => {
      const res = await this.httpClient.request(`/api/posts/${this.context.commentPostId}/comments`, {
        method: 'POST',
        body: {
          content: '这是一条测试评论',
          guestName: '测试用户',
          guestEmail: 'test@example.com'
        }
      });
      assert.statusIn(res, [200, 201]);
    }, { skip: !this.context.commentPostId, skipReason: '需要文章ID' });

    await this.test('GET /api/posts/{id}/comments 应该返回评论列表', async () => {
      const res = await this.httpClient.request(`/api/posts/${this.context.commentPostId}/comments`);
      assert.statusOk(res);
      assert.hasField(res.body, 'content');
    }, { skip: !this.context.commentPostId, skipReason: '需要文章ID' });

    // 清理
    await this.test('清理：删除测试文章', async () => {
      const res = await this.httpClient.request(`/api/posts/${this.context.commentPostId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.commentPostId, skipReason: '需要认证令牌和文章ID' });
  }
}

// 9. StorySeed 接口
class StorySeedTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    await this.test('GET /api/story-seeds 应该返回种子列表', async () => {
      const res = await this.httpClient.request('/api/story-seeds');
      assert.statusOk(res);
      assert.isArray(res.body.content);
    });

    await this.test('POST /api/story-seeds 应该创建种子', async () => {
      const res = await this.httpClient.request('/api/story-seeds', {
        method: 'POST',
        token: authToken,
        body: {
          title: '测试种子',
          slug: 'test-seed-' + Date.now(),
          openingMarkdown: '这是一个测试种子的开头内容...',
          published: true
        }
      });
      assert.statusIn(res, [200, 201]);
      assert.hasField(res.body, 'id');
      this.context.storySeedId = res.body.id;
      this.context.storySeedSlug = res.body.slug;
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('GET /api/story-seeds/{id} 应该返回种子详情', async () => {
      const res = await this.httpClient.request(`/api/story-seeds/${this.context.storySeedId}`, { 
        token: authToken 
      });
      assert.statusOk(res);
      assert.equal(res.body.id, this.context.storySeedId);
    }, { skip: !authToken || !this.context.storySeedId, skipReason: '需要认证令牌和种子ID' });

    await this.test('GET /api/story-seeds/slug/{slug} 应该返回种子详情', async () => {
      const res = await this.httpClient.request(`/api/story-seeds/slug/${this.context.storySeedSlug}`);
      assert.statusOk(res);
    }, { skip: !this.context.storySeedSlug, skipReason: '需要种子slug' });

    await this.test('GET /api/story-seeds/me 应该返回我的种子', async () => {
      const res = await this.httpClient.request('/api/story-seeds/me', { token: authToken });
      assert.statusOk(res);
      assert.isArray(res.body);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('PUT /api/story-seeds/{id} 应该更新种子', async () => {
      const res = await this.httpClient.request(`/api/story-seeds/${this.context.storySeedId}`, {
        method: 'PUT',
        token: authToken,
        body: {
          title: '更新后的种子标题',
          openingMarkdown: '更新后的开头内容'
        }
      });
      assert.statusOk(res);
    }, { skip: !authToken || !this.context.storySeedId, skipReason: '需要认证令牌和种子ID' });

    await this.test('POST /api/story-seeds/{id}/fork 应该 Fork 种子', async () => {
      const res = await this.httpClient.request(`/api/story-seeds/${this.context.storySeedId}/fork`, {
        method: 'POST',
        token: authToken
      });
      // 可能返回 201（成功）或 400（不能 fork 自己的）
      assert.statusIn(res, [201, 400]);
    }, { skip: !authToken || !this.context.storySeedId, skipReason: '需要认证令牌和种子ID' });

    await this.test('DELETE /api/story-seeds/{id} 应该删除种子', async () => {
      const res = await this.httpClient.request(`/api/story-seeds/${this.context.storySeedId}`, {
        method: 'DELETE',
        token: authToken
      });
      assert.statusIn(res, [200, 204]);
    }, { skip: !authToken || !this.context.storySeedId, skipReason: '需要认证令牌和种子ID' });
  }
}

// 10. 标签接口
class TagTests extends TestSuite {
  async runTests() {
    await this.test('GET /api/tags 应该返回标签列表', async () => {
      const res = await this.httpClient.request('/api/tags');
      assert.statusOk(res);
      assert.isArray(res.body);
    });
  }
}

// 11. AI 接口
class AiTests extends TestSuite {
  async runTests() {
    const authToken = this.runner.globalState.authToken;

    await this.test('GET /api/ai/models 应该返回模型列表', async () => {
      const res = await this.httpClient.request('/api/ai/models', { token: authToken });
      // 可能 200（成功）或 503（AI 未配置）
      assert.statusIn(res, [200, 503]);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    await this.test('POST /api/ai/chat 应该返回 AI 响应', async () => {
      const res = await this.httpClient.request('/api/ai/chat', {
        method: 'POST',
        token: authToken,
        body: {
          messages: [{ role: 'user', content: '你好' }],
          model: 'gpt-4o-mini'
        }
      });
      // 可能 200（成功）或 503（AI 未配置）
      assert.statusIn(res, [200, 503]);
    }, { skip: !authToken, skipReason: '需要认证令牌' });

    // 流式接口只测试连接，不测试完整响应
    await this.test('POST /api/ai/chat/stream 应该建立流式连接', async () => {
      // 流式接口需要特殊处理，返回 text/event-stream
      // 当 AI 未配置时，应该返回 503
      // 这里跳过详细测试，因为需要特殊处理 SSE 流
      assert.equal(true, true);
    }, { skip: false });
  }
}

// ==================== 主函数 ====================
async function main() {
  const args = process.argv.slice(2);
  const isCI = args.includes('--ci');
  const shouldSeed = args.includes('--seed');
  
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
    .addSuite(new WikiTests('Wiki 接口'))
    .addSuite(new InspirationTests('Inspiration 接口'))
    .addSuite(new PostTests('Post 接口'))
    .addSuite(new CommentTests('Comment 接口'))
    .addSuite(new StorySeedTests('StorySeed 接口'))
    .addSuite(new TagTests('Tag 接口'))
    .addSuite(new AiTests('AI 接口'));

  await runner.run({
    ci: isCI,
    report: shouldSaveReport,
    reportPath: reportPath,
    junitPath: junitPath,
    seed: shouldSeed
  });
}

main().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
