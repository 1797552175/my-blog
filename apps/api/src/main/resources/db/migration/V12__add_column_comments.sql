-- ============================================
-- 为所有表字段添加 COMMENT，便于在数据库工具中理解含义
-- 与 docs/PROJECT_SPEC.md 第 3 节「数据库表结构」一致
-- 若某表/列不存在（如由 ddl-auto 生成的列名不同），可注释掉对应语句后重跑
-- ============================================

-- 3.1 users
ALTER TABLE users
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间（插入时写入）',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间（插入/更新时写入）',
    MODIFY COLUMN username VARCHAR(32) NOT NULL COMMENT '登录用户名',
    MODIFY COLUMN email VARCHAR(128) NOT NULL COMMENT '邮箱',
    MODIFY COLUMN password_hash VARCHAR(255) NOT NULL COMMENT '密码 BCrypt 加密后的密文',
    MODIFY COLUMN persona_prompt TEXT NULL COMMENT '作者分身/人设提示词',
    MODIFY COLUMN persona_enabled BIT(1) NOT NULL COMMENT '是否启用作者分身',
    MODIFY COLUMN default_ai_model VARCHAR(64) NULL COMMENT '默认使用的 AI 模型';

-- 3.2 posts
ALTER TABLE posts
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '标题',
    MODIFY COLUMN slug VARCHAR(220) NOT NULL COMMENT 'URL 友好标识',
    MODIFY COLUMN content_markdown LONGTEXT NOT NULL COMMENT '正文（Markdown）',
    MODIFY COLUMN published BIT(1) NOT NULL COMMENT '是否已发布',
    MODIFY COLUMN author_id BIGINT NOT NULL COMMENT '作者用户 ID',
    MODIFY COLUMN inspiration_id BIGINT NULL COMMENT '来源灵感 ID';

-- 3.3 post_tags
ALTER TABLE post_tags
    MODIFY COLUMN post_id BIGINT NOT NULL COMMENT '文章 ID，关联 posts.id',
    MODIFY COLUMN tag VARCHAR(255) NOT NULL COMMENT '标签名';

-- 3.4 comments
ALTER TABLE comments
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '评论主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN post_id BIGINT NOT NULL COMMENT '文章 ID，关联 posts.id',
    MODIFY COLUMN user_id BIGINT NULL COMMENT '登录用户 ID，空表示游客',
    MODIFY COLUMN guest_name VARCHAR(64) NULL COMMENT '游客昵称',
    MODIFY COLUMN guest_email VARCHAR(128) NULL COMMENT '游客邮箱',
    MODIFY COLUMN guest_url VARCHAR(512) NULL COMMENT '游客网址',
    MODIFY COLUMN content VARCHAR(2000) NOT NULL COMMENT '评论内容（纯文本）';

-- 3.5 inspirations
ALTER TABLE inspirations
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN user_id BIGINT NOT NULL COMMENT '所属用户 ID',
    MODIFY COLUMN title VARCHAR(200) NULL COMMENT '灵感标题';

-- 3.6 inspiration_messages
ALTER TABLE inspiration_messages
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN inspiration_id BIGINT NOT NULL COMMENT '灵感 ID',
    MODIFY COLUMN seq INT NOT NULL COMMENT '消息序号',
    MODIFY COLUMN role VARCHAR(20) NOT NULL COMMENT '角色：user/assistant',
    MODIFY COLUMN content TEXT NOT NULL COMMENT '消息内容',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间';

-- 3.7 story_seeds
ALTER TABLE story_seeds
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '故事标题',
    MODIFY COLUMN slug VARCHAR(220) NOT NULL COMMENT 'URL 友好标识',
    MODIFY COLUMN opening_markdown LONGTEXT NOT NULL COMMENT '开头正文（Markdown）',
    MODIFY COLUMN style_params VARCHAR(2000) NULL COMMENT 'AI 风格参数',
    MODIFY COLUMN license_type VARCHAR(32) NULL COMMENT '许可类型',
    MODIFY COLUMN published BIT(1) NOT NULL COMMENT '是否已发布',
    MODIFY COLUMN author_id BIGINT NOT NULL COMMENT '作者用户 ID',
    MODIFY COLUMN story_summary VARCHAR(2000) NULL COMMENT '小说概述/简介',
    MODIFY COLUMN intent_keywords JSON NULL COMMENT '意图分析关键字配置';

