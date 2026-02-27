# 小说级RAG系统 - 实施计划

## 项目概述

将小说级RAG（检索增强生成）系统集成到现有互动式故事平台中，解决长文本生成时的上下文遗忘问题。

---

## 技术栈确认

- **后端**: Spring Boot 3.x + JPA/Hibernate
- **数据库**: MariaDB (支持JSON类型)
- **AI服务**: OpenAI兼容接口 (已配置)
- **自动建表**: Hibernate `ddl-auto: update` (开发阶段)

---

## 实施路线图

### 📌 Phase 1: 核心功能（2周）- 解决Prompt爆炸问题

**目标**: 实现章节摘要和分层Prompt构建，确保10章以上故事能正常生成

#### Week 1: 数据库与实体层

| 天数 | 任务 | 输出文件 | 工作量 |
|------|------|----------|--------|
| Day 1 | 创建章节摘要表SQL | `V2__add_commit_summaries.sql` | 2h |
| Day 1 | 创建实体索引表SQL | `V2__add_entity_index.sql` | 2h |
| Day 2 | 创建StoryCommitSummary实体 | `StoryCommitSummary.java` | 3h |
| Day 2 | 创建StoryCommitSummaryRepository | `StoryCommitSummaryRepository.java` | 2h |
| Day 3 | 创建StoryEntityIndex实体 | `StoryEntityIndex.java` | 3h |
| Day 3 | 创建EntityAppearance实体 | `EntityAppearance.java` | 2h |
| Day 4 | 创建实体Repository层 | `*Repository.java` x3 | 3h |
| Day 5 | 单元测试与联调 | - | 4h |

#### Week 2: 服务层与Prompt构建

| 天数 | 任务 | 输出文件 | 工作量 |
|------|------|----------|--------|
| Day 6 | 实现摘要生成服务 | `CommitSummaryService.java` | 6h |
| Day 7 | 实现分层Prompt构建器 | `LayeredPromptBuilder.java` | 6h |
| Day 8 | 修改ReaderForkService集成 | `ReaderForkServiceImpl.java` 修改 | 4h |
| Day 9 | Token预算管理 | `TokenBudgetManager.java` | 4h |
| Day 10 | 集成测试与Bug修复 | - | 4h |

**Phase 1 验收标准**:
- [ ] 数据库表创建成功
- [ ] 生成章节后自动创建三级摘要
- [ ] 10章故事Prompt < 8K tokens
- [ ] Prompt构建时间 < 100ms

---

### 📌 Phase 2: 智能优化（2周）- 提升生成质量

**目标**: 实现智能筛选，提升AI生成内容的连贯性和准确性

#### Week 3: 实体识别与索引

| 天数 | 任务 | 输出文件 | 工作量 |
|------|------|----------|--------|
| Day 11 | 实现实体识别服务 | `EntityRecognitionService.java` | 6h |
| Day 12 | 实现实体索引更新 | `EntityIndexService.java` | 6h |
| Day 13 | 集成到生成流程 | 修改 `ReaderForkServiceImpl` | 4h |
| Day 14 | 实体查询API | `EntityQueryController.java` | 4h |

#### Week 4: 智能筛选与优化

| 天数 | 任务 | 输出文件 | 工作量 |
|------|------|----------|--------|
| Day 15 | 实现世界观相关性评分 | `WorldbuildingRelevanceScorer.java` | 6h |
| Day 16 | 智能世界观筛选 | `SmartWorldbuildingSelector.java` | 4h |
| Day 17 | 摘要质量评估 | `SummaryQualityEvaluator.java` | 4h |
| Day 18 | Prompt模板系统 | `PromptTemplateService.java` | 4h |
| Day 19-20 | 集成测试与优化 | - | 8h |

**Phase 2 验收标准**:
- [ ] 实体识别准确率 > 80%
- [ ] 世界观设定智能筛选
- [ ] 生成内容连贯性评分 > 4/5

---

### 📌 Phase 3: 高级功能（2-3周）- 完整RAG体系

**目标**: 多时间线、关系图谱、调试面板

