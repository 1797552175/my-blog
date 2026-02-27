-- 合并 posts 和 story_seeds 表到 stories 表
-- 热门小说功能合并到故事库，统一称为"小说种子"
-- 不区分类型，所有小说都是AI创作的，有contentMarkdown的是已完成小说，只有openingMarkdown的是待续写小说

-- ============================================
-- 1. 创建新的统一表 stories
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说种子表（合并原posts和story_seeds）';

-- ============================================
-- 2. 迁移 posts 表数据到 stories（已完成的小说）
-- ============================================
INSERT INTO stories (
    id, title, slug, content_markdown, opening_markdown, 
    published, style_params, license_type, story_summary, intent_keywords,
    author_id, inspiration_id, created_at, updated_at
)
SELECT 
    p.id,
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
FROM posts p;

-- ============================================
-- 3. 迁移 story_seeds 表数据到 stories（待续写的互动小说）
-- ============================================
INSERT INTO stories (
    title, slug, content_markdown, opening_markdown, 
    published, style_params, license_type, story_summary, intent_keywords,
    author_id, inspiration_id, created_at, updated_at
)
SELECT 
    s.title,
    CONCAT(s.slug, '-seed') as slug,  -- 避免slug冲突
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
FROM story_seeds s;

-- ============================================
-- 4. 迁移 post_tags 到 story_tags
-- ============================================
CREATE TABLE IF NOT EXISTS story_tags (
    story_id BIGINT NOT NULL,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (story_id, tag),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    INDEX idx_story_tags_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说标签';

-- 迁移原 post_tags 数据
INSERT INTO story_tags (story_id, tag)
SELECT pt.post_id, pt.tag
FROM post_tags pt
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = pt.post_id);

-- ============================================
-- 5. 更新关联表的外键引用
-- ============================================

-- 5.1 更新 story_branch_points 表
ALTER TABLE story_branch_points 
ADD COLUMN story_id BIGINT NULL COMMENT '关联的小说ID',
ADD FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

-- 将原 story_seed_id 映射到 story_id
UPDATE story_branch_points sbp
SET story_id = sbp.story_seed_id
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = sbp.story_seed_id AND s.opening_markdown IS NOT NULL);

-- 5.2 更新 story_characters 表
ALTER TABLE story_characters 
ADD COLUMN story_id BIGINT NULL COMMENT '关联的小说ID',
ADD FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

UPDATE story_characters sc
SET story_id = sc.story_seed_id
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = sc.story_seed_id AND s.opening_markdown IS NOT NULL);

-- 5.3 更新 story_terms 表
ALTER TABLE story_terms 
ADD COLUMN story_id BIGINT NULL COMMENT '关联的小说ID',
ADD FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

UPDATE story_terms st
SET story_id = st.story_seed_id
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = st.story_seed_id AND s.opening_markdown IS NOT NULL);

-- 5.4 更新 story_readmes 表
ALTER TABLE story_readmes 
ADD COLUMN story_id BIGINT NULL COMMENT '关联的小说ID',
ADD FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

UPDATE story_readmes sr
SET story_id = sr.story_seed_id
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = sr.story_seed_id AND s.opening_markdown IS NOT NULL);

-- 5.5 更新 reader_forks 表
ALTER TABLE reader_forks 
ADD COLUMN story_id BIGINT NULL COMMENT '关联的小说ID',
ADD FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

UPDATE reader_forks rf
SET story_id = rf.story_seed_id
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = rf.story_seed_id AND s.opening_markdown IS NOT NULL);

-- 5.6 更新 story_entity_index 表
ALTER TABLE story_entity_index 
ADD COLUMN story_id BIGINT NULL COMMENT '关联的小说ID',
ADD FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

UPDATE story_entity_index sei
SET story_id = sei.story_seed_id
WHERE EXISTS (SELECT 1 FROM stories s WHERE s.id = sei.story_seed_id AND s.opening_markdown IS NOT NULL);

-- ============================================
-- 6. 清理旧表（可选，建议先保留一段时间确认无误后再删除）
-- ============================================
-- 注意：暂时注释掉删除操作，确认数据迁移无误后再执行
-- DROP TABLE IF EXISTS post_tags;
-- DROP TABLE IF EXISTS posts;
-- DROP TABLE IF EXISTS story_seeds;

-- 添加注释说明
ALTER TABLE story_branch_points 
MODIFY COLUMN story_seed_id BIGINT COMMENT '原story_seed_id，已迁移到story_id';

ALTER TABLE story_characters 
MODIFY COLUMN story_seed_id BIGINT COMMENT '原story_seed_id，已迁移到story_id';

ALTER TABLE story_terms 
MODIFY COLUMN story_seed_id BIGINT COMMENT '原story_seed_id，已迁移到story_id';

ALTER TABLE story_readmes 
MODIFY COLUMN story_seed_id BIGINT COMMENT '原story_seed_id，已迁移到story_id';

ALTER TABLE reader_forks 
MODIFY COLUMN story_seed_id BIGINT COMMENT '原story_seed_id，已迁移到story_id';

ALTER TABLE story_entity_index 
MODIFY COLUMN story_seed_id BIGINT COMMENT '原story_seed_id，已迁移到story_id';
