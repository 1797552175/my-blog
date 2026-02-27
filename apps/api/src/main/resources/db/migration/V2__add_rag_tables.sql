-- 小说级RAG系统数据库迁移脚本
-- 创建章节摘要表和实体索引表

-- ============================================
-- 1. 章节压缩体系
-- ============================================

-- 章节摘要表
CREATE TABLE IF NOT EXISTS story_commit_summaries (
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

-- 章节内容片段表
CREATE TABLE IF NOT EXISTS story_commit_snippets (
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

-- ============================================
-- 2. 符号表/索引系统
-- ============================================

-- 实体索引表
CREATE TABLE IF NOT EXISTS story_entity_index (
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

-- 实体出场记录表
CREATE TABLE IF NOT EXISTS entity_appearances (
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

-- 情节关键词索引表
CREATE TABLE IF NOT EXISTS story_keywords_index (
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

-- ============================================
-- 3. Prompt构建辅助表
-- ============================================

-- Prompt模板表
CREATE TABLE IF NOT EXISTS prompt_templates (
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

-- Prompt构建上下文表
CREATE TABLE IF NOT EXISTS prompt_build_contexts (
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

-- ============================================
-- 4. AI生成质量追踪表
-- ============================================

-- AI生成记录表
CREATE TABLE IF NOT EXISTS ai_generation_logs (
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

-- ============================================
-- 5. 初始化默认Prompt模板
-- ============================================

INSERT INTO prompt_templates (template_name, template_type, system_prompt, user_prompt_template, description, model, temperature, max_tokens) VALUES
(
    'chapter_summary',
    'summary',
    '你是一位专业的小说编辑，擅长提炼情节要点。请对提供的章节内容生成三级摘要和结构化信息。保持客观，准确提取关键信息。',
    '【世界观背景】\n{worldbuilding}\n\n【章节内容】\n{chapter_content}\n\n请生成三级摘要和结构化信息，严格按JSON格式输出：\n{\n  "ultra_short_summary": "50字以内核心事件",\n  "short_summary": "200字以内情节+情感",\n  "medium_summary": "500字以内完整梗概",\n  "key_events": [{"event": "事件", "type": "转折/冲突/揭示", "importance": 1-5}],\n  "characters_involved": [{"name": "角色名", "action": "行为", "emotional_state": "情绪"}],\n  "locations_involved": [{"name": "地点名", "scene_type": "场景类型"}],\n  "items_involved": [{"name": "物品名", "significance": "重要性"}],\n  "emotional_tone": "情感基调",\n  "chapter_function": "本章功能"\n}',
    '章节摘要生成模板',
    'gpt-4o-mini',
    0.3,
    2000
),
(
    'entity_recognition',
    'character',
    '你是一位专业的小说分析助手。请从章节内容中提取所有实体（角色、地点、物品、组织），并分析它们的关系和状态。',
    '【已有实体列表】\n{existing_entities}\n\n【章节内容】\n{chapter_content}\n\n请提取所有实体，按JSON格式输出：\n{\n  "characters": [{"name": "名称", "alias": ["别名"], "actions": "行为", "emotional_state": "情绪", "is_new": true/false}],\n  "locations": [{"name": "名称", "description": "描述", "is_new": true/false}],\n  "items": [{"name": "名称", "significance": "重要性", "is_new": true/false}],\n  "organizations": [{"name": "名称", "description": "描述", "is_new": true/false}]\n}',
    '实体识别模板',
    'gpt-4o-mini',
    0.3,
    1500
),
(
    'story_generation',
    'generation',
    '你是一位小说续写助手。请根据提供的世界观、历史剧情和读者选择，续写下一段剧情。保持风格一致，情节连贯，注意角色性格和世界观设定的准确性。',
    '{system_context}\n\n【世界观设定】\n{worldbuilding}\n\n【故事背景】\n{story_background}\n\n【近期剧情】\n{recent_chapters}\n\n【前期剧情概要】\n{older_summaries}\n\n【当前情境】\n{current_situation}\n\n【读者选择】\n{reader_choice}\n\n请续写下一段剧情（800-1200字），保持风格一致，情节连贯。输出纯Markdown正文，不要输出标题或元信息。',
    '故事续写生成模板',
    'gpt-4o-mini',
    0.7,
    2000
);