-- 3.8 story_branch_points
ALTER TABLE story_branch_points
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID（兼容旧数据）',
    MODIFY COLUMN story_id BIGINT NULL COMMENT '小说 ID，关联 stories.id',
    MODIFY COLUMN sort_order INT NOT NULL COMMENT '分支点顺序',
    MODIFY COLUMN anchor_text VARCHAR(500) NULL COMMENT '分支前剧情摘要';

-- 3.9 story_options
ALTER TABLE story_options
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN branch_point_id BIGINT NOT NULL COMMENT '分支点 ID',
    MODIFY COLUMN label VARCHAR(200) NOT NULL COMMENT '选项文案',
    MODIFY COLUMN sort_order INT NOT NULL COMMENT '选项顺序',
    MODIFY COLUMN influence_notes TEXT NULL COMMENT '影响描述（供 AI 用）';

-- 3.10 story_characters
ALTER TABLE story_characters
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID',
    MODIFY COLUMN story_id BIGINT NULL COMMENT '小说 ID',
    MODIFY COLUMN name VARCHAR(100) NOT NULL COMMENT '角色名',
    MODIFY COLUMN description TEXT NULL COMMENT '性格、背景等',
    MODIFY COLUMN sort_order INT NOT NULL COMMENT '展示顺序';

-- 3.11 story_terms
ALTER TABLE story_terms
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID',
    MODIFY COLUMN story_id BIGINT NULL COMMENT '小说 ID',
    MODIFY COLUMN term_type VARCHAR(32) NOT NULL COMMENT '如 place/item/skill',
    MODIFY COLUMN name VARCHAR(100) NOT NULL COMMENT '名称',
    MODIFY COLUMN definition TEXT NULL COMMENT '简短定义',
    MODIFY COLUMN sort_order INT NOT NULL COMMENT '展示顺序';

-- 3.12 story_readme
ALTER TABLE story_readme
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID',
    MODIFY COLUMN story_id BIGINT NULL COMMENT '小说 ID',
    MODIFY COLUMN content_markdown LONGTEXT NULL COMMENT '设定文档（Markdown）';

-- 3.13 stories
ALTER TABLE stories
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '小说标题',
    MODIFY COLUMN slug VARCHAR(220) NOT NULL COMMENT 'URL 友好标识',
    MODIFY COLUMN published BIT(1) NOT NULL COMMENT '是否已发布',
    MODIFY COLUMN is_open_source BIT(1) NULL COMMENT '是否开源可 Fork',
    MODIFY COLUMN open_source_license VARCHAR(50) NULL COMMENT '开源协议（如 MIT/CC-BY）',
    MODIFY COLUMN fork_count INT NULL COMMENT '被 Fork 次数',
    MODIFY COLUMN star_count INT NULL COMMENT 'Star 数',
    MODIFY COLUMN style_params VARCHAR(2000) NULL COMMENT 'AI 风格参数',
    MODIFY COLUMN license_type VARCHAR(32) NULL COMMENT '许可类型',
    MODIFY COLUMN story_summary VARCHAR(2000) NULL COMMENT '小说概述/简介',
    MODIFY COLUMN intent_keywords JSON NULL COMMENT '意图分析关键字配置',
    MODIFY COLUMN author_id BIGINT NOT NULL COMMENT '作者用户 ID',
    MODIFY COLUMN inspiration_id BIGINT NULL COMMENT '来源灵感 ID';

-- 3.14 story_tags
ALTER TABLE story_tags
    MODIFY COLUMN story_id BIGINT NOT NULL COMMENT '小说 ID',
    MODIFY COLUMN tag VARCHAR(255) NOT NULL COMMENT '标签名';

