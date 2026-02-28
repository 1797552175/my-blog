package com.example.api.ai;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * AI接口调试拦截器
 * 当 debug-log 开启时，在响应头中添加调试信息
 */
@Component
public class AiDebugInterceptor implements HandlerInterceptor {

    @Value("${ai.debug-log:false}")
    private boolean debugLogEnabled;

    private static final String DEBUG_HEADER_PREFIX = "X-AI-Debug-";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (debugLogEnabled && isAiEndpoint(request)) {
            request.setAttribute("aiDebugStartTime", System.currentTimeMillis());
            request.setAttribute("aiDebugEndpoint", request.getRequestURI());
            request.setAttribute("aiDebugMethod", request.getMethod());
            AiDebugContext.init();
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, 
                                Object handler, Exception ex) {
        if (debugLogEnabled && isAiEndpoint(request)) {
            Long startTime = (Long) request.getAttribute("aiDebugStartTime");
            if (startTime != null) {
                long duration = System.currentTimeMillis() - startTime;
                response.setHeader(DEBUG_HEADER_PREFIX + "Duration-Ms", String.valueOf(duration));
            }
            
            response.setHeader(DEBUG_HEADER_PREFIX + "Endpoint", 
                    (String) request.getAttribute("aiDebugEndpoint"));
            response.setHeader(DEBUG_HEADER_PREFIX + "Method", 
                    (String) request.getAttribute("aiDebugMethod"));
            response.setHeader(DEBUG_HEADER_PREFIX + "Timestamp", 
                    DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
            
            // 添加调试上下文中的日志
            if (AiDebugContext.hasDebugInfo()) {
                AiDebugContext.DebugInfo debugInfo = AiDebugContext.get();
                int index = 1;
                for (Map.Entry<String, String> entry : debugInfo.getLogs().entrySet()) {
                    response.setHeader(DEBUG_HEADER_PREFIX + "Log-" + index + "-" + entry.getKey(), 
                            entry.getValue());
                    index++;
                }
            }
            
            // 添加提示信息
            response.setHeader(DEBUG_HEADER_PREFIX + "Info", 
                    "AI接口调试模式已开启，请在前端控制台查看详细信息");
        }
        
        // 清理上下文
        AiDebugContext.clear();
    }

    private boolean isAiEndpoint(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.contains("/ai") || uri.contains("/ai-writing") || uri.contains("/chapter");
    }
}
