-- 修复 story_characters 表的约束问题
-- 问题：story_seed_id 字段有 NOT NULL 约束，但代码创建角色时只设置 story 字段
-- 解决：将 story_seed_id 改为 NULL，允许只使用 story_id

ALTER TABLE story_characters 
MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID（兼容旧数据）';

ALTER TABLE story_terms 
MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID（兼容旧数据）';

ALTER TABLE story_readmes 
MODIFY COLUMN story_seed_id BIGINT NULL COMMENT '故事种子 ID（兼容旧数据）';
