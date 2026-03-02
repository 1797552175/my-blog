-- 用户表增加手机号字段（可空、唯一），用于短信登录/注册/绑定
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL UNIQUE COMMENT '手机号';
