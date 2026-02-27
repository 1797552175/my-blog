-- 添加章节父子关系，支持树形分支结构
ALTER TABLE story_chapters
ADD COLUMN IF NOT EXISTS parent_chapter_id BIGINT COMMENT '父章节ID（null表示主线起点）',
ADD COLUMN IF NOT EXISTS is_mainline BOOLEAN DEFAULT FALSE COMMENT '是否主创的主线',
ADD COLUMN IF NOT EXISTS branch_name VARCHAR(200) COMMENT '分支名称（如：张三的暗黑结局）',
ADD CONSTRAINT fk_chapter_parent
    FOREIGN KEY (parent_chapter_id) REFERENCES story_chapters(id)
    ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_story_chapters_parent_id ON story_chapters(parent_chapter_id);
CREATE INDEX IF NOT EXISTS idx_story_chapters_mainline ON story_chapters(story_id, is_mainline);

-- 将现有章节设置为主创的主线（假设已有章节都是主创的）
-- UPDATE story_chapters SET is_mainline = TRUE WHERE parent_chapter_id IS NULL;
