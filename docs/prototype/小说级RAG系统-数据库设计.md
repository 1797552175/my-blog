# 小说级RAG系统 - 数据库设计

## 概述

本文档定义小说级RAG（检索增强生成）系统所需的数据库表结构，实现三层压缩体系：世界观设定、章节压缩、符号表索引。

---

## 一、章节压缩体系

### 1.1 章节摘要表 (story_commit_summaries)

存储每个章节的压缩版本，供AI快速理解已发生情节。

```sql
CREATE TABLE story_commit_summaries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    commit_id BIGINT NOT NULL UNIQUE,
    
    -- 三级压缩摘要
    ultra_short_summary VARCHAR(100) NOT NULL COMMENT '50字以内超压缩版，核心事件一句话',
    short_summary VARCHAR(500) NOT NULL COMMENT '200字以内短摘要，情节+情感',
    medium_summary TEXT COMMENT '500字以内中等摘要，完整情节梗概',
    
    -- 结构化数据（JSON格式）
    key_events JSON COMMENT '关键事件列表：[{"event": "事件描述", "type": "转折/冲突/揭示", "importance": 1-5}]',
    characters_involved JSON COMMENT '出场角色：[{"name": "角色名", "action": "行为", "emotional_state": "情绪"}]',
    locations_involved JSON COMMENT '出场地点：[{"name": "地点名", "scene_type": "场景类型"}]',
    items_involved JSON COMMENT '出场物品：[{"name": "物品名", "significance": "重要性描述"}]',
    
    -- 元数据
    emotional_tone VARCHAR(50) COMMENT '情感基调：紧张/温馨/悬疑/悲伤等',
    chapter_function VARCHAR(200) COMMENT '本章功能：铺垫/高潮/转折/收尾等',
    token_estimate INT COMMENT '原始章节预估token数',
    summary_token_estimate INT COMMENT '摘要预估token数',
    
    -- 依赖关系
    prerequisite_chapters JSON COMMENT '前置依赖章节ID列表：[1, 2, 3]',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (commit_id) REFERENCES story_commits(id) ON DELETE CASCADE,
    INDEX idx_commit_id (commit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节摘要表';
```

### 1.2 章节内容片段表 (story_commit_snippets)

存储章节中的关键片段，用于精确引用。

```sql
CREATE TABLE story_commit_snippets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    commit_id BIGINT NOT NULL,
    
    snippet_type VARCHAR(50) NOT NULL COMMENT '片段类型：dialogue/action/description/monologue',
    content TEXT NOT NULL COMMENT '片段内容',
    start_position INT COMMENT '在章节中的起始位置（字符数）',
    end_position INT COMMENT '在章节中的结束位置',
    
    -- 关联信息
    related_characters JSON COMMENT '相关角色',
    related_locations JSON COMMENT '相关地点',
    significance_score INT DEFAULT 0 COMMENT '重要性评分 1-10',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (commit_id) REFERENCES story_commits(id) ON DELETE CASCADE,
    INDEX idx_commit_id (commit_id),
    INDEX idx_snippet_type (snippet_type),
    INDEX idx_significance (significance_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节内容片段表';
```

### 1.3 故事时间线表 (story_timeline)

维护故事的时间线，支持多线叙事。

```sql
CREATE TABLE story_timeline (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_seed_id BIGINT NOT NULL,
    
    timeline_name VARCHAR(100) NOT NULL COMMENT '时间线名称：主线/支线A/回忆线等',
    timeline_type VARCHAR(50) DEFAULT 'main' COMMENT '类型：main/branch/flashback/parallel',
    parent_timeline_id BIGINT NULL COMMENT '父时间线ID（用于支线）',
    
    description TEXT COMMENT '时间线描述',
    sort_order INT DEFAULT 0 COMMENT '排序',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (story_seed_id) REFERENCES story_seeds(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_timeline_id) REFERENCES story_timeline(id),
    INDEX idx_story_seed_id (story_seed_id),
    INDEX idx_timeline_type (timeline_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事时间线表';
```

