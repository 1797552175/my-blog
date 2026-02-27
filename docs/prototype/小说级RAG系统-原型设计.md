# 小说级RAG系统 - 原型设计

## 产品定位

**让AI记住整个故事，而不只是最后一章。**

这是一个专为互动式小说设计的检索增强生成系统，通过三层压缩体系（世界观→章节摘要→符号表），解决长文本生成中的上下文遗忘问题。

---

## 一、核心概念

### 1.1 从代码到小说的压缩映射

| 代码概念 | 小说映射 | 解决的问题 |
|---------|---------|-----------|
| **代码压缩 (minify)** | 章节摘要生成 | 去除冗余描述，保留核心情节 |
| **头文件 (header)** | 世界观设定文件 | 全局上下文，所有分支共享 |
| **接口文档 (API spec)** | 关键事件节点 | 快速理解剧情依赖关系 |
| **函数摘要 (docstring)** | 章节功能描述 | 这一章完成了什么 |
| **依赖管理 (package.json)** | 前置章节依赖 | 阅读第X章需要哪些前置知识 |
| **符号表 (symbol table)** | 实体索引 | 快速定位角色/物品出场位置 |

### 1.2 三层压缩体系

```
┌─────────────────────────────────────────────────────────────┐
│  L1: 世界观设定层 (Global Context)                          │
│  ├── 角色设定库（性格、背景、关系）                          │
│  ├── 专有名词（地名、物品、技能）                            │
│  ├── 故事README（核心规则、大背景）                          │
│  └── 永远加载，故事的"操作系统"                              │
├─────────────────────────────────────────────────────────────┤
│  L2: 章节压缩层 (Chapter Compression)                        │
│  ├── 超短摘要（50字，核心事件）                              │
│  ├── 短摘要（200字，情节+情感）                              │
│  ├── 中摘要（500字，完整梗概）                               │
│  └── 按距离选择性加载（近详远略）                            │
├─────────────────────────────────────────────────────────────┤
│  L3: 符号表层 (Symbol Index)                                 │
│  ├── 实体索引（角色/地点/物品）                              │
│  ├── 出场记录（何时何地做了什么）                            │
│  └── 按需检索（当前剧情相关实体）                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、系统架构

### 2.1 整体流程

```
用户做出选择
    ↓
┌──────────────────────────────────────┐
│  Step 1: Prompt构建器                 │
│  ├── 加载世界观设定（筛选相关）        │
│  ├── 加载历史剧情（分层压缩）          │
│  └── 加载符号表（当前相关实体）        │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│  Step 2: AI生成                       │
│  └── 调用LLM生成新章节                 │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│  Step 3: 后处理与索引                 │
│  ├── 自动生成章节摘要（三级）          │
│  ├── 提取关键片段                      │
│  ├── 更新实体出场记录                  │
│  └── 更新关键词索引                    │
└──────────────────────────────────────┘
    ↓
存储新章节 + 所有索引数据
```

### 2.2 核心模块

```
┌─────────────────────────────────────────────────────────────┐
│                    小说级RAG系统                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  世界观管理器 │  │  章节压缩器   │  │  符号表管理器 │      │
│  │  (L1层)      │  │  (L2层)      │  │  (L3层)      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           ↓                                │
│                  ┌─────────────────┐                       │
│                  │   Prompt构建器   │                       │
│                  │  (分层组装策略)  │                       │
│                  └────────┬────────┘                       │
│                           ↓                                │
│                  ┌─────────────────┐                       │
│                  │    AI生成器      │                       │
│                  │  (LLM调用+后处理) │                       │
│                  └────────┬────────┘                       │
│                           ↓                                │
│                  ┌─────────────────┐                       │
│                  │   索引更新器     │                       │
│                  │ (自动生成摘要等) │                       │
│                  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、核心功能原型

### 3.1 章节摘要生成

#### 输入
- 新生成的章节完整内容
- 故事风格参数
- 世界观设定

