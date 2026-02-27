## 新接口需要添加测试

检测到 22 个接口尚未被自动化测试覆盖。

请在 `api-test-complete.js` 中添加以下测试：

### AiController

- `POST /api/ai/persona/chat` - personaChat()

### ReaderForkController

- `POST /api/story-seeds/{storySeedId}/fork` - createFork()
  - 需要认证 ⚠️
- `GET /api/reader-forks/{forkId}` - getFork()
  - 需要认证 ⚠️
- `POST /api/reader-forks/{forkId}/choose` - choose()
  - 需要认证 ⚠️
- `POST /api/reader-forks/{forkId}/rollback` - rollback()
  - 需要认证 ⚠️

### StoryPullRequestController

- `POST /api/story-seeds/{storySeedId}/pull-requests` - create()
  - 需要认证 ⚠️
- `GET /api/story-pull-requests/{prId}` - getById()
  - 需要认证 ⚠️
- `PATCH /api/story-pull-requests/{prId}` - updateStatus()
  - 需要认证 ⚠️

### AiWritingController

- `POST /api/ai-writing` - write()
  - 需要认证 ⚠️
- `POST /api/ai-writing` - streamWrite()
  - 需要认证 ⚠️

### StoryBranchController

- `GET /api/stories/{storyId}/branches/stats` - getBranchStats()

### StoryWikiController

- `PUT /api/stories/{storyId}/wiki/timeline/{eventId}` - updateTimelineEvent()
  - 需要认证 ⚠️
- `DELETE /api/stories/{storyId}/wiki/timeline/{eventId}` - deleteTimelineEvent()
  - 需要认证 ⚠️

### StoryBranchPointController

- `POST /api/story-seeds/{storySeedId}/branch-points` - create()
  - 需要认证 ⚠️
- `PUT /api/story-seeds/{storySeedId}/branch-points/{branchPointId}` - update()
  - 需要认证 ⚠️
- `DELETE /api/story-seeds/{storySeedId}/branch-points/{branchPointId}` - delete()
  - 需要认证 ⚠️

### WorldbuildingController

- `POST /api/story-seeds/{storySeedId}/characters` - createCharacter()
  - 需要认证 ⚠️
- `PUT /api/story-seeds/{storySeedId}/characters/{characterId}` - updateCharacter()
  - 需要认证 ⚠️
- `DELETE /api/story-seeds/{storySeedId}/characters/{characterId}` - deleteCharacter()
  - 需要认证 ⚠️
- `POST /api/story-seeds/{storySeedId}/terms` - createTerm()
  - 需要认证 ⚠️
- `PUT /api/story-seeds/{storySeedId}/terms/{termId}` - updateTerm()
  - 需要认证 ⚠️
- `DELETE /api/story-seeds/{storySeedId}/terms/{termId}` - deleteTerm()
  - 需要认证 ⚠️


## 如何添加测试

1. 在对应的 TestSuite 类中添加测试方法
2. 参考已有测试的写法
3. 运行 `node api-test-complete.js` 验证