### 1.4 章节时间线关联表 (commit_timeline_mapping)

关联章节与时间线。

```sql
CREATE TABLE commit_timeline_mapping (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    commit_id BIGINT NOT NULL,
    timeline_id BIGINT NOT NULL,
    
    chronological_order INT NOT NULL COMMENT '在该时间线上的顺序',
    story_time VARCHAR(100) COMMENT '故事内时间：如"第三天傍晚"',
    
    FOREIGN KEY (commit_id) REFERENCES story_commits(id) ON DELETE CASCADE,
    FOREIGN KEY (timeline_id) REFERENCES story_timeline(id) ON DELETE CASCADE,
    UNIQUE KEY uk_commit_timeline (commit_id, timeline_id),
    INDEX idx_timeline_order (timeline_id, chronological_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节时间线关联表';
```

---

## 二、符号表/索引系统

### 2.1 实体索引表 (story_entity_index)

故事中的核心实体（角色、地点、物品）索引。

```sql
CREATE TABLE story_entity_index (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_seed_id BIGINT NOT NULL,
    
    entity_type VARCHAR(50) NOT NULL COMMENT '实体类型：character/location/item/organization/event',
    entity_name VARCHAR(100) NOT NULL COMMENT '实体名称',
    entity_alias JSON COMMENT '别名列表：["别名1", "别名2"]',
    
    -- 实体描述
    description TEXT COMMENT '实体描述',
    first_appearance_commit_id BIGINT COMMENT '首次出场章节',
    last_appearance_commit_id BIGINT COMMENT '最后出场章节',
    appearance_count INT DEFAULT 0 COMMENT '出场次数',
    
    -- 状态追踪（动态更新）
    current_status VARCHAR(200) COMMENT '当前状态',
    status_history JSON COMMENT '状态变更历史：[{"chapter": 1, "status": "状态", "event": "触发事件"}]',
    
    -- 关系网络
    relationships JSON COMMENT '关系网络：[{"target_entity": "目标实体", "relation_type": "关系类型", "strength": 1-10}]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (story_seed_id) REFERENCES story_seeds(id) ON DELETE CASCADE,
    FOREIGN KEY (first_appearance_commit_id) REFERENCES story_commits(id),
    FOREIGN KEY (last_appearance_commit_id) REFERENCES story_commits(id),
    INDEX idx_story_entity (story_seed_id, entity_type, entity_name),
    INDEX idx_entity_type (entity_type),
    INDEX idx_appearance_count (appearance_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实体索引表';
```

### 2.2 实体出场记录表 (entity_appearances)

记录实体在每个章节的具体出场信息。

```sql
CREATE TABLE entity_appearances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    entity_id BIGINT NOT NULL,
    commit_id BIGINT NOT NULL,
    
    appearance_type VARCHAR(50) COMMENT '出场类型：mention/dialogue/action/thought',
    context_snippet TEXT COMMENT '出场上下文片段',
    context_start_position INT COMMENT '上下文起始位置',
    
    -- 出场时的状态
    emotional_state VARCHAR(100) COMMENT '情绪状态',
    physical_state VARCHAR(100) COMMENT '身体状态',
    location_at VARCHAR(100) COMMENT '所在地点',
    
    -- 重要性
    significance_score INT DEFAULT 5 COMMENT '重要性 1-10',
    is_key_moment BOOLEAN DEFAULT FALSE COMMENT '是否关键情节',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (entity_id) REFERENCES story_entity_index(id) ON DELETE CASCADE,
    FOREIGN KEY (commit_id) REFERENCES story_commits(id) ON DELETE CASCADE,
    UNIQUE KEY uk_entity_commit (entity_id, commit_id),
    INDEX idx_commit_id (commit_id),
    INDEX idx_significance (significance_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实体出场记录表';
```

### 2.3 情节关键词索引表 (story_keywords_index)

关键词到章节的倒排索引。

