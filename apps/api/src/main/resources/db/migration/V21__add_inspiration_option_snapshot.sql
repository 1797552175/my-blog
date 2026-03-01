-- 灵感表增加「小说方案快照」：一个选项 = 一条灵感时，存结构化预填数据（书名、简介、风格等）
ALTER TABLE inspirations
    ADD COLUMN option_snapshot JSON NULL COMMENT '小说方案快照（书名、简介、风格等），用于快速创作预填';
