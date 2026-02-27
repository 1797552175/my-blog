-- ============================================
-- 开源小说系统重构 - 数据模型清理
-- ============================================

-- 1. 添加开源相关字段到 stories 表
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS is_open_source BOOLEAN DEFAULT FALSE COMMENT '是否开源小说',
ADD COLUMN IF NOT EXISTS open_source_license VARCHAR(50) COMMENT '开源协议 (MIT/GPL/CC-BY等)',
ADD COLUMN IF NOT EXISTS fork_count INT DEFAULT 0 COMMENT '被Fork次数',
ADD COLUMN IF NOT EXISTS star_count INT DEFAULT 0 COMMENT 'Star数';

-- 2. 创建用户Star表
CREATE TABLE IF NOT EXISTS story_stars (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_story_user (story_id, user_id),
    INDEX idx_story_stars_story_id (story_id),
    INDEX idx_story_stars_user_id (user_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说Star表';

-- 3. 创建贡献者表
CREATE TABLE IF NOT EXISTS story_contributors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    contribution_count INT DEFAULT 0 COMMENT '贡献次数',
    lines_added INT DEFAULT 0 COMMENT '新增行数',
    lines_deleted INT DEFAULT 0 COMMENT '删除行数',
    first_contribution_at TIMESTAMP,
    last_contribution_at TIMESTAMP,
    UNIQUE KEY uk_story_contributor (story_id, user_id),
    INDEX idx_story_contributors_story_id (story_id),
    INDEX idx_story_contributors_user_id (user_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说贡献者表';

-- 4. 将 story_seeds 的 openingMarkdown 迁移为 story_chapters 的第一章
-- 注意：只迁移那些还没有章节的故事
INSERT INTO story_chapters (story_id, sort_order, title, content_markdown, created_at, updated_at)
SELECT 
    s.id,
    1,
    '开头',
    s.opening_markdown,
    s.created_at,
    s.updated_at
FROM stories s
WHERE s.opening_markdown IS NOT NULL 
  AND s.opening_markdown != ''
  AND NOT EXISTS (
      SELECT 1 FROM story_chapters sc WHERE sc.story_id = s.id
  );

-- 5. 将 content_markdown 迁移为 story_chapters（如果不存在章节）
INSERT INTO story_chapters (story_id, sort_order, title, content_markdown, created_at, updated_at)
SELECT 
    s.id,
    1,
    '正文',
    s.content_markdown,
    s.created_at,
    s.updated_at
FROM stories s
WHERE s.content_markdown IS NOT NULL 
  AND s.content_markdown != ''
  AND NOT EXISTS (
      SELECT 1 FROM story_chapters sc WHERE sc.story_id = s.id
  );

-- 6. 修改 reader_forks 表，添加对 story 的直接关联（如果还没有）
-- 注意：保留 story_seed_id 用于兼容，但主要使用 story_id
ALTER TABLE reader_forks 
ADD COLUMN IF NOT EXISTS fork_type VARCHAR(20) DEFAULT 'story' COMMENT 'Fork类型: story/seed';

-- 7. 更新现有 Fork 的 fork_type
UPDATE reader_forks SET fork_type = 'seed' WHERE story_seed_id IS NOT NULL;
UPDATE reader_forks SET fork_type = 'story' WHERE story_id IS NOT NULL;

-- 8. 标记废弃字段（可选，先保留数据用于回滚）
-- ALTER TABLE stories DROP COLUMN content_markdown;
-- ALTER TABLE stories DROP COLUMN opening_markdown;

-- 9. 添加索引优化
CREATE INDEX IF NOT EXISTS idx_stories_open_source ON stories(is_open_source);
CREATE INDEX IF NOT EXISTS idx_stories_license ON stories(open_source_license);
