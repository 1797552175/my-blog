-- 添加章节作者字段
ALTER TABLE story_chapters
ADD COLUMN IF NOT EXISTS author_id BIGINT COMMENT '章节作者ID（可能是原作者或Fork后的贡献者）',
ADD CONSTRAINT fk_story_chapters_author
    FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_story_chapters_author_id ON story_chapters(author_id);
