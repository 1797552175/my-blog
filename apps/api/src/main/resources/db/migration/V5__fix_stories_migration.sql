-- 修复 stories 表迁移问题
-- 如果 V4 迁移失败，此脚本确保 stories 表正确创建并迁移数据

-- ============================================
-- 1. 确保 stories 表存在
-- ============================================
CREATE TABLE IF NOT EXISTS stories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- 基础字段
    title VARCHAR(200) NOT NULL COMMENT '小说标题',
    slug VARCHAR(220) NOT NULL UNIQUE COMMENT 'URL标识',

    -- 内容字段
    content_markdown LONGTEXT COMMENT '完整内容（已完成的小说）',
    opening_markdown LONGTEXT COMMENT '开头内容（待续写的互动小说）',

    -- 状态
    published BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否发布',

    -- AI创作相关字段
    style_params VARCHAR(2000) COMMENT 'AI风格参数',
    license_type VARCHAR(32) COMMENT '许可证类型',
    story_summary TEXT COMMENT '小说概述/简介',
    intent_keywords JSON COMMENT '意图分析关键字配置',

    -- 关联字段
    author_id BIGINT NOT NULL COMMENT '作者ID',
    inspiration_id BIGINT COMMENT '关联的灵感ID',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_stories_slug (slug),
    INDEX idx_stories_author_id (author_id),
    INDEX idx_stories_published (published),
    INDEX idx_stories_author_published (author_id, published),

    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (inspiration_id) REFERENCES inspirations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说种子表';

-- ============================================
-- 2. 确保 story_tags 表存在
-- ============================================
CREATE TABLE IF NOT EXISTS story_tags (
    story_id BIGINT NOT NULL,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (story_id, tag),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    INDEX idx_story_tags_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说标签';

-- ============================================
-- 3. 从 posts 表迁移数据（不指定id，让自增生成）
-- ============================================
INSERT IGNORE INTO stories (
    title, slug, content_markdown, opening_markdown,
    published, style_params, license_type, story_summary, intent_keywords,
    author_id, inspiration_id, created_at, updated_at
)
SELECT
    p.title,
    p.slug,
    p.content_markdown,
    NULL as opening_markdown,
    p.published,
    NULL as style_params,
    NULL as license_type,
    NULL as story_summary,
    NULL as intent_keywords,
    p.author_id,
    p.inspiration_id,
    p.created_at,
    p.updated_at
FROM posts p
WHERE NOT EXISTS (SELECT 1 FROM stories s WHERE s.slug = p.slug);

-- ============================================
-- 4. 从 story_seeds 表迁移数据
-- ============================================
INSERT IGNORE INTO stories (
    title, slug, content_markdown, opening_markdown,
    published, style_params, license_type, story_summary, intent_keywords,
    author_id, inspiration_id, created_at, updated_at
)
SELECT
    s.title,
    CONCAT(s.slug, '-seed') as slug,
    NULL as content_markdown,
    s.opening_markdown,
    s.published,
    s.style_params,
    s.license_type,
    s.story_summary,
    s.intent_keywords,
    s.author_id,
    NULL as inspiration_id,
    s.created_at,
    s.updated_at
FROM story_seeds s
WHERE NOT EXISTS (SELECT 1 FROM stories s2 WHERE s2.slug = CONCAT(s.slug, '-seed'));

-- ============================================
-- 5. 迁移标签数据（从 post_tags）
-- ============================================
INSERT IGNORE INTO story_tags (story_id, tag)
SELECT s.id, pt.tag
FROM post_tags pt
JOIN posts p ON pt.post_id = p.id
JOIN stories s ON s.slug = p.slug;
