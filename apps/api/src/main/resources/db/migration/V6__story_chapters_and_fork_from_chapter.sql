-- 小说章节表（作者按章节写作）
CREATE TABLE IF NOT EXISTS story_chapters (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content_markdown LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_story_chapters_story_id (story_id),
    INDEX idx_story_chapters_story_sort (story_id, sort_order),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说章节';

-- 阅读副本：从第几章开始续写（若列已存在可注释本行）
ALTER TABLE reader_forks ADD COLUMN from_chapter_sort_order INT NULL COMMENT '从第几章开始续写（作者章节序号）';