```sql
CREATE TABLE story_keywords_index (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_seed_id BIGINT NOT NULL,
    
    keyword VARCHAR(100) NOT NULL COMMENT '关键词',
    keyword_type VARCHAR(50) COMMENT '类型：theme/motif/symbol/emotion/action',
    
    -- 出现位置
    appearances JSON COMMENT '出现位置：[{"commit_id": 1, "positions": [100, 500], "context": "上下文"}]',
    total_count INT DEFAULT 0 COMMENT '总出现次数',
    
    -- 关联
    related_entities JSON COMMENT '关联实体',
    related_keywords JSON COMMENT '关联关键词',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (story_seed_id) REFERENCES story_seeds(id) ON DELETE CASCADE,
    INDEX idx_story_keyword (story_seed_id, keyword),
    INDEX idx_keyword_type (keyword_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情节关键词索引表';
```

---

## 三、Prompt构建辅助表

### 3.1 Prompt模板表 (prompt_templates)

存储各种场景的Prompt模板。

```sql
CREATE TABLE prompt_templates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    template_name VARCHAR(100) NOT NULL UNIQUE COMMENT '模板名称',
    template_type VARCHAR(50) NOT NULL COMMENT '类型：summary/generation/worldbuilding/character',
    
    system_prompt TEXT NOT NULL COMMENT '系统Prompt',
    user_prompt_template TEXT NOT NULL COMMENT '用户Prompt模板（支持变量替换）',
    
    -- 变量定义
    variables JSON COMMENT '变量列表：[{"name": "变量名", "type": "string", "required": true, "description": "描述"}]',
    
    -- 配置
    model VARCHAR(50) DEFAULT 'gpt-4o-mini' COMMENT '使用的模型',
    temperature DECIMAL(3,2) DEFAULT 0.7 COMMENT '温度参数',
    max_tokens INT DEFAULT 2000 COMMENT '最大token数',
    
    -- 元数据
    description TEXT COMMENT '模板描述',
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    average_latency_ms INT COMMENT '平均响应时间',
    
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_template_type (template_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Prompt模板表';
```

### 3.2 Prompt构建上下文表 (prompt_build_contexts)

记录每次Prompt构建的上下文，用于调试和优化。

```sql
CREATE TABLE prompt_build_contexts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    fork_id BIGINT NOT NULL COMMENT '阅读副本ID',
    commit_id BIGINT COMMENT '当前章节ID（生成前）',
    
    -- 构建参数
    build_strategy VARCHAR(50) COMMENT '构建策略：full/recent/summary/hybrid',
    token_budget INT COMMENT 'token预算',
    
    -- 使用的数据
    included_summaries JSON COMMENT '包含的摘要列表',
    included_full_commits JSON COMMENT '包含的完整章节列表',
    included_worldbuilding JSON COMMENT '包含的世界观设定',
    
    -- 结果
    final_prompt TEXT COMMENT '最终构建的Prompt',
    final_prompt_tokens INT COMMENT '最终Prompt的token数',
    
    -- 性能
    build_time_ms INT COMMENT '构建耗时',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fork_id) REFERENCES reader_forks(id) ON DELETE CASCADE,
    FOREIGN KEY (commit_id) REFERENCES story_commits(id),
    INDEX idx_fork_id (fork_id),
    INDEX idx_build_strategy (build_strategy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Prompt构建上下文表';
```

---

## 四、AI生成质量追踪表

### 4.1 AI生成记录表 (ai_generation_logs)

记录每次AI生成的详细信息。

