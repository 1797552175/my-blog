-- 为 StorySeed 添加小说概述和意图关键字配置字段

-- 添加 story_summary 字段（小说概述/简介）
ALTER TABLE story_seeds
ADD COLUMN IF NOT EXISTS story_summary TEXT COMMENT '小说概述/简介，用于AI理解整体方向';

-- 添加 intent_keywords 字段（意图关键字配置，JSON格式）
ALTER TABLE story_seeds
ADD COLUMN IF NOT EXISTS intent_keywords JSON COMMENT '意图分析关键字配置，示例：{"simple": ["继续"], "complex": ["法宝"]}';

-- 创建索引（如果数据库支持JSON索引）
-- 注意：MariaDB 10.6+ 支持 JSON 类型，但索引支持有限
-- 如果需要频繁查询，建议创建虚拟列再索引

-- 添加注释说明
ALTER TABLE story_seeds
MODIFY COLUMN story_summary TEXT COMMENT '小说概述/简介，让AI了解故事整体方向和核心设定';

ALTER TABLE story_seeds
MODIFY COLUMN intent_keywords JSON COMMENT '自定义意图分析关键字，格式：{"simple": ["关键字1"], "complex": ["关键字2"]}，用于覆盖系统默认配置';