#### 输出（JSON格式）
```json
{
  "ultra_short_summary": "主角在废弃工厂发现神秘宝箱，决定打开它",
  "short_summary": "主角追踪线索来到城市边缘的废弃工厂，在地下室发现一个发光的神秘宝箱。经过犹豫，他决定打开宝箱，里面藏着一张指向更大秘密的古老地图。",
  "medium_summary": "主角根据之前获得的线索，独自来到城市边缘的废弃工厂...",
  "key_events": [
    {
      "event": "发现神秘宝箱",
      "type": "揭示",
      "importance": 5
    },
    {
      "event": "决定打开宝箱",
      "type": "决策",
      "importance": 4
    }
  ],
  "characters_involved": [
    {
      "name": "林默",
      "action": "探索工厂、发现宝箱、做出选择",
      "emotional_state": "好奇→犹豫→坚定"
    }
  ],
  "locations_involved": [
    {
      "name": "废弃工厂",
      "scene_type": "悬疑探索"
    },
    {
      "name": "工厂地下室",
      "scene_type": "关键发现"
    }
  ],
  "items_involved": [
    {
      "name": "神秘宝箱",
      "significance": "核心道具，引出后续剧情"
    },
    {
      "name": "古老地图",
      "significance": "下一阶段的线索"
    }
  ],
  "emotional_tone": "悬疑、紧张、期待",
  "chapter_function": "关键道具引入，推动主线发展",
  "prerequisite_chapters": [1, 2, 3]
}
```

#### Prompt模板
```
你是一位专业的小说编辑。请对以下章节生成三级摘要和结构化信息。

【世界观设定】
{worldbuilding_context}

【章节内容】
{chapter_content}

【要求】
1. ultra_short_summary: 50字以内，只保留最核心的情节转折
2. short_summary: 200字以内，包含情节+情感变化
3. medium_summary: 500字以内，完整情节梗概
4. 提取所有关键事件、出场角色、地点、物品
5. 分析本章在整体故事中的功能

请严格按照以下JSON格式输出：
{
  "ultra_short_summary": "...",
  "short_summary": "...",
  "medium_summary": "...",
  "key_events": [...],
  "characters_involved": [...],
  "locations_involved": [...],
  "items_involved": [...],
  "emotional_tone": "...",
  "chapter_function": "...",
  "prerequisite_chapters": [...]
}
```

---

### 3.2 分层Prompt构建策略

#### Token预算分配（以8K上下文为例）

```
总预算: 8192 tokens
├── 系统Prompt + 输出预留: 2048 tokens (25%)
├── 世界观设定 (L1): 2048 tokens (25%)
├── 历史剧情 (L2): 3072 tokens (37.5%)
│   ├── 最近2章完整内容: ~1500 tokens
│   ├── 第3-5章短摘要: ~800 tokens
│   └── 更早章节超短摘要: ~772 tokens
└── 符号表 (L3): 1024 tokens (12.5%)
```

#### 构建算法

