package com.example.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.stereotype.Component;

@SpringBootApplication
public class ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }

    @Component
    public static class JwtSecretCheckListener implements ApplicationListener<ContextRefreshedEvent> {

        @Value("${jwt.secret}")
        private String jwtSecret;

        @Value("${spring.profiles.active}")
        private String activeProfile;

        @Override
        public void onApplicationEvent(ContextRefreshedEvent event) {
            // 检查生产环境下的JWT密钥是否为默认值
            if ("docker".equals(activeProfile) || "prod".equals(activeProfile)) {
                if ("please_change_me_please_change_me_please_change_me".equals(jwtSecret)) {
                    System.err.println("ERROR: JWT密钥仍为默认值，请通过环境变量JWT_SECRET设置安全的密钥");
                    System.exit(1);
                }
            }
        }
    }

}
