// 自动生成的测试代码
// 复制到 api-test-complete.js 中使用

// Ai 接口测试 - 自动生成
class AiTests extends TestSuite {
  constructor() {
    super('Ai 接口');
  }

  async runTests() {
    await this.test('POST /api/ai/persona/chat 应该正常工作', async () => {
      const res = await makeRequest('/api/ai/persona/chat', {
        method: 'POST',
        body: {}
      });
      assert.statusIn(res, [201, 200]);
    });

  }
}


// ReaderFork 接口测试 - 自动生成
class ReaderForkTests extends TestSuite {
  constructor() {
    super('ReaderFork 接口');
  }

  async runTests() {
    await this.test('POST /api/story-seeds/{storySeedId}/fork 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/fork', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('GET /api/reader-forks/{forkId} 应该正常工作', async () => {
      const res = await makeRequest('/api/reader-forks/{forkId}', { token: authToken });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('POST /api/reader-forks/{forkId}/choose 应该正常工作', async () => {
      const res = await makeRequest('/api/reader-forks/{forkId}/choose', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "fork_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('POST /api/reader-forks/{forkId}/rollback 应该正常工作', async () => {
      const res = await makeRequest('/api/reader-forks/{forkId}/rollback', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "fork_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

  }
}


// StoryPullRequest 接口测试 - 自动生成
class StoryPullRequestTests extends TestSuite {
  constructor() {
    super('StoryPullRequest 接口');
  }

  async runTests() {
    await this.test('POST /api/story-seeds/{storySeedId}/pull-requests 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/pull-requests', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('GET /api/story-pull-requests/{prId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-pull-requests/{prId}', { token: authToken });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('PATCH /api/story-pull-requests/{prId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-pull-requests/{prId}', {
        method: 'PATCH',
        token: authToken,
        body: {
                  "user": "test",
                  "pr_id": 1
        }
      });
      assert.statusIn(res, [200, 200]);
    });

  }
}


// AiWriting 接口测试 - 自动生成
class AiWritingTests extends TestSuite {
  constructor() {
    super('AiWriting 接口');
  }

  async runTests() {
    await this.test('POST /api/ai-writing 应该正常工作', async () => {
      const res = await makeRequest('/api/ai-writing', {
        method: 'POST',
        token: authToken,
        body: {
                  "user_details": "test"
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('POST /api/ai-writing 应该正常工作', async () => {
      const res = await makeRequest('/api/ai-writing', {
        method: 'POST',
        token: authToken,
        body: {
                  "user_details": "test",
                  "response": "test"
        }
      });
      assert.statusIn(res, [201, 200]);
    });

  }
}


// StoryBranch 接口测试 - 自动生成
class StoryBranchTests extends TestSuite {
  constructor() {
    super('StoryBranch 接口');
  }

  async runTests() {
    await this.test('GET /api/stories/{storyId}/branches/stats 应该正常工作', async () => {
      const res = await makeRequest('/api/stories/{storyId}/branches/stats');
      assert.statusIn(res, [200, 200]);
    });

  }
}


// StoryWiki 接口测试 - 自动生成
class StoryWikiTests extends TestSuite {
  constructor() {
    super('StoryWiki 接口');
  }

  async runTests() {
    await this.test('PUT /api/stories/{storyId}/wiki/timeline/{eventId} 应该正常工作', async () => {
      const res = await makeRequest('/api/stories/{storyId}/wiki/timeline/{eventId}', {
        method: 'PUT',
        token: authToken,
        body: {
                  "story_id": 1,
                  "event_id": 1,
                  "user_details": "test"
        }
      });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('DELETE /api/stories/{storyId}/wiki/timeline/{eventId} 应该正常工作', async () => {
      const res = await makeRequest('/api/stories/{storyId}/wiki/timeline/{eventId}', { token: authToken });
      assert.statusIn(res, [200, 200]);
    });

  }
}


// StoryBranchPoint 接口测试 - 自动生成
class StoryBranchPointTests extends TestSuite {
  constructor() {
    super('StoryBranchPoint 接口');
  }

  async runTests() {
    await this.test('POST /api/story-seeds/{storySeedId}/branch-points 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/branch-points', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('PUT /api/story-seeds/{storySeedId}/branch-points/{branchPointId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/branch-points/{branchPointId}', {
        method: 'PUT',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1,
                  "branch_point_id": 1
        }
      });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('DELETE /api/story-seeds/{storySeedId}/branch-points/{branchPointId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/branch-points/{branchPointId}', { token: authToken });
      assert.statusIn(res, [200, 200]);
    });

  }
}


// Worldbuilding 接口测试 - 自动生成
class WorldbuildingTests extends TestSuite {
  constructor() {
    super('Worldbuilding 接口');
  }

  async runTests() {
    await this.test('POST /api/story-seeds/{storySeedId}/characters 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/characters', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('PUT /api/story-seeds/{storySeedId}/characters/{characterId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/characters/{characterId}', {
        method: 'PUT',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1,
                  "character_id": 1
        }
      });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('DELETE /api/story-seeds/{storySeedId}/characters/{characterId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/characters/{characterId}', { token: authToken });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('POST /api/story-seeds/{storySeedId}/terms 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/terms', {
        method: 'POST',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1
        }
      });
      assert.statusIn(res, [201, 200]);
    });

    await this.test('PUT /api/story-seeds/{storySeedId}/terms/{termId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/terms/{termId}', {
        method: 'PUT',
        token: authToken,
        body: {
                  "user": "test",
                  "story_seed_id": 1,
                  "term_id": 1
        }
      });
      assert.statusIn(res, [200, 200]);
    });

    await this.test('DELETE /api/story-seeds/{storySeedId}/terms/{termId} 应该正常工作', async () => {
      const res = await makeRequest('/api/story-seeds/{storySeedId}/terms/{termId}', { token: authToken });
      assert.statusIn(res, [200, 200]);
    });

  }
}


