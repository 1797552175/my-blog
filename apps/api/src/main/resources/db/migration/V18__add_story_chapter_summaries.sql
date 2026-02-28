-- 作者章节预压缩表：发布章节时 AI 压缩正文后存入，用于前文概要与生成选项
CREATE TABLE IF NOT EXISTS story_chapter_summaries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    chapter_id BIGINT NOT NULL,
    compressed_content TEXT NOT NULL COMMENT 'AI 压缩后的内容；失败降级时为原文',
    is_fallback BIT(1) NOT NULL DEFAULT 0 COMMENT '是否降级：1=存的是原文',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_chapter_summaries_chapter_id (chapter_id),
    CONSTRAINT fk_chapter_summaries_chapter FOREIGN KEY (chapter_id) REFERENCES story_chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作者章节预压缩表';