-- 3.15 story_chapters
ALTER TABLE story_chapters
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_id BIGINT NOT NULL COMMENT '小说 ID',
    MODIFY COLUMN author_id BIGINT NULL COMMENT '章节作者（原作者或贡献者）',
    MODIFY COLUMN parent_chapter_id BIGINT NULL COMMENT '父章节 ID，null 表示主线起点',
    MODIFY COLUMN sort_order INT NOT NULL COMMENT '章节在该故事线内序号',
    MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '章节标题',
    MODIFY COLUMN content_markdown LONGTEXT NULL COMMENT '章节正文（Markdown）',
    MODIFY COLUMN is_mainline BIT(1) NULL COMMENT '是否主创的主线',
    MODIFY COLUMN branch_name VARCHAR(200) NULL COMMENT '分支名称';

-- 3.16 story_stars
ALTER TABLE story_stars
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_id BIGINT NOT NULL COMMENT '小说 ID',
    MODIFY COLUMN user_id BIGINT NOT NULL COMMENT '用户 ID';

-- 3.17 reader_forks
ALTER TABLE reader_forks
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID（兼容旧互动）',
    MODIFY COLUMN story_id BIGINT NULL COMMENT '小说 ID（从某小说 Fork）',
    MODIFY COLUMN reader_id BIGINT NOT NULL COMMENT '读者用户 ID',
    MODIFY COLUMN title VARCHAR(200) NULL COMMENT '副本标题',
    MODIFY COLUMN from_chapter_sort_order INT NULL COMMENT '从第几章开始续写（作者章节序号）';

-- 3.18 story_commits
ALTER TABLE story_commits
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN fork_id BIGINT NOT NULL COMMENT '读者 fork ID',
    MODIFY COLUMN parent_commit_id BIGINT NULL COMMENT '上一章节 ID',
    MODIFY COLUMN branch_point_id BIGINT NULL COMMENT '分支点 ID',
    MODIFY COLUMN option_id BIGINT NULL COMMENT '选项 ID',
    MODIFY COLUMN content_markdown LONGTEXT NOT NULL COMMENT 'AI 生成本章正文',
    MODIFY COLUMN sort_order INT NOT NULL COMMENT '章节顺序';

-- 3.19 story_pull_requests
ALTER TABLE story_pull_requests
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NOT NULL COMMENT '故事种子 ID',
    MODIFY COLUMN fork_id BIGINT NOT NULL COMMENT '读者 fork ID',
    MODIFY COLUMN from_commit_id BIGINT NULL COMMENT '希望合并的起点章节 ID',
    MODIFY COLUMN title VARCHAR(200) NULL COMMENT 'PR 标题',
    MODIFY COLUMN description TEXT NULL COMMENT '说明',
    MODIFY COLUMN status VARCHAR(20) NOT NULL COMMENT 'open/merged/closed',
    MODIFY COLUMN reviewed_by_id BIGINT NULL COMMENT '处理人（作者）ID';

-- 3.20 story_wiki_pages
ALTER TABLE story_wiki_pages
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_id BIGINT NOT NULL COMMENT '所属小说 ID',
    MODIFY COLUMN slug VARCHAR(100) NOT NULL COMMENT '页面标识（如 worldview, characters）',
    MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '页面标题',
    MODIFY COLUMN content_markdown LONGTEXT NULL COMMENT '页面内容（Markdown）',
    MODIFY COLUMN category VARCHAR(50) NULL COMMENT '分类：worldview/character/timeline/other',
    MODIFY COLUMN sort_order INT NULL COMMENT '排序顺序';

