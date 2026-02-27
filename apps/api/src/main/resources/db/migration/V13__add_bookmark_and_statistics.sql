-- ============================================
-- 添加书签功能，优化阅读回退体验
-- ============================================

-- 创建书签表
CREATE TABLE IF NOT EXISTS reader_fork_bookmarks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
    fork_id BIGINT NOT NULL COMMENT '读者 fork ID',
    reader_id BIGINT NOT NULL COMMENT '读者用户 ID',
    commit_id BIGINT NULL COMMENT '章节 ID（可为空，表示书签在作者章节）',
    chapter_sort_order INT NULL COMMENT '章节序号（用于作者章节）',
    bookmark_name VARCHAR(200) NULL COMMENT '书签名称',
    notes TEXT NULL COMMENT '书签备注',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '书签顺序',
    UNIQUE KEY uk_fork_reader_sort (fork_id, reader_id, sort_order),
    INDEX idx_fork_id (fork_id),
    INDEX idx_reader_id (reader_id),
    CONSTRAINT fk_bookmark_fork FOREIGN KEY (fork_id) REFERENCES reader_forks(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_reader FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='读者书签表';

-- 添加书签表字段注释
ALTER TABLE reader_fork_bookmarks
    MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '书签主键',
    MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL COMMENT '创建时间',
    MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL COMMENT '更新时间',
    MODIFY COLUMN fork_id BIGINT NOT NULL COMMENT '读者 fork ID',
    MODIFY COLUMN reader_id BIGINT NOT NULL COMMENT '读者用户 ID',
    MODIFY COLUMN commit_id BIGINT NULL COMMENT '章节 ID（可为空，表示书签在作者章节）',
    MODIFY COLUMN chapter_sort_order INT NULL COMMENT '章节序号（用于作者章节）',
    MODIFY COLUMN bookmark_name VARCHAR(200) NULL COMMENT '书签名称',
    MODIFY COLUMN notes TEXT NULL COMMENT '书签备注',
    MODIFY COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '书签顺序';

-- 为 story_options 添加选择率统计字段
ALTER TABLE story_options ADD COLUMN IF NOT EXISTS selection_count INT NOT NULL DEFAULT 0 COMMENT '该选项被选择的次数';
ALTER TABLE story_options ADD COLUMN IF NOT EXISTS plot_hint TEXT NULL COMMENT '剧情提示（供用户查看）';
ALTER TABLE story_options ADD INDEX idx_selection_count (selection_count);

-- 为 story_commits 添加回退统计字段
ALTER TABLE story_commits ADD COLUMN IF NOT EXISTS rollback_count INT NOT NULL DEFAULT 0 COMMENT '该章节被回退到的次数';
ALTER TABLE story_commits ADD INDEX idx_rollback_count (rollback_count);
