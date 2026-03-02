package com.example.api.sms;

/**
 * 短信验证码场景，与阿里云模板、Redis key 前缀对应。
 */
public enum SmsScene {
    /** 登录/注册（模板 100001） */
    LOGIN_REGISTER,
    /** 重置密码（模板 100003） */
    RESET_PASSWORD,
    /** 绑定新手机号（模板 100004） */
    BIND_PHONE,
    /** 验证绑定手机号（模板 100005） */
    VERIFY_PHONE,
    /** 修改绑定手机号（模板 100002） */
    CHANGE_PHONE
}
