package com.example.api.common;

import com.example.api.ai.AiDebugInterceptor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private AiDebugInterceptor aiDebugInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 注册 AI 调试拦截器，拦截所有 API 请求
        registry.addInterceptor(aiDebugInterceptor)
                .addPathPatterns("/api/**");
    }
}