```java
public class LayeredPromptBuilder {
    
    private static final int TOTAL_BUDGET = 8192;
    private static final int OUTPUT_RESERVE = 2048;
    private static final int AVAILABLE_BUDGET = TOTAL_BUDGET - OUTPUT_RESERVE;
    
    public String buildPrompt(StoryContext context) {
        StringBuilder prompt = new StringBuilder();
        int remainingBudget = AVAILABLE_BUDGET;
        
        // L1: 世界观设定（智能筛选）
        String worldbuilding = buildRelevantWorldbuilding(context);
        prompt.append(worldbuilding);
        remainingBudget -= estimateTokens(worldbuilding);
        
        // L2: 历史剧情（分层加载）
        String history = buildLayeredHistory(context, remainingBudget * 0.7);
        prompt.append(history);
        remainingBudget -= estimateTokens(history);
        
        // L3: 符号表（按需加载）
        String symbols = buildRelevantSymbols(context, remainingBudget);
        prompt.append(symbols);
        
        return prompt.toString();
    }
    
    private String buildLayeredHistory(StoryContext context, double budget) {
        List<StoryCommit> commits = context.getCommits();
        StringBuilder history = new StringBuilder();
        
        // 最近2章：完整内容
        List<StoryCommit> recent = getRecentCommits(commits, 2);
        for (StoryCommit commit : recent) {
            history.append("【第").append(commit.getSortOrder()).append("章】\n");
            history.append(commit.getContentMarkdown()).append("\n\n");
        }
        
        // 第3-5章：短摘要
        List<StoryCommitSummary> middle = getCommitSummaries(commits, 3, 5);
        history.append("【前期剧情概要】\n");
        for (StoryCommitSummary summary : middle) {
            history.append("第").append(summary.getChapterNumber()).append("章：");
            history.append(summary.getShortSummary()).append("\n");
        }
        
        // 更早章节：超短摘要
        List<StoryCommitSummary> older = getCommitSummaries(commits, 6, Integer.MAX_VALUE);
        if (!older.isEmpty()) {
            history.append("\n【故事背景】\n");
            for (StoryCommitSummary summary : older) {
                history.append(summary.getUltraShortSummary()).append("\n");
            }
        }
        
        return history.toString();
    }
}
```

---

### 3.3 智能世界观筛选

#### 筛选策略

```
1. 高频实体（出场次数>5）→ 必须包含
2. 最近章节出场实体 → 必须包含
3. 当前选择相关实体 → 必须包含
4. 其他实体 → 按相关性排序，空间剩余时包含
```

#### 相关性评分算法

```java
public class WorldbuildingRelevanceScorer {
    
    public List<StoryCharacter> scoreCharacters(StoryContext context) {
        List<StoryCharacter> characters = context.getAllCharacters();
        
        return characters.stream()
            .map(c -> {
                double score = 0;
                
                // 出场频率权重
                score += c.getAppearanceCount() * 0.5;
                
                // 最近出场权重（指数衰减）
                int lastChapter = c.getLastAppearanceChapter();
                int currentChapter = context.getCurrentChapter();
                score += 10 * Math.exp(-0.3 * (currentChapter - lastChapter));
                
                // 当前选择关键词匹配
                if (context.getCurrentOption().getKeywords().contains(c.getName())) {
                    score += 20;
                }
                
                return new ScoredCharacter(c, score);
            })
            .sorted(Comparator.comparing(ScoredCharacter::getScore).reversed())
            .map(ScoredCharacter::getCharacter)
            .collect(Collectors.toList());
    }
}
```

---

### 3.4 实体符号表

#### 实体卡片示例

```json
{
  "entity_type": "character",
  "entity_name": "林默",
  "entity_alias": ["主角", "林侦探", "那家伙"],
  "description": "前刑警，因一次失败案件离职成为私家侦探。性格冷静但内心有创伤。",
  "first_appearance": {
    "chapter": 1,
    "context": "在办公室里接到神秘委托"
  },
  "last_appearance": {
    "chapter": 5,
    "context": "在废弃工厂发现宝箱"
  },
  "appearance_count": 5,
  "current_status": "获得古老地图，准备前往下一个地点",
  "status_history": [
    {"chapter": 1, "status": "接到委托", "event": "神秘女子来访"},
    {"chapter": 3, "status": "发现线索", "event": "找到关键证据"},
    {"chapter": 5, "status": "获得地图", "event": "打开宝箱"}
  ],
  "relationships": [
    {"target": "苏雨", "relation": "委托人", "strength": 8},
    {"target": "陈队", "relation": "前上司", "strength": 6},
    {"target": "神秘组织", "relation": "追查对象", "strength": 9}
  ]
}
```

#### 实体查询接口

```java
// 获取角色完整档案（用于角色重新出场时）
GET /api/story-seeds/{id}/entities/{entity_name}/profile

// 获取角色上次出场后的变化
GET /api/story-seeds/{id}/entities/{entity_name}/changes?since_chapter={n}

// 获取两个角色之间的关系历史
GET /api/story-seeds/{id}/entities/relationship?entity1=A&entity2=B
```