-- 3.21 story_wiki_characters
ALTER TABLE story_wiki_characters
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_id BIGINT NOT NULL COMMENT '所属小说 ID',
    MODIFY COLUMN name VARCHAR(100) NOT NULL COMMENT '角色名称',
    MODIFY COLUMN alias VARCHAR(200) NULL COMMENT '角色别名/称号',
    MODIFY COLUMN avatar_url VARCHAR(500) NULL COMMENT '角色头像 URL',
    MODIFY COLUMN role_type VARCHAR(50) NULL COMMENT '角色类型：protagonist/supporting/antagonist/minor',
    MODIFY COLUMN age VARCHAR(50) NULL COMMENT '年龄',
    MODIFY COLUMN gender VARCHAR(20) NULL COMMENT '性别',
    MODIFY COLUMN appearance TEXT NULL COMMENT '外貌描述',
    MODIFY COLUMN personality TEXT NULL COMMENT '性格特点',
    MODIFY COLUMN background TEXT NULL COMMENT '背景故事',
    MODIFY COLUMN abilities TEXT NULL COMMENT '能力/技能',
    MODIFY COLUMN relationships TEXT NULL COMMENT '人物关系',
    MODIFY COLUMN content_markdown LONGTEXT NULL COMMENT '完整角色介绍（Markdown）',
    MODIFY COLUMN sort_order INT NULL COMMENT '排序顺序';

-- 3.22 story_wiki_timeline_events
ALTER TABLE story_wiki_timeline_events
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_id BIGINT NOT NULL COMMENT '所属小说 ID',
    MODIFY COLUMN event_time VARCHAR(100) NOT NULL COMMENT '事件发生时间（如：第一章、十年前）',
    MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '事件标题',
    MODIFY COLUMN description TEXT NULL COMMENT '事件描述',
    MODIFY COLUMN content_markdown LONGTEXT NULL COMMENT '详细内容（Markdown）',
    MODIFY COLUMN related_characters VARCHAR(500) NULL COMMENT '相关角色（逗号分隔）',
    MODIFY COLUMN sort_order INT NULL COMMENT '排序顺序';

-- 3.23 story_entity_index
ALTER TABLE story_entity_index
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN story_seed_id BIGINT NOT NULL COMMENT '故事种子 ID',
    MODIFY COLUMN entity_type VARCHAR(50) NOT NULL COMMENT '实体类型：character/location/item/organization/event',
    MODIFY COLUMN entity_name VARCHAR(100) NOT NULL COMMENT '实体名称',
    MODIFY COLUMN entity_alias JSON NULL COMMENT '别名列表',
    MODIFY COLUMN description TEXT NULL COMMENT '实体描述',
    MODIFY COLUMN first_appearance_commit_id BIGINT NULL COMMENT '首次出场章节 ID',
    MODIFY COLUMN last_appearance_commit_id BIGINT NULL COMMENT '最后出场章节 ID',
    MODIFY COLUMN appearance_count INT NULL COMMENT '出场次数',
    MODIFY COLUMN current_status VARCHAR(200) NULL COMMENT '当前状态',
    MODIFY COLUMN status_history JSON NULL COMMENT '状态变更历史',
    MODIFY COLUMN relationships JSON NULL COMMENT '关系网络';

-- 3.24 entity_appearances
ALTER TABLE entity_appearances
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN entity_id BIGINT NOT NULL COMMENT '实体 ID，关联 story_entity_index.id',
    MODIFY COLUMN commit_id BIGINT NOT NULL COMMENT '章节 ID',
    MODIFY COLUMN appearance_type VARCHAR(50) NULL COMMENT '出场类型：mention/dialogue/action/thought',
    MODIFY COLUMN context_snippet TEXT NULL COMMENT '出场上下文片段',
    MODIFY COLUMN context_start_position INT NULL COMMENT '上下文起始位置',
    MODIFY COLUMN emotional_state VARCHAR(100) NULL COMMENT '情绪状态',
    MODIFY COLUMN physical_state VARCHAR(100) NULL COMMENT '身体状态',
    MODIFY COLUMN location_at VARCHAR(100) NULL COMMENT '所在地点',
    MODIFY COLUMN significance_score INT NULL COMMENT '重要性 1–10',
    MODIFY COLUMN is_key_moment BIT(1) NULL COMMENT '是否关键情节';

