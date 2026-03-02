package com.example.api.sms;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.aliyuncs.DefaultAcsClient;
import com.aliyuncs.dypnsapi.model.v20170525.SendSmsVerifyCodeRequest;
import com.aliyuncs.dypnsapi.model.v20170525.SendSmsVerifyCodeResponse;
import com.aliyuncs.exceptions.ClientException;
import com.aliyuncs.profile.DefaultProfile;
import com.example.api.common.ApiException;

import org.springframework.http.HttpStatus;

@Service
public class SmsService {

    private static final String REDIS_KEY_PREFIX = "sms:code:";
    private static final String REDIS_LIMIT_PREFIX = "sms:limit:";
    private static final int CODE_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SmsProperties props;
    private final StringRedisTemplate redis;

    public SmsService(SmsProperties props, StringRedisTemplate redis) {
        this.props = props;
        this.redis = redis;
    }

    /**
     * 发送验证码：限流 → 生成并存 Redis → 调阿里云。
     * 手机号需为 11 位数字（中国大陆）。
     */
    public void sendCode(String phone, SmsScene scene) {
        String normalized = normalizePhone(phone);
        String limitKey = REDIS_LIMIT_PREFIX + normalized;
        Boolean limitExists = redis.hasKey(limitKey);
        if (Boolean.TRUE.equals(limitExists)) {
            Long ttl = redis.getExpire(limitKey, TimeUnit.SECONDS);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "发送过于频繁，请" + (ttl != null ? ttl + "秒" : "稍候") + "后再试");
        }
        if (!props.isEnabled() || props.getAccessKeyId().isBlank() || props.getAccessKeySecret().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "短信服务未配置或已关闭");
        }
        if (props.getSignName() == null || props.getSignName().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "短信签名未配置");
        }

        String code = generateCode();
        String redisKey = REDIS_KEY_PREFIX + scene.name().toLowerCase() + ":" + normalized;
        redis.opsForValue().set(redisKey, code, props.getCodeTtlSeconds(), TimeUnit.SECONDS);
        redis.opsForValue().set(limitKey, "1", props.getSendIntervalSeconds(), TimeUnit.SECONDS);

        String templateCode = getTemplateCode(scene);
        int min = (props.getCodeTtlSeconds() + 59) / 60;
        String templateParam = "{\"code\":\"" + code + "\",\"min\":\"" + min + "\"}";

        try {
            DefaultAcsClient client = createClient();
            SendSmsVerifyCodeRequest req = new SendSmsVerifyCodeRequest();
            req.setPhoneNumber(normalized);
            req.setSignName(props.getSignName());
            req.setTemplateCode(templateCode);
            req.setTemplateParam(templateParam);
            req.setValidTime((long) props.getCodeTtlSeconds());
            req.setCodeLength((long) CODE_LENGTH);
            req.setInterval((long) props.getSendIntervalSeconds());
            req.setReturnVerifyCode(false);

            SendSmsVerifyCodeResponse resp = client.getAcsResponse(req);
            if (resp == null || !"OK".equalsIgnoreCase(resp.getCode())) {
                String msg = resp != null ? (resp.getMessage() != null ? resp.getMessage() : resp.getCode()) : "发送失败";
                throw new ApiException(HttpStatus.BAD_GATEWAY, "短信发送失败：" + msg);
            }
        } catch (ClientException e) {
            String msg = e.getErrMsg() != null ? e.getErrMsg() : e.getErrCode();
            if ("FREQUENCY_FAIL".equals(e.getErrCode()) || "BUSINESS_LIMIT_CONTROL".equals(e.getErrCode())) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "发送过于频繁，请稍后再试");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY, "短信发送失败：" + msg);
        }
    }

    /**
     * 校验验证码（校验成功后删除 Redis，一次性使用）。
     */
    public boolean verifyCode(String phone, SmsScene scene, String code) {
        if (code == null || code.isBlank()) return false;
        String normalized = normalizePhone(phone);
        String redisKey = REDIS_KEY_PREFIX + scene.name().toLowerCase() + ":" + normalized;
        String stored = redis.opsForValue().get(redisKey);
        if (stored == null) return false;
        boolean ok = stored.trim().equals(code.trim());
        if (ok) redis.delete(redisKey);
        return ok;
    }

    public static String normalizePhone(String phone) {
        if (phone == null) return "";
        String s = phone.replaceAll("\\s", "");
        if (s.length() == 11 && s.matches("1[3-9]\\d{9}")) return s;
        if (s.startsWith("86") && s.length() == 13 && s.matches("86[1-9]\\d{9}")) return s.substring(2);
        return s;
    }

    public static boolean isValidChineseMobile(String phone) {
        return normalizePhone(phone).length() == 11;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return sb.toString();
    }

    private String getTemplateCode(SmsScene scene) {
        return switch (scene) {
            case LOGIN_REGISTER -> props.getTemplate().getLoginRegister();
            case RESET_PASSWORD -> props.getTemplate().getResetPassword();
            case BIND_PHONE -> props.getTemplate().getBindPhone();
            case VERIFY_PHONE -> props.getTemplate().getVerifyPhone();
            case CHANGE_PHONE -> props.getTemplate().getChangePhone();
        };
    }

    private DefaultAcsClient createClient() {
        DefaultProfile profile = DefaultProfile.getProfile(
                props.getRegionId(),
                props.getAccessKeyId(),
                props.getAccessKeySecret());
        return new DefaultAcsClient(profile);
    }
}
