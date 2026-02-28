-- 添加章节发布功能
-- 给 story_chapters 表添加 published 字段

ALTER TABLE story_chapters
ADD COLUMN published BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已发布';

-- 为现有章节添加索引
CREATE INDEX idx_story_chapters_published ON story_chapters(story_id, published);

-- 更新注释
ALTER TABLE story_chapters
MODIFY COLUMN published BOOLEAN NOT NULL DEFAULT FALSE COMMENT '章节是否已发布，false=草稿（仅作者可见），true=已发布（读者可见）';