---

## 四、用户界面原型

### 4.1 创作者端 - 世界观管理

```
┌─────────────────────────────────────────────────────────────┐
│  故事设定：《迷雾之城》                    [保存] [预览]     │
├─────────────────────────────────────────────────────────────┤
│  [角色设定]  [专有名词]  [故事README]  [时间线]  [索引]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 角色列表                              [+ 新建角色]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  👤 林默 (主角) - 出场5次                           │   │
│  │     当前状态：获得古老地图，准备前往下一个地点       │   │
│  │     [编辑] [查看出场记录] [关系图谱]                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  👤 苏雨 (委托人) - 出场2次                         │   │
│  │     当前状态：失踪，下落不明                        │   │
│  │     [编辑] [查看出场记录] [关系图谱]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 实体关系图谱（可视化）                               │   │
│  │                                                     │   │
│  │        [林默] ←──委托人──→ [苏雨]                   │   │
│  │          ↓                   ↓                      │   │
│  │      追查对象           被追杀                      │   │
│  │          ↓                   ↓                      │   │
│  │      [神秘组织] ←──敌对──→ [陈队]                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 读者端 - 阅读界面（带RAG调试）

```
┌─────────────────────────────────────────────────────────────┐
│  《迷雾之城》 - 第5章                    [📊 RAG详情]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【剧情】                                                    │
│  林默深吸一口气，伸手触碰宝箱的锁扣...                       │
│                                                             │
│  [继续阅读...]                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【你的选择】                                                │
│  ○ 选项A：打开宝箱                                           │
│  ○ 选项B：先检查是否有陷阱                                   │
│  ○ 选项C：拍照记录后离开                                     │
├─────────────────────────────────────────────────────────────┤
│  📊 RAG构建详情（点击展开）                                  │
├─────────────────────────────────────────────────────────────┤
│  本次生成使用了：                                            │
│  ├── 世界观设定：2048 tokens (5个角色 + 3个地点 + README)   │
│  ├── 历史剧情：3072 tokens                                   │
│  │   ├── 第4章（完整）：~800 tokens                         │
│  │   ├── 第3章（完整）：~700 tokens                         │
│  │   ├── 第1-2章（摘要）：~400 tokens                       │
│  │   └── 故事背景：~1172 tokens                             │
│  └── 符号表：512 tokens (林默、神秘宝箱、废弃工厂)          │
│  总计：5632 / 8192 tokens (68%)                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 调试面板 - Prompt预览