#### Week 5-6: 高级功能

| 任务 | 输出文件 | 工作量 |
|------|----------|--------|
| 多时间线支持 | `StoryTimeline.java` + 服务 | 3天 |
| 实体关系图谱 | `RelationshipGraphService.java` | 2天 |
| 关键词索引 | `KeywordIndexService.java` | 2天 |
| 调试面板API | `RagDebugController.java` | 2天 |
| 前端调试界面 | `RagDebugPanel.jsx` | 2天 |

**Phase 3 验收标准**:
- [ ] 支持主线+回忆线多时间线
- [ ] 可视化角色关系图谱
- [ ] 调试面板可查看Prompt构建详情

---

## 详细任务说明

### Task 1: 创建章节摘要表

**文件**: `apps/api/src/main/resources/db/migration/V2__add_commit_summaries.sql`

```sql
-- 章节摘要表
CREATE TABLE IF NOT EXISTS story_commit_summaries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    commit_id BIGINT NOT NULL UNIQUE,
    
    -- 三级压缩摘要
    ultra_short_summary VARCHAR(100) NOT NULL COMMENT '50字以内超压缩版',
    short_summary VARCHAR(500) NOT NULL COMMENT '200字以内短摘要',
    medium_summary TEXT COMMENT '500字以内中等摘要',
    
    -- 结构化数据（JSON格式）
    key_events JSON COMMENT '关键事件列表',
    characters_involved JSON COMMENT '出场角色',
    locations_involved JSON COMMENT '出场地点',
    items_involved JSON COMMENT '出场物品',
    
    -- 元数据
    emotional_tone VARCHAR(50) COMMENT '情感基调',
    chapter_function VARCHAR(200) COMMENT '本章功能',
    token_estimate INT COMMENT '原始章节预估token数',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (commit_id) REFERENCES story_commits(id) ON DELETE CASCADE,
    INDEX idx_commit_id (commit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Task 2: 创建实体索引表

**文件**: `apps/api/src/main/resources/db/migration/V2__add_entity_index.sql`

```sql
-- 实体索引表
CREATE TABLE IF NOT EXISTS story_entity_index (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_seed_id BIGINT NOT NULL,
    
    entity_type VARCHAR(50) NOT NULL COMMENT '实体类型：character/location/item/organization',
    entity_name VARCHAR(100) NOT NULL COMMENT '实体名称',
    entity_alias JSON COMMENT '别名列表',
    
    description TEXT COMMENT '实体描述',
    first_appearance_commit_id BIGINT COMMENT '首次出场章节',
    last_appearance_commit_id BIGINT COMMENT '最后出场章节',
    appearance_count INT DEFAULT 0 COMMENT '出场次数',
    
    current_status VARCHAR(200) COMMENT '当前状态',
    status_history JSON COMMENT '状态变更历史',
    relationships JSON COMMENT '关系网络',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (story_seed_id) REFERENCES story_seeds(id) ON DELETE CASCADE,
    FOREIGN KEY (first_appearance_commit_id) REFERENCES story_commits(id),
    FOREIGN KEY (last_appearance_commit_id) REFERENCES story_commits(id),
    INDEX idx_story_entity (story_seed_id, entity_type, entity_name),
    INDEX idx_entity_type (entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 实体出场记录表
CREATE TABLE IF NOT EXISTS entity_appearances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    entity_id BIGINT NOT NULL,
    commit_id BIGINT NOT NULL,
    
    appearance_type VARCHAR(50) COMMENT '出场类型：mention/dialogue/action/thought',
    context_snippet TEXT COMMENT '出场上下文片段',
    
    emotional_state VARCHAR(100) COMMENT '情绪状态',
    physical_state VARCHAR(100) COMMENT '身体状态',
    location_at VARCHAR(100) COMMENT '所在地点',
    
    significance_score INT DEFAULT 5 COMMENT '重要性 1-10',
    is_key_moment BOOLEAN DEFAULT FALSE COMMENT '是否关键情节',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (entity_id) REFERENCES story_entity_index(id) ON DELETE CASCADE,
    FOREIGN KEY (commit_id) REFERENCES story_commits(id) ON DELETE CASCADE,
    UNIQUE KEY uk_entity_commit (entity_id, commit_id),
    INDEX idx_commit_id (commit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Task 3-4: 创建实体类

参考现有实体风格（如 `StoryCommit.java`），创建：
- `StoryCommitSummary.java`
- `StoryEntityIndex.java`
- `EntityAppearance.java`

### Task 5: 摘要生成服务

**文件**: `apps/api/src/main/java/com/example/api/rag/CommitSummaryService.java`

核心方法：
```java
@Service
public class CommitSummaryService {
    
    @Async
    public void generateSummaryAsync(StoryCommit commit) {
        // 1. 构建摘要生成Prompt
        String prompt = buildSummaryPrompt(commit);
        
        // 2. 调用AI生成摘要
        String jsonResponse = aiChatService.chat(...);
        
        // 3. 解析并保存
        StoryCommitSummary summary = parseAndSave(jsonResponse, commit);
    }
}
```

### Task 6: 分层Prompt构建器

**文件**: `apps/api/src/main/java/com/example/api/rag/LayeredPromptBuilder.java`

核心方法：
```java
@Component
public class LayeredPromptBuilder {
    
    public String buildPrompt(StorySeed seed, List<StoryCommit> commits, 
                              StoryOption option, int tokenBudget) {
        StringBuilder prompt = new StringBuilder();
        
        // L1: 世界观（智能筛选）
        prompt.append(buildWorldbuildingLayer(seed, commits, tokenBudget * 0.25));
        
        // L2: 历史剧情（分层）
        prompt.append(buildHistoryLayer(commits, tokenBudget * 0.6));
        
        // L3: 当前选择
        prompt.append(buildChoiceLayer(option));
        
        return prompt.toString();
    }
}
```

### Task 7-11: 后续功能

按照Phase 2和Phase 3的计划逐步实现。

---

## 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| MariaDB JSON支持问题 | 低 | 高 | 使用TEXT存储JSON字符串，应用层解析 |
| AI摘要生成不稳定 | 中 | 高 | 添加重试机制 + 默认摘要模板 |
| Token估算不准确 | 中 | 中 | 使用字符数估算，预留20%缓冲 |
| 性能下降（长故事） | 中 | 中 | 添加缓存 + 异步处理 |

---

## 每日站会检查清单

- [ ] 昨日完成任务
- [ ] 今日计划任务
- [ ] 遇到的阻塞问题
- [ ] 是否需要调整计划

---

## 关键里程碑

| 日期 | 里程碑 | 检查点 |
|------|--------|--------|
| Day 5 | 数据库层完成 | 表创建 + 实体类 + Repository |
| Day 10 | Phase 1完成 | 分层Prompt + 自动摘要 |
| Day 20 | Phase 2完成 | 实体识别 + 智能筛选 |
| Day 30 | Phase 3完成 | 多时间线 + 调试面板 |

---

## 开始实施

### 第一步：立即执行（今天）

1. 创建数据库迁移文件
2. 创建实体类
3. 启动应用验证表创建

### 命令

```bash
# 进入API目录
cd apps/api

# 启动应用（会自动建表）
./gradlew bootRun

# 验证表创建
# 使用数据库客户端查看表结构
```

---

## 附录：代码规范

### 实体类规范
```java
@Entity
@Table(name = "story_commit_summaries")
public class StoryCommitSummary extends BaseEntity {
    // 参考 StoryCommit.java 的风格
    // 使用 @Column 注解
    // 使用适当的 FetchType
}
```

### Repository规范
```java
@Repository
public interface StoryCommitSummaryRepository extends JpaRepository<StoryCommitSummary, Long> {
    Optional<StoryCommitSummary> findByCommitId(Long commitId);
    List<StoryCommitSummary> findByCommitIdIn(List<Long> commitIds);
}
```

### Service规范
```java
@Service
@Transactional
public class CommitSummaryService {
    // 使用构造函数注入
    // 使用 @Transactional 管理事务
    // 使用 @Async 处理异步任务
}
```
