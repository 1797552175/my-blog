-- 分支小说表（PR Novel）：用户拉取的PR分支小说
CREATE TABLE IF NOT EXISTS story_pr_novels (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    story_id BIGINT NOT NULL COMMENT '原小说ID',
    fork_id BIGINT NOT NULL COMMENT '关联的阅读副本ID',
    creator_id BIGINT NOT NULL COMMENT '创建者用户ID',
    title VARCHAR(200) NOT NULL COMMENT '分支小说标题',
    description TEXT COMMENT '分支小说描述',
    from_chapter_sort_order INT NOT NULL COMMENT '从原小说第几章开始分支',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态：draft(草稿)/submitted(已提交)/approved(已通过)/rejected(已拒绝)',
    submitted_at TIMESTAMP NULL COMMENT '提交时间',
    reviewed_by_id BIGINT NULL COMMENT '审核人ID',
    reviewed_at TIMESTAMP NULL COMMENT '审核时间',
    review_comment TEXT COMMENT '审核意见',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_story_pr_novels_story_id (story_id),
    INDEX idx_story_pr_novels_creator_id (creator_id),
    INDEX idx_story_pr_novels_status (status),
    INDEX idx_story_pr_novels_fork_id (fork_id),
    CONSTRAINT fk_story_pr_novels_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    CONSTRAINT fk_story_pr_novels_fork FOREIGN KEY (fork_id) REFERENCES reader_forks(id) ON DELETE CASCADE,
    CONSTRAINT fk_story_pr_novels_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_story_pr_novels_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分支小说表';

-- 分支小说章节表
CREATE TABLE IF NOT EXISTS story_pr_chapters (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    pr_novel_id BIGINT NOT NULL COMMENT '所属分支小说ID',
    sort_order INT NOT NULL COMMENT '章节序号（从1开始）',
    title VARCHAR(200) NOT NULL COMMENT '章节标题',
    content_markdown LONGTEXT COMMENT '章节内容（Markdown）',
    summary TEXT COMMENT '章节摘要',
    word_count INT DEFAULT 0 COMMENT '字数统计',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pr_chapters_novel_sort (pr_novel_id, sort_order),
    INDEX idx_pr_chapters_novel_id (pr_novel_id),
    CONSTRAINT fk_pr_chapters_novel FOREIGN KEY (pr_novel_id) REFERENCES story_pr_novels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分支小说章节表';

-- PR提交记录表（用户提交给作者的审核记录）
CREATE TABLE IF NOT EXISTS story_pr_submissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    pr_novel_id BIGINT NOT NULL COMMENT '分支小说ID',
    story_id BIGINT NOT NULL COMMENT '目标原小说ID',
    submitter_id BIGINT NOT NULL COMMENT '提交者ID',
    title VARCHAR(200) COMMENT '提交标题',
    description TEXT COMMENT '提交描述/说明',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending(待审核)/approved(已通过)/rejected(已拒绝)',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    reviewed_by_id BIGINT NULL COMMENT '审核人ID（作者）',
    reviewed_at TIMESTAMP NULL COMMENT '审核时间',
    review_comment TEXT COMMENT '审核意见',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pr_submissions_story_id (story_id),
    INDEX idx_pr_submissions_submitter_id (submitter_id),
    INDEX idx_pr_submissions_status (status),
    INDEX idx_pr_submissions_novel_id (pr_novel_id),
    CONSTRAINT fk_pr_submissions_novel FOREIGN KEY (pr_novel_id) REFERENCES story_pr_novels(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_submissions_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_submissions_submitter FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_submissions_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PR提交记录表';
