-- 修复 stories 表的数据完整性问题
-- 1. 修复 version 字段的 NULL 值
-- 2. 修复 intent_keywords 字段的空字符串问题

-- 1. 修复 version 字段的 NULL 值
UPDATE stories SET version = 0 WHERE version IS NULL;

-- 2. 修复 intent_keywords 字段的空字符串问题
-- 将空字符串转换为 NULL
UPDATE stories SET intent_keywords = NULL WHERE intent_keywords = '';

-- 3. 添加注释说明
ALTER TABLE stories
MODIFY COLUMN version BIGINT NULL COMMENT '乐观锁版本号';

ALTER TABLE stories
MODIFY COLUMN intent_keywords LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (json_valid(`intent_keywords`)) COMMENT '意图分析关键字配置，JSON格式';
