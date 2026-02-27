-- ============================================
-- 修复 fork_count 和 star_count 字段允许 NULL
-- ============================================

-- 将 fork_count 和 star_count 字段改为允许 NULL
ALTER TABLE stories 
MODIFY COLUMN fork_count INT DEFAULT 0 COMMENT '被Fork次数',
MODIFY COLUMN star_count INT DEFAULT 0 COMMENT 'Star数';

-- 更新现有 NULL 值为 0
UPDATE stories SET fork_count = 0 WHERE fork_count IS NULL;
UPDATE stories SET star_count = 0 WHERE star_count IS NULL;
