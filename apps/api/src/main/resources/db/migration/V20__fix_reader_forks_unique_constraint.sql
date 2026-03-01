-- 修复 reader_forks 表的唯一约束
-- 问题：数据库约束是 (story_seed_id, reader_id)，但代码定义是 (story_id, reader_id)
-- 解决：删除旧约束，创建新约束

-- 1. 先更新现有数据，将 story_id 为 NULL 的记录关联到对应的 story
-- 通过 story_seeds 表找到 story_id
UPDATE reader_forks rf
JOIN story_seeds ss ON rf.story_seed_id = ss.id
JOIN stories s ON s.seed_id = ss.id
SET rf.story_id = s.id
WHERE rf.story_id IS NULL;

-- 2. 删除旧的唯一约束
ALTER TABLE reader_forks DROP INDEX idx_reader_forks_story_reader;

-- 3. 创建新的唯一约束（在 story_id 和 reader_id 上）
-- 注意：MySQL 中 NULL != NULL，所以 NULL 值不会触发唯一约束冲突
-- 但我们已经更新了所有 story_id 为 NULL 的记录，所以这应该没问题
ALTER TABLE reader_forks ADD UNIQUE INDEX idx_reader_forks_story_reader (story_id, reader_id);

-- 4. 修改 story_seed_id 为可空（因为有些 fork 可能只关联 story）
ALTER TABLE reader_forks MODIFY COLUMN story_seed_id BIGINT NULL;