```
┌─────────────────────────────────────────────────────────────┐
│  Prompt构建预览                                            │
├─────────────────────────────────────────────────────────────┤
│  [原始] [压缩后] [Token分析]                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【系统Prompt】                                              │
│  你是一位小说续写助手...                                     │
│                                                             │
│  【世界观设定】                                              │
│  [已加载] 林默：前刑警...                                    │
│  [已加载] 废弃工厂：位于城市边缘...                          │
│  [已省略] 陈队（相关性较低）...                              │
│                                                             │
│  【历史剧情】                                                │
│  [完整] 第4章：林默追踪线索来到工厂...                       │
│  [完整] 第3章：在旧书店发现关键线索...                       │
│  [摘要] 第1-2章：主角接到委托，开始调查...                   │
│                                                             │
│  【当前选择】                                                │
│  分支点（发现宝箱）：选项「打开宝箱」                         │
│                                                             │
│  ─────────────────────────────────────────────────         │
│  预估Token：5632 | 预计响应时间：3-5秒                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、实施路线图

### 阶段一：MVP（2-3周）

**目标**：解决Prompt爆炸问题，实现基础章节摘要

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 1. 创建 `story_commit_summaries` 表 | P0 | 1天 |
| 2. 实现章节摘要自动生成 | P0 | 3天 |
| 3. 修改Prompt构建器（分层加载） | P0 | 3天 |
| 4. Token预算管理 | P1 | 2天 |
| 5. 基础调试面板 | P1 | 2天 |

**验收标准**：
- 10章以上的故事可以正常生成，不超出上下文限制
- 每章自动生成三级摘要
- Prompt构建时间 < 100ms

### 阶段二：智能优化（3-4周）

**目标**：实现智能筛选，提升生成质量

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 6. 创建 `story_entity_index` 表 | P0 | 1天 |
| 7. 实体自动识别与索引 | P0 | 3天 |
| 8. 智能世界观筛选 | P0 | 3天 |
| 9. 相关性评分算法 | P1 | 3天 |
| 10. 摘要质量评估 | P1 | 2天 |

**验收标准**：
- 实体识别准确率 > 80%
- 世界观设定自动筛选，相关性提升
- 生成内容连贯性评分 > 4/5

### 阶段三：高级功能（4-6周）

**目标**：完整的三层RAG体系

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 11. 多时间线支持 | P1 | 1周 |
| 12. 关键词索引 | P2 | 1周 |
| 13. 实体关系图谱 | P2 | 1周 |
| 14. Prompt模板系统 | P2 | 1周 |
| 15. A/B测试框架 | P2 | 1周 |

**验收标准**：
- 支持多线叙事（主线+回忆线）
- 可视化角色关系图谱
- Prompt可配置化

---

## 六、关键指标

### 技术指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| Prompt构建时间 | < 100ms | 从请求到发送给LLM |
| Token利用率 | > 70% | 有效内容 / 总预算 |
| 上下文命中率 | > 90% | 生成内容引用历史剧情的比例 |
| 摘要压缩率 | 80-90% | 原文token / 摘要token |

### 质量指标

| 指标 | 目标值 | 评估方式 |
|------|--------|----------|
| 连贯性评分 | > 4.0/5 | 人工标注 |
| 风格一致性 | > 4.0/5 | 与开头章节对比 |
| 世界观准确性 | > 4.5/5 | 角色行为是否符合设定 |
| 读者满意度 | > 4.0/5 | 用户反馈 |

---

## 七、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 摘要生成质量不稳定 | 高 | 多模型对比+人工审核机制 |
| Token预算分配不当 | 中 | 动态调整算法+A/B测试 |
| 实体识别错误 | 中 | 人工校对+反馈修正 |
| 长故事性能下降 | 中 | 预计算+缓存策略 |
| 多语言支持 | 低 | 先聚焦中文，后续扩展 |

---

## 附录：Prompt模板库

### A.1 章节摘要生成Prompt

```
你是一位专业的小说编辑，擅长提炼情节要点。

【任务】
对以下章节生成三级摘要，提取结构化信息。

【世界观背景】
{worldbuilding}

【章节内容】
{chapter_content}

【输出要求】
1. ultra_short_summary: 50字以内，一句话概括核心转折
2. short_summary: 200字以内，情节+情感+关键对话
3. medium_summary: 500字以内，完整梗概
4. 提取所有关键事件、出场角色、地点、物品
5. 分析本章功能（铺垫/高潮/转折/收尾）

请严格按JSON格式输出。
```

### A.2 实体识别Prompt

```
从以下章节内容中提取所有实体（角色、地点、物品、组织）。

【已有实体列表】（用于消歧）
{existing_entities}

【章节内容】
{chapter_content}

【输出格式】
{
  "characters": [{"name": "名称", "alias": ["别名"], "actions": "行为", "emotional_state": "情绪"}],
  "locations": [{"name": "名称", "description": "描述"}],
  "items": [{"name": "名称", "significance": "重要性"}],
  "organizations": [{"name": "名称", "description": "描述"}]
}
```

### A.3 续写生成Prompt

```
{system_prompt}

【世界观设定】
{relevant_worldbuilding}

【故事背景】
{story_background}

【近期剧情】
{recent_chapters}

【前期剧情概要】
{older_summaries}

【当前情境】
{current_situation}

【读者选择】
{reader_choice}

请续写下一段剧情（800-1200字），保持风格一致，情节连贯。
```
