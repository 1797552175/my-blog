-- 小说 Wiki 系统（世界观百科、角色档案、时间线等）
CREATE TABLE IF NOT EXISTS story_wiki_pages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    story_id BIGINT NOT NULL COMMENT '所属小说ID',
    slug VARCHAR(100) NOT NULL COMMENT '页面标识（如：worldview, characters, timeline）',
    title VARCHAR(200) NOT NULL COMMENT '页面标题',
    content_markdown LONGTEXT COMMENT '页面内容（Markdown格式）',
    category VARCHAR(50) COMMENT '分类：worldview(世界观), character(角色), timeline(时间线), other(其他)',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_story_wiki_story_slug (story_id, slug),
    INDEX idx_story_wiki_story_id (story_id),
    INDEX idx_story_wiki_category (story_id, category),
    CONSTRAINT fk_story_wiki_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说Wiki页面';

-- 角色档案表（专门存储角色信息）
CREATE TABLE IF NOT EXISTS story_wiki_characters (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    story_id BIGINT NOT NULL COMMENT '所属小说ID',
    name VARCHAR(100) NOT NULL COMMENT '角色名称',
    alias VARCHAR(200) COMMENT '角色别名/称号',
    avatar_url VARCHAR(500) COMMENT '角色头像URL',
    role_type VARCHAR(50) COMMENT '角色类型：protagonist(主角), supporting(配角), antagonist(反派), minor(龙套)',
    age VARCHAR(50) COMMENT '年龄',
    gender VARCHAR(20) COMMENT '性别',
    appearance TEXT COMMENT '外貌描述',
    personality TEXT COMMENT '性格特点',
    background TEXT COMMENT '背景故事',
    abilities TEXT COMMENT '能力/技能',
    relationships TEXT COMMENT '人物关系',
    content_markdown LONGTEXT COMMENT '完整角色介绍（Markdown）',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_story_wiki_char_story_name (story_id, name),
    INDEX idx_story_wiki_char_story_id (story_id),
    INDEX idx_story_wiki_char_role_type (story_id, role_type),
    CONSTRAINT fk_story_wiki_char_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说角色档案';

-- 时间线事件表
CREATE TABLE IF NOT EXISTS story_wiki_timeline_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    story_id BIGINT NOT NULL COMMENT '所属小说ID',
    event_time VARCHAR(100) NOT NULL COMMENT '事件发生时间（可以是具体日期或描述，如：第一章、十年前）',
    title VARCHAR(200) NOT NULL COMMENT '事件标题',
    description TEXT COMMENT '事件描述',
    content_markdown LONGTEXT COMMENT '详细内容（Markdown）',
    related_characters VARCHAR(500) COMMENT '相关角色（逗号分隔的角色名）',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_story_wiki_timeline_story_id (story_id),
    INDEX idx_story_wiki_timeline_sort (story_id, sort_order),
    CONSTRAINT fk_story_wiki_timeline_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说时间线事件';
