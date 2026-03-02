package com.example.api.sms;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sms")
public class SmsProperties {

    private boolean enabled = false;
    private String accessKeyId = "";
    private String accessKeySecret = "";
    private String signName = "";
    private String regionId = "cn-hangzhou";
    private int codeTtlSeconds = 300;
    private int sendIntervalSeconds = 60;

    private Template template = new Template();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getAccessKeyId() {
        return accessKeyId;
    }

    public void setAccessKeyId(String accessKeyId) {
        this.accessKeyId = accessKeyId;
    }

    public String getAccessKeySecret() {
        return accessKeySecret;
    }

    public void setAccessKeySecret(String accessKeySecret) {
        this.accessKeySecret = accessKeySecret;
    }

    public String getSignName() {
        return signName;
    }

    public void setSignName(String signName) {
        this.signName = signName;
    }

    public String getRegionId() {
        return regionId;
    }

    public void setRegionId(String regionId) {
        this.regionId = regionId;
    }

    public int getCodeTtlSeconds() {
        return codeTtlSeconds;
    }

    public void setCodeTtlSeconds(int codeTtlSeconds) {
        this.codeTtlSeconds = codeTtlSeconds;
    }

    public int getSendIntervalSeconds() {
        return sendIntervalSeconds;
    }

    public void setSendIntervalSeconds(int sendIntervalSeconds) {
        this.sendIntervalSeconds = sendIntervalSeconds;
    }

    public Template getTemplate() {
        return template;
    }

    public void setTemplate(Template template) {
        this.template = template;
    }

    public static class Template {
        private String loginRegister = "100001";
        private String resetPassword = "100003";
        private String bindPhone = "100004";
        private String verifyPhone = "100005";
        private String changePhone = "100002";

        public String getLoginRegister() {
            return loginRegister;
        }

        public void setLoginRegister(String loginRegister) {
            this.loginRegister = loginRegister;
        }

        public String getResetPassword() {
            return resetPassword;
        }

        public void setResetPassword(String resetPassword) {
            this.resetPassword = resetPassword;
        }

        public String getBindPhone() {
            return bindPhone;
        }

        public void setBindPhone(String bindPhone) {
            this.bindPhone = bindPhone;
        }

        public String getVerifyPhone() {
            return verifyPhone;
        }

        public void setVerifyPhone(String verifyPhone) {
            this.verifyPhone = verifyPhone;
        }

        public String getChangePhone() {
            return changePhone;
        }

        public void setChangePhone(String changePhone) {
            this.changePhone = changePhone;
        }
    }
}