-- 3.25 entity_relationships
ALTER TABLE entity_relationships
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN source_entity_id BIGINT NOT NULL COMMENT '源实体 ID',
    MODIFY COLUMN target_entity_id BIGINT NOT NULL COMMENT '目标实体 ID',
    MODIFY COLUMN relationship_type VARCHAR(50) NOT NULL COMMENT '关系类型',
    MODIFY COLUMN relationship_description VARCHAR(500) NULL COMMENT '关系描述',
    MODIFY COLUMN strength_score INT NULL COMMENT '关系强度',
    MODIFY COLUMN is_bidirectional BIT(1) NOT NULL COMMENT '是否双向',
    MODIFY COLUMN first_appearance_commit_id BIGINT NULL COMMENT '首次出现章节 ID',
    MODIFY COLUMN last_updated_commit_id BIGINT NULL COMMENT '最后更新章节 ID',
    MODIFY COLUMN is_active BIT(1) NOT NULL COMMENT '是否有效',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间';

-- 3.26 story_commit_summaries
ALTER TABLE story_commit_summaries
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN commit_id BIGINT NOT NULL COMMENT '章节 ID',
    MODIFY COLUMN ultra_short_summary VARCHAR(100) NOT NULL COMMENT '50 字以内超压缩摘要',
    MODIFY COLUMN short_summary VARCHAR(500) NOT NULL COMMENT '200 字以内短摘要',
    MODIFY COLUMN medium_summary TEXT NULL COMMENT '500 字以内中等摘要',
    MODIFY COLUMN key_events JSON NULL COMMENT '关键事件列表',
    MODIFY COLUMN characters_involved JSON NULL COMMENT '出场角色',
    MODIFY COLUMN locations_involved JSON NULL COMMENT '出场地点',
    MODIFY COLUMN items_involved JSON NULL COMMENT '出场物品',
    MODIFY COLUMN emotional_tone VARCHAR(50) NULL COMMENT '情感基调',
    MODIFY COLUMN chapter_function VARCHAR(200) NULL COMMENT '本章功能',
    MODIFY COLUMN token_estimate INT NULL COMMENT '原始章节预估 token 数',
    MODIFY COLUMN summary_token_estimate INT NULL COMMENT '摘要预估 token 数',
    MODIFY COLUMN prerequisite_chapters JSON NULL COMMENT '前置依赖章节 ID 列表';

-- 3.27 story_timeline
ALTER TABLE story_timeline
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN story_seed_id BIGINT NOT NULL COMMENT '故事种子 ID',
    MODIFY COLUMN timeline_name VARCHAR(100) NOT NULL COMMENT '时间线名称',
    MODIFY COLUMN timeline_description VARCHAR(500) NULL COMMENT '时间线描述',
    MODIFY COLUMN branch_point VARCHAR(200) NULL COMMENT '分支点描述',
    MODIFY COLUMN divergence_commit_id BIGINT NULL COMMENT '分歧点章节 ID',
    MODIFY COLUMN is_main_timeline BIT(1) NOT NULL COMMENT '是否主线时间线',
    MODIFY COLUMN is_active BIT(1) NOT NULL COMMENT '是否启用',
    MODIFY COLUMN probability DECIMAL(5,2) NULL COMMENT '概率',
    MODIFY COLUMN stability_score INT NULL COMMENT '稳定性评分',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间';

-- 3.28 commit_timeline_mapping
ALTER TABLE commit_timeline_mapping
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    MODIFY COLUMN timeline_id BIGINT NOT NULL COMMENT '时间线 ID',
    MODIFY COLUMN commit_id BIGINT NOT NULL COMMENT '章节 ID',
    MODIFY COLUMN timeline_order INT NOT NULL COMMENT '在时间线中的顺序',
    MODIFY COLUMN is_divergence_point BIT(1) NOT NULL COMMENT '是否分歧点',
    MODIFY COLUMN divergence_description VARCHAR(500) NULL COMMENT '分歧描述',
    MODIFY COLUMN probability_at_this_point DECIMAL(5,2) NULL COMMENT '该点概率',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间';

-- 3.29 user_persona_profile
ALTER TABLE user_persona_profile
    MODIFY COLUMN user_id BIGINT NOT NULL COMMENT '用户 ID，与 users.id 一对一',
    MODIFY COLUMN distilled_content LONGTEXT NULL COMMENT '提炼后的分身内容',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间';
