package com.example.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;

@SpringBootApplication
public class ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("My Blog API")
                .version("1.0")
                .description("博客系统 API 文档")
                .termsOfService("http://swagger.io/terms/")
                .contact(new Contact().name("API Support").email("support@example.com"))
                .license(new License().name("Apache 2.0").url("http://springdoc.org")));
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