```sql
CREATE TABLE ai_generation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    fork_id BIGINT NOT NULL,
    commit_id BIGINT COMMENT '生成的章节ID',
    prompt_template_id BIGINT COMMENT '使用的Prompt模板',
    
    -- 输入
    system_prompt_hash VARCHAR(64) COMMENT '系统Prompt哈希',
    user_prompt_hash VARCHAR(64) COMMENT '用户Prompt哈希',
    full_prompt_length INT COMMENT '完整Prompt长度',
    
    -- 输出
    generated_content_length INT COMMENT '生成内容长度',
    generated_content_tokens INT COMMENT '生成内容token数',
    
    -- 性能
    request_time_ms INT COMMENT '请求耗时',
    model VARCHAR(50) COMMENT '使用的模型',
    
    -- 质量评估（可选人工标注）
    coherence_score INT COMMENT '连贯性评分 1-5',
    style_consistency_score INT COMMENT '风格一致性评分 1-5',
    worldbuilding_accuracy_score INT COMMENT '世界观准确性评分 1-5',
    
    -- 错误记录
    error_message TEXT COMMENT '错误信息',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fork_id) REFERENCES reader_forks(id) ON DELETE CASCADE,
    FOREIGN KEY (commit_id) REFERENCES story_commits(id),
    FOREIGN KEY (prompt_template_id) REFERENCES prompt_templates(id),
    INDEX idx_fork_id (fork_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生成记录表';
```

---

## 五、数据库关系图

```
story_seeds (故事种子)
    ├── story_commits (章节) ←── story_commit_summaries (章节摘要)
    │                              └── story_commit_snippets (片段)
    ├── story_timeline (时间线)
    │      └── commit_timeline_mapping (章节时间线关联)
    ├── story_entity_index (实体索引)
    │      └── entity_appearances (出场记录)
    ├── story_keywords_index (关键词索引)
    │
    └── reader_forks (阅读副本)
           ├── prompt_build_contexts (Prompt构建记录)
           └── ai_generation_logs (AI生成记录)
```

---

## 六、核心查询示例

### 6.1 获取分层历史剧情（用于Prompt构建）

```sql
-- 获取最近3章的完整内容 + 之前章节的摘要
SELECT 
    c.id,
    c.sort_order,
    CASE 
        WHEN c.sort_order > (SELECT MAX(sort_order) - 3 FROM story_commits WHERE fork_id = ?)
        THEN c.content_markdown  -- 最近3章：完整内容
        ELSE s.short_summary      -- 之前章节：短摘要
    END as content,
    CASE 
        WHEN c.sort_order > (SELECT MAX(sort_order) - 3 FROM story_commits WHERE fork_id = ?)
        THEN 'full'
        ELSE 'summary'
    END as content_type
FROM story_commits c
LEFT JOIN story_commit_summaries s ON c.id = s.commit_id
WHERE c.fork_id = ?
ORDER BY c.sort_order ASC;
```

### 6.2 获取角色出场历史

```sql
-- 获取某角色所有出场记录，按时间排序
SELECT 
    e.entity_name,
    c.sort_order as chapter,
    a.context_snippet,
    a.emotional_state,
    a.significance_score
FROM story_entity_index e
JOIN entity_appearances a ON e.id = a.entity_id
JOIN story_commits c ON a.commit_id = c.id
WHERE e.story_seed_id = ? AND e.entity_name = ?
ORDER BY c.sort_order ASC;
```

### 6.3 智能世界观筛选

```sql
-- 根据最近章节出场角色筛选相关设定
SELECT DISTINCT
    e.*
FROM story_entity_index e
WHERE e.story_seed_id = ?
AND (
    e.entity_name IN (
        -- 最近3章出场的角色
        SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(a.related_characters, '$[*].name'))
        FROM story_commit_summaries s
        JOIN story_commits c ON s.commit_id = c.id
        WHERE c.fork_id = ?
        AND c.sort_order > (SELECT MAX(sort_order) - 3 FROM story_commits WHERE fork_id = ?)
    )
    OR e.appearance_count > 5  -- 或者高频出场角色
)
ORDER BY e.appearance_count DESC;
```

---

## 七、实施建议

### 阶段一：核心表（1-2周）
1. `story_commit_summaries` - 章节摘要
2. `story_entity_index` - 实体索引
3. `entity_appearances` - 出场记录

### 阶段二：优化表（2-3周）
4. `story_commit_snippets` - 内容片段
5. `story_keywords_index` - 关键词索引
6. `prompt_templates` - Prompt模板

### 阶段三：高级功能（3-4周）
7. `story_timeline` - 多时间线
8. `prompt_build_contexts` - 构建追踪
9. `ai_generation_logs` - 质量追踪
